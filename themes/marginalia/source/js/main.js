(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pageVeil = doc.querySelector('.page-veil');
  let navigating = false;

  const navigate = (url) => {
    if (navigating) return;
    if (!pageVeil || reducedMotion.matches) {
      window.location.href = url;
      return;
    }
    navigating = true;
    try {
      sessionStorage.setItem('page-transition', '1');
    } catch (error) {}
    root.classList.add('is-leaving');
    window.setTimeout(() => {
      window.location.href = url;
    }, 180);
  };

  if (root.classList.contains('is-entering')) {
    window.setTimeout(() => {
      root.classList.remove('is-transitioning', 'is-entering');
    }, 300);
  }

  const copyText = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const area = doc.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    doc.body.appendChild(area);
    area.select();
    const ok = doc.execCommand('copy');
    area.remove();
    if (!ok) throw new Error('Copy failed');
  };

  /* ---------------- theme toggle ---------------- */

  const themeMeta = doc.querySelector('meta[name="theme-color"]');
  const applyTheme = (theme) => {
    const next = theme === 'light' ? 'light' : 'dark';
    root.dataset.theme = next;
    if (themeMeta) {
      themeMeta.setAttribute('content', next === 'light' ? '#f8fafc' : '#07080d');
    }
    doc.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.setAttribute('aria-pressed', next === 'light' ? 'true' : 'false');
    });
  };

  applyTheme(root.dataset.theme || 'dark');

  doc.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const current = root.dataset.theme === 'light' ? 'light' : 'dark';
      const next = current === 'light' ? 'dark' : 'light';
      applyTheme(next);
      try {
        localStorage.setItem('theme', next);
      } catch (error) {}
    });
  });

  /* ---------------- spotlight mouse glow ---------------- */

  if (!reducedMotion.matches && window.matchMedia('(hover: hover)').matches) {
    let activeCard = null;
    doc.addEventListener('pointermove', (event) => {
      const card = event.target instanceof Element ? event.target.closest('.spotlight-card') : null;
      if (!card) {
        if (activeCard) {
          activeCard.style.removeProperty('--mouse-x');
          activeCard.style.removeProperty('--mouse-y');
          activeCard = null;
        }
        return;
      }
      activeCard = card;
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x.toFixed(1)}px`);
      card.style.setProperty('--mouse-y', `${y.toFixed(1)}px`);
    }, { passive: true });
  }

  /* ---------------- mobile menu ---------------- */

  const menu = doc.getElementById('mobile-menu');
  const menuToggle = doc.querySelector('[data-menu-toggle]');
  let menuCloseTimer;

  const openMenu = () => {
    if (!menu || !menuToggle) return;
    clearTimeout(menuCloseTimer);
    menu.hidden = false;
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', '关闭导航菜单');
    root.classList.add('menu-open');
    requestAnimationFrame(() => menu.classList.add('is-open'));
  };

  const closeMenu = () => {
    if (!menu || !menuToggle) return;
    menu.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', '打开导航菜单');
    root.classList.remove('menu-open');
    menuCloseTimer = setTimeout(() => {
      if (!menu.classList.contains('is-open')) menu.hidden = true;
    }, 320);
  };

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      if (menuToggle.getAttribute('aria-expanded') === 'true') closeMenu();
      else openMenu();
    });
  }

  doc.querySelectorAll('[data-menu-close]').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 960 && menuToggle && menuToggle.getAttribute('aria-expanded') === 'true') {
      closeMenu();
    }
  });

  /* ---------------- header state ---------------- */

  const header = doc.getElementById('site-header');
  if (header) {
    let ticking = false;
    const updateHeader = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateHeader);
      }
    }, { passive: true });
    updateHeader();
  }

  /* ---------------- hero interactive terminal ---------------- */

  const terminal = doc.querySelector('[data-terminal]');
  if (terminal) {
    const tabs = Array.from(terminal.querySelectorAll('[data-terminal-tab]'));
    const panels = Array.from(terminal.querySelectorAll('[data-terminal-panel]'));
    const langBadge = terminal.querySelector('[data-terminal-lang]');
    const statusText = terminal.querySelector('[data-terminal-status]');

    const metaByTab = {
      lean: {
        lang: 'Lean 4 · ∀ n',
        status: 'Proof State: No goals · Typechecked'
      },
      cpp: {
        lang: 'C++20 · constexpr',
        status: 'Compile-time N only · Not dependent'
      }
    };

    const activateTab = (key) => {
      tabs.forEach((tab) => {
        const active = tab.dataset.terminalTab === key;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      panels.forEach((panel) => {
        const active = panel.dataset.terminalPanel === key;
        panel.hidden = !active;
        panel.classList.toggle('is-active', active);
      });
      const meta = metaByTab[key];
      if (meta) {
        if (langBadge) langBadge.textContent = meta.lang;
        if (statusText) statusText.textContent = meta.status;
      }
    };

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => activateTab(tab.dataset.terminalTab));
    });
  }

  /* ---------------- search ---------------- */

  const overlay = doc.getElementById('search-overlay');
  const searchInput = doc.getElementById('search-input');
  const searchStatus = doc.getElementById('search-status');
  const searchResults = doc.getElementById('search-results');
  let searchEntries = null;
  let searchLoading = false;
  let searchOpen = false;
  let activeResult = -1;
  let lastFocused = null;
  let closeTimer;

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const tokenizeQuery = (query) => Array.from(
    new Set(String(query || '').trim().split(/\s+/).filter(Boolean))
  );

  const plainText = (html) => String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<span class="katex-mathml">[\s\S]*?<\/span>/gi, ' ')
    .replace(/<td class="gutter">[\s\S]*?<\/td>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&hellip;/gi, '…')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/\s+/g, ' ')
    .trim();

  const markMatch = (value, query) => {
    const text = String(value ?? '');
    const tokens = tokenizeQuery(query).sort((a, b) => b.length - a.length);
    if (!tokens.length) return escapeHtml(text);
    const pattern = new RegExp(`(${tokens.map(escapeRegExp).join('|')})`, 'gi');
    let out = '';
    let lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match.index > lastIndex) out += escapeHtml(text.slice(lastIndex, match.index));
      out += `<mark>${escapeHtml(match[0])}</mark>`;
      lastIndex = pattern.lastIndex;
    }
    if (lastIndex < text.length) out += escapeHtml(text.slice(lastIndex));
    return out;
  };

  const parseIndex = (xmlText) => {
    const xml = new DOMParser().parseFromString(xmlText, 'application/xml');
    if (xml.querySelector('parsererror')) throw new Error('Invalid search index');
    const nodes = Array.from(xml.getElementsByTagName('entry'));
    return nodes.map((entry) => {
      const field = (tag) => {
        const node = entry.getElementsByTagName(tag)[0];
        return node ? node.textContent.trim() : '';
      };
      const content = field('content');
      return {
        title: field('title'),
        url: field('url'),
        content,
        plain: plainText(content),
        categories: field('categories'),
        tags: field('tags'),
        date: field('date')
      };
    }).filter((entry) => entry.title && entry.url);
  };

  const loadIndex = async () => {
    if (searchEntries || searchLoading || !overlay) return;
    searchLoading = true;
    if (searchStatus) searchStatus.textContent = '正在加载检索索引…';
    try {
      const response = await fetch(overlay.dataset.index || '/search.xml', { cache: 'no-cache' });
      if (!response.ok) throw new Error('Search index unavailable');
      const text = await response.text();
      searchEntries = parseIndex(text);
      searchLoading = false;
      if (searchOpen) renderResults(searchInput ? searchInput.value.trim() : '');
    } catch (error) {
      searchLoading = false;
      if (searchStatus) searchStatus.textContent = '无法打开搜索索引。';
      if (searchResults) searchResults.innerHTML = '';
    }
  };

  const itemMeta = (entry) => [entry.categories, entry.tags].filter(Boolean).join(' / ');

  const itemDate = (entry) => {
    if (!entry.date) return '';
    return entry.date.slice(0, 10);
  };

  const snippetFor = (entry, query) => {
    const text = entry.plain || '';
    const tokens = tokenizeQuery(query).map((t) => t.toLowerCase());
    if (!tokens.length) return text.slice(0, 130);
    const lower = text.toLowerCase();
    let bestIndex = -1;
    for (const token of tokens) {
      const idx = lower.indexOf(token);
      if (idx >= 0 && (bestIndex < 0 || idx < bestIndex)) bestIndex = idx;
    }
    if (bestIndex < 0) return text.slice(0, 130);
    const start = Math.max(0, bestIndex - 52);
    const end = Math.min(text.length, bestIndex + 110);
    return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
  };

  const setActiveResult = (index) => {
    const items = Array.from(searchResults.querySelectorAll('.search-result'));
    if (!items.length) return;
    activeResult = (index + items.length) % items.length;
    items.forEach((item, itemIndex) => item.classList.toggle('is-active', itemIndex === activeResult));
    items[activeResult].scrollIntoView({ block: 'nearest' });
  };

  const renderResults = (query) => {
    if (!searchEntries || !searchResults || !searchStatus) return;
    const normalized = query.trim();
    let matches;

    if (!normalized) {
      matches = searchEntries.slice(0, 5);
      searchStatus.textContent = '最近发布';
    } else {
      const q = normalized.toLowerCase();
      const tokens = tokenizeQuery(q);
      matches = searchEntries.map((entry) => {
        const title = entry.title.toLowerCase();
        const meta = itemMeta(entry).toLowerCase();
        const content = entry.plain.toLowerCase();
        const allMatch = tokens.every((token) => (
          title.includes(token) || meta.includes(token) || content.includes(token)
        ));
        if (!allMatch) return { entry, score: 0 };

        let score = 0;
        if (title === q) score += 30;
        if (title.includes(q)) score += 15;
        tokens.forEach((token) => {
          if (title.includes(token)) score += 12;
          if (meta.includes(token)) score += 4;
          if (content.includes(token)) score += 1;
        });
        return { entry, score };
      })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map((item) => item.entry);
      searchStatus.textContent = matches.length
        ? `共找到 ${matches.length} 条关于 “${normalized}” 的结果`
        : `没有找到与 “${normalized}” 匹配的文章`;
    }

    activeResult = -1;
    searchResults.innerHTML = '';

    if (!matches.length) {
      searchResults.innerHTML = '<li class="search-empty">换一个更简短的关键词试试，或者前往归档浏览。</li>';
      return;
    }

    matches.forEach((entry) => {
      const item = doc.createElement('li');
      const link = doc.createElement('a');
      const date = itemDate(entry);
      const meta = itemMeta(entry);
      link.className = 'search-result';
      link.href = entry.url;
      link.innerHTML = `
        <span class="search-result-top">
          <span class="search-result-title">${markMatch(entry.title, normalized)}</span>
          ${date ? `<span class="search-result-date">${escapeHtml(date)}</span>` : ''}
        </span>
        ${meta ? `<span class="search-result-meta">${markMatch(meta, normalized)}</span>` : ''}
        <span class="search-result-snippet">${markMatch(snippetFor(entry, normalized), normalized)}</span>
      `;
      item.appendChild(link);
      searchResults.appendChild(item);
    });
  };

  const openSearch = () => {
    if (!overlay || !searchInput) return;
    clearTimeout(closeTimer);
    closeMenu();
    lastFocused = doc.activeElement;
    overlay.hidden = false;
    searchOpen = true;
    root.classList.add('search-open');
    doc.querySelectorAll('[data-search-open]').forEach((button) => button.setAttribute('aria-expanded', 'true'));
    requestAnimationFrame(() => overlay.classList.add('is-open'));
    setTimeout(() => searchInput.focus(), 40);
    if (searchEntries) renderResults(searchInput.value.trim());
    else loadIndex();
  };

  const closeSearch = () => {
    if (!overlay || !searchOpen) return;
    searchOpen = false;
    overlay.classList.remove('is-open');
    root.classList.remove('search-open');
    doc.querySelectorAll('[data-search-open]').forEach((button) => button.setAttribute('aria-expanded', 'false'));
    closeTimer = setTimeout(() => {
      overlay.hidden = true;
      if (searchInput) searchInput.value = '';
      if (searchStatus) searchStatus.textContent = '输入关键词开始检索（支持空格分词）';
      if (searchResults) searchResults.innerHTML = '';
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    }, 280);
  };

  doc.querySelectorAll('[data-search-open]').forEach((button) => {
    button.addEventListener('click', openSearch);
  });

  doc.querySelectorAll('[data-search-close]').forEach((button) => {
    button.addEventListener('click', closeSearch);
  });

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (searchEntries) renderResults(searchInput.value);
    });
  }

  if (searchResults) {
    searchResults.addEventListener('mousemove', (event) => {
      const result = event.target.closest('.search-result');
      if (!result) return;
      const items = Array.from(searchResults.querySelectorAll('.search-result'));
      const index = items.indexOf(result);
      if (index !== activeResult && index >= 0) setActiveResult(index);
    });
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(loadIndex, { timeout: 2600 });
  } else {
    setTimeout(loadIndex, 1600);
  }

  /* ---------------- code copy & macOS toolbar ---------------- */

  const languageNames = {
    bash: 'Shell',
    sh: 'Shell',
    shell: 'Shell',
    c: 'C',
    cpp: 'C++',
    cxx: 'C++',
    cc: 'C++',
    h: 'C/C++ Header',
    hpp: 'C++ Header',
    cs: 'C#',
    csharp: 'C#',
    css: 'CSS',
    diff: 'Diff',
    go: 'Go',
    haskell: 'Haskell',
    hs: 'Haskell',
    html: 'HTML',
    ini: 'INI',
    java: 'Java',
    javascript: 'JavaScript',
    js: 'JavaScript',
    json: 'JSON',
    kotlin: 'Kotlin',
    latex: 'LaTeX',
    lean: 'Lean 4',
    lean4: 'Lean 4',
    lua: 'Lua',
    markdown: 'Markdown',
    md: 'Markdown',
    mermaid: 'Mermaid',
    ml: 'OCaml',
    nix: 'Nix',
    ocaml: 'OCaml',
    plain: 'Text',
    plaintext: 'Text',
    py: 'Python',
    python: 'Python',
    rs: 'Rust',
    rust: 'Rust',
    sql: 'SQL',
    swift: 'Swift',
    tex: 'TeX',
    text: 'Text',
    toml: 'TOML',
    ts: 'TypeScript',
    typescript: 'TypeScript',
    txt: 'Text',
    xml: 'XML',
    yaml: 'YAML',
    yml: 'YAML',
    zig: 'Zig'
  };

  doc.querySelectorAll('.post-content figure.highlight, .markdown-body figure.highlight').forEach((figure) => {
    const code = figure.querySelector('td.code pre') || figure.querySelector('pre');
    if (!code) return;
    const classes = Array.from(figure.classList).filter((name) => name !== 'highlight');
    const languageClass = classes.find((name) => name !== 'plain') || (classes.includes('plain') ? 'plain' : '');
    const language = languageNames[languageClass] || (languageClass ? languageClass.charAt(0).toUpperCase() + languageClass.slice(1) : 'Code');
    const lineNodes = Array.from(code.querySelectorAll('.line'));
    const rawCode = lineNodes.length
      ? lineNodes.map((line) => line.textContent).join('\n')
      : code.textContent.replace(/\n$/, '');
    const lineCount = lineNodes.length || (rawCode ? rawCode.split('\n').length : 0);

    const toolbar = doc.createElement('div');
    const leftGroup = doc.createElement('div');
    const dots = doc.createElement('span');
    const label = doc.createElement('span');
    const button = doc.createElement('button');

    toolbar.className = 'code-toolbar';
    leftGroup.className = 'code-toolbar-left';
    dots.className = 'code-dots';
    dots.setAttribute('aria-hidden', 'true');
    dots.innerHTML = '<span></span><span></span><span></span>';

    label.className = 'code-lang';
    label.textContent = lineCount > 0
      ? `${language} · ${lineCount} ${lineCount === 1 ? 'line' : 'lines'}`
      : language;

    leftGroup.append(dots, label);

    button.type = 'button';
    button.className = 'code-copy';
    button.textContent = '复制';
    button.setAttribute('aria-label', `复制 ${language} 代码`);

    toolbar.append(leftGroup, button);
    figure.insertBefore(toolbar, figure.firstChild);

    button.addEventListener('click', async () => {
      try {
        await copyText(rawCode);
        button.textContent = '已复制';
        button.classList.add('is-copied');
        setTimeout(() => {
          button.textContent = '复制';
          button.classList.remove('is-copied');
        }, 1600);
      } catch (error) {
        button.textContent = '按 ⌘C 复制';
        setTimeout(() => { button.textContent = '复制'; }, 1600);
      }
    });
  });

  /* ---------------- inline [TOC] hydration ---------------- */

  const buildTocFromHeadings = () => {
    const headings = Array.from(doc.querySelectorAll('.post-content h2[id], .post-content h3[id], .markdown-body h2[id], .markdown-body h3[id]'));
    if (!headings.length) return null;
    const rootList = doc.createElement('ol');
    rootList.className = 'toc';
    let lastTopItem = null;
    let lastChildList = null;

    headings.forEach((heading) => {
      const li = doc.createElement('li');
      const level = heading.tagName === 'H3' ? 3 : 2;
      li.className = `toc-item toc-level-${level}`;
      const link = doc.createElement('a');
      link.className = 'toc-link';
      link.href = `#${encodeURIComponent(heading.id)}`;
      const span = doc.createElement('span');
      span.className = 'toc-text';
      span.textContent = heading.textContent.trim();
      link.appendChild(span);
      li.appendChild(link);

      if (level === 3 && lastTopItem) {
        if (!lastChildList) {
          lastChildList = doc.createElement('ol');
          lastChildList.className = 'toc-child';
          lastTopItem.appendChild(lastChildList);
        }
        lastChildList.appendChild(li);
      } else {
        rootList.appendChild(li);
        lastTopItem = li;
        lastChildList = null;
      }
    });
    return rootList;
  };

  const inlineTocContainers = doc.querySelectorAll('.post-content [data-inline-toc], .markdown-body [data-inline-toc]');
  if (inlineTocContainers.length) {
    const sourceToc = doc.querySelector('.post-aside .toc') || doc.querySelector('.post-toc-mobile-body .toc');
    const builtToc = sourceToc ? null : buildTocFromHeadings();
    inlineTocContainers.forEach((container) => {
      container.innerHTML = '';
      const clone = sourceToc ? sourceToc.cloneNode(true) : (builtToc ? builtToc.cloneNode(true) : null);
      if (!clone || !clone.children.length) return;
      clone.querySelectorAll('.is-active').forEach((node) => node.classList.remove('is-active'));
      container.appendChild(clone);
    });
  }

  /* ---------------- heading anchors ---------------- */

  doc.querySelectorAll('.post-content h2[id], .post-content h3[id], .post-content h4[id]').forEach((heading) => {
    if (heading.querySelector('.heading-anchor')) return;
    const anchor = doc.createElement('a');
    anchor.className = 'heading-anchor';
    anchor.href = `#${encodeURIComponent(heading.id)}`;
    anchor.textContent = '#';
    anchor.setAttribute('aria-label', '复制章节链接');
    anchor.setAttribute('title', '复制当前章节链接');
    let resetTimer;
    anchor.addEventListener('click', async (event) => {
      event.preventDefault();
      const targetHref = anchor.getAttribute('href');
      try {
        history.replaceState(null, '', targetHref);
      } catch (error) {}
      const fullUrl = new URL(targetHref, window.location.href).href;
      try {
        await copyText(fullUrl);
        anchor.textContent = '✓';
        anchor.classList.add('is-copied');
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          anchor.textContent = '#';
          anchor.classList.remove('is-copied');
        }, 1600);
      } catch (error) {
        window.location.hash = targetHref;
      }
    });
    heading.appendChild(anchor);
  });

  /* ---------------- table wrapper ---------------- */

  doc.querySelectorAll('.post-content > table, .markdown-body > table, .post-content .callout-body > table').forEach((table) => {
    if (table.closest('figure.highlight')) return;
    if (table.parentElement && table.parentElement.classList.contains('table-wrap')) return;
    const wrap = doc.createElement('div');
    wrap.className = 'table-wrap';
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
  });

  /* ---------------- image captions & lightbox ---------------- */

  doc.querySelectorAll('.post-content p > img[alt]').forEach((img) => {
    if (img.closest('figure')) return;
    const alt = (img.getAttribute('alt') || '').trim();
    if (!alt) return;
    const parent = img.parentElement;
    if (!parent || parent.tagName !== 'P') return;
    const hasExtraContent = Array.from(parent.childNodes).some((node) => {
      if (node === img) return false;
      if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim().length > 0;
      if (node.nodeType === Node.ELEMENT_NODE) return node.tagName !== 'BR';
      return false;
    });
    if (hasExtraContent) return;
    if (img.nextElementSibling && img.nextElementSibling.classList.contains('img-caption')) return;
    const caption = doc.createElement('span');
    caption.className = 'img-caption mono';
    caption.textContent = alt;
    img.insertAdjacentElement('afterend', caption);
  });

  let lightboxEl = null;
  let lightboxImg = null;
  let lightboxCaption = null;
  let lightboxCloseBtn = null;
  let lightboxOpen = false;
  let lightboxLastFocus = null;
  let lightboxCloseTimer;

  const ensureLightbox = () => {
    if (lightboxEl) return;
    lightboxEl = doc.createElement('div');
    lightboxEl.className = 'image-lightbox';
    lightboxEl.hidden = true;
    lightboxEl.setAttribute('role', 'dialog');
    lightboxEl.setAttribute('aria-modal', 'true');
    lightboxEl.setAttribute('aria-label', '图片预览');
    lightboxEl.innerHTML = `
      <div class="image-lightbox-backdrop" data-lightbox-close></div>
      <figure class="image-lightbox-frame">
        <button type="button" class="image-lightbox-close" data-lightbox-close aria-label="关闭图片预览">×</button>
        <img class="image-lightbox-img" alt="">
        <figcaption class="image-lightbox-caption mono"></figcaption>
      </figure>
    `;
    doc.body.appendChild(lightboxEl);
    lightboxImg = lightboxEl.querySelector('.image-lightbox-img');
    lightboxCaption = lightboxEl.querySelector('.image-lightbox-caption');
    lightboxCloseBtn = lightboxEl.querySelector('.image-lightbox-close');
    lightboxEl.querySelectorAll('[data-lightbox-close]').forEach((node) => {
      node.addEventListener('click', closeLightbox);
    });
  };

  const openLightbox = (img) => {
    const src = img.currentSrc || img.getAttribute('src');
    if (!src) return;
    ensureLightbox();
    clearTimeout(lightboxCloseTimer);
    lightboxLastFocus = doc.activeElement;
    const alt = (img.getAttribute('alt') || '').trim();
    lightboxImg.src = src;
    lightboxImg.alt = alt;
    lightboxCaption.textContent = alt;
    lightboxEl.hidden = false;
    lightboxOpen = true;
    requestAnimationFrame(() => lightboxEl.classList.add('is-open'));
    setTimeout(() => {
      if (lightboxCloseBtn) lightboxCloseBtn.focus();
    }, 30);
  };

  const closeLightbox = () => {
    if (!lightboxEl || !lightboxOpen) return;
    lightboxOpen = false;
    lightboxEl.classList.remove('is-open');
    lightboxCloseTimer = setTimeout(() => {
      if (!lightboxOpen) {
        lightboxEl.hidden = true;
        if (lightboxImg) lightboxImg.removeAttribute('src');
        if (lightboxLastFocus && typeof lightboxLastFocus.focus === 'function') lightboxLastFocus.focus();
      }
    }, 180);
  };

  doc.querySelectorAll('.post-content img').forEach((img) => {
    if (img.closest('a')) return;
    img.addEventListener('click', () => openLightbox(img));
  });

  /* ---------------- global keyboard shortcuts ---------------- */

  doc.addEventListener('keydown', (event) => {
    if (lightboxOpen) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeLightbox();
      }
      return;
    }

    const target = event.target;
    const editable = target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    );

    if (searchOpen) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSearch();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveResult(activeResult + 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveResult(activeResult - 1);
      } else if (event.key === 'Enter') {
        const items = Array.from(searchResults.querySelectorAll('.search-result'));
        const chosen = items[activeResult >= 0 ? activeResult : 0];
        if (chosen) {
          event.preventDefault();
          navigate(chosen.href);
        }
      }
      return;
    }

    if (event.key === 'Escape') {
      if (menuToggle && menuToggle.getAttribute('aria-expanded') === 'true') closeMenu();
      return;
    }

    if (editable) return;

    if (event.key === '/' || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) {
      event.preventDefault();
      openSearch();
    }
  });

  /* ---------------- reading progress & TOC highlight ---------------- */

  const article = doc.querySelector('.post-content');
  const progress = doc.querySelector('.reading-progress');
  const percentEl = doc.querySelector('[data-reading-percent]');
  const aside = doc.querySelector('.post-aside');

  const collectTocItems = (selector) => Array.from(doc.querySelectorAll(selector)).map((link) => {
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('#')) return null;
    const id = decodeURIComponent(href.slice(1));
    const heading = doc.getElementById(id);
    return heading ? { heading, link } : null;
  }).filter(Boolean);

  const asideTocItems = collectTocItems('.post-aside .toc a');
  const mobileTocItems = collectTocItems('.post-toc-mobile-body .toc a');

  const updateReadingState = () => {
    if (article && (progress || percentEl)) {
      const top = article.getBoundingClientRect().top + window.scrollY;
      const distance = article.offsetHeight - window.innerHeight;
      let fraction = distance <= 0 ? 1 : Math.max(0, Math.min(1, (window.scrollY - top) / distance));
      if (window.scrollY + window.innerHeight >= doc.documentElement.scrollHeight - 2) {
        fraction = 1;
      }
      if (progress && !reducedMotion.matches) {
        progress.style.transform = `scaleX(${fraction})`;
      }
      if (percentEl) {
        percentEl.textContent = `${Math.round(fraction * 100)}%`;
      }
    }

    if (asideTocItems.length || mobileTocItems.length) {
      const items = asideTocItems.length ? asideTocItems : mobileTocItems;
      const atBottom = window.scrollY + window.innerHeight >= doc.documentElement.scrollHeight - 4;
      let activeIndex = 0;

      if (atBottom) {
        activeIndex = items.length - 1;
      } else {
        const threshold = 136;
        for (let i = 0; i < items.length; i += 1) {
          if (items[i].heading.getBoundingClientRect().top <= threshold) {
            activeIndex = i;
          } else {
            break;
          }
        }
      }

      const activeHeading = items[activeIndex].heading;
      [asideTocItems, mobileTocItems].forEach((group) => {
        group.forEach(({ heading, link }) => {
          link.classList.toggle('is-active', heading === activeHeading);
        });
      });

      if (aside && aside.scrollHeight > aside.clientHeight && asideTocItems[activeIndex]) {
        const activeLink = asideTocItems[activeIndex].link;
        const linkTop = activeLink.offsetTop;
        const linkBottom = linkTop + activeLink.offsetHeight;
        if (linkTop < aside.scrollTop + 24) {
          aside.scrollTop = Math.max(0, linkTop - 24);
        } else if (linkBottom > aside.scrollTop + aside.clientHeight - 24) {
          aside.scrollTop = linkBottom - aside.clientHeight + 24;
        }
      }
    }
  };

  if ((article && (progress || percentEl)) || asideTocItems.length || mobileTocItems.length) {
    let readingTicking = false;
    const scheduleReadingUpdate = () => {
      if (!readingTicking) {
        readingTicking = true;
        requestAnimationFrame(() => {
          readingTicking = false;
          updateReadingState();
        });
      }
    };
    window.addEventListener('scroll', scheduleReadingUpdate, { passive: true });
    window.addEventListener('resize', scheduleReadingUpdate, { passive: true });
    updateReadingState();
  }

  /* ---------------- friend avatars ---------------- */

  doc.querySelectorAll('[data-friend-avatar]').forEach((image) => {
    const markBroken = () => image.classList.add('is-broken');
    image.addEventListener('error', markBroken);
    if (image.complete && image.naturalWidth === 0) markBroken();
  });

  /* ---------------- page transitions ---------------- */

  doc.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target instanceof Element ? event.target.closest('a') : null;
    if (!target) return;
    if (target.target && target.target !== '_self') return;
    if (target.hasAttribute('download')) return;
    const href = target.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    let url;
    try {
      url = new URL(target.href, window.location.href);
    } catch (error) {
      return;
    }
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname && url.search === window.location.search) return;
    if (/\.(?:xml|json|txt|pdf|zip|png|jpe?g|webp|svg|gif|mp4|mp3|m4a|wav|woff2?)$/i.test(url.pathname)) return;
    event.preventDefault();
    navigate(url.href);
  });

  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    navigating = false;
    root.classList.remove('is-leaving', 'is-transitioning', 'is-entering');
    try {
      sessionStorage.removeItem('page-transition');
    } catch (error) {}
  });
})();
