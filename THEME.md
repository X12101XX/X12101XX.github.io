# Marginalia

`themes/marginalia` 是为这个网站写的原创 Hexo 主题。现已全面重构为 **Aurora & Glassmorphism 现代技术博客设计**，参考 Linear / Vercel / Raycast 的视觉体验，提供炫酷而舒适的深浅双模式界面；配套的 Typora 编辑器主题 [`typora/marginalia.css`](typora/marginalia.css) 延续相同的星夜深色配色与排版风格。

核心特性包括：极光环境光晕与微网格背景（`.ambient-canvas`）、鼠标跟随聚光灯微光卡片（`.spotlight-card`）、毛玻璃胶囊顶栏、支持一键切换的深邃星夜暗色（`#07080d`）与清爽纸感浅色（`#f8fafc`）双模式、交互式代码终端演示、macOS 风格代码块以及居中 Command-K 检索面板。

## 页面结构

- **入口 `/`**：左栏展示动态发光胶囊、渐变主标题、简介、快速主题标签与动作按钮；右栏展示可切换 `DepTypes.lean` / `Template.cpp` 的交互式代码终端窗口与 3 张 Bento 统计卡片；下方依次为 `NEW` 脉冲精选大卡、`近期文章` 三列 Bento 矩阵与六格图标入口。
- **文章 `/posts/`**：顶部分类与标签筛选栏（`.journal-taxonomies`），下方为带有鼠标聚光灯效果的现代文章卡片。
- **文章 `/posts/:title/`**：清爽面包屑元信息（分类、日期、字数与阅读时长）、左栏舒适正文排版（`h2` 渐变竖条装饰、macOS 代码块、KaTeX 独立公式衬底、Callouts、高亮、脚注、行内 `[TOC]`、标题 `#` 复制锚点、横向滚动表格与灯箱预览）以及右栏粘性毛玻璃目录（含实时阅读百分比与 `返回顶部 ↑`）。
- **归档 / 分类 / 标签 / 友链 / 关于 / 404**：纵向时间线归档、Bento 分类卡、标签胶囊云、友链卡片与互换信息卡、个人名片及渐变 404 页面。

## 文件结构

```
.
├── .nojekyll                # 防止 GitHub Pages 误用 Jekyll 构建
├── scripts/
│   ├── markdown.js          # KaTeX / Lean 4、Typora 语法扩展、标题去重与路径改写
│   └── typora-helper.cjs    # 新建文章/草稿与 Typora 主题安装 CLI
├── scaffolds/
│   ├── post.md              # 文章脚手架（含 typora-root-url 等字段）
│   └── draft.md             # 草稿脚手架
├── typora/
│   └── marginalia.css       # 配套 Typora 现代星夜主题
└── themes/marginalia/
    ├── _config.yml          # 主题默认值
    ├── layout/
    │   ├── _partial/
    │   │   ├── base.pug         # 页面外壳（含极光背景层）
    │   │   ├── head.pug         # title、meta、主题防闪烁脚本与样式
    │   │   ├── header.pug       # 悬浮毛玻璃胶囊导航、搜索按钮与主题切换
    │   │   ├── mobile-menu.pug  # 移动端全屏菜单
    │   │   ├── footer.pug       # 页脚
    │   │   ├── icons.pug        # 内联 SVG 图标
    │   │   ├── post-rows.pug    # 文章列表卡片
    │   │   ├── pagination.pug
    │   │   └── search.pug       # Command-K 居中检索面板
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
        ├── js/main.js       # 主题切换、鼠标聚光灯、终端切换、菜单、搜索、代码复制、进度、目录、锚点、灯箱
        └── fonts/           # Archivo / IBM Plex Mono 与 OFL 许可证
```

站点级设置写在根目录的 `_config.marginalia.yml`，会覆盖主题 `_config.yml` 中的同名配置。

## 设计变量

颜色与变量集中在 `themes/marginalia/source/css/base.css` 的 `:root` 与 `html[data-theme='light']`：

- **深色模式（默认）**：`--bg: #07080d`、`--surface: rgba(16, 19, 29, 0.78)`、`--accent: #8b5cf6`、`--accent-bright: #c084fc`、`--cyan: #38bdf8`。
- **浅色模式**：`--bg: #f8fafc`、`--surface: rgba(255, 255, 255, 0.86)`、`--accent: #7c3aed`、`--cyan: #0284c7`。
- **字体**：正文与标题使用自托管 `Archivo` 搭配系统中文黑体；代码与元数据使用 `IBM Plex Mono`。

## 交互

`themes/marginalia/source/js/main.js` 不依赖框架：

- **明暗主题切换**：右上角按钮实时切换深色/浅色并持久化到 `localStorage`。
- **鼠标聚光灯**：悬浮在 `.spotlight-card` 卡片上时，径向微光实时跟随指针移动。
- **首页代码终端**：支持在 `DepTypes.lean` 与 `Template.cpp` 示例之间即时切换。
- **Command-K 搜索**：点击搜索按钮、按 `/` 或 `Ctrl/Cmd + K` 打开居中搜索面板，支持多词分词、方向键选择与回车跳转。
- **文章阅读辅助**：顶部渐变阅读进度条、侧边栏百分比与目录高亮、macOS 代码块复制、标题 `#` 锚点复制、宽表格横向滚动与图片毛玻璃灯箱。
