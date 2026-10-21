# 设计接入与验收

使用 CQU Design **theme 1.2.0**。参考该 tag 的 `START-HERE.md`、`DESIGN.md`、`docs/consumption.md`、`docs/brand.md`、`docs/product-pages.md` 与 `docs/blue-brand-release.md`。发行 tarball 与 SHA256SUMS 来源见 [本地包记录](../.design/README.md)。

## 接入方式

脚本是原生 JavaScript 与 Shadow DOM，按设计系统允许的「非 React 系统仅接入 theme」路径实现；继续使用原生 dialog、表单控件和站点接口。未引入 React、UI 组件包、Toast 或图标依赖，未复制共享组件或覆盖 `.ds-*` 规则。

`.design/` 保存本地主题包，开发时由 `scripts/design.mjs` 读取公开的 `@cqu-moe/theme/styles.css`。`npm run build` 只把 `:root` 选择器转换为 shadow host 对应的 `:host` 选择器，并嵌入脚本标记区；设计变量保持原样。这是主题文件同步，不需要打包器或运行时网络依赖。学校页面不受主题 CSS 影响。

界面自动跟随系统深浅色，未增加手动主题偏好或存储键。指针触发步骤切换时，使用原生 WAAPI 的180ms、12px方向提示与淡入；前进从右进入，返回从左进入。进度填充通过 transform 在280ms内追随已核实数量，扫光与状态点仅在提交期间循环。键盘和减少动态效果模式下即时切换、无循环动效。颜色、字号、间距、圆角与阴影使用共享语义变量；44px触屏尺寸、16px输入下限和视口断点为浏览器布局约束。未引入动画依赖。

固定头尾和稳定的弹窗高度用于分步切换，内容区独立滚动。初始仅设置面板与「下一步」；预览显示清单、「上一步」和「开始刷课」；提交显示进度与记录，突出停止动作，结束后焦点返回刷新按钮。返回设置保留预览状态，修改统一设置才使其失效。v0.3.0 使用原生 details/summary 展开课程，复选框作为独立控件放在展开控件外；CSS仅绘制展开指示。收起时省略过长名称，展开可读完整名称和教师。选择与编辑共用提交锁；校验失败会展开课程并聚焦错误字段。

提交阶段使用独立的只读记录区，随弹窗剩余空间调整高度，并设上限以保持紧凑；按处理顺序倒序排列，新课程从顶部进入并将滚动位置重置至顶部，旧记录可通过触屏、滚轮或键盘查看。入口使用180ms淡入与8px位移，沿用键盘与减少动态效果的关闭规则。长课程名和教师名在记录行中省略，完整文本仍提供给辅助技术与标题提示；当前课程在进度卡内完整换行显示。失败记录保留，未开始处理的课程不列入记录。

满意度和逐项指标仍使用原生 select。支持 `appearance: base-select` 的浏览器通过 `::picker(select)` 复用主题菜单颜色、圆角、阴影与选中标记；保留原生表单验证、焦点及键盘操作。不支持时回退为原生选择菜单，未增加运行时依赖。参考 [MDN 的可定制 select](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select)。

## 官网

独立官网沿用 theme-only 接入，使用统一蓝色品牌与营销标题尺度，移除旧赭金及暖中性色覆盖；局部 CTA 映射和素材来源见 [官网维护说明](website.md)。脚本继续使用中性背景、黑白主按钮和语义状态色，链接与焦点采用共享蓝色。评分档位、草稿、核对和提交流程保持原有行为。

## 自动检查

```sh
npm ci
npm run build
npm run check
npm run check:design
npm test
```

`check:design` 是适用于单文件脚本的有限检查：保证内嵌 CSS 与本地主题包一致、业务样式不使用原始颜色／全属性过渡、引用的主题变量存在。它不等同于 React UI 包的完整消费检查器，也不证明视觉、可访问性或真实接口正确；需结合下面的页面检查。

[桌面浅色设置](screenshots/settings-light.png) · [课程选择清单](screenshots/course-list-light.png) · [手机深色编辑](screenshots/preview-dark-mobile.png) · [提交进度](screenshots/progress-dark.png) · [手机进度](screenshots/progress-dark-mobile.png) · [深色下拉菜单](screenshots/select-dark.png) · [手机浅色菜单](screenshots/select-light-mobile.png)（均为合成数据）

## 2026-10-19 验收范围

- 本地构建、语法与主题同步检查通过；另使用 CQU Design 源码的官方 `checkSource` 检查业务代码（排除原样内嵌的主题区），无违规。
- 受控 HTTP 的 Chromium 测试：30 项；覆盖分步往返、勾选、全选、逐课编辑的请求内容与草稿保护、收起错误定位、未选项排除校验，以及已发送未回读时不增加进度、部分成功与完成计数、循环结束、键盘与减少动态效果；不连接学校服务器。
- 20门课程回归：记录区随桌面和窄屏可用空间伸缩，当前课程置顶、历史可滚动、下一门自动回顶、全部请求顺序不变；检查1440／390／320px布局与键盘浏览。
- 浅深主题的下拉菜单：1440／320px展开截图、44px选项、不溢出视口、鼠标与键盘选择、Esc只关闭菜单、选择后实际提交值正确；覆盖统一满意度和逐项指标选择。
- 320／390／768／1440px × 浅深主题：长标题重排、无横向溢出、操作区可达、44px 控件与16px 输入下限；保存对应截图供视觉检查。
- 系统主题即时变化及刷新；不会修改学校主题或写入 localStorage。
- 键盘打开／校验／Enter 预览／Escape 关闭与焦点恢复；慢加载、空清单、窄屏停止、提交失败后的刷新入口；超长服务端错误在反馈区完整滚动显示，恢复按钮仍可见。
- ego lite 真实页面：v0.2.0 设置与只读预览曾识别14个待评条目，未修改草稿；完成后刷新移除临时脚本。v0.3.0 本轮只验证受控接口，未重复真实页面验收。

未执行真实评价提交、Tampermonkey 安装链路、Safari／Firefox、真实手机和屏幕阅读器验收。没有修改共享设计包或创建外部设计 issue；当前 theme-only 接入没有阻塞所需界面的共享能力缺口。
