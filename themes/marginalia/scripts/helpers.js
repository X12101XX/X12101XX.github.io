'use strict';

const NAMED_ENTITIES = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  hellip: '…',
  mdash: '—',
  ndash: '–'
};

function decodeHtmlEntities(text) {
  return String(text || '').replace(
    /&(nbsp|amp|lt|gt|quot|apos|hellip|mdash|ndash|#\d+|#x[0-9a-f]+);/gi,
    (full, token) => {
      const lower = token.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, lower)) {
        return NAMED_ENTITIES[lower];
      }
      const code = lower.startsWith('#x')
        ? parseInt(lower.slice(2), 16)
        : Number(lower.slice(1));
      if (Number.isInteger(code) && code >= 0 && code <= 0x10ffff) {
        return String.fromCodePoint(code);
      }
      return full;
    }
  );
}

function stripHtml(html) {
  const withoutBlocks = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<span class="katex-mathml">[\s\S]*?<\/span>/gi, ' ')
    .replace(/<div class="callout-head">[\s\S]*?<\/div>/gi, ' ')
    .replace(/<section class="footnotes">[\s\S]*?<\/section>/gi, ' ')
    .replace(/<td class="gutter">[\s\S]*?<\/td>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');

  return decodeHtmlEntities(withoutBlocks)
    .replace(/\s+/g, ' ')
    .trim();
}

function countTokens(content) {
  const text = stripHtml(content);
  const chinese = (text.match(/[\u3400-\u9fff]/g) || []).length;
  const latin = text.replace(/[\u3400-\u9fff]/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return { chinese, latin, total: chinese + latin };
}

hexo.extend.helper.register('reading_time', function (content) {
  const { chinese, latin } = countTokens(content);
  const minutes = Math.ceil(chinese / 420 + latin / 220);
  return Math.max(1, minutes);
});

hexo.extend.helper.register('word_count', function (content) {
  const { total } = countTokens(content);
  if (total >= 1000) {
    return `${(total / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(total);
});

hexo.extend.helper.register('valid_posts', function (posts) {
  if (!posts) return [];
  let list;
  if (Array.isArray(posts)) {
    list = posts;
  } else if (typeof posts.toArray === 'function') {
    list = posts.toArray();
  } else if (Array.isArray(posts.data)) {
    list = posts.data;
  } else {
    return [];
  }

  return list.filter((post) => {
    if (!post || post.published === false) return false;
    const hasTitle = Boolean(post.title && String(post.title).trim());
    if (!hasTitle) return false;
    return true;
  });
});

hexo.extend.helper.register('post_excerpt', function (post, length) {
  const max = length || 170;
  const text = stripHtml(post.excerpt || post.content || '');
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  return `${chars.slice(0, max).join('').replace(/[，、；：\s]+$/, '')}…`;
});

hexo.extend.helper.register('is_active_nav', function (target, currentPath) {
  if (!currentPath) return false;
  const current = `/${String(currentPath).replace(/^\/+/, '').replace(/index\.html$/, '')}`;
  const normalized = target.endsWith('/') ? target : `${target}/`;
  if (normalized === '/') return current === '/';
  const safeCurrent = current.endsWith('/') ? current : `${current}/`;
  return safeCurrent === normalized || safeCurrent.startsWith(normalized);
});

hexo.extend.helper.register('domain_of', function (value) {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch (error) {
    return String(value || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  }
});

hexo.extend.helper.register('initials', function (value) {
  const name = String(value || '').trim();
  if (!name) return '·';
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return `${Array.from(words[0])[0] || ''}${Array.from(words[1])[0] || ''}`.toUpperCase();
  }
  return Array.from(name).slice(0, 2).join('').toUpperCase();
});
