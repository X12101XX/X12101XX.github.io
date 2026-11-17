# Marginalia

`themes/marginalia` 是为这个网站写的原创 Hexo 主题，不是上游主题的 fork。名字取意于书页边缘的批注，视觉上融合了 **Linear / Vercel 风格现代深色极简质感**（深邃炭黑层次 `#09090b`、微光渐变边框、毛玻璃导航与浮层、精致圆角卡片、柔和阴影）与原有八列网格及点阵字标基因。配套的 Typora 编辑器主题 [`typora/marginalia.css`](typora/marginalia.css) 延续相同的深色质感与排版规则，实现写作环境与线上阅读的一致体验。

设计变量以深邃夜幕黑底（`#09090b`）、多级炭黑表面（`#12131a` / `#181a24`）、环境顶部聚光渐变与紫色信号（`#b15cff`）为核心；Archivo 承担标题与正文，Doto 只用于字标和数字，IBM Plex Mono 承担标签与代码。标题与正文使用句子式大小写，只有字标使用大写。

## 页面的样子

- **入口 `/`**：顶部毛玻璃胶囊导航 + 聚光灯背景；点阵字标、放大的渐变标题、毛玻璃右栏（可交互 5×5 点阵字形 + 统计面板）、浮层风格 `Latest note` 横幅（含分类与阅读时长）、`Recent notes` 三列 Bento 摘要卡片与六格圆角入口（Notes / Archive / Categories / Tags / Friends / About）。
- **文章 `/posts/`**：顶部分类与标签筛选栏（`.journal-taxonomies`），下方按时间排列的圆角卡片索引；点阵编号、日期、标题、摘要、字数/阅读时长统计与圆角标签。
- **文章 `/posts/:title/`**：点阵章节编号的阅读版式；Archivo 渐变标题、字数与阅读时长 kicker、单栏正文、桌面端右侧毛玻璃粘性目录（带实时阅读百分比与 `Top ↑` 返回链接）、移动端/平板端可折叠目录、文内 `[TOC]` 自动目录、标题悬停复制锚点、Typora 语义配色 Callout / 高亮 / 脚注 / 任务列表、圆角横向可滚动表格包装、图片说明与毛玻璃灯箱、IDE 风格等宽代码块（含语言标签与行数统计）与圆角上下篇卡片。
- **归档 / 分类 / 标签**：渐变大号点阵年份搭配篇数胶囊与主分类标签、圆角分类卡（全站索引卡采用紫靛微光渐变高亮）与圆角标签胶囊。
- **友链 `/friends/`**：圆角头像、微光名片与交换友链的说明。
- **关于 `/about/`**：头像、站点说明与规格卡片并排；章节标题带点阵编号。
- **404**：渐变点阵 404 与微光按钮。

## 文件结构

```
.
├── scripts/
│   ├── markdown.js          # KaTeX / Lean 4、Typora 语法扩展、标题去重与路径改写
│   └── typora-helper.cjs    # 新建文章/草稿与 Typora 主题安装 CLI
├── scaffolds/
│   ├── post.md              # 文章脚手架（含 typora-root-url 等字段）
│   └── draft.md             # 草稿脚手架
├── typora/
│   └── marginalia.css       # 配套 Typora 纯黑编辑器主题
└── themes/marginalia/
    ├── _config.yml          # 主题默认值
    ├── layout/
    │   ├── _partial/
    │   │   ├── base.pug         # 页面外壳
    │   │   ├── head.pug         # title、meta、字体与样式
    │   │   ├── header.pug       # 桌面导航与搜索按钮（含 / 快捷键提示）
    │   │   ├── mobile-menu.pug  # 移动端全屏菜单
    │   │   ├── footer.pug       # 页脚
    │   │   ├── icons.pug        # 内联 SVG 图标
    │   │   ├── post-rows.pug    # 文章列表行
    │   │   ├── pagination.pug
    │   │   └── search.pug       # 搜索面板与键盘操作提示
    │   ├── landing.pug
    │   ├── index.pug
    │   ├── post.pug
    │   ├── archive.pug
    │   ├── categories.pug
    │   ├── category.pug
    │   ├── tags.pug
    │   ├── tag.pug
    │   ├── about.pug
    │   ├── friends.pug
    │   ├── page.pug
    │   └── 404.pug
    ├── scripts/helpers.js   # 阅读时间、字数统计、摘要、有效文章过滤、导航状态、域名、文字头像
    └── source/
        ├── css/             # base / landing / article / pages / search / responsive
        ├── js/main.js       # 菜单、多词搜索、代码复制、进度、目录、锚点、灯箱、点阵互动
        └── fonts/           # Archivo / Doto / IBM Plex Mono 与 OFL 许可证
```

站点级设置写在根目录的 `_config.marginalia.yml`，会覆盖主题 `_config.yml` 中的同名配置。Hexo 会把两份配置合并后交给模板。

## 设计变量

颜色与字体集中在 `themes/marginalia/source/css/base.css` 的 `:root`：

```css
--bg: #09090b;           /* 深邃炭黑底 */
--surface: #12131a;      /* 卡片表面 */
--surface-2: #181a24;    /* 悬停/高阶表面 */
--ink: #f4f4f6;          /* 主文字 */
--muted: #9496a4;        /* 次级文字 */
--faint: #646775;        /* 微文字 */
--purple: #b15cff;       /* 紫色信号 */
--line: rgba(255, 255, 255, 0.085);
--margin: clamp(20px, 2.3vw, 40px);  /* 2.3% 页边距 */
--sans: 'Archivo', 'PingFang SC', ...;
--dot: 'Doto', 'IBM Plex Mono', monospace;
--mono: 'IBM Plex Mono', 'SFMono-Regular', ...;
```

