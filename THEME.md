# Marginalia

`themes/marginalia` 是为这本手记写的原创 Hexo 主题，不是上游主题的 fork。名字取意于书页边缘的批注：不抢正文，只把该说的话轻轻放在旁边。

设计方向来自暖象牙纸色、淡紫色强调、细线分隔与文学化的衬线排版，再收进一点编辑设计与手记的气息：大面积留白、宽字距的小号标签、衬线标题、柔软的圆角与尽量少的装饰。品牌与页眉以纯文字呈现，不使用图形标志；交互也保持安静，只在需要的时候出现。

## 页面的样子

- **入口 `/`**：一张几乎落满整屏的开始页。淡淡的稿纸网格、柔光与放大的「&」文字水印之后，是头像、名字、站点标题、双语短句、社交链接，以及“The Journal / 博客文章”和“Friends / 友情链接”两扇入口；最近一篇手记安静地留在下方。
- **手记 `/posts/`**：按时间排列的文章列表，首篇带 “Latest note” 标记，附分类、标签与阅读时间。
- **文章 `/posts/:title/`**：阅读进度条、导语、首字下沉、目录、代码语言标签与复制按钮、上下篇导航。
- **归档 / 分类 / 标签**：同样的页面骨架，用大号年份、编号与细分隔线组织信息。
- **友链 `/friends/`**：友链名片、站点名片与邀请区；头像加载失败时自动显示文字标记。入口页与主菜单都能直接抵达。
- **关于 `/about/`**：正文与侧栏名片、站点说明并排。
- **404**：以描边大字和纸张网格构成的失页提示。

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
    └── fonts/               # Newsreader 变量字体与 OFL 许可证
```

站点级设置写在根目录的 `_config.marginalia.yml`，会覆盖主题 `_config.yml` 中的同名配置。Hexo 会把两份配置合并后交给模板。

## 设计变量

颜色与字体集中在 `source/css/base.css` 的 `:root`：

```css
--paper: #faf9f5;     /* 暖象牙纸 */
--ink: #1f1e1d;       /* 墨色 */
--muted: #6e685e;     /* 次级文字 */
--accent: #9b7fc7;    /* 淡紫色强调 */
--accent-deep: #7b5fa6;
--accent-soft: #f0eaf8;
--radius: 16px;       /* 卡片与入口的圆角 */
--serif: 'Newsreader', 'Songti SC', 'Noto Serif CJK SC', ...;
--sans: -apple-system, 'PingFang SC', 'Microsoft YaHei', ...;
--mono: 'SFMono-Regular', 'Cascadia Code', ...;
```

英文字体使用自托管的 [Newsreader](https://github.com/productiontype/Newsreader) 变量字体，中文回退到宋体 / 思源宋体系列。Newsreader 以 SIL Open Font License 1.1 授权，许可证随字体放在同一目录。

页面宽度、行高、字距和间距都尽量用 `rem` 或相对单位，在 1240px、960px、768px 与 560px 附近调整布局。桌面端的文章目录在 1240px 以上出现，短屏幕与移动端自动收起。

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

- 换颜色：只改 `base.css` 顶部的变量，优先保持纸色、墨色、淡紫色三层关系。
- 换首页文案：改 `_config.marginalia.yml` 的 `landing` 与各页面 `heading_before` / `heading_em`；入口两扇门可分别设置英文 `label` 与中文 `cn`。
- 换菜单：改 `menu`；社交图标名称需在 `layout/_partial/icons.pug` 中存在。
- 换友链：改 `source/_data/friends.yml`，`avatar` 可为空。
- 改页脚：`_config.marginalia.yml` 的 `footer.since` / `footer.note`；请保留“不显示 Hexo 与主题版本”的原则。
- 新增页面布局：在 `layout/` 中创建同名 `.pug`，并在 Markdown front matter 里指定 `layout`。
