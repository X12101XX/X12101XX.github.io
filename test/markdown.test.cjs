'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { before, after, test } = require('node:test');
const Hexo = require('hexo');

const ROOT_DIR = path.resolve(__dirname, '..');
const hexo = new Hexo(ROOT_DIR, { silent: true });
before(() => hexo.init());
after(() => hexo.exit());

async function render(content, extra = {}) {
  return (await hexo.post.render(null, { content, engine: 'markdown', ...extra })).content;
}

test('inline math works beside Chinese text and preserves TeX subscripts', async () => {
  const html = await render(String.raw`对于$n \in \mathbb{N}$，有$a_i + b_i$。`);
  assert.equal((html.match(/class="katex"/g) || []).length, 2);
  assert.match(html, /<math /);
  assert.match(html, /<msub>/);
  assert.doesNotMatch(html, /katex-error|<em>/);
});

test('display math preserves fractions, alignment and matrix line breaks', async () => {
  const html = await render(String.raw`$$
\begin{aligned}
\sum_{i=1}^{n} i &= \frac{n(n+1)}{2} \\
A &= \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}
\end{aligned}
$$`);
  assert.match(html, /class="katex-display"/);
  assert.match(html, /<mfrac>/);
  assert.match(html, /<mtable/);
  assert.doesNotMatch(html, /katex-error/);
});

test('nested TeX groups are not interpreted as Nunjucks templates', async () => {
  const html = await render(String.raw`$\frac{{a_i}}{{b_i}}$`);
  assert.match(html, /<mfrac>/);
  assert.equal((html.match(/<msub>/g) || []).length, 2);
  assert.ok(html.includes('\\frac{{a_i}}{{b_i}}'));
  assert.doesNotMatch(html, /katex-error|swig|\ufffc/);
});

test('code and escaped dollars remain literal; invalid TeX does not break the page', async () => {
  const html = await render('`$a_i$`\n\n```text\n$$\\frac{1}{2}$$\n```\n\n\\$5\n\n$\\frac{$');
  assert.match(html, /<code>\$a_i\$<\/code>/);
  assert.match(html, /\$\$\\frac&#123;1&#125;&#123;2&#125;\$\$/);
  assert.match(html, /\$5/);
  assert.match(html, /class="katex-error"/);
  assert.doesNotMatch(html, /class="katex"/);
});

test('lean4 and lean fences highlight Lean 4 syntax, nested comments and Unicode', async () => {
  for (const language of ['lean4', 'lean']) {
    const html = await render('```' + language + '\n/- outer /- nested -/ comment -/\nabbrev Count := Nat\ntheorem identity (n : ℕ) : n = n := by\n  rfl\n#check Count\n```');
    assert.ok(html.includes(`figure class="highlight ${language}"`));
    assert.match(html, /class="keyword">abbrev/);
    assert.match(html, /class="keyword">theorem/);
    assert.match(html, /class="keyword">rfl/);
    assert.match(html, /class="type">ℕ/);
    assert.match(html, /nested -\/<\/span> comment -\/<\/span>/);
  }
});

test('math, Lean 4 and C++ render together without changing existing languages', async () => {
  const html = await render('对于$n$，构造长度为$n$的数组。\n\n```lean4\ndef zeros (n : Nat) : Vector Int n := Vector.replicate n 0\n```\n\n```cpp\ntemplate <std::size_t N>\nconstexpr std::array<int, N> zeros() { return {}; }\n```');
  assert.match(html, /figure class="highlight lean4"/);
  assert.match(html, /figure class="highlight cpp"/);
  assert.match(html, /class="keyword">template/);
  assert.match(html, /class="katex"/);
  assert.doesNotMatch(html, /katex-error|\$n\$/);
});

test('all fonts referenced by the local KaTeX CSS are published', async () => {
  const assets = await hexo.extend.generator.get('katex-assets').call(hexo);
  const cssAsset = assets.find(asset => asset.path.endsWith('/katex.min.css'));
  const chunks = [];
  for await (const chunk of cssAsset.data()) chunks.push(chunk);
  const css = Buffer.concat(chunks).toString();
  const assetPaths = new Set(assets.map(asset => asset.path));
  for (const [, font] of css.matchAll(/url\((fonts\/[^)]+)\)/g)) {
    assert.ok(assetPaths.has(`vendor/katex/${font}`), `Missing ${font}`);
  }
  assert.ok(assetPaths.has('vendor/katex/LICENSE'));
});

