# 官网维护

官网是 `website/index.html`、`website/public/style.css` 与一段截图切换脚本组成的静态页面，没有前端框架、远程字体、统计或学校接口调用。网站只提供介绍与安装入口；用户脚本继续以单个 `jxzljc.user.js` 分发。

## 构建与预览

先按 README 安装现有开发依赖与 Playwright Chromium，再运行：

```sh
npm run dev:website
# http://127.0.0.1:4187
npm run check:website
npm run test:website
npm run build:website
```

构建读取 `@cqu-moe/theme/styles.css`，复制到 `website/dist/theme.css`；从脚本元数据读取版本号填入页面，再复制本地素材。输出目录为 `website/dist/`，由根目录 `wrangler.jsonc` 配置为 Workers Static Assets；不上传脚本源码或研究文档。`dev:website` 使用 Python 3 标准库 HTTP 服务；测试独占 4187 端口，若被占用则报错，不复用其他项目的服务。

## GitHub 与 Cloudflare Git Connector

官网和用户脚本保存在同一个 `cqu-moe/jxzljc` 仓库。Logo 可编辑源文件和完整素材包保存在 `cqu-moe/design`，官网使用同步后的品牌文件；Cloudflare 构建无需访问另一个仓库。

使用 **Workers Builds 的 Git 集成**，连接 GitHub 仓库。设置如下：

| 项目 | 值 |
| --- | --- |
| Worker 名称 | `cqu-jxzljc`，必须与 `wrangler.jsonc` 相同 |
| Git 仓库 | `cqu-moe/jxzljc` |
| 生产分支 | `main` |
| 官网域名 | `jxzljc.cqu.moe`，由 Wrangler Custom Domain 管理 DNS 和证书 |
| 根目录 | `/`，保留根目录的锁文件和 `.design/` 本地主题包 |
| Build command | 留空，Wrangler 的 `build.command` 负责构建 |
| Deploy command | `npm run deploy:website` |
| 非生产分支预览构建 | 关闭 |
| Node.js | `.nvmrc` 指定 22，与 GitHub Actions 一致 |
| 构建 / 运行时密钥 | 网站自身不需要；部署身份使用 Cloudflare 为 Builds 创建的 token |

控制台当前复用已有的 `cqu-feed build token`，未创建新凭据，也未把凭据值写入仓库。该 token 撤销或轮换时，需要同步更新本项目的 Builds 设置。

Cloudflare 自动安装锁文件中的依赖；固定版本的 Wrangler 会先执行 `npm run build:website`，再发布 `website/dist/`。这是一张静态页面，不使用 SPA fallback，未知路径返回 404。`npm run build` 仍仅同步用户脚本内嵌主题，不是官网构建命令。

GitHub 仓库授权、分支和自动构建连接是 Cloudflare 端的配置，不能只靠提交 `wrangler.jsonc` 创建；首次连接后，推送生产分支会自动构建部署。GitHub Actions 保留脚本 / 官网检查及原有 Greasy Fork 同步，不增加 Cloudflare 部署密钥或部署 job。Cloudflare 构建不会等待独立 GitHub 检查，应在 PR 检查通过后再合并到 `main`。

本地可复现检查：

```sh
npm ci
npm run deploy:website -- --dry-run
```

Dry run 只验证构建和部署打包。生产验收还需核对 Git Connector 的提交号、构建日志与激活版本，并打开线上首页，检查样式、Logo、截图和安装链接。GitHub CI 通过不等于网站已经上线。

