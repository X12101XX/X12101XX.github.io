'use strict';

function stripHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39|hellip|mdash|ndash);/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

hexo.extend.helper.register('reading_time', function (content) {
  const text = stripHtml(content);
  const chinese = (text.match(/[\u3400-\u9fff]/g) || []).length;
  const latin = text.replace(/[\u3400-\u9fff]/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil(chinese / 420 + latin / 220);
  return Math.max(1, minutes);
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
