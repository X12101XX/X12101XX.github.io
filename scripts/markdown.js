'use strict';

const fs = require('node:fs');
const path = require('node:path');
const hljs = require('highlight.js');
const lean4 = require('highlightjs-lean4').default;
const markedKatex = require('marked-katex-extension');

// Share Hexo's highlight.js instance so its code wrappers and copy buttons stay intact.
hljs.registerLanguage('lean4', function (highlighter) {
  const grammar = lean4(highlighter);
  // The upstream TextMate list relies on Lean's language server for tactics.
  // Include common tactics for static blog examples as well.
  grammar.keywords.keyword = grammar.keywords.keyword.concat([
    'apply', 'assumption', 'cases', 'constructor', 'contradiction', 'decide',
    'exact', 'ext', 'induction', 'intro', 'intros', 'linarith', 'nlinarith',
    'norm_num', 'obtain', 'omega', 'rcases', 'refine', 'rename_i', 'repeat',
    'rfl', 'ring', 'rintro', 'rw', 'simp', 'simp_all', 'simpa', 'subst',
    'tauto', 'trivial', 'use'
  ]);
  return grammar;
});
hljs.registerAliases(['lean'], { languageName: 'lean4' });

hexo.extend.filter.register('marked:use', function (markedUse) {
  markedUse(markedKatex({
    nonStandard: true, // Allow Chinese text directly beside $...$.
    throwOnError: false,
    trust: false,
    output: 'htmlAndMathml'
  }));
});

// Publish the matching CSS and fonts locally, without a runtime JS or CDN dependency.
hexo.extend.generator.register('katex-assets', function () {
  const dist = path.dirname(require.resolve('katex'));
  const assets = ['katex.min.css', ...fs.readdirSync(path.join(dist, 'fonts'))
    .map(name => `fonts/${name}`)];

  return assets.map(name => ({
    path: `vendor/katex/${name}`,
    data: () => fs.createReadStream(path.join(dist, name))
  })).concat({
    path: 'vendor/katex/LICENSE',
    data: () => fs.createReadStream(path.join(dist, '..', 'LICENSE'))
  });
});
