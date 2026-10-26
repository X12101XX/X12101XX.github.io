(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------------- mobile menu ---------------- */

  const menu = doc.getElementById('mobile-menu');
  const menuToggle = doc.querySelector('[data-menu-toggle]');
  let menuCloseTimer;

  const openMenu = () => {
    if (!menu || !menuToggle) return;
    clearTimeout(menuCloseTimer);
    menu.hidden = false;
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Close menu');
    root.classList.add('menu-open');
    requestAnimationFrame(() => menu.classList.add('is-open'));
  };

  const closeMenu = () => {
    if (!menu || !menuToggle) return;
    menu.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open menu');
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
  if (header && !header.classList.contains('site-header--landing')) {
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

  const plainText = (html) => String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/\s+/g, ' ')
    .trim();

  const markMatch = (value, query) => {
    const safe = escapeHtml(value);
    if (!query) return safe;
    const pattern = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    return safe.replace(pattern, '<mark>$1</mark>');
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
    if (searchStatus) searchStatus.textContent = 'Opening the index…';
    try {
      const response = await fetch(overlay.dataset.index || '/search.xml', { cache: 'no-cache' });
      if (!response.ok) throw new Error('Search index unavailable');
      const text = await response.text();
      searchEntries = parseIndex(text);
      searchLoading = false;
      if (searchOpen) renderResults(searchInput ? searchInput.value.trim() : '');
    } catch (error) {
      searchLoading = false;
      if (searchStatus) searchStatus.textContent = 'The index could not be opened.';
      if (searchResults) searchResults.innerHTML = '';
    }
  };

  const itemMeta = (entry) => [entry.categories, entry.tags].filter(Boolean).join(' / ');

  const itemDate = (entry) => {
    if (!entry.date) return '';
    return entry.date.slice(0, 10).replace(/-/g, '.');
  };

  const snippetFor = (entry, query) => {
    const text = entry.plain || '';
    if (!query) return text.slice(0, 130);
    const lower = text.toLowerCase();
    const index = lower.indexOf(query.toLowerCase());
    if (index < 0) return text.slice(0, 130);
    const start = Math.max(0, index - 52);
    const end = Math.min(text.length, index + 110);
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
      matches = searchEntries.slice(0, 4);
      searchStatus.textContent = 'Recently filed';
    } else {
      const q = normalized.toLowerCase();
      matches = searchEntries.map((entry) => {
        const title = entry.title.toLowerCase();
        const meta = itemMeta(entry).toLowerCase();
        const content = entry.plain.toLowerCase();
        let score = 0;
        if (title === q) score += 30;
        if (title.includes(q)) score += 12;
        if (meta.includes(q)) score += 4;
        if (content.includes(q)) score += 1;
        return { entry, score };
      })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map((item) => item.entry);
      searchStatus.textContent = matches.length
        ? `${matches.length} ${matches.length === 1 ? 'result' : 'results'} for “${normalized}”`
        : `Nothing found for “${normalized}”`;
    }

    activeResult = -1;
    searchResults.innerHTML = '';

    if (!matches.length) {
      searchResults.innerHTML = '<li class="search-empty">Try a shorter word, or browse the journal instead.</li>';
      return;
    }

    matches.forEach((entry) => {
      const item = doc.createElement('li');
      const link = doc.createElement('a');
      const date = itemDate(entry);
      link.className = 'search-result';
      link.href = entry.url;
      link.innerHTML = `
        <span class="search-result-top">
          <span class="search-result-title">${markMatch(entry.title, normalized)}</span>
          ${date ? `<span class="search-result-date">${escapeHtml(date)}</span>` : ''}
        </span>
        ${itemMeta(entry) ? `<span class="search-result-meta">${escapeHtml(itemMeta(entry))}</span>` : ''}
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
      if (searchStatus) searchStatus.textContent = 'Type to search notes and essays.';
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

  doc.addEventListener('keydown', (event) => {
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
          window.location.href = chosen.href;
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

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(loadIndex, { timeout: 2600 });
  } else {
    setTimeout(loadIndex, 1600);
  }

  /* ---------------- code copy ---------------- */

  const languageNames = {
    bash: 'Shell',
    sh: 'Shell',
    shell: 'Shell',
    css: 'CSS',
    html: 'HTML',
    js: 'JavaScript',
    javascript: 'JavaScript',
    json: 'JSON',
    md: 'Markdown',
    markdown: 'Markdown',
    py: 'Python',
    python: 'Python',
    rs: 'Rust',
    rust: 'Rust',
    ts: 'TypeScript',
    typescript: 'TypeScript',
    xml: 'XML',
    yaml: 'YAML',
    yml: 'YAML',
    plain: 'Text'
  };

  doc.querySelectorAll('.post-content figure.highlight').forEach((figure) => {
    const code = figure.querySelector('td.code pre') || figure.querySelector('pre');
    if (!code) return;
    const languageClass = Array.from(figure.classList).find((name) => !['highlight', 'plain'].includes(name));
    const language = languageNames[languageClass] || (languageClass ? languageClass.charAt(0).toUpperCase() + languageClass.slice(1) : 'Code');
    const toolbar = doc.createElement('div');
    const label = doc.createElement('span');
    const button = doc.createElement('button');
    toolbar.className = 'code-toolbar';
    label.className = 'code-lang';
    label.textContent = language;
    button.type = 'button';
    button.className = 'code-copy';
    button.textContent = 'Copy';
    button.setAttribute('aria-label', `Copy ${language} code`);
    toolbar.append(label, button);
    figure.insertBefore(toolbar, figure.firstChild);

    button.addEventListener('click', async () => {
      const text = code.textContent.replace(/\n$/, '');
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          const area = doc.createElement('textarea');
          area.value = text;
          area.setAttribute('readonly', '');
          area.style.position = 'fixed';
          area.style.opacity = '0';
          doc.body.appendChild(area);
          area.select();
          doc.execCommand('copy');
          area.remove();
        }
        button.textContent = 'Copied';
        button.classList.add('is-copied');
        setTimeout(() => {
          button.textContent = 'Copy';
          button.classList.remove('is-copied');
        }, 1600);
      } catch (error) {
        button.textContent = 'Press ⌘C';
        setTimeout(() => { button.textContent = 'Copy'; }, 1600);
      }
    });
  });

  /* ---------------- reading progress ---------------- */

  const article = doc.querySelector('.post-content');
  const progress = doc.querySelector('.reading-progress');
  if (article && progress) {
    let ticking = false;
    const updateProgress = () => {
      const top = article.getBoundingClientRect().top + window.scrollY;
      const distance = article.offsetHeight - window.innerHeight;
      const fraction = distance <= 0 ? 1 : Math.max(0, Math.min(1, (window.scrollY - top) / distance));
      progress.style.transform = `scaleX(${fraction})`;
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (reducedMotion.matches) return;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateProgress);
      }
    }, { passive: true });
    window.addEventListener('resize', updateProgress, { passive: true });
    updateProgress();
  }

  /* ---------------- table of contents ---------------- */

  const tocLinks = Array.from(doc.querySelectorAll('.post-aside .toc a'));
  if (tocLinks.length) {
    const linkMap = new Map();
    tocLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      const id = decodeURIComponent(href.slice(1));
      const heading = doc.getElementById(id);
      if (heading) linkMap.set(heading, link);
    });

    if (linkMap.size && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          tocLinks.forEach((link) => link.classList.remove('is-active'));
          const active = linkMap.get(entry.target);
          if (active) active.classList.add('is-active');
        });
      }, { rootMargin: '-12% 0px -72% 0px', threshold: 0 });
      linkMap.forEach((link, heading) => observer.observe(heading));
    }
  }

  /* ---------------- friend avatars ---------------- */

  doc.querySelectorAll('[data-friend-avatar]').forEach((image) => {
    const markBroken = () => image.classList.add('is-broken');
    image.addEventListener('error', markBroken);
    if (image.complete && image.naturalWidth === 0) markBroken();
  });
})();