参考：[Workers Builds 接入](https://developers.cloudflare.com/workers/ci-cd/builds/)、[构建配置](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)、[静态资源](https://developers.cloudflare.com/workers/static-assets/)。

## 设计与品牌来源

按 CQU Design 的静态内容站 theme-only 路径接入 **theme 1.2.0**，不引入 React UI 包。来源为 [design v1.2.0](https://github.com/cqu-moe/design/releases/tag/v1.2.0)，使用正式 tarball 并核对发行 SHA256SUMS，保留 npm 锁文件。统一蓝色决策取代先前的赭金与暖中性色例外；网页直接引用共享品牌变量。只有 `.brand-action` 局部将主按钮映射到 `--brand-solid` / `--brand-on-solid`，根级 primary 和工作界面保持黑白。页面内的 `design-exception` 只用于营销标题字号，检查器对整份 CSS 校验颜色，不再豁免品牌色值。

页面以实际脚本截图、四步安装、使用边界和常见问题为主。首屏保留中性页面、蓝色强调标题和浅蓝预览区，只有一个主要安装动作，电脑浏览器、Tampermonkey、校园网和非学校官方身份在首屏可见。标题下用两笔曲线强调“少填几遍”，预览上方用“评分，还是你来定”的旁注与弯箭头呼应逐门核对；装饰为内联 SVG，不响应指针、不进入辅助技术树，也不自动播放。默认展开一条示例课程展示逐项评分，图注只保留“示例数据”。安装区与使用边界采用左侧标题、右侧正文的布局，小屏恢复单列。评分由用户决定、草稿保留、确认后提交及隐私边界放在正文中，不只藏在 FAQ。无滚动入场、远程字体、自动轮播或新增运行时依赖；首屏截图按视口与系统主题预加载。

Logo 的唯一来源是 `cqu-moe/design` 的 `v1.2.0` tag 下 `assets/brand/path-family/jxzljc/`；`source/marks.json` 保留已批准的气泡/勾选轮廓，配色来自共享主题 token。原稿、提取记录与透明素材保存在 design 中。页面显示蓝色浅深双版本，SVG favicon 自适应系统主题，ICO 与应用图标同步更新。官网没有手动主题切换，因此图片与页面均跟随同一个系统偏好。

在 design 仓库运行以下命令同步并校验，禁止在消费目录手工改路径或配色：

```sh
node scripts/brand.mjs sync jxzljc /path/to/jxzljc
node scripts/brand.mjs check jxzljc /path/to/jxzljc
```

品牌 Logo 标准色用于非文字标识。浅色模式的链接和按钮使用更深的同色相语义色，确保正文和按钮文字达到 4.5:1 对比度。

## 演示截图

`website/public/demo/` 是实际用户脚本的设置、预览、完成界面，每种界面各有桌面和小屏、浅深主题四张 PNG。两组截图分别运行于 608px 与 320px 视口；官网在 600px 以下选用真实小屏布局截图，避免把完整桌面界面缩到难以辨认。它们使用合成课程与教师名称，所有请求均在浏览器边界被本地响应或拦截，不连接学校服务器。生成命令：

```sh
npm run capture:website
npm run build:website
```

`source.json` 记录截图所用脚本的版本与 SHA-256。改动脚本界面后应重新生成并视觉检查截图；不要替换成含有真实课程、教师、学生或会话信息的图片。官网只切换图片，点击演示不会提交评价；脚本自身的完整交互由原有测试覆盖。

校园网内外的实际响应与浏览器限制见 [校园网访问采集](network-access.md)。学校入口保留用户指定的完整 HTTP 地址，页面注明仅校园网可访问。

安装权限说明参考 [Tampermonkey 官方 FAQ](https://www.tampermonkey.net/faq.php?locale=zh&q=Q209)。Greasy Fork 链接为用户提供的 [601134](https://greasyfork.org/zh-CN/scripts/601134)，GitHub 安装链接读取仓库 main 的原始脚本。

## 2026-10-21 · issue #9 本地验证

- 1.2.0 正式 theme tarball SHA-256 与发行清单一致；design `v1.2.0` 的品牌同步工具与资源已逐字节核对，13 个消费素材通过 `brand:check`。
- `npm run build`、`check`、`check:design`、`build:website`、`check:website` 通过；30 项脚本交互、11 项官网交互及 9 项同步协议测试通过。新增检查约束官网实际蓝色和脚本黑白主按钮；正文、强调文字、按钮、旁注及截图衬底上的说明和选中标签均至少 4.5:1。
- 官网和脚本均覆盖 320 / 390 / 768 / 1440px × 浅深主题，检查无溢出、断图、44px 操作区域、键盘焦点和主题刷新；脚本输入至少 16px。官网无 JavaScript 时安装与问答仍可用。
- 重新生成十二张合成演示图，`source.json` 匹配 v0.3.4 脚本哈希。除版本与生成主题区外，脚本源码与升级前完全一致，草稿、核对、返回与失败恢复由原交互测试覆盖。
- 在浏览器实看[桌面浅色首屏](screenshots/website-light.png)、[手机深色首屏](screenshots/website-dark-mobile.png)和完整长页；实看正式 Logo 的 16 / 24 / 32px、应用图标和 SVG / ICO favicon。16px 层叠细节较少，轮廓保留可辨认性。
- `npm run deploy:website -- --dry-run` 通过，仅构建与打包，没有执行部署。远端 CI 见对应 PR；生产 Git Connector 构建、线上读回、Greasy Fork 发布与真实安装不由本地检查证明。

未执行真实学校提交、Tampermonkey 安装完整链路、真实手机、Safari / Firefox 或屏幕阅读器验收。

## 2026-10-20 本地验证（升级前）

- 官网 Chromium **11 项通过**：320 / 390 / 768 / 1440px × 浅深主题，无横向溢出、资源错误；截图切换、安装锚点、FAQ、44px 操作区域、键盘焦点、系统主题变化及刷新、无 JavaScript 的安装与问答均可用。
- 从浏览器实际渲染颜色校验品牌强调色仍有色度，并验证正文、说明、强调文字和主按钮文字至少 4.5:1；可捕获共享主题选择器覆盖局部品牌颜色的问题。
- 实看桌面浅深主题及手机布局；演示数据与真实用户资料无关。
- `check:website`、`check:design`、脚本语法检查通过；原用户脚本 **30 项**受控接口测试及 Greasy Fork 同步脚本 **9 项**测试通过。
- 官网检查已加入 GitHub Actions；本轮结果为本地验证，不代表远端 CI 或生产上线。

未执行真实学校提交、Tampermonkey 扩展安装完整链路、真实手机、Safari / Firefox 或屏幕阅读器验收。既有真实页面只读验收记录见 README 与 `docs/design.md`，不能用官网截图或受控测试替代真实业务验收。
