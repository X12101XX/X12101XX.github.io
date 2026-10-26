# X12101XX 的代码手记

使用 Hexo 和[Yun 主题](https://github.com/YunYouJun/hexo-theme-yun)构建，部署至 GitHub Pages。

## 首次上线

1. 在 GitHub 创建公开仓库 `X12101XX.github.io`，默认分支使用 `main`。
2. 将本项目的全部源码推送至该仓库，包括 `.github/workflows/pages.yml`。
3. 打开仓库 **Settings → Pages → Build and deployment**，将 **Source** 选择为 **GitHub Actions**。
4. 在 **Actions → Build and deploy Hexo → Run workflow** 触发部署（如果推送时尚未开启 Pages）。
5. 等待部署成功后访问 https://x12101xx.github.io/ 。

## 本地使用

需要 Node.js 22 或更高的受支持版本。

```sh
npm ci
npm run server
```

本地地址：http://localhost:4000 。

## 发布文章

```sh
npx hexo new post "文章标题"
```

编辑 `source/_posts/` 中的新 Markdown 文件。在 `<!-- more -->` 之前填写首页摘要。

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

提交并推送到 `main` 分支后会自动构建、部署。
也可以直接在 GitHub 网页上新建或编辑 `source/_posts/*.md`。

## 个性化

- `_config.yml`：站点标题、简介、作者、域名。
- `source/about/index.md`：关于页面。
- 主题提供浅紫色浅色外观、侧栏导航、文章目录、分类、标签、归档与本地搜索。
- `_config.yun.yml`：主题级配置；上游来源与改动见 `THEME.md`。

日期在未来的文章不会提前公开。草稿放入 `source/_drafts/`。
