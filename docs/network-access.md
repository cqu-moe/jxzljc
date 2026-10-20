# 校园网访问采集 · 2026-10-20

目标入口：`http://jxzljc.cqu.edu.cn/xspj/xspj/index/xspjindex`。用户先确认连接校园网，再确认已切换到校外网络。只执行未登录的只读请求；重定向产生的临时 Cookie 仅在采集进程内存中使用。未保存 Cookie、完整响应、IP、课程、账号或 HAR，也没有提交评价。

## 实际观察

| 环境 | 无凭据请求的重定向链 |
| --- | --- |
| 用户确认的校园网 | 入口 `307` → 同主机 `/` `302` → `/cas/login` `302` → `https://sso.cqu.edu.cn/login` `200` |
| 用户确认的校外网络 | 入口 `302` → `/rump_frontend/access_forbidden/` `302` → `https://net.cqu.edu.cn/info/1007/3056.htm` `412` |

以上为命令行客户端的结果。随后用真实浏览器顶层打开同一 HTTP 入口，地址栏确实跳到 `https://net.cqu.edu.cn/info/1007/3056.htm`，并正常显示《关于部分信息系统在校外需通过VPN访问的通知》全文；命令行的 412 不能描述为用户浏览器打不开通知页。通知日期为 2026-07-09，说明校外须先成功接入学校 aTrust VPN。

校外的 HEAD 与 GET 均观察到相同的跳转；本次没有观察到 502，不应把 502 当成唯一判断条件。校内首次 HEAD 和 GET 都返回同主机 307；保存临时 Cookie 的客户端才能正常跟随到 SSO。直接用 curl 无 Cookie 跟随后曾得到 404，因此也不能把单次 HEAD 失败等同于不在校园网。未登录时的正常认证跳转不是校外信号。

## 普通网页能看到什么

用 Ego Lite 的真实页面 `fetch` 验证，均使用 HEAD、`credentials: omit`、`cache: no-store` 和 6 秒内超时，不读取业务正文。

| 页面来源 / 请求方式 | 校园网 | 校外网络 |
| --- | --- | --- |
| 本地 HTTP 预览 / `cors` | `TypeError: Failed to fetch` | 相同 |
| 本地 HTTP 预览 / `no-cors` 跟随跳转 | `opaque`，状态 0、无标头 | 相同 |
| HTTPS 页面 / `cors` 或 `no-cors` | `TypeError: Failed to fetch` | 相同 |

进一步在 `https://example.com/` 普通页面执行同一无凭据 HEAD fetch，Chromium 的 `Network.loadingFailed.blockedReason` 明确为 `mixed-content`，与学校页面自己的 CSP 或脚本无关。

系统没有提供允许官网读取响应的有效 CORS 标头。`no-cors` 不能绕过限制来读取状态或 Location；HTTPS 页面的 HTTP fetch 还受 mixed content 限制。虽然终端能读到校内外差异，官网 JavaScript 读不到这些区别。不能根据上述失败宣称“检测到校外”，也不能把 opaque 请求成功当成校内。

参考：[MDN Response.type](https://developer.mozilla.org/en-US/docs/Web/API/Response/type)、[MDN Mixed content](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Mixed_content)。跨站顶层 HTTP 链接可以导航，与页面内 fetch 不同。

服务端代发请求只能看到服务器自身的网络，不能判断用户是否在校园网。普通网页若要读取探测端点的标头，需要有效 HTTPS 和允许官网的 CORS；但这不是全部方案：经校内外验证的 HTTPS 图片可通过加载事件提供有限信号，已安装用户脚本则可能借助扩展后台读取响应。后续研究已在独立扩展后台读到校外通知页跳转，详见 [校园网检测方案研究](campus-network-research.md)。油猴桥接和新方案的校内 / VPN 表现尚未验收。
