# 官网维护

官网是 `website/index.html`、`website/public/style.css` 与本地交互演示组成的静态页面，没有前端框架、远程字体、统计或学校接口调用。网站提供介绍、示例体验与安装入口；用户脚本继续以单个 `jxzljc.user.js` 分发。

## 构建与预览

先按 README 安装现有开发依赖与 Playwright Chromium，再运行：

```sh
npm run dev:website
# http://127.0.0.1:4187
npm run check:website
npm run test:website
npm run build:website
```

构建读取 `@cqu-moe/theme/styles.css`，复制到 `website/dist/theme.css`；从脚本元数据读取版本号填入页面，并将完整源脚本原样写入 `website/dist/jxzljc.user.js`，再复制本地素材。输出目录为 `website/dist/`，由根目录 `wrangler.jsonc` 配置为 Workers Static Assets；不上传研究文档。`dev:website` 使用 Python 3 标准库 HTTP 服务；测试独占 4187 端口，若被占用则报错，不复用其他项目的服务。

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

页面以实际脚本交互演示、四步安装、使用边界和常见问题为主。首屏保留中性页面、蓝色强调标题和浅蓝预览区，播放控制与示例说明合为顶部一行，浅蓝框保持紧凑内边距；只有一个主要安装动作，电脑浏览器、Tampermonkey、校园网和非学校官方身份在首屏可见。标题下用两笔曲线强调“少填几遍”，预览上方用“评分，还是你来定”的旁注与弯箭头呼应逐门核对；装饰为内联 SVG，不响应指针、不进入辅助技术树，也不自动播放。演示自动循环填写、核对与提交流程，可随时接管并调整三门基础课的评分。安装区与使用边界采用左侧标题、右侧正文的布局，小屏恢复单列。评分由用户决定、草稿保留、确认后提交及隐私边界放在正文中，不只藏在 FAQ。无滚动入场、远程字体或新增运行时依赖；截图仅作为无 JavaScript 时的替代内容。

Logo 的唯一来源是 `cqu-moe/design` 的 `v1.2.0` tag 下 `assets/brand/path-family/jxzljc/`；`source/marks.json` 保留已批准的气泡/勾选轮廓，配色来自共享主题 token。原稿、提取记录与透明素材保存在 design 中。页面显示蓝色浅深双版本，SVG favicon 自适应系统主题，ICO 与应用图标同步更新。官网没有手动主题切换，因此图片与页面均跟随同一个系统偏好。

在 design 仓库运行以下命令同步并校验，禁止在消费目录手工改路径或配色：

```sh
node scripts/brand.mjs sync jxzljc /path/to/jxzljc
node scripts/brand.mjs check jxzljc /path/to/jxzljc
```

品牌 Logo 标准色用于非文字标识。浅色模式的链接和按钮使用更深的同色相语义色，确保正文和按钮文字达到 4.5:1 对比度。

## 交互演示

`demo.html` 在没有 `allow-same-origin` 的 sandbox iframe 内运行实际用户脚本。构建生成 `demo-userscript.js`，把完整脚本放入函数作用域，注入独立窗口标识、空草稿读取和仅返回合成数据的 `fetch`；不修改原始业务逻辑。CSP 禁止连接网络和表单导航。表单事件用于实际界面的校验与提交逻辑，所有示例状态只保存在 iframe 内存中，刷新或重置即清空。

课程使用高等数学、大学物理、大学英语及虚构教师；自动填写的满意度、90 分和评语只属于演示，实际安装脚本仍不预选评分。重置及“再试一次”清空示例状态并停在第一步设置，不自动填入或跳到核对页，也不刷新主页。

页面打开、预览区至少一半进入视口且未开启减少动态效果时，立即自动循环：展开满意度选项、逐字填写评分与评语、展开高等数学调整指标、模拟提交、短暂停留完成页，再淡出回到设置开始下一轮。自动流程等待时间为手动操作的 2.5 倍：约每 213ms 输入一个字，选项展开与选中反馈共停留约 2.1 秒，完成页停留 4.5 秒。演示浮层与淡入淡出使用 300ms 动效；步骤切换沿用实际脚本的 180ms 位移淡入与进度动画。逐字输入仅更新输入框值，在每个字段开始填写时通知表单一次，避免每个字符都重新清空预览、改写提示与按钮状态；手动输入仍走原脚本事件。模拟选项先确定宽度再挂载测量高度，避免以默认宽度布局后再次测量。每轮只重载 iframe，清空示例状态并释放上一轮脚本监听器。

