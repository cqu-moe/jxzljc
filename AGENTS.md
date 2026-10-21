# AGENTS.md

本仓库公开地址为 `cqu-moe/jxzljc`，交付 Tampermonkey 可安装的单文件用户脚本。开始领域工作前先阅读 `GLOSSARY.md`；需求入口和分流规则见 `docs/agents/issue-tracker.md` 与 `docs/agents/triage-labels.md`。

## 实现边界

- `jxzljc.user.js` 保持单文件用户脚本，无运行时依赖；不引入打包器、框架或运行时外部库。
- 前端复用 CQU Design theme 1.2.0。开发依赖从 `.design/` 的正式发行包读取并核对 SHA256SUMS，`npm run build` 仅同步内嵌主题；不要手改标记内的变量。官网使用共享蓝色，主动作仅局部映射；工作界面保持中性和黑白主按钮。改动后运行 `npm run check:design` 和交互测试，接入边界见 `docs/design.md`。
- 接口、页面结构和指标约定只能来自实际网站的可验证观察；不硬编码课程、教师、学生资料、指标 ID 或会话。
- 学校 HTTP 边界必须区分验证层级：受控响应用于脚本逻辑测试；真实提交只能在用户明确批准的验收中执行，不得把模拟结果说成真实外部行为。
- 绝不提交账号、学生或老师资料、会话凭据，或含有这些内容的日志、HAR、截图和“真实”测试数据。

## Git 规则

- 非微小改动在隔离 Git worktree 中完成，不直接改主分支。
- 提交前确认有效的 `user.name` 与 `user.email`（仓库局部配置优先），并按原样使用；缺失时停止询问，不临时覆盖身份。
