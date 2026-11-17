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

const ASSET_IMAGE_RE = /\.(?:png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i;
const ASSET_DIR_RE = /^(?:.*\.assets|assets)$/i;

/**
 * Recursively collect image files inside `*.assets/` or `assets/` folders under `source/_posts/`.
 */
function collectPostAssets(baseDir, currentDir, inAssetDir, results) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      const nextInAssetDir = inAssetDir || ASSET_DIR_RE.test(entry.name);
      collectPostAssets(baseDir, fullPath, nextInAssetDir, results);
    } else if (entry.isFile() && inAssetDir && ASSET_IMAGE_RE.test(entry.name)) {
      const relPath = path.relative(baseDir, fullPath).split(path.sep).join('/');
      results.push({
        path: `images/posts/${relPath}`,
        data: () => fs.createReadStream(fullPath)
      });
    }
  }
}

// Publish Typora post-local `.assets/` and `assets/` images under `/images/posts/...`.
hexo.extend.generator.register('typora-post-assets', function () {
  const postsDir = path.join(hexo.source_dir, '_posts');
  if (!fs.existsSync(postsDir)) return [];
  const results = [];
  collectPostAssets(postsDir, postsDir, false, results);
  return results;
});

const pendingFootnotes = new WeakMap();

const FENCE_OPEN_RE = /^([ \t]*(?:>[ \t]*)*)(`{3,}|~{3,})(.*)$/;
const DISPLAY_MATH_LINE_RE = /^((?:[ \t]*>)*[ \t]*)\$\$[ \t]*$/;
const FOOTNOTE_DEF_START_RE = /^\[\^([^\]]+)\]:[ \t]*(.*)$/;
const INLINE_MATH_SINGLE_RE = /^\$(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n$]))\$/;
const INLINE_MATH_DOUBLE_RE = /^\$\$(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n$]))\$\$/;
const HIGHLIGHT_RE = /(?<!=)==((?:[^=\n]|(?<!=)=(?!=))+)==(?!=)/g;
const FOOTNOTE_REF_RE = /\[\^([^\]]+)\]/g;

function parseFenceOpen(line, maxIndent = Infinity) {
  const match = line.match(FENCE_OPEN_RE);
  if (!match) return null;
  const prefix = match[1];
  if (maxIndent < Infinity && !prefix.includes('>')) {
    const leadingSpaces = prefix.replace(/\t/g, '    ').length;
    if (leadingSpaces > maxIndent) return null;
  }
  const marker = match[2];
  const char = marker[0];
  const info = match[3];
  if (char === '`' && info.includes('`')) return null;
  return { char, len: marker.length };
}

function isFenceClose(line, fence) {
  const stripped = line.replace(/^[ \t]*(?:>[ \t]*)*/, '');
  const closeMatch = stripped.match(/^(`{3,}|~{3,})[ \t]*$/);
  return Boolean(closeMatch && closeMatch[1][0] === fence.char && closeMatch[1].length >= fence.len);
}

function countQuotes(prefix) {
  let count = 0;
  for (let i = 0; i < prefix.length; i += 1) {
    if (prefix[i] === '>') count += 1;
  }
  return count;
}

function extractQuoteMarker(prefix) {
  const lastGt = prefix.lastIndexOf('>');
  return lastGt >= 0 ? prefix.slice(0, lastGt + 1) : '';
}

function isBlankLineForQuote(line, quoteDepth) {
  if (/^[ \t]*$/.test(line)) return true;
  if (quoteDepth <= 0) return false;
  const re = new RegExp(`^(?:[ \\t]*>){${quoteDepth}}[ \\t]*$`);
  return re.test(line);
}

function isEscapedAt(str, index) {
  let slashes = 0;
  for (let i = index - 1; i >= 0 && str[i] === '\\'; i -= 1) {
    slashes += 1;
  }
  return slashes % 2 === 1;
}

/**
 * Advance inline backtick-code state across one line so multi-line inline code
 * spans are respected during line-oriented pre-processing.
 */