悬停整个浅蓝演示区会冻结当前字符、步骤、动画及模拟请求的剩余等待时间，移开从原处继续。滚出视口或隐藏页面同样暂停，恢复可见后继续。暂停按钮保持暂停，直到点击继续。实际点击、键盘输入或触屏操作会接管界面并停止自动循环，保留当前填写内容；若模拟提交已在处理中，先完成当前示例条目再停止后续条目。“重播演示”清空手动修改并重新开始循环。减少动态效果默认显示静态可操作的空白设置页，主动重播时不播放动效。自动播放不抢焦点、不滚动主页，也不连续播报进度。

## 无 JavaScript 时的演示截图

`website/public/demo/` 是实际用户脚本的设置、预览、完成界面，每种界面各有桌面和小屏、浅深主题四张 PNG。两组截图分别运行于 608px 与 320px 视口；官网在 600px 以下选用真实小屏布局截图，避免把完整桌面界面缩到难以辨认。它们使用合成课程与教师名称，所有请求均在浏览器边界被本地响应或拦截，不连接学校服务器。生成命令：

```sh
npm run capture:website
npm run build:website
```

`source.json` 记录截图所用脚本的版本与 SHA-256。改动脚本界面后应重新生成并视觉检查截图；不要替换成含有真实课程、教师、学生或会话信息的图片。官网只切换图片，点击演示不会提交评价；脚本自身的完整交互由原有测试覆盖。

校园网内外的实际响应与浏览器限制见 [校园网访问采集](network-access.md)。学校入口保留用户指定的完整 HTTP 地址，页面注明仅校园网可访问。

