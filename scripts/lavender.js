// Keep the theme upstream intact and add a small editorial introduction to the home page.
hexo.extend.filter.register('after_render:html', function (html) {
  if (!html.includes('class="is-home"')) return html;
  return html.replace(/(<main[^>]*id="content"[^>]*>)/, '$1' +
    '<header class="notebook-intro"><div class="notebook-kicker"><span></span> X12101XX / NOTEBOOK</div>' +
    '<h1>让思考，<br>慢慢有迹可循。</h1><p>记录代码、工具，以及理解一个问题的过程。</p>' +
    '<div class="notebook-caption"><span>学习 · 记录 · 探索</span><a href="/archives/">浏览所有笔记 <span aria-hidden="true">↗</span></a></div></header>' +
    '<div class="notebook-section"><h2>最近的笔记</h2><span>NOTES & IDEAS</span></div>');
});
