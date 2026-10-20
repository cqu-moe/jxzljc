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

按 CQU Design 的静态内容站 theme-only 路径接入 **theme 1.1.0**，不引入 React UI 包。字号、间距、圆角、阴影使用现有主题变量。依据用户 2026-10-20 的确认，参考 [QuickLogin 官网](https://quicklogin.cqu.moe/) 的布局与暖色表面层次，以赭金替换暖橙；页面内的 `design-exception` 仅覆盖官网的品牌色和营销标题字号，不修改共享 theme 或脚本主题。

页面以实际脚本截图、四步安装、常见问题为主。首屏只保留一个安装动作，截图直接展示，不再套装饰卡片；版本放在页脚。安装区和常见问题在桌面采用左侧标题、右侧内容的布局，手机恢复单列。品牌色保留在标题、链接、主按钮和步骤编号，不增加英文装饰标题、滚动入场或重复的卖点区。

Logo 的唯一来源是 `cqu-moe/design` 的 `assets/brand/path-family/jxzljc/`；可编辑路径与配色在 `source/marks.json`。原稿、提取记录与透明素材保存在 design 中。页面显示标准色 / 深底彩色双版本，favicon 也使用彩色；官网没有手动主题切换，因此图片与页面均跟随同一个系统偏好。

在 design 仓库运行以下命令同步并校验，禁止在消费目录手工改路径或配色：

```sh
node scripts/brand.mjs sync jxzljc /path/to/jxzljc
node scripts/brand.mjs check jxzljc /path/to/jxzljc
```

品牌 Logo 标准色用于非文字标识。浅色模式的链接和按钮使用更深的同色相语义色，确保正文和按钮文字达到 4.5:1 对比度。

## 演示截图

`website/public/demo/` 是实际用户脚本的设置、预览、完成界面，每种界面各有浅深两张 PNG。它们使用合成课程与教师名称，所有请求均在浏览器边界被本地响应或拦截，不连接学校服务器。生成命令：

```sh
npm run capture:website
npm run build:website
```

`source.json` 记录截图所用脚本的版本与 SHA-256。改动脚本界面后应重新生成并视觉检查截图；不要替换成含有真实课程、教师、学生或会话信息的图片。官网只切换图片，点击演示不会提交评价；脚本自身的完整交互由原有测试覆盖。

校园网内外的实际响应与浏览器限制见 [校园网访问采集](network-access.md)。学校入口保留用户指定的完整 HTTP 地址，页面注明仅校园网可访问。

安装权限说明参考 [Tampermonkey 官方 FAQ](https://www.tampermonkey.net/faq.php?locale=zh&q=Q209)。Greasy Fork 链接为用户提供的 [601134](https://greasyfork.org/zh-CN/scripts/601134)，GitHub 安装链接读取仓库 main 的原始脚本。

## 2026-10-20 本地验证

- 官网 Chromium **11 项通过**：320 / 390 / 768 / 1440px × 浅深主题，无横向溢出、资源错误；截图切换、安装锚点、FAQ、44px 操作区域、键盘焦点、系统主题变化及刷新、无 JavaScript 的安装与问答均可用。
- 从浏览器实际渲染颜色校验品牌强调色仍有色度，并验证正文、说明、强调文字和主按钮文字至少 4.5:1；可捕获共享主题选择器覆盖局部品牌颜色的问题。
- 实看桌面浅深主题及手机布局；演示数据与真实用户资料无关。
- `check:website`、`check:design`、脚本语法检查通过；原用户脚本 **30 项**受控接口测试及 Greasy Fork 同步脚本 **9 项**测试通过。
- 官网检查已加入 GitHub Actions；本轮结果为本地验证，不代表远端 CI 或生产上线。

未执行真实学校提交、Tampermonkey 扩展安装完整链路、真实手机、Safari / Firefox 或屏幕阅读器验收。既有真实页面只读验收记录见 README 与 `docs/design.md`，不能用官网截图或受控测试替代真实业务验收。