英文字体使用自托管的 [Archivo](https://fonts.google.com/specimen/Archivo) 变量字体，数字与字标使用 [Doto](https://fonts.google.com/specimen/Doto)，标签与代码使用 [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono)；中文回退到苹方 / 微软雅黑 / Noto Sans SC。三套字体均以 SIL Open Font License 1.1 授权，许可证随字体放在同一目录。

页面使用八列网格，页边距为画布宽度的 2.3%；820px 以下收成单列。桌面端的文章目录在 1100px 以上显示在右侧粘性栏中，1100px 以下切换为正文顶部的可折叠目录（`details.post-toc-mobile`）。

## 交互

`themes/marginalia/source/js/main.js` 不依赖框架：

- **多词搜索**：按钮、`/` 或 `Ctrl/Cmd + K` 打开；输入按空格拆分为多词 token，对标题、分类/标签与正文执行全词命中与加权排序并高亮全部匹配词；支持方向键选择、回车跳转、`Esc` 关闭，底部附快捷键提示。
- **可交互点阵**：首页 5×5 Glyph 支持点击切换按钮（`01`–`04` 预设图案轮换）或直接点击单个方格开关点亮状态。
- **移动端菜单**：打开后锁定页面滚动，`Esc`、导航链接或关闭按钮均可退出。
- **代码块**：根据 `figure.highlight` 的语言类名生成语言名称与行数标签及复制按钮，复制成功后短暂反馈。
- **阅读进度与百分比**：只在文章页显示，顶部 2px 进度条与右侧目录顶部百分比（`00%`–`100%`）随文章阅读高度同步更新。
- **目录与行内 `[TOC]`**：桌面侧边栏使用 `IntersectionObserver` 高亮当前章节并附 `Top ↑`；文章正文中的 `[TOC]` 占位会自动填充当前文章的目录结构。
- **标题锚点**：正文 `h2` / `h3` / `h4` 自动附带 `#` 锚点按钮，点击后复制当前章节直达链接并短暂显示已复制状态。
- **表格与图片灯箱**：正文宽表格自动包裹在 `.table-wrap` 横向滚动容器内；带 `alt` 的独立图片自动生成等宽图注；点击文章内图片打开 1px 边框纯黑灯箱视图（支持 `Esc`、遮罩或关闭按钮退出）。
- **页面切换**：拦截站内链接，先淡出到黑，新页再淡入；`prefers-reduced-motion` 下直接跳转。
- **无障碍与减弱动效**：所有动效均尊重 `prefers-reduced-motion`。

## 配套 Typora 主题

[`typora/marginalia.css`](typora/marginalia.css) 将站点视觉规则延伸到 Typora 写作界面：

- 使用与网页端一致的深邃炭黑 `#09090b` 画布、分层表面、精致圆角、微光边框与 `#b15cff` 紫色信号。
- 通过 `@font-face` 与字体栈引用 `Archivo`、`Doto`（用于 `h2::before` 的 `01`, `02`, ... 章节编号）与 `IBM Plex Mono`（用于 YAML front matter `.md-meta-block`、行内代码、`.md-fences` 代码块与界面的等宽标签）。
- 覆盖 `.md-Alert` / `.md-alert` 提醒块（`note` / `tip` / `important` / `warning` / `caution`）、`blockquote`、`table`、`mark`（`==高亮==`）、`.md-task-list-item` 任务列表、`.md-footnote` 脚注、KaTeX / MathJax 公式块与 `#typora-sidebar` 暗色大纲侧边栏。
- 运行 `npm run typora:theme`（或 `npm run typora:theme -- --dir <path>`）可将样式与字体安装至本地 Typora 主题目录。

## 搜索

搜索索引由根目录 `_config.yml` 的 `search` 配置生成：

```yaml
search:
  path: search.xml
  field: post
  content: true
```

主题读取 `/search.xml`，解析 `<entry>` 并在前端完成标题、分类、标签和正文的加权匹配。没有额外的搜索服务，也不需要构建时的数据库。

## 定制建议

- 换颜色：只改 `themes/marginalia/source/css/base.css` 顶部的变量，保持深邃炭黑层次与高对比度文字的可读性。
- 换字体：改 `base.css` 的 `@font-face` 与 `--sans` / `--dot` / `--mono`；Doto 只用于字标和数字，不要放进正文。
- 换首页文案：改 `_config.marginalia.yml` 的 `landing` 与各页面 `heading_before` / `heading_em`；首页主按钮使用 `primary`。
- 换菜单：改 `menu`；社交图标名称需在 `layout/_partial/icons.pug` 中存在。
- 换友链：改 `source/_data/friends.yml`，`avatar` 可为空。
- 改页脚：`_config.marginalia.yml` 的 `footer.since` / `footer.note`；请保留“不显示 Hexo 与主题版本”的原则。
- 新增页面布局：在 `layout/` 中创建同名 `.pug`，并在 Markdown front matter 里指定 `layout`。
- 保持卡片圆角（`--radius-*`）、细线边框（`--line` / `--border-glow`）和紫色信号的点到为止，避免过度炫光影响长文阅读沉浸感。
