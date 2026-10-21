# CQU Design 本地主题包

使用 [cqu-moe/design v1.2.0 正式发行](https://github.com/cqu-moe/design/releases/tag/v1.2.0) 的 `cqu-moe-theme-1.2.0.tgz`，作为 npm 开发依赖提交；最终用户脚本不请求 CDN 或加载外部模块。该包未发布到 registry。

`SHA256SUMS` 保留发行文件原文（包含未使用的 UI 包条目）。本仓库使用的 theme tarball 校验值与发行清单一致：`3e0f6806acfc479f91a6821145921987aa7f9990e398b663736ee0af53110aeb`。

官网品牌素材由 design 的 `v1.2.0` tag（commit `81edae415e2e020e321fe831809480a6ae276a9d`）执行 `node scripts/brand.mjs sync jxzljc <repo-root>` 同步，`check` 校验 13 个正式文件通过。轮廓保持已批准的气泡/勾选图形，蓝色来自共享 theme token。

包内 `dist/styles.css` SHA-256：`86e74b9f4a31bb08be51b6da596ae4f13ceb3d59b2fce4204c8fb61f2fc3f41d`。

更新时取得对应发行 tarball 和 SHA256SUMS，核对后替换依赖及锁文件，执行 `npm run build`、`npm run check:design`、`npm run capture:website` 与浏览器测试。不要修改 tarball 或内嵌变量来分叉设计系统。