test('adjacent display math and blockquote display math render cleanly while code blocks stay literal', async () => {
  const md = [
    '前一段落直接紧贴公式：',
    '$$',
    'x^2 + y^2 = z^2',
    '$$',
    '后一段落紧贴结束。',
    '',
    '> 引用中的公式：',
    '> $$',
    '> \\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}',
    '> $$',
    '> 引用后续文字。',
    '',
    '```markdown',
    '代码示例中不改写：',
    '$$',
    '\\alpha + \\beta',
    '$$',
    '```',
    '',
    '行内代码 `$$\\gamma$$` 保持原样。'
  ].join('\n');

  const html = await render(md);
  assert.equal((html.match(/class="katex-display"/g) || []).length, 2);
  assert.match(html, /<p>前一段落直接紧贴公式：<\/p>/);
  assert.match(html, /<p>后一段落紧贴结束。<\/p>/);
  assert.match(html, /<blockquote>[\s\S]*class="katex-display"[\s\S]*<p>引用后续文字。<\/p>[\s\S]*<\/blockquote>/);
  assert.match(html, /figure class="highlight markdown"/);
  assert.match(html, /\$\$<\/span><br><span class="line">\\alpha \+ \\beta<\/span><br><span class="line">\$\$<\/span>/);
  assert.match(html, /<code>\$\$\\gamma\$\$<\/code>/);
  assert.doesNotMatch(html, /katex-error/);
});

