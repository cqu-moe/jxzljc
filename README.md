# 重庆大学快速评教

适用于[重庆大学学生评教系统](http://jxzljc.cqu.edu.cn/)的 Tampermonkey 用户脚本。统一设置满意度、综合评分和评语，核对预览后逐条提交当前学期待评条目。

v0.3.6 使用「填写设置 → 核对预览 → 提交进度」分步界面，支持勾选课程、展开修改每项评分和评语。使用 CQU Design 1.2.0 主题，跟随系统深浅色，底部操作区保持可见；工作界面保持中性与黑白主按钮。

**[安装脚本](https://jxzljc.cqu.moe/jxzljc.user.js)** · [官网与安装指南](https://jxzljc.cqu.moe/) · [Greasy Fork 备用](https://greasyfork.org/zh-CN/scripts/601134) · [GitHub 备用](https://raw.githubusercontent.com/cqu-moe/jxzljc/main/jxzljc.user.js) · [查看源码](jxzljc.user.js)

从官网或 GitHub 安装的 v0.3.6 及后续版本，通过 `@updateURL` / `@downloadURL` 从 `https://jxzljc.cqu.moe/jxzljc.user.js` 检查并下载新版；Greasy Fork 安装的脚本由 Greasy Fork 提供更新地址。自动检查需在 Tampermonkey 中启用。旧版如果无法访问原更新源，或通过手动粘贴安装，请打开官网安装链接，在油猴确认页更新已有脚本，以写入本站更新地址；无需同时安装多份。名称与 namespace 保持不变。

## 使用

1. 安装并启用 [Tampermonkey](https://www.tampermonkey.net/)，打开上方安装链接。也可新建脚本，粘贴 `jxzljc.user.js` 的完整内容并保存。
2. 登录学生评教系统，点击右下角「快速评教」。如已打开单门评价窗口，先关闭它以保存当前草稿。
3. 选择满意度档位、综合评分并填写评语。脚本不预选实际评价内容；评语可留空。
4. 点击右下角「下一步」进入预览。默认勾选全部待评课程，可逐门取消或使用全选框。点击课程行或展开符号，查看完整课程名、教师及评价内容；各项指标、综合评分和评语都可单独调整。已有内容标明「保留草稿」，手动调整后标明「本次修改」。
5. 可通过「上一步」返回设置。核对已选数量和内容后，点击「开始评教」提交评价。只提交勾选的课程；如有无效评分，会展开并定位到该字段，整个批次暂不提交。
6. 提交页显示当前课程、百分比和提交记录。记录区按可用空间自动调整高度，当前课程在最上方，历史记录可滚动查看；开始下一门时自动回到顶部。每条提交后重新查询服务器状态，核实成功后才增加进度并继续下一条。

收起、取消勾选或返回上一步会保留本次编辑。修改统一设置后再进入下一步会重置勾选和逐课修改；刷新页面也不会保存这些临时设置。

「停止后续提交」会等待当前已发出的请求核实，再停止下一条。发生失败或结果不明确时也会停止；先刷新核实，再决定是否重新预览。刷新不会自动继续提交。

## 行为边界

- 只处理当前学期状态为「未评教」且未完成的条目。同名课程的不同教师按条目 ID 分别处理；跳过历史学期、已提交、已审核和被驳回条目。
- 只支持已核实的 A–E 五档选择题，使用网站返回的指标及权重。当前已检查理论课和实验课；遇到其他题型会停止。
- 综合评分以页面控件为准，实测范围为 2–95 分（初始值 1 不可提交）。已有但不再符合规则的草稿会触发停止。
- 生成预览时保留原有草稿，仅补空白；用户可明确修改某门课本次将提交的内容。脚本不会改写或删除学校的本地草稿。预览后若学校草稿或条目状态变化，旧计划停止使用。
- 单文件、无运行时依赖。只访问本站同源接口，使用当前登录态；不收集账号，不向第三方上传评价，也不保存脚本的统一设置。
- 一次只在一个标签页运行。此版本不提供跨标签页互斥锁；检查服务器状态不能完全消除同时提交的竞态。
- 评价用时记录从预览生成到该条提交的实际经过时间，不修改或伪造学校的校验结果。

脚本可停用或删除；已经提交到学校的评价仍受学校系统的修改规则约束。

## Greasy Fork 发布

[已发布脚本](https://greasyfork.org/zh-CN/scripts/601134)使用 **Unlisted user script** 类型与 MIT 许可证，数字 ID 为 `601134`。在脚本的“管理”页启用同步，来源设为 `https://raw.githubusercontent.com/cqu-moe/jxzljc/main/jxzljc.user.js`，选择手动同步；后续首次收到 webhook 后会转为 webhook 同步。

仓库 Actions 需要配置：

- Secret `GREASY_FORK_WEBHOOK_SECRET`：Greasy Fork 账号 webhook 页生成的密钥，不使用登录 Cookie。
- Variable `GREASY_FORK_SCRIPT_ID`：已发布脚本的数字 ID。

`main` 每次推送通过全部测试后，`greasyfork` 任务发送签名 webhook，由 Greasy Fork 从 GitHub 拉取本次已测试的确切提交。Pull Request 只运行测试。任务仅在返回回执包含配置的脚本 ID 且无同步失败时成功；HTTP 200 或 ping 成功均不等同于脚本已发布。

同步保留首次发布的 Unlisted 类型与附加说明。需要发布脚本新版本时仍须增加 `@version`。官方机制见 [Greasy Fork API](https://greasyfork.org/en/help/api) 与 [webhook 配置说明](https://greasyfork.org/en/users/webhook-info)。

## 官网

`website/` 是独立的静态介绍与安装页，使用 CQU Design theme 1.2.0 的共享蓝色品牌、正式 Logo 与自适应 favicon，跟随系统深浅主题。首屏说明使用条件并展示脚本实际界面，安装指引从 Tampermonkey 开始；安装按钮默认下载本站脚本，右侧箭头展开 Greasy Fork 和 GitHub 备用来源，不按 IP 分流。

```sh
npm run dev:website
# http://127.0.0.1:4187
npm run check:website
npm run test:website
npm run build:website
```

产物在 `website/dist/`，包含与根目录源文件一致的 `jxzljc.user.js`，交给现有 Workers Static Assets 随官网发布。官网的 Cloudflare Git Connector 部署配置、构建、素材来源和验证范围见 [官网维护说明](docs/website.md)。本站安装及更新依赖官网可达，已安装脚本在学校页面运行时不依赖官网。

## 开发与验证

```sh
npm ci
npx playwright install chromium
npm run build
npm run check
npm run check:design
node --test scripts/greasyfork-sync.test.mjs
npm test
```

构建只将本地 theme 包的 CSS 内嵌到脚本；安装用户仍只需要一个 `.user.js` 文件。设计来源、升级与验收边界见 [设计接入说明](docs/design.md)。

测试从脚本界面操作，并在学校 HTTP 接口边界拦截**全部**网络请求；不访问真实学校服务器。测试涵盖分步往返、课程选择、展开编辑、提交内容与校验、草稿保留、确认前不提交、顺序提交与回读、真实计数进度、停止、失败不重试、旧计划保护、未知题型、坏草稿、小屏布局、文本注入和焦点恢复，以及 320／390／768／1440px 双主题布局、44px 操作区域、系统主题变化、键盘与减少动态效果、慢加载和空状态。

2026-10-19 曾对 v0.2.0 在 ego lite 的已登录真实页面检查入口、设置和只读预览，识别当前页面全部待评条目且未修改本地草稿。v0.3.0 的课程选择与编辑通过受控接口验证，未在真实页面重复验收。没有执行真实评价提交或 Tampermonkey 扩展安装后的完整执行链路；浏览器注入成功和接口模拟测试不代表真实提交验收。

范围与术语见 [方案](docs/quick-evaluation-plan.md)和[术语表](GLOSSARY.md)。

## 许可证

[MIT](LICENSE)