安装权限说明参考 [Tampermonkey 官方 FAQ](https://www.tampermonkey.net/faq.php?locale=zh&q=Q209)。主安装地址固定为 `https://jxzljc.cqu.moe/jxzljc.user.js`，与官网一起发布；不增加 R2、Worker 路由逻辑或 IP 查询。沿用 Static Assets 默认的 MIME 类型、ETag 和 `Cache-Control: public, max-age=0, must-revalidate`，不对固定地址设置长期 immutable 缓存。

安装按钮左侧安装本站脚本，右侧箭头用原生 `details` / `summary` 展开备用链接：[Greasy Fork 601134](https://greasyfork.org/zh-CN/scripts/601134) 与 GitHub main 原始脚本。箭头有“其他安装来源”可访问名称和至少 44px 点击宽度；支持 Enter / Space 展开、Tab 访问链接、Escape 返回箭头、点击外部或移出焦点收起。关闭时链接不进入 Tab 顺序；禁用 JavaScript 时仍可展开并安装。

主安装按钮沿用 [Greasy Fork 的公开管理器信号](https://github.com/greasyfork-org/greasyfork/blob/main/app/javascript/managers.js)：收到 `window.external` 上 Tampermonkey、Violentmonkey 或 FireMonkey 信号时直接打开脚本；未收到信号则显示安装引导，不能据此断言用户没有安装扩展。弹窗提供油猴官网和“已安装，继续”两条路径，后者保留原生链接导航，并在本浏览器记住明确确认。存储被禁用时，本次页面内仍可继续；刷新后可能再次提示。不探测扩展 ID，也不引入检测依赖。无 JavaScript、修饰键点击和备用链接保留原有链接行为。

引导使用原生 `dialog`，背景不可交互，支持 Escape、关闭按钮、点击遮罩和焦点返回。沿用主题浅深配色、蓝色主按钮与 44px 操作区域；指针打开时以 180ms 轻微位移淡入、120ms 退出，键盘打开即时显示，减少动态效果时仅淡入淡出。

分体按钮两侧统一为 50px 高，分隔线在上下留白。指针操作时，菜单从右上方以 180ms 淡入和轻微位移、缩放展开，以 120ms 收起，箭头同步旋转；快速反向操作会取消待完成的关闭。收起期间链接立即设为 inert，避免误点或聚焦。键盘操作即时响应；减少动态效果时只保留淡入淡出。无 JavaScript 时仍可使用原生展开控件。

按钮及其菜单局部禁用文字选择，避免快速双击、三击展开箭头时误选刚显示的菜单文字；正文仍可选择复制。仅使用 CSS（包含 WebKit 前缀），不拦截全局选择事件。

v0.3.6 起源脚本的 `@updateURL` / `@downloadURL` 均指向本站固定地址，名称与 namespace 不变；Greasy Fork 分发仍使用其管理的更新地址。旧版无法连接原更新源时，需要从本站安装链接手动更新一次。发布验收应检查线上下载返回 JavaScript 原文、版本与构建源文件一致，并单独验证 Tampermonkey 安装及更新；首页可达、本地静态服务器或 CI 通过都不能证明扩展后台请求不受挑战页影响，也不能证明国内网络可达。

### 下载路径的 Cloudflare 例外

2026-10-21 的无 Cookie 下载被 Super Bot Fight Mode 的 `manage definite bots for static resources` 规则挑战（规则 ID `5ac94856e22545c0ac580ded156bc052`）。已在 `cqu.moe` 的 Custom rules 添加 `JXZLJC public userscript install and update`，只跳过 `http_request_sbfm`：

```text
(http.host eq "jxzljc.cqu.moe" and http.request.uri.path eq "/jxzljc.user.js" and http.request.method in {"GET" "HEAD"})
```

规则 ID 为 `be8f4b88f64d4fd099c38cb091f66f7a`，开启匹配日志。未跳过其他自定义规则、WAF Managed Rules、限流、Browser Integrity Check 或 Security Level，也未修改全站机器人防护设置。配置保存在 Cloudflare 控制台，Wrangler 部署不会创建此例外；回滚时禁用或删除该条规则即可。

保存后回读确认规则生效；无 Cookie GET、HEAD 和带查询参数的 GET 均不再带 `cf-mitigated: challenge`。当时脚本尚未部署，三者返回 404；`/theme.css` 和 `/jxzljc.user.js/` 对照请求仍返回 403 挑战。上线后仍需验收脚本 200、内容一致与真实油猴更新，不能把此次 404 当作分发成功。例外的范围参考 [Cloudflare Skip options](https://developers.cloudflare.com/waf/custom-rules/skip/options/)。

## 2026-10-21 · 自托管安装与更新（v0.3.6）

- 21 项官网交互、30 项脚本受控接口测试和 9 项 Greasy Fork 同步协议测试通过；语法、主题、官网检查及 Wrangler dry run 通过。
- 下载回归在旧构建上因 `/jxzljc.user.js` 返回 404 而失败；新构建返回与源文件完全一致的脚本，版本与包版本一致，两个更新地址均指向本站。
- 本地 Wrangler runtime 返回 `text/javascript; charset=utf-8`、默认重新验证缓存头及 ETag，条件请求返回 304，未知脚本路径返回 404。
- 分体按钮覆盖 320 / 390 / 768 / 1440px × 浅深主题、44px 点击范围、键盘关闭与焦点恢复、点击外部收起和无 JavaScript 展开。实看桌面浅色及 320px 深色展开效果。
- 按钮接缝与菜单动效调整后，13 项定向回归通过，覆盖八种尺寸/主题、下载原文、键盘、关闭中不可交互、快速反向、减少动态效果、无 JavaScript 和主题对比度；实看进出动画帧，并刷新本地 Wrangler 预览。
- 安装引导与快速连点修复后，31 项官网回归通过；新检查覆盖未检测到管理器时不下载、三种公开信号的受控替身、原生链接继续安装、记住确认、存储禁用、键盘与关闭焦点、320px 深色及桌面浅色，以及真实指针连点不选字、正文仍可复制。已实看本地 Wrangler 弹窗。管理器信号替身不代表真实扩展探测验收。
- WebKit 的 5 项定向回归通过：连点不选字、正文可复制、可用与受限存储下继续安装，以及 320px 深色和桌面浅色弹窗。
- 未部署到生产，未验收国内实网、真实 Tampermonkey 安装或自动更新。本次仅修改脚本版本与更新元数据，评教业务代码不变；备用示例截图仍保留 v0.3.5 的真实来源记录。

## 2026-10-21 · 可交互示例

- 用户脚本、官网安装说明和操作提示统一使用“开始评教”；脚本发布版本递增为 v0.3.5。
- 原脚本 30 项交互测试通过；官网 19 项检查覆盖八种尺寸/主题、编辑与勾选、返回保留、模拟提交、重置、键盘焦点、连续两轮自动流程、逐字输入、悬停冻结与恢复、手动接管（包括提交等待期间）、减少动态效果和视口外暂停。
- WebKit 定向检查通过：320px 浅色布局、重置回空白第一步、提交等待期间接管；另已验证连续两轮与悬停续播。
- 隔离测试确认 iframe 不能访问父页面 DOM，CSP 阻止直接网络请求，完整演示没有发送评教 HTTP 请求；示例状态只在内存中修改。
- `check`、`check:design`、`check:website`、静态网站构建与 Wrangler dry run 通过。备用截图已更新到 v0.3.5 及基础课名称。
- 本地浏览器查看实际可交互首屏，保留蓝色标题、浅蓝衬底与手写装饰。线上版本和学校真实行为需分别验收，本轮未提交真实评价。

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