function advanceInlineBackticks(line, activeCount) {
  let count = activeCount;
  if (/^[ \t]*$/.test(line)) return 0;
  for (let i = 0; i < line.length; i += 1) {
    if (line[i] !== '`') continue;
    if (count === 0 && isEscapedAt(line, i)) continue;
    let run = 1;
    while (line[i + run] === '`') run += 1;
    if (count === 0) {
      count = run;
    } else if (run === count) {
      count = 0;
    }
    i += run - 1;
  }
  return count;
}

/**
 * Find the closing index of an inline code span starting at `start` with `btLen` backticks.
 * Returns the index of the closing backtick run, or -1 if unclosed before a blank line/EOF.
 */
function findInlineCodeClose(str, start, btLen) {
  const len = str.length;
  for (let i = start; i < len; i += 1) {
    if (str[i] === '\n') {
      const rest = str.slice(i + 1);
      if (/^[ \t]*\n/.test(rest)) return -1;
    } else if (str[i] === '`') {
      let run = 1;
      while (str[i + run] === '`') run += 1;
      if (run === btLen) return i;
      i += run - 1;
    }
  }
  return -1;
}

/**
 * Find the end offset (exclusive) of a block-level `$$ ... $$` math span starting at `pos`.
 */
function findBlockMathEnd(str, pos) {
  if (!str.startsWith('$$\n', pos)) return -1;
  const lineStart = str.lastIndexOf('\n', pos - 1) + 1;
  const before = str.slice(lineStart, pos);
  if (!/^(?:[ \t]*>)*[ \t]*$/.test(before)) return -1;
  const quoteDepth = countQuotes(before);

  let cursor = pos + 3;
  while (cursor <= str.length) {
    const nextNl = str.indexOf('\n', cursor);
    const lineEnd = nextNl === -1 ? str.length : nextNl;
    const line = str.slice(cursor, lineEnd);
    const closeMatch = line.match(DISPLAY_MATH_LINE_RE);
    if (closeMatch && countQuotes(closeMatch[1]) === quoteDepth) {
      return lineEnd;
    }
    if (quoteDepth > 0 && /^[ \t]*$/.test(line)) return -1;
    if (nextNl === -1) break;
    cursor = nextNl + 1;
  }
  return -1;
}

/**
 * Create a collision-free placeholder factory and replace fenced code blocks,
 * HTML comments, raw `<pre>`/`<code>`, inline code spans, and optionally math spans.
 */
