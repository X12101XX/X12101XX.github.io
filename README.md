# X12101XX 的代码手记

一册关于代码、工具与理解的个人手记。使用 [Hexo](https://hexo.io/) 8 构建，搭配自建的 **Marginalia** 主题，部署在 GitHub Pages。

主题取意于 Claude 的暖象牙纸色、珊瑚色强调与文学化的衬线排版：大面积留白、细线分隔、克制的动效，以及一枚小小的星芒记号。首页是一张安静的入口页，文章与友链像两扇门，站在同一张纸上。

## 首次上线

1. 在 GitHub 创建公开仓库 `X12101XX.github.io`，默认分支使用 `main`。
2. 将本项目的全部源码推送至该仓库，包括 `.github/workflows/pages.yml`。
3. 打开仓库 **Settings → Pages → Build and deployment**，将 **Source** 选择为 **GitHub Actions**。
4. 在 **Actions → Build and deploy Hexo → Run workflow** 触发部署（如果推送时尚未开启 Pages）。
5. 等待部署成功后访问 <https://x12101xx.github.io/> 。

## 本地使用

需要 Node.js 22 或更高的受支持版本。

```sh
npm ci
npm run server
```

本地地址：<http://localhost:4000>。

也可以执行 `npm run build` 只生成静态文件，输出目录为 `public/`。

## 发布文章

```sh
npx hexo new post "文章标题"
```

编辑 `source/_posts/` 中的新 Markdown 文件。首页 `/` 是入口页，文章列表位于 `/posts/`。

```yaml
---
title: 文章标题
date: 2026-10-26 12:00:00
categories:
  - 学习笔记
tags:
  - Rust
---
```

正文第一段会作为文章页的导语；`<!-- more -->` 之前的内容适合写一段简短摘要。提交并推送到 `main` 分支后会自动构建、部署，也可以直接在 GitHub 网页上编辑 Markdown。

## 个性化

- `_config.yml`：站点标题、简介、作者、域名，以及文章列表路径、搜索和订阅源。
- `_config.marginalia.yml`：主题级设置，包括导航、社交链接、首页文案、各页面标题与页脚。
- `themes/marginalia/`：自建主题的全部模板、样式、脚本和字体。
- `source/_data/friends.yml`：友链数据；留空 `avatar` 会自动使用文字头像。
- `source/index.md`、`source/about/index.md`、`source/friends/index.md`：入口页、关于页和友链页。
- `source/images/avatar.jpg`：首页与关于页头像。

页脚只保留版权、站点状态和 GitHub / Journal / RSS / 返回顶部，不显示 Hexo 版本或主题信息。

## 搜索与订阅

- 搜索索引由 `hexo-generator-searchdb` 生成到 `/search.xml`，搜索面板完全由主题实现。
- Atom 订阅由 `hexo-generator-feed` 生成到 `/atom.xml`。
- 主题的目录、代码复制、阅读进度、移动端菜单与搜索快捷键说明见 `THEME.md`。

## 部署

推送到 `main` 后，GitHub Actions 会执行 `npm ci` 与 `npm run build`，再把 `public/` 发布到 Pages。

日期在未来的文章不会提前公开。草稿放入 `source/_drafts/`。

字体 Newsreader 以 SIL Open Font License 1.1 授权分发，许可证见 `themes/marginalia/source/fonts/OFL.txt`。
