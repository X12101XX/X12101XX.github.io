# X12101XX 的代码笔记

一个关于代码、工具与理解的个人笔记。使用 [Hexo](https://hexo.io/) 8 构建，搭配自建的 **Marginalia** 主题，部署在 GitHub Pages。

主题以暖象牙纸色、淡紫色强调与文学化的衬线排版为主：大面积留白、细线分隔、克制的动效。首页是一张安静的入口页，文章与友链像两扇门，站在同一张纸上。

## 首次上线

1. 在 GitHub 创建公开仓库 `X12101XX.github.io`，默认分支使用 `main`。
2. 将本项目的全部源码推送至该仓库，包括 `.github/workflows/pages.yml`。
3. 打开仓库 **Settings → Pages → Build and deployment**，将 **Source** 选择为 **GitHub Actions**。
4. 在 **Actions → Build and deploy Hexo → Run workflow** 触发部署（如果推送时尚未开启 Pages）。
5. 等待部署成功后访问 <https://x12101xx.github.io/> 。

## 本地使用

需要 Node.js 22.12 或更高的受支持版本。

```sh
npm ci
npm run server
```

本地地址：<http://localhost:4000>。

也可以执行 `npm run build` 只生成静态文件，输出目录为 `public/`。

## 文章管理

文章就是一个 Markdown 文件，统一放在 `source/_posts/`。网站没有数据库，每次构建都会读取这里的文件，自动生成 `/posts/` 列表与文章页面。

### 新建文章

```sh
npx hexo new post "How I Read a Codebase"
```

然后在 `source/_posts/` 里找到新文件并编辑。开头保留或修改这段 front matter：

```yaml
---
title: How I Read a Codebase
date: 2026-10-26 12:00:00
description: 一句话摘要，用于文章导语与搜索。
categories:
  - 学习笔记
tags:
  - Rust
---
```

- `title`：文章标题。
- `date`：发布时间。日期在未来的文章不会提前公开。
- `description`：可选，用作页面摘要与分享描述。
- `categories` / `tags`：分类与标签，可留空。
- 文件名最好用英文短横线，例如 `how-i-read-a-codebase.md`，这样文章地址更干净。

正文第一段会作为导语；在摘要之后加一行 `<!-- more -->`，列表页就会在这里截断。

### LaTeX 公式与 Lean 4

公式使用 KaTeX 在构建时渲染，无需额外 front matter。支持行内 `$...$` 和独立成行的 `$$...$$`，也可以紧邻中文：

```markdown
对于$n \in \mathbb{N}$，有$n + 0 = n$。

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$
```

代码围栏标注 `lean4` 或 `lean` 即可启用 Lean 4 高亮：

````markdown
```lean4
def zeros (n : Nat) : Vector Int n := Vector.replicate n 0

theorem add_zero (n : Nat) : n + 0 = n := by
  simp
```
````

行内代码、代码块里的 `$` 不会被解析为公式；普通正文中的美元符号可以写成 `\$`。支持的公式命令见 [KaTeX 文档](https://katex.org/docs/supported)。公式样式和字体由站点本地提供，不依赖 CDN。

执行 `npm test` 可检查公式渲染、代码保护、Lean 4 高亮和公式资源。

为保留公式中的连续花括号，Markdown 默认关闭 Nunjucks 模板解析；如果某篇文章需要 Hexo 的 `{% ... %}` 标签插件，可以在该文章的 front matter 设置 `disableNunjucks: false`。

### 修改、删除

- 修改：直接编辑 `source/_posts/` 里对应的 `.md` 文件。
- 删除：删除该文件即可，列表和文章页会在下次构建后一起消失。
- 文章图片：放到 `source/images/`，正文中用 `![说明](/images/图片名.jpg)` 引用。

### 草稿与预览

```sh
npx hexo new draft "还没写完的文章"
npx hexo server --draft   # 本地预览草稿
npx hexo publish post "还没写完的文章"  # 发布草稿
```

草稿放在 `source/_drafts/`，不会被线上构建读取。写完后再发布。

### 发布上线

```sh
git add .
git commit -m "Add a new note"
git push
```

推送到 `main` 后，GitHub Actions 会自动构建并部署。也可以完全在 GitHub 网页上管理：进入仓库的 `source/_posts/`，新建 / 编辑 / 删除 Markdown 文件并提交，等待 Actions 完成即可。首页开始页的「LATEST NOTE」会自动显示最新一篇文章。

## 个性化

- `_config.yml`：站点标题、简介、作者、域名，以及文章列表路径、搜索和订阅源。
- `_config.marginalia.yml`：主题级设置，包括导航、社交链接、首页文案、各页面标题与页脚。
- `themes/marginalia/`：自建主题的全部模板、样式、脚本和字体。
- `source/_data/friends.yml`：友链数据；留空 `avatar` 会自动使用文字头像。
- `source/index.md`、`source/about/index.md`、`source/friends/index.md`：入口页、关于页和友链页。
- `source/images/avatar.jpg`：首页与关于页头像。

页脚只保留版权、站点状态和 GitHub / Notes / RSS / 返回顶部，不显示 Hexo 版本或主题信息。

## 搜索与订阅

- 搜索索引由 `hexo-generator-searchdb` 生成到 `/search.xml`，搜索面板完全由主题实现。
- Atom 订阅由 `hexo-generator-feed` 生成到 `/atom.xml`。
- 主题的目录、代码复制、阅读进度、移动端菜单与搜索快捷键说明见 `THEME.md`。

## 部署

推送到 `main` 后，GitHub Actions 会执行 `npm ci` 与 `npm run build`，再把 `public/` 发布到 Pages。

日期在未来的文章不会提前公开。草稿放入 `source/_drafts/`。

字体 Newsreader 以 SIL Open Font License 1.1 授权分发，许可证见 `themes/marginalia/source/fonts/OFL.txt`。