function maskProtectedSpans(text, { maskMath = true } = {}) {
  let prefix = '\uE000TYPORA';
  while (text.includes(prefix)) prefix += '_';
  const suffix = '\uE001';
  const stored = [];
  const stash = (value) => {
    const id = stored.push(value) - 1;
    return `${prefix}_${id}${suffix}`;
  };

  // First separate fenced code blocks at line granularity.
  const lines = text.split('\n');
  const segments = [];
  let textLines = [];
  let fenceLines = [];
  let fence = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!fence) {
      const opened = parseFenceOpen(line);
      if (opened) {
        if (textLines.length) {
          segments.push({ type: 'text', value: textLines.join('\n') });
          textLines = [];
        }
        fence = opened;
        fenceLines = [line];
      } else {
        textLines.push(line);
      }
    } else {
      fenceLines.push(line);
      if (isFenceClose(line, fence)) {
        segments.push({ type: 'fence', value: fenceLines.join('\n') });
        fence = null;
        fenceLines = [];
      }
    }
  }
  if (fenceLines.length) segments.push({ type: 'fence', value: fenceLines.join('\n') });
  if (textLines.length) segments.push({ type: 'text', value: textLines.join('\n') });

  const maskInline = (segment) => {
    let out = '';
    let i = 0;
    while (i < segment.length) {
      const ch = segment[i];

      // Preserve backslash-escaped characters verbatim so \$ or \` don't trigger spans.
      if (ch === '\\' && i + 1 < segment.length) {
        out += segment.slice(i, i + 2);
        i += 2;
        continue;
      }

      // Preserve HTML comments, <pre>, <code>, and Hexo escaped code blocks.
      if (ch === '<') {
        const rest = segment.slice(i);
        const tagMatch = rest.match(/^(?:<!--[\s\S]*?-->|<hexoPostRenderCodeBlock>[\s\S]*?<\/hexoPostRenderCodeBlock>|<pre\b[^>]*>[\s\S]*?<\/pre>|<code\b[^>]*>[\s\S]*?<\/code>)/i);
        if (tagMatch) {
          out += stash(tagMatch[0]);
          i += tagMatch[0].length;
          continue;
        }
      }

      // Inline code spans (CommonMark backtick rules).
      if (ch === '`') {
        let btLen = 1;
        while (segment[i + btLen] === '`') btLen += 1;
        const closeIdx = findInlineCodeClose(segment, i + btLen, btLen);
        if (closeIdx !== -1) {
          out += stash(segment.slice(i, closeIdx + btLen));
          i = closeIdx + btLen;
          continue;
        }
        out += segment.slice(i, i + btLen);
        i += btLen;
        continue;
      }

      // Math spans ($$...$$ block/inline and $...$ inline).
      if (maskMath && ch === '$') {
        if (segment[i + 1] === '$' && segment[i + 2] !== '$') {
          const blockEnd = findBlockMathEnd(segment, i);
          if (blockEnd !== -1) {
            out += stash(segment.slice(i, blockEnd));
            i = blockEnd;
            continue;
          }
          const dblMatch = segment.slice(i).match(INLINE_MATH_DOUBLE_RE);
          if (dblMatch) {
            out += stash(dblMatch[0]);
            i += dblMatch[0].length;
            continue;
          }
        } else if (segment[i + 1] !== '$') {
          const singleMatch = segment.slice(i).match(INLINE_MATH_SINGLE_RE);
          if (singleMatch) {
            out += stash(singleMatch[0]);
            i += singleMatch[0].length;
            continue;
          }
        }
      }

      out += ch;
      i += 1;
    }
    return out;
  };

  const masked = segments
    .map(seg => (seg.type === 'fence' ? stash(seg.value) : maskInline(seg.value)))
    .join('\n');

  const placeholderRe = new RegExp(`${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_(\\d+)${suffix}`, 'g');
  return {
    masked,
    restore(value) {
      return value.replace(placeholderRe, (_, idx) => stored[Number(idx)]);
    }
  };
}

/**
 * Ensure multi-line `$$ ... $$` display math blocks have blank lines before and after
 * (or blank `>` lines inside blockquotes), outside fenced code blocks and inline code.
 */
function normalizeDisplayMath(text) {
  const lines = text.split('\n');
  const out = [];
  let fence = null;
  let inlineBackticks = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (fence) {
      out.push(line);
      if (isFenceClose(line, fence)) fence = null;
      continue;
    }

    if (inlineBackticks === 0) {
      const opened = parseFenceOpen(line, 3);
      if (opened) {
        fence = opened;
        out.push(line);
        continue;
      }

      const openMatch = line.match(DISPLAY_MATH_LINE_RE);
      if (openMatch) {
        const openPrefix = openMatch[1];
        const quoteDepth = countQuotes(openPrefix);
        const quoteMarker = extractQuoteMarker(openPrefix);

        // Search forward for the matching closing `$$` line at the same quote depth.
        let closeIdx = -1;
        for (let j = i + 1; j < lines.length; j += 1) {
          const candidate = lines[j];
          if (parseFenceOpen(candidate)) break;
          if (quoteDepth > 0 && /^[ \t]*$/.test(candidate)) break;
          const closeMatch = candidate.match(DISPLAY_MATH_LINE_RE);
          if (closeMatch && countQuotes(closeMatch[1]) === quoteDepth) {
            closeIdx = j;
            break;
          }
        }

        if (closeIdx !== -1) {
          const closePrefix = lines[closeIdx].match(DISPLAY_MATH_LINE_RE)[1];

          // Insert separating blank line before opening `$$` if needed.
          if (out.length > 0 && !isBlankLineForQuote(out[out.length - 1], quoteDepth)) {
            out.push(quoteDepth > 0 ? quoteMarker : '');
          }

          out.push(`${openPrefix}$$`);
          for (let k = i + 1; k < closeIdx; k += 1) {
            out.push(lines[k]);
          }
          out.push(`${closePrefix}$$`);

          // Insert separating blank line after closing `$$` if needed.
          if (closeIdx + 1 < lines.length) {
            const nextLine = lines[closeIdx + 1];
            if (quoteDepth > 0) {
              const nextQuoteMatch = nextLine.match(/^((?:[ \t]*>)*)/);
              const nextQuotes = nextQuoteMatch ? countQuotes(nextQuoteMatch[1]) : 0;
              if (nextQuotes >= quoteDepth && !isBlankLineForQuote(nextLine, quoteDepth)) {
                out.push(quoteMarker);
              } else if (nextQuotes < quoteDepth && !/^[ \t]*$/.test(nextLine)) {
                out.push('');
              }
            } else if (!/^[ \t]*$/.test(nextLine)) {
              out.push('');
            }
          }

          i = closeIdx;
          continue;
        }
      }
    }

    inlineBackticks = advanceInlineBackticks(line, inlineBackticks);
    out.push(line);
  }

  return out.join('\n');
}

