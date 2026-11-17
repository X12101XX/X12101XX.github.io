# Marginalia — Swiss International Style Theme

Custom Hexo theme crafted in **Swiss International Typographic Style** (Josef Müller-Brockmann / Neue Grafik inspired): exposed 12-column structural grid, zero border-radius, high-contrast Gallery Paper (`#F4F1EA`) default with a toggleable Darkroom (`#0E0E0D`) theme, Vermilion signal accents (`#E02B20` / `#FF3B30`), and large-scale typography.

## Layout & Aesthetics

- **Default Light Mode (Gallery Paper)**: `#F4F1EA` background, `#111111` ink, `#E02B20` Vermilion signal, crisp `1px` / `2px` architectural grid rules.
- **Toggleable Dark Mode (Darkroom Film)**: `#0E0E0D` background, `#F2EFE9` ink, `#FF3B30` signal (`localStorage['marginalia-theme']` `'light'` / `'dark'`).
- **Typographic Scale**: `19px` global base font size, `20px` article body prose, `clamp(48px, 6.8vw, 92px)` landing display headline, `clamp(36px, 4.8vw, 60px)` article titles, `15.5px` monospace code blocks, `1.12em` KaTeX equations.
- **Zero-Radius Discipline**: Strict `border-radius: 0` across every container, pill, badge, button, code frame, modal, and avatar.

## Templates & Modular CSS

| File | Responsibility |
| --- | --- |
| `themes/marginalia/layout/_partial/base.pug` | Page shell, 12-column grid guide overlay, skip link, footer, script entrypoint |
| `themes/marginalia/layout/landing.pug` | Exhibition hero with Müller-Brockmann SVG poster, featured issue spread, recent index rows, 6-column directory |
| `themes/marginalia/layout/index.pug` | Numbered article index with category/tag filter strips and pagination |
| `themes/marginalia/layout/post.pug` | 4-cell spec grid header, 12-column article + sticky right outline, callouts, footnotes, lightbox |
| `themes/marginalia/layout/archive.pug` | Year-grouped chronological archive rows |
| `themes/marginalia/layout/categories.pug` | 2-column exposed cell category matrix |
| `themes/marginalia/layout/tags.pug` | Architectural bordered tag pills with padded counts |
| `themes/marginalia/layout/friends.pug` | 2-column independent blogroll matrix and site specification card |
| `themes/marginalia/layout/about.pug` | 12-column biography layout and editorial colophon |
| `themes/marginalia/source/css/base.css` | Design tokens, fonts, Swiss grid guide, masthead, buttons, footer |
| `themes/marginalia/source/css/landing.css` | Home exhibition layout and 404 spread |
| `themes/marginalia/source/css/article.css` | Post index rows, spec grid, editorial typography, KaTeX, code frames, highlight tokens, lightbox |
| `themes/marginalia/source/css/pages.css` | Archives, categories, tags, friends, about |
| `themes/marginalia/source/css/search.css` | Full-site search overlay dialog |
| `themes/marginalia/source/css/responsive.css` | Breakpoints at `1100px`, `960px`, `820px`, `640px`, `380px` |

## Companion Typora Theme

`typora/marginalia.css` mirrors the website's Gallery Paper `#F4F1EA` surface, `20px` reading typography, numbered `#write h2::before` Swiss section counters, crisp `15.5px` CodeMirror blocks, GFM callouts (`.md-alert` / `.md-Alert`), tables, and KaTeX styling.

Install directly into `~/.config/Typora/themes` via:

```bash
npm run typora:theme
```
