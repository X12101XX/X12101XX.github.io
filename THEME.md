# Marginalia

`themes/marginalia` 是为这个网站写的原创 Hexo 主题，不是上游主题的 fork。名字取意于书页边缘的批注，版式则采用 Nothing 的工业点阵与网格系统。

设计方向来自 Nothing 的工业点阵与八列网格：纯黑底、白色字、单一紫色信号；Archivo 承担标题与正文，Doto 只用于字标和数字，IBM Plex Mono 承担标签与代码。严格页边距、1px 细线、零圆角、零阴影、零渐变；标题与正文使用句子式大小写，只有字标使用大写。

## 页面的样子

- **入口 `/`**：一块黑色索引。点阵字标、放大的标签标题、5×5 点阵字形、最新笔记与四条入口；没有头像、没有渐变、没有水印。
- **文章 `/posts/`**：按时间排列的索引行；点阵编号、日期、标题、摘要与方形标签，全部落在 1px 细线上。
- **文章 `/posts/:title/`**：点阵章节编号的阅读版式；Archivo 标题、单栏正文、右侧目录、等宽代码栏与上下篇索引。
- **归档 / 分类 / 标签**：大号点阵年份、方形分类卡与方角标签，用编号与细线组织信息。
- **友链 `/friends/`**：方形头像、1px 名片与交换友链的说明。
- **关于 `/about/`**：头像、站点说明与规格表并排；章节标题带点阵编号。
- **404**：超大点阵 404 与硬边按钮。

## 文件结构

```
themes/marginalia/
├── _config.yml              # 主题默认值
├── layout/
│   ├── _partial/
│   │   ├── base.pug         # 页面外壳
│   │   ├── head.pug         # title、meta、字体与样式
│   │   ├── header.pug       # 桌面导航与工具
│   │   ├── mobile-menu.pug  # 移动端全屏菜单
│   │   ├── footer.pug       # 页脚
│   │   ├── icons.pug        # 内联 SVG 图标
│   │   ├── post-rows.pug    # 文章列表行
│   │   ├── pagination.pug
│   │   └── search.pug       # 搜索面板
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
├── scripts/helpers.js       # 阅读时间、摘要、导航状态、域名、文字头像
└── source/
    ├── css/                 # base / landing / article / pages / search / responsive
    ├── js/main.js           # 菜单、搜索、复制、进度、目录
    └── fonts/               # Archivo / Doto / IBM Plex Mono 与 OFL 许可证
```

站点级设置写在根目录的 `_config.marginalia.yml`，会覆盖主题 `_config.yml` 中的同名配置。Hexo 会把两份配置合并后交给模板。

## 设计变量

颜色与字体集中在 `source/css/base.css` 的 `:root`：

```css
--bg: #000000;           /* 黑底 */
--ink: #ffffff;          /* 白字 */
--muted: #b1b3b3;        /* 次级文字 */
--faint: #7e8080;        /* 微文字 */
--purple: #b15cff;       /* 唯一信号色 */
--line: rgba(255, 255, 255, 0.2);
--margin: clamp(20px, 2.3vw, 40px);  /* 2.3% 页边距 */
--sans: 'Archivo', 'PingFang SC', ...;
--dot: 'Doto', 'IBM Plex Mono', monospace;
--mono: 'IBM Plex Mono', 'SFMono-Regular', ...;
```

英文字体使用自托管的 [Archivo](https://fonts.google.com/specimen/Archivo) 变量字体，数字与字标使用 [Doto](https://fonts.google.com/specimen/Doto)，标签与代码使用 [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono)；中文回退到苹方 / 微软雅黑 / Noto Sans SC。三套字体均以 SIL Open Font License 1.1 授权，许可证随字体放在同一目录。

页面使用八列网格，页边距为画布宽度的 2.3%；820px 以下收成单列。桌面端的文章目录在 1100px 以上出现，短屏幕与移动端自动收起。

## 交互

`source/js/main.js` 不依赖框架：

- 搜索面板：按钮、`/` 或 `Ctrl/Cmd + K` 打开，方向键选择，回车跳转，`Esc` 关闭。
- 移动端菜单：打开后锁定页面滚动，`Esc`、导航链接或关闭按钮均可退出。
- 代码块：根据 `figure.highlight` 的语言类名生成标签与复制按钮，复制成功后短暂反馈。
- 阅读进度：只在文章页显示，按文章实际高度计算。
- 目录：用 `IntersectionObserver` 高亮当前章节。
- 动效尊重 `prefers-reduced-motion`。

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

- 换颜色：只改 `base.css` 顶部的变量，优先保持黑底、白字、单一紫色信号三层关系。
- 换字体：改 `base.css` 的 `@font-face` 与 `--sans` / `--dot` / `--mono`；Doto 只用于字标和数字，不要放进正文。
- 换首页文案：改 `_config.marginalia.yml` 的 `landing` 与各页面 `heading_before` / `heading_em`；首页主按钮使用 `primary`。
- 换菜单：改 `menu`；社交图标名称需在 `layout/_partial/icons.pug` 中存在。
- 换友链：改 `source/_data/friends.yml`，`avatar` 可为空。
- 改页脚：`_config.marginalia.yml` 的 `footer.since` / `footer.note`；请保留“不显示 Hexo 与主题版本”的原则。
- 新增页面布局：在 `layout/` 中创建同名 `.pug`，并在 Markdown front matter 里指定 `layout`。
- 不要加圆角、阴影或渐变；网格、1px 细线和单一紫色信号是这个主题的约束，不是可选项。