/**
 * Extract `[^id]: ...` footnote definitions (with indented or lazy continuation lines)
 * outside fenced code blocks and inline code, returning remaining markdown and definition map.
 */
function extractFootnoteDefinitions(text) {
  const lines = text.split('\n');
  const bodyLines = [];
  const defs = new Map();
  let fence = null;
  let inlineBackticks = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (fence) {
      bodyLines.push(line);
      if (isFenceClose(line, fence)) fence = null;
      continue;
    }

    if (inlineBackticks === 0) {
      const opened = parseFenceOpen(line, 3);
      if (opened) {
        fence = opened;
        bodyLines.push(line);
        continue;
      }

      const defMatch = line.match(FOOTNOTE_DEF_START_RE);
      if (defMatch) {
        const id = defMatch[1].trim();
        const firstText = defMatch[2];
        const hasNextIndented = i + 1 < lines.length && /^(?: {2,}|\t)/.test(lines[i + 1]) && !/^ {0,3}\[\^([^\]]+)\]:/.test(lines[i + 1]);

        if (id && (firstText.trim().length > 0 || hasNextIndented)) {
          const fnLines = [];
          if (firstText.trim().length > 0) fnLines.push(firstText);

          let j = i + 1;
          let innerFence = null;
          while (j < lines.length) {
            const nextLine = lines[j];

            if (innerFence) {
              const unindented = nextLine.replace(/^(?: {1,4}|\t)/, '');
              fnLines.push(unindented);
              if (isFenceClose(unindented, innerFence)) innerFence = null;
              j += 1;
              continue;
            }

            if (/^[ \t]*$/.test(nextLine)) {
              // Blank line continues footnote only if followed by an indented non-definition line.
              let k = j + 1;
              while (k < lines.length && /^[ \t]*$/.test(lines[k])) k += 1;
              if (k < lines.length && /^(?: {2,}|\t)/.test(lines[k]) && !/^ {0,3}\[\^([^\]]+)\]:/.test(lines[k])) {
                while (j < k) {
                  fnLines.push('');
                  j += 1;
                }
                continue;
              }
              break;
            }

            if (/^ {0,3}\[\^([^\]]+)\]:/.test(nextLine)) break;

            if (/^(?: {2,}|\t)/.test(nextLine)) {
              const unindented = nextLine.replace(/^(?: {1,4}|\t)/, '');
              const openedInner = parseFenceOpen(unindented);
              if (openedInner) innerFence = openedInner;
              fnLines.push(unindented);
              j += 1;
              continue;
            }

            // Lazy paragraph continuation (stop on block starters).
            if (/^[ \t]*(?:#{1,6}[ \t]|>|`{3,}|~{3,}|\$\$|[-+*][ \t]|\d+\.[ \t]|(?:[-*_][ \t]*){3,}$)/.test(nextLine)) {
              break;
            }
            if (fnLines.length === 0) break;
            fnLines.push(nextLine);
            j += 1;
          }

          if (!defs.has(id)) {
            defs.set(id, fnLines.join('\n').trim());
          }
          i = j - 1;
          continue;
        }
      }
    }

    inlineBackticks = advanceInlineBackticks(line, inlineBackticks);
    bodyLines.push(line);
  }

  return { text: bodyLines.join('\n'), defs };
}

