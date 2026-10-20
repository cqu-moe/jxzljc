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

构建读取 `@cqu-moe/theme/styles.css`，复制到 `website/dist/theme.css`；从脚本元数据读取版本号填入页面，再复制本地素材。输出目录可部署到任意提供根路径的静态站点，当前未配置域名或生产部署。`dev:website` 使用 Python 3 标准库 HTTP 服务；测试独占 4187 端口，若被占用则报错，不复用其他项目的服务。

## 设计与品牌来源

按 CQU Design 的静态内容站 theme-only 路径接入 **theme 1.1.0**，不引入 React UI 包。字号、间距、圆角、阴影使用现有主题变量。依据用户 2026-10-20 的确认，参考 [QuickLogin 官网](https://quicklogin.cqu.moe/) 的布局与暖色表面层次，以赭金替换暖橙；页面内的 `design-exception` 仅覆盖官网的品牌色和营销标题字号，不修改共享 theme 或脚本主题。

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

安装权限说明参考 [Tampermonkey 官方 FAQ](https://www.tampermonkey.net/faq.php?locale=zh&q=Q209)。Greasy Fork 链接为用户提供的 [601134](https://greasyfork.org/zh-CN/scripts/601134)，GitHub 安装链接读取仓库 main 的原始脚本。

## 2026-10-20 本地验证

- 官网 Chromium **11 项通过**：320 / 390 / 768 / 1440px × 浅深主题，无横向溢出、资源错误；截图切换、安装锚点、FAQ、44px 操作区域、键盘焦点、系统主题变化及刷新、无 JavaScript 的安装与问答均可用。
- 从浏览器实际渲染颜色校验品牌强调色仍有色度，并验证正文、说明、强调文字和主按钮文字至少 4.5:1；可捕获共享主题选择器覆盖局部品牌颜色的问题。
- 实看桌面浅深主题及手机布局；演示数据与真实用户资料无关。
- `check:website`、`check:design`、脚本语法检查通过；原用户脚本 **30 项**受控接口测试及 Greasy Fork 同步脚本 **9 项**测试通过。
- 官网检查已加入 GitHub Actions；本轮结果为本地验证，不代表远端 CI 或生产上线。

未执行真实学校提交、Tampermonkey 扩展安装完整链路、真实手机、Safari / Firefox 或屏幕阅读器验收。既有真实页面只读验收记录见 README 与 `docs/design.md`，不能用官网截图或受控测试替代真实业务验收。
