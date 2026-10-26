'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { before, after, test } = require('node:test');
const Hexo = require('hexo');

const hexo = new Hexo(path.resolve(__dirname, '..'), { silent: true });
before(() => hexo.init());
after(() => hexo.exit());

async function render(content) {
  return (await hexo.post.render(null, { content, engine: 'markdown' })).content;
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