function sanitizeFootnoteId(id, usedSafeIds, idToSafe) {
  if (idToSafe.has(id)) return idToSafe.get(id);
  const base = String(id).trim().replace(/\s+/g, '-').replace(/[^\w\u3400-\u9fff.-]/g, '-') || 'note';
  let candidate = base;
  let suffix = 2;
  while (usedSafeIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  usedSafeIds.add(candidate);
  idToSafe.set(id, candidate);
  return candidate;
}

/**
 * Replace `[^id]` footnote references outside protected code and math spans,
 * including transitive references inside footnote bodies.
 */
function processFootnotes(text, defs) {
  if (!defs.size) return { text, ordered: [] };

  const ordered = [];
  const entries = new Map();
  const usedSafeIds = new Set();
  const idToSafe = new Map();

  const registerRef = (id) => {
    if (!defs.has(id)) return null;
    let entry = entries.get(id);
    if (!entry) {
      entry = {
        id,
        safeId: sanitizeFootnoteId(id, usedSafeIds, idToSafe),
        num: ordered.length + 1,
        rawText: defs.get(id),
        count: 0
      };
      entries.set(id, entry);
      ordered.push(entry);
    }
    entry.count += 1;
    const refId = entry.count === 1 ? `fnref-${entry.safeId}` : `fnref-${entry.safeId}-${entry.count}`;
    return `<sup class="footnote-ref"><a href="#fn-${entry.safeId}" id="${refId}">${entry.num}</a></sup>`;
  };

  const replaceInString = (input) => {
    const { masked, restore } = maskProtectedSpans(input, { maskMath: true });
    const replaced = masked.replace(FOOTNOTE_REF_RE, (full, rawId, offset, src) => {
      if (isEscapedAt(src, offset)) return full;
      const html = registerRef(rawId.trim());
      return html || full;
    });
    return restore(replaced);
  };

  const processedText = replaceInString(text);
  for (let i = 0; i < ordered.length; i += 1) {
    ordered[i].rawText = replaceInString(ordered[i].rawText);
  }
  return { text: processedText, ordered };
}

/**
 * Convert `==text==` Typora highlights to `<mark>text</mark>` outside code and math.
 */
function replaceHighlights(text) {
  const { masked, restore } = maskProtectedSpans(text, { maskMath: true });
  const replaced = masked.replace(HIGHLIGHT_RE, (full, inner, offset, src) => {
    if (isEscapedAt(src, offset)) return full;
    return `<mark>${inner}</mark>`;
  });
  return restore(replaced);
}

function normalizeTitleComparison(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

// Run at priority 5 (before Hexo's built-in backtick_code_block filter at 10) so raw fences are intact.
hexo.extend.filter.register('before_post_render', function (data) {
  if (!data || typeof data.content !== 'string') return;

  let content = data.content.replace(/\r\n?/g, '\n');

  if (!data._isFootnote) {
    const hasTitle = Boolean(data.title && String(data.title).trim());

    if (data.source && !hasTitle && !content.trim()) {
      data.published = false;
      data.content = '';
      return;
    }

    const leadingH1Match = content.match(/^(?:[ \t]*\n)*#[ \t]+([^\n]+?)(?:[ \t]+#+)?[ \t]*(?:\n+|$)/);
    if (data.source && !hasTitle) {
      if (leadingH1Match) {
        data.title = leadingH1Match[1].trim();
        content = content.slice(leadingH1Match[0].length);
      } else {
        const rawSlug = data.slug || path.posix.basename(
          String(data.source).replace(/\\/g, '/'),
          path.posix.extname(String(data.source))
        );
        const derivedTitle = path.posix.basename(String(rawSlug).replace(/\\/g, '/'), '.md').trim();
        if (derivedTitle) data.title = derivedTitle;
      }
    } else if (hasTitle && leadingH1Match) {
      if (normalizeTitleComparison(leadingH1Match[1]) === normalizeTitleComparison(data.title)) {
        content = content.slice(leadingH1Match[0].length);
      }
    }
  }

  content = normalizeDisplayMath(content);

  if (!data._isFootnote) {
    const extracted = extractFootnoteDefinitions(content);
    const footnoted = processFootnotes(extracted.text, extracted.defs);
    content = footnoted.text;
    if (footnoted.ordered.length > 0) {
      pendingFootnotes.set(data, footnoted.ordered);
    }
  }

  content = replaceHighlights(content);
  data.content = content;
}, 5);

const CALLOUT_HEAD_RE = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:[ \t]+([\s\S]*))?$/i;

function renderCalloutOrBlockquote(openTag, innerHtml) {
  const trimmed = innerHtml.trim();
  const pMatch = trimmed.match(/^<p>([\s\S]*?)<\/p>([\s\S]*)$/);
  if (!pMatch) return `${openTag}${innerHtml}</blockquote>`;

  const firstP = pMatch[1];
  const rest = pMatch[2];
  const breakMatch = firstP.match(/<br\s*\/?>|\r?\n/i);
  const firstLine = breakMatch ? firstP.slice(0, breakMatch.index) : firstP;
  const remainingFirstP = breakMatch ? firstP.slice(breakMatch.index + breakMatch[0].length) : '';

  const headMatch = firstLine.match(CALLOUT_HEAD_RE);
  if (!headMatch) return `${openTag}${innerHtml}</blockquote>`;

  const typeLower = headMatch[1].toLowerCase();
  const typeUpper = headMatch[1].toUpperCase();
  const titleHtml = (headMatch[2] || '').trim() || typeUpper;
  const firstBody = remainingFirstP.trim();
  const restTrimmed = rest.trim();

  const bodyParts = [];
  if (firstBody) bodyParts.push(`<p>${firstBody}</p>`);
  if (restTrimmed) bodyParts.push(restTrimmed);

  return `<aside class="callout callout--${typeLower}"><div class="callout-head"><span class="callout-badge">${typeUpper}</span><span class="callout-title">${titleHtml}</span></div><div class="callout-body">${bodyParts.join('\n')}</div></aside>`;
}

/**
 * Transform balanced `<blockquote>` callouts outside `<pre>` and `<code>` blocks.
 */
function transformCallouts(html) {
  const tokenRe = /<pre\b[^>]*>[\s\S]*?<\/pre>|<code\b[^>]*>[\s\S]*?<\/code>|<blockquote\b[^>]*>|<\/blockquote>/gi;
  const stack = [{ openTag: '', chunks: [] }];
  let lastIndex = 0;
  let match;

  while ((match = tokenRe.exec(html)) !== null) {
    const token = match[0];
    const current = stack[stack.length - 1];
    current.chunks.push(html.slice(lastIndex, match.index));
    lastIndex = match.index + token.length;

    if (/^<blockquote\b/i.test(token)) {
      stack.push({ openTag: token, chunks: [] });
    } else if (/^<\/blockquote>/i.test(token)) {
      if (stack.length > 1) {
        const frame = stack.pop();
        stack[stack.length - 1].chunks.push(renderCalloutOrBlockquote(frame.openTag, frame.chunks.join('')));
      } else {
        current.chunks.push(token);
      }
    } else {
      current.chunks.push(token);
    }
  }

  stack[stack.length - 1].chunks.push(html.slice(lastIndex));
  while (stack.length > 1) {
    const frame = stack.pop();
    stack[stack.length - 1].chunks.push(frame.openTag + frame.chunks.join(''));
  }
  return stack[0].chunks.join('');
}

function rewriteImageSrc(rawSrc, postSource) {
  if (!rawSrc || /^(?:#|data:|blob:|https?:\/\/|\/\/)/i.test(rawSrc)) return rawSrc;
  if (/^\/images\//i.test(rawSrc)) return rawSrc;

  const qIndex = rawSrc.search(/[?#]/);
  const srcPath = qIndex >= 0 ? rawSrc.slice(0, qIndex) : rawSrc;
  const suffix = qIndex >= 0 ? rawSrc.slice(qIndex) : '';

  const clean = srcPath.replace(/\\/g, '/');
  // Strip leading `/` added by hexo-renderer-marked's url_for() on relative paths.
  const rel = clean.replace(/^\/+/, '').replace(/^(?:\.\/)+/, '');

  const imagesMatch = rel.match(/^(?:\.\.\/)*images\/(.+)$/);
  if (imagesMatch) {
    return `/images/${imagesMatch[1]}${suffix}`;
  }

  let postSubdir = '';
  if (postSource) {
    const normSource = String(postSource).replace(/\\/g, '/');
    if (normSource.startsWith('_posts/')) {
      const dir = path.posix.dirname(normSource.slice('_posts/'.length));
      postSubdir = dir === '.' ? '' : dir;
    }
  }

  const candidate = postSubdir ? path.posix.normalize(`${postSubdir}/${rel}`) : path.posix.normalize(rel);
  if (!candidate.startsWith('../') && /(?:^|\/)(?:[^/]+\.assets|assets)\/.+$/.test(candidate)) {
    return `/images/posts/${candidate}${suffix}`;
  }

  return rawSrc;
}

/**
 * Transform `[TOC]` and relative Typora image paths outside `<figure class="highlight">`, `<pre>`, `<code>`.
 */
function transformHtmlOutsideCode(html, postSource) {
  let prefix = '\uE000HTMLCODE';
  while (html.includes(prefix)) prefix += '_';
  const suffix = '\uE001';
  const stored = [];

  let masked = html.replace(
    /<figure\b[^>]*class=["'][^"']*\bhighlight\b[^"']*["'][^>]*>[\s\S]*?<\/figure>|<pre\b[^>]*>[\s\S]*?<\/pre>|<code\b[^>]*>[\s\S]*?<\/code>/gi,
    (block) => {
      const idx = stored.push(block) - 1;
      return `${prefix}_${idx}${suffix}`;
    }
  );

  masked = masked.replace(
    /<p>\s*\[toc\]\s*<\/p>/gi,
    '<nav class="inline-toc" data-inline-toc aria-label="Table of contents"></nav>'
  );

  masked = masked.replace(
    /<img\b([^>]*?)\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')([^>]*)>/gi,
    (full, before, dqSrc, sqSrc, after) => {
      const rawSrc = dqSrc !== undefined ? dqSrc : sqSrc;
      const quote = dqSrc !== undefined ? '"' : "'";
      const rewritten = rewriteImageSrc(rawSrc, postSource);
      if (rewritten === rawSrc) return full;
      return `<img${before}src=${quote}${rewritten}${quote}${after}>`;
    }
  );

  const restoreRe = new RegExp(`${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_(\\d+)${suffix}`, 'g');
  return masked.replace(restoreRe, (_, idx) => stored[Number(idx)]);
}

function formatFootnoteListItem(renderedHtml, safeId) {
  const backref = `<a href="#fnref-${safeId}" class="footnote-backref" aria-label="Back to content">↩</a>`;
  const trimmed = renderedHtml.trim();
  const singlePMatch = trimmed.match(/^<p>([\s\S]*)<\/p>$/);
  let body;
  if (singlePMatch && !/<\/p>/i.test(singlePMatch[1])) {
    body = `${singlePMatch[1]} ${backref}`;
  } else if (/<\/p>$/i.test(trimmed)) {
    body = trimmed.replace(/<\/p>$/i, ` ${backref}</p>`);
  } else {
    body = `${trimmed} ${backref}`;
  }
  return `<li id="fn-${safeId}">${body}</li>`;
}

// Run at priority 5 (before external_link and excerpt at priority 10) so callouts/images apply inside excerpts too.
hexo.extend.filter.register('after_post_render', async function (data) {
  if (!data || typeof data.content !== 'string') return;

  const assetSource = data.source || data._assetSource || '';
  if (pendingFootnotes.has(data)) {
    const footnotes = pendingFootnotes.get(data);
    pendingFootnotes.delete(data);
    const items = [];
    for (const fn of footnotes) {
      // Render sequentially so marked's global defaults in hexo-renderer-marked do not collide.
      const rendered = await this.post.render(null, {
        content: fn.rawText,
        engine: 'markdown',
        _isFootnote: true,
        _assetSource: assetSource
      });
      items.push(formatFootnoteListItem(rendered.content, fn.safeId));
    }
    data.content += `\n<section class="footnotes"><hr><ol class="footnotes-list">\n${items.join('\n')}\n</ol></section>`;
  }

  let html = transformCallouts(data.content);
  html = transformHtmlOutsideCode(html, assetSource);
  data.content = html;
}, 5);
