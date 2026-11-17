# X12101XX 的代码笔记

一个关于代码、工具与理解的个人笔记。使用 [Hexo](https://hexo.io/) 8 构建，搭配自建的 **Marginalia** 主题，部署在 GitHub Pages。

主题以纯黑底、白色文字与单一紫色信号为主：点阵字标、八列网格、1px 细线与硬边卡片。首页是一块黑色索引：站点字标、可交互 5×5 点阵字形、最新笔记、近期摘要与六条入口。

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

## Typora 写作工作流

仓库针对 **Typora** 做了完整适配：配套纯黑编辑器主题、一键建文脚本、标题提取去重、空文件保护、图片路径改写，以及常见 Typora 扩展语法的构建期渲染。

### 安装配套 Typora 主题

```sh
npm run typora:theme
```

该命令会自动检测系统的 Typora 主题目录（Linux `~/.config/Typora/themes`、macOS `~/Library/Application Support/abnerworks.Typora/themes`、Windows `%APPDATA%/Typora/themes`），将 [`typora/marginalia.css`](typora/marginalia.css) 与本地字体（`themes/marginalia/source/fonts/`）复制到主题目录并输出启用指引。若目标目录位于自定义位置，或当前环境未检测到 Typora，可显式指定目录：

```sh
npm run typora:theme -- --dir "/path/to/Typora/themes"
```

安装完成后重启 Typora，在菜单中选择 **主题 → Marginalia**，并在 **偏好设置 → Markdown** 中开启行内公式、块级公式、高亮（`==`）、脚注、任务列表与 GitHub 风格提醒块（Alerts）。

### 新建文章与草稿

推荐使用仓库内置脚本（零外部依赖）创建带有 Typora 图片配置的文章或草稿：

```sh
npm run new -- "文章标题"
npm run new -- "文章标题" --slug custom-slug
npm run draft -- "草稿"
```

- ASCII 标题会自动转为 kebab-case 文件名；纯非 ASCII 标题默认生成 `note-YYYYMMDD-HHmmss.md`（除非传入 `--slug`），并自动避开重名文件。
- 生成的 front matter 包含 `title`、`date`、`description: `、`categories: []`、`tags: []`、`typora-root-url: ..`、`typora-copy-images-to: ../images`，以及正文起始段落与 `<!-- more -->`。
- 同样支持 `npx hexo new post "How I Read a Codebase"` 与 `npx hexo new draft "草稿"`，脚手架位于 `scaffolds/post.md` 与 `scaffolds/draft.md`。

```yaml
---
title: How I Read a Codebase
date: 2026-10-26 12:00:00
description: 一句话摘要，用于文章导语与搜索。
categories:
  - 学习笔记
tags:
  - Rust
typora-root-url: ..
typora-copy-images-to: ../images
---
```

- `title`：文章标题。
- `date`：发布时间。日期在未来的文章不会提前公开。
- `description`：可选，用作页面摘要与分享描述。
- `categories` / `tags`：分类与标签，可留空。
- 正文第一段会作为导语；在摘要之后加一行 `<!-- more -->`，列表页就会在这里截断。

### 自动标题、空文件保护与图片路径

- **自动 `# H1` 标题提取与去重**：若文章没有 front matter `title`，构建时会自动提取正文开头的 `# H1` 作为标题（若无 `# H1` 则回退为文件名 slug）并移除该行；若 `title` 已存在且正文首行出现同名 `# H1`，也会自动剥离重复标题。
- **空 `Untitled.md` 保护**：若某篇文件既无非空 `title`、正文剪去空白后又为空（例如在 Typora 中误保存的空白 `Untitled.md`），构建时会自动标记为不发布，避免生成空白页面。
- **图片路径自动解析**：
  - Typora 配合 `typora-copy-images-to: ../images` 写入的 `../images/foo.png`（以及 `./images/`、`images/`）会在构建时自动重写为 `/images/foo.png`。
  - 使用 Typora「复制到 `./${filename}.assets`」或 `assets/` 存放的本地图片，也会在构建时自动重写并发布到 `/images/posts/...`。

### 支持的 Typora 语法、公式与 Lean 4

除了标准 Markdown，构建流程对以下 Typora 常用语法提供原生支持（代码块与行内代码内的对应符号均会被安全跳过）：

- **紧邻段落的 `$$...$$` 与引用块公式**：上下没有空行直接贴着段落的多行 `$$...$$` 块，以及写在引用块中的 `> $$...$$`，都会自动规范化并由 KaTeX 正确渲染。
- **Callouts 提醒块**：支持 `> [!NOTE]`、`> [!TIP]`、`> [!IMPORTANT]`、`> [!WARNING]`、`> [!CAUTION]`，可在标签后附带自定义标题。
- **高亮**：使用 `==高亮==` 语法渲染为 `<mark>`。
- **脚注**：支持 `[^1]` 引用与 `[^1]: ...` 定义（含缩进续行），自动生成双向跳转锚点与文末脚注列表。
- **行内目录**：在正文中独占一行写入 `[TOC]`（或 `[toc]`），会自动替换为当前文章的章节目录。
- **任务列表**：支持 `- [ ]` 与 `- [x]` 复选框样式。

行内公式 `$...$` 可紧邻中文书写，块级公式支持多行对齐与矩阵环境：

```markdown
对于$n \in \mathbb{N}$，有$n + 0 = n$。
紧邻段落的块级公式也能正常解析：
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

执行 `npm test` 可检查公式渲染、Typora 语法、路径改写、Lean 4 高亮与资源生成。

为保留公式中的连续花括号，Markdown 默认关闭 Nunjucks 模板解析；如果某篇文章需要 Hexo 的 `{% ... %}` 标签插件，可以在该文章的 front matter 设置 `disableNunjucks: false`。

### 修改、删除与发布草稿

- 修改：直接编辑 `source/_posts/` 里对应的 `.md` 文件。
- 删除：删除该文件即可，列表和文章页会在下次构建后一起消失。
- 草稿预览与发布：

```sh
npm run draft -- "还没写完的文章"
npx hexo server --draft                # 本地预览草稿
npx hexo publish post "<slug>"         # 发布草稿到 source/_posts/
```

草稿放在 `source/_drafts/`，不会被线上构建读取。写完后再发布。

### 发布上线

```sh
git add .
git commit -m "Add a new note"
git push
```

推送到 `main` 后，GitHub Actions 会自动构建并部署。也可以完全在 GitHub 网页上管理：进入仓库的 `source/_posts/`，新建 / 编辑 / 删除 Markdown 文件并提交，等待 Actions 完成即可。首页开始页的「LATEST NOTE」与「RECENT NOTES」会自动更新。

## 个性化

- `_config.yml`：站点标题、简介、作者、域名，以及文章列表路径、搜索和订阅源。
- `_config.marginalia.yml`：主题级设置，包括导航（含 Categories / Tags）、社交链接、首页文案、各页面标题与页脚。
- `themes/marginalia/`：自建主题的全部模板、样式、脚本和字体。
- `typora/marginalia.css` 与 `scripts/typora-helper.cjs`：配套 Typora 编辑器主题与建文/安装脚本。
- `source/_data/friends.yml`：友链数据；留空 `avatar` 会自动使用文字头像。
- `source/index.md`、`source/about/index.md`、`source/friends/index.md`：入口页、关于页和友链页。
- `source/images/avatar.jpg`：首页与关于页头像。

页脚只保留版权、站点状态和导航 / GitHub / RSS / 返回顶部链接，不显示 Hexo 版本或主题信息。

## 搜索与订阅

- 搜索索引由 `hexo-generator-searchdb` 生成到 `/search.xml`，搜索面板由主题前端实现并支持多词空格分词匹配。
- Atom 订阅由 `hexo-generator-feed` 生成到 `/atom.xml`。
- 主题的目录、代码复制、阅读进度、图片灯箱、交互细节与设计规范见 [`THEME.md`](THEME.md)。

## 部署

推送到 `main` 后，GitHub Actions 会执行 `npm ci` 与 `npm run build`，再把 `public/` 发布到 Pages。

日期在未来的文章不会提前公开。草稿放入 `source/_drafts/`。

字体 Archivo、Doto 与 IBM Plex Mono 以 SIL Open Font License 1.1 授权分发，许可证见 `themes/marginalia/source/fonts/OFL.txt`。
