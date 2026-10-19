# CQU Design 本地主题包

`cqu-moe-theme-1.1.0.tgz` 由 CQU Design 源码的 `packages/theme` 打包，作为开发依赖提交，最终用户脚本不请求 CDN 或加载外部模块。

来源版本：`cqu-moe/design` 的 `e0598bfd0414c66dbc88fc671a48c35db5417811`，theme 1.1.0；打包前已核对 `dist/styles.css` 与 `src/tokens.css` 完全一致。当前设计包未发布到 registry。

更新时从设计系统取得对应版本的 tarball，替换依赖并更新锁文件，执行 `npm run build`、`npm run check:design` 与浏览器测试。不要修改 tarball 或内嵌变量来分叉设计系统。

主题 CSS 的 SHA-256：`8c675dae80f1f84de1e9e4d5f9017991032b69c1da58e3c4e7352afb9e626922`。