test('Typora / GFM callouts render with type classes and optional custom titles', async () => {
  const md = [
    '> [!NOTE]',
    '> 默认标题正文。',
    '',
    '> [!WARNING] 注意边界条件',
    '> 第一段内容。',
    '>',
    '> 第二段含公式 $x > 0$。',
    '',
    '> [!tip] 小技巧',
    '> 大小写不敏感。',
    '',
    '> 普通引用不应变成 callout。',
    '',
    '```markdown',
    '> [!NOTE]',
    '> 代码块里的 callout 保持原样。',
    '```'
  ].join('\n');

  const html = await render(md);
  assert.match(
    html,
    /<aside class="callout callout--note"><div class="callout-head"><span class="callout-badge">NOTE<\/span><span class="callout-title">NOTE<\/span><\/div><div class="callout-body"><p>默认标题正文。<\/p><\/div><\/aside>/
  );
  assert.match(
    html,
    /<aside class="callout callout--warning"><div class="callout-head"><span class="callout-badge">WARNING<\/span><span class="callout-title">注意边界条件<\/span><\/div><div class="callout-body"><p>第一段内容。<\/p>\s*<p>第二段含公式 <span class="katex"/
  );
  assert.match(
    html,
    /<aside class="callout callout--tip"><div class="callout-head"><span class="callout-badge">TIP<\/span><span class="callout-title">小技巧<\/span><\/div><div class="callout-body"><p>大小写不敏感。<\/p><\/div><\/aside>/
  );
  assert.match(html, /<blockquote>\s*<p>普通引用不应变成 callout。<\/p>\s*<\/blockquote>/);
  assert.equal((html.match(/class="callout /g) || []).length, 3);
});

test('Typora highlight, footnotes, and standalone [TOC] render safely', async () => {
  const md = [
    '[TOC]',
    '',
    '支持 ==重点高亮==、行内代码 `==非高亮==`、公式 $==a==$，以及 `[TOC]`。',
    '',
    '这里有脚注[^1]、命名脚注[^note]和网址脚注[^url]。',
    '',
    '```text',
    '==fence== [^1] [TOC]',
    '```',
    '',
    '[^1]: 第一条脚注，支持 `code` 和 $x^2$。',
    '[^note]: 第二条脚注',
    '  带有缩进续行。',
    '[^url]: https://example.com/docs'
  ].join('\n');

  const html = await render(md);
  assert.match(html, /<nav class="inline-toc" data-inline-toc aria-label="Table of contents"><\/nav>/);
  assert.equal((html.match(/data-inline-toc/g) || []).length, 1);

  assert.match(html, /<mark>重点高亮<\/mark>/);
  assert.match(html, /<code>==非高亮==<\/code>/);
  assert.equal((html.match(/<mark>/g) || []).length, 1);

  assert.match(html, /<sup class="footnote-ref"><a href="#fn-1" id="fnref-1">1<\/a><\/sup>/);
  assert.match(html, /<sup class="footnote-ref"><a href="#fn-note" id="fnref-note">2<\/a><\/sup>/);
  assert.match(html, /<sup class="footnote-ref"><a href="#fn-url" id="fnref-url">3<\/a><\/sup>/);
  assert.match(html, /<section class="footnotes"><hr><ol class="footnotes-list">/);
  assert.match(html, /<li id="fn-1">第一条脚注，支持 <code>code<\/code> 和 <span class="katex"/);
  assert.match(html, /href="#fnref-1" class="footnote-backref"/);
  assert.match(html, /<li id="fn-note">第二条脚注<br>带有缩进续行。/);
  assert.match(html, /<li id="fn-url">/);
  assert.doesNotMatch(html, /<a\b[^>]*>\^(?:1|note|url)<\/a>/i);
});

test('relative Typora image paths rewrite and .assets images publish via typora-post-assets', async () => {
  const md = [
    '![root-img](../images/foo.png)',
    '',
    '![dot-img](./images/bar.png)',
    '',
    '![assets-img](./demo.assets/pic.png)',
    '',
    '![plain-assets](assets/diagram.svg)',
    '',
    '![external](https://example.com/keep.png)'
  ].join('\n');

  const topHtml = await render(md, { source: '_posts/demo.md' });
  assert.match(topHtml, /<img src="\/images\/foo\.png" alt="root-img">/);
  assert.match(topHtml, /<img src="\/images\/bar\.png" alt="dot-img">/);
  assert.match(topHtml, /<img src="\/images\/posts\/demo\.assets\/pic\.png" alt="assets-img">/);
  assert.match(topHtml, /<img src="\/images\/posts\/assets\/diagram\.svg" alt="plain-assets">/);
  assert.match(topHtml, /<img src="https:\/\/example\.com\/keep\.png" alt="external">/);

  const nestedHtml = await render('![nested](./demo.assets/pic.png)', { source: '_posts/sub/demo.md' });
  assert.match(nestedHtml, /<img src="\/images\/posts\/sub\/demo\.assets\/pic\.png" alt="nested">/);

  const tmpPostsAssetDir = path.join(ROOT_DIR, 'source', '_posts', '__tmp_test.assets');
  fs.mkdirSync(tmpPostsAssetDir, { recursive: true });
  const tmpPng = path.join(tmpPostsAssetDir, 'probe.png');
  try {
    fs.writeFileSync(tmpPng, Buffer.from('png-bytes'));
    const assets = await hexo.extend.generator.get('typora-post-assets').call(hexo);
    const assetPaths = new Set(assets.map(asset => asset.path));
    assert.ok(assetPaths.has('images/posts/__tmp_test.assets/probe.png'));
  } finally {
    fs.rmSync(tmpPostsAssetDir, { recursive: true, force: true });
  }
});

test('helpers preserve angle brackets, skip duplicate KaTeX MathML, count words, and filter valid posts', async () => {
  const postExcerpt = hexo.extend.helper.get('post_excerpt');
  const wordCount = hexo.extend.helper.get('word_count');
  const validPosts = hexo.extend.helper.get('valid_posts');

  const rendered = await render(
    '模板 `std::array<T, length>` 加上公式 $n$。\n\n> [!NOTE] 提醒标题\n> 正文说明\n\n注脚引用[^1]\n\n[^1]: 脚注文本'
  );
  const excerpt = postExcerpt({ content: rendered }, 200);
  assert.ok(excerpt.includes('std::array<T, length>'), `Expected angle brackets in excerpt: ${excerpt}`);
  assert.ok(!excerpt.includes('n n') && !excerpt.includes('nn'), `MathML duplicated in excerpt: ${excerpt}`);
  assert.ok(!excerpt.includes('提醒标题'), `callout-head should be stripped: ${excerpt}`);
  assert.ok(!excerpt.includes('脚注文本'), `footnotes section should be stripped: ${excerpt}`);

  assert.equal(wordCount('<p>Hello world 你好</p>'), '4');
  assert.equal(wordCount(`<p>${'token '.repeat(1200)}</p>`), '1.2k');

  const filtered = validPosts({
    toArray: () => [
      { title: 'Good Post', published: true },
      { title: '', published: true },
      { title: '   ', published: true },
      { title: 'Unpublished', published: false },
      null
    ]
  });
  assert.deepEqual(filtered, [{ title: 'Good Post', published: true }]);
});

test('leading H1 title inference/deduplication and empty Untitled guard work cleanly', async () => {
  assert.equal(fs.existsSync(path.join(ROOT_DIR, 'source', '_posts', 'Untitled.md')), false);

  const untitled = { content: '  \n\t\n', engine: 'markdown', source: '_posts/Untitled.md', title: '' };
  await hexo.post.render(null, untitled);
  assert.equal(untitled.published, false);
  assert.equal(untitled.content, '');

  const inferred = { content: '\n# Inferred Heading\n\nBody paragraph.', engine: 'markdown', source: '_posts/demo.md' };
  const inferredResult = await hexo.post.render(null, inferred);
  assert.equal(inferred.title, 'Inferred Heading');
  assert.doesNotMatch(inferredResult.content, /<h1\b/);
  assert.match(inferredResult.content, /<p>Body paragraph\.<\/p>/);

  const slugFallback = { content: 'Plain body without H1.', engine: 'markdown', source: '_posts/my-fallback-slug.md' };
  await hexo.post.render(null, slugFallback);
  assert.equal(slugFallback.title, 'my-fallback-slug');

  const dedup = { content: '#   Same   Title \n\nBody text.', engine: 'markdown', title: 'same title' };
  const dedupResult = await hexo.post.render(null, dedup);
  assert.doesNotMatch(dedupResult.content, /<h1\b/);
  assert.match(dedupResult.content, /<p>Body text\.<\/p>/);

  const distinct = { content: '# Different Heading\n\nBody text.', engine: 'markdown', title: 'Post Title' };
  const distinctResult = await hexo.post.render(null, distinct);
  assert.match(distinctResult.content, /<h1[^>]*>.*Different Heading<\/h1>/);
});

test('typora/marginalia.css and scripts/typora-helper.cjs exist with expected structure and Hexo compatibility', () => {
  const typoraCssPath = path.join(ROOT_DIR, 'typora', 'marginalia.css');
  assert.ok(fs.existsSync(typoraCssPath), 'Missing typora/marginalia.css');
  const typoraCss = fs.readFileSync(typoraCssPath, 'utf8');
  assert.match(typoraCss, /--bg-color:\s*#F4F1EA/);
  assert.match(typoraCss, /--accent:\s*#E02B20/);
  assert.match(typoraCss, /#write\s*\{/);
  assert.match(typoraCss, /#write h2::before/);
  assert.match(typoraCss, /\.md-Alert|\.md-alert/);
  assert.match(typoraCss, /\.md-fences/);
  assert.match(typoraCss, /\.md-footnote/);

  const helperPath = path.join(ROOT_DIR, 'scripts', 'typora-helper.cjs');
  assert.ok(fs.existsSync(helperPath), 'Missing scripts/typora-helper.cjs');
  const helperSrc = fs.readFileSync(helperPath, 'utf8');

  // Verify Hexo's loadPlugin wrapper can compile every file in scripts/ without SyntaxError.
  for (const name of fs.readdirSync(path.join(ROOT_DIR, 'scripts'))) {
    const filePath = path.join(ROOT_DIR, 'scripts', name);
    if (!/\.(?:c?js)$/i.test(name) || !fs.statSync(filePath).isFile()) continue;
    const src = fs.readFileSync(filePath, 'utf8');
    assert.doesNotThrow(
      () => new vm.Script(`(async function(exports, require, module, __filename, __dirname, hexo){${src}\n});`, { filename: filePath }),
      `Hexo plugin wrapper failed to compile scripts/${name}`
    );
  }

  const helper = require(helperPath);
  for (const fn of ['createNote', 'installTheme', 'parseCliArgs', 'runCli', 'getDefaultTyporaThemeDir']) {
    assert.equal(typeof helper[fn], 'function', `Expected export ${fn}`);
  }
  assert.match(helperSrc, /typora-root-url:\s*\.\./);
  assert.match(helperSrc, /typora-copy-images-to:\s*\.\.\/images/);

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'marginalia-helper-test-'));
  try {
    const fixedDate = new Date(2026, 10, 17, 9, 5, 3);
    const createdAscii = helper.createNote({ title: 'Hello Typora World', rootDir: tmpRoot, now: fixedDate });
    assert.equal(createdAscii.relativePath, path.join('source', '_posts', 'hello-typora-world.md'));
    const createdContent = fs.readFileSync(createdAscii.filePath, 'utf8');
    assert.match(createdContent, /title: Hello Typora World/);
    assert.match(createdContent, /typora-root-url: \.\./);
    assert.match(createdContent, /typora-copy-images-to: \.\.\/images/);
    assert.match(createdContent, /<!-- more -->/);

    const createdCollision = helper.createNote({ title: 'Hello Typora World', rootDir: tmpRoot, now: fixedDate });
    assert.equal(createdCollision.relativePath, path.join('source', '_posts', 'hello-typora-world-2.md'));

    const createdCjk = helper.createNote({ title: '中文笔记', draft: true, rootDir: tmpRoot, now: fixedDate });
    assert.equal(createdCjk.relativePath, path.join('source', '_drafts', 'note-20261117-090503.md'));

    const missingInstall = helper.installTheme({ rootDir: ROOT_DIR, platform: 'linux', homeDir: path.join(tmpRoot, 'empty-home') });
    assert.equal(missingInstall.installed, false);
    assert.equal(missingInstall.reason, 'missing-typora-dir');

    const themeTarget = path.join(tmpRoot, 'typora-themes');
    const customInstall = helper.installTheme({ dir: themeTarget, rootDir: ROOT_DIR });
    assert.equal(customInstall.installed, true);
    assert.ok(fs.existsSync(path.join(themeTarget, 'marginalia.css')));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
