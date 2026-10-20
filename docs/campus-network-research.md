# 校园网检测方案研究

> 2026-10-20 用户决定：不实施校园网检测、油猴后台桥接或额外权限。官网保留入口旁的校园网文字说明，点击直接打开学校 HTTP 系统，由学校处理校外跳转。以下方案仅作研究记录，不是待办。

日期：2026-10-20。目标是在 HTTPS 官网后台检查 `http://jxzljc.cqu.edu.cn/xspj/xspj/index/xspjindex` 是否可访问，并在用户点击入口时给出有依据的提示。按 `/research` 委派子代理研究 Web 平台限制，主代理复核规范、研究 Tampermonkey，并完成独立扩展后台实验。

## 结论

**存在值得采用的替代方案：安装后的用户脚本通过 Tampermonkey 后台请求学校入口，把有限的检测结果交给官网。** 官方接口支持读取最终 URL、状态和标头；独立 Chromium 扩展后台已经在用户确认的校外网络读到了学校通知页跳转。真实 Tampermonkey 桥接、校内和 VPN 情况仍待验收，不能把扩展原语验证说成完整功能已经完成。

检测应描述“评教入口当前是否可达”，不要判断用户的物理位置。校外使用学校 VPN 也可能可达；502、超时、证书或权限错误不能证明人在校外。

| 方向 | 能获得什么 | 结论 |
| --- | --- | --- |
| 已安装脚本的后台请求 | 在授权范围内读取最终 URL、状态和标头 | 首选候选；扩展后台校外样本已通过，油猴链路待验收 |
| 纯网页加载 HTTPS 专属图片 | 可观察图像是否加载成功，不读标头 | 条件性候选；尚未发现并验证合适的资源 |
| 普通 HTTPS 页直接 HTTP fetch | 当前被 mixed content 阻止；no-cors 也不开放响应 | 不能实现当前目标 |
| iframe / popup / postMessage | 跨源窗口信息有限；消息回复需要学校页面配合 | 不能自行读取跳转目标 |
| 普通网页 Service Worker | 可处理受控页面的请求，但不增加跨源读取权限 | 不能解决当前限制 |
| Resource Timing | 跨源详细时序和响应状态另受 TAO / CORS 限制 | 不能当成状态码或跳转读取的替代通道 |
| Chrome Local Network Access | 特定实际 local 目标可获 HTTP 例外，仍需权限 | 不是通用、首次静默、免 CORS 的方案 |
| 服务端代理 / IP、ASN / DNS / WebRTC | 看到服务器路径，或某一请求的出口线索 | 不能可靠代表用户到评教系统的路径 |

## 实测证据及边界

只执行未登录的只读请求。未保存账号、课程、用户 IP、Cookie、完整响应或 HAR；未提交评价。此前校内外采集详见 [network-access.md](network-access.md)。

| 环境 / 客户端 | 观察 |
| --- | --- |
| 用户确认校园网，HTTP 请求 | 入口 307 → 同主机首页 → CAS → `https://sso.cqu.edu.cn/login` 200；正常跟随曾依赖临时 Cookie |
| 用户确认校外、未连学校 VPN，HTTP 请求 | 302 → `/rump_frontend/access_forbidden/` → `https://net.cqu.edu.cn/info/1007/3056.htm` |
| 校外顶层浏览器导航 | 正常显示学校通知；CLI 的最终 412 不能描述为用户浏览器打不开 |
| 校内外 HTTPS 页面后台 HTTP HEAD | 均失败；随后在校外普通 `https://example.com/` 页的 Chromium 事件中明确观察到 `mixed-content` |
| 校内外本地 HTTP 预览 | cors 均失败；no-cors 均为 opaque、状态 0、无标头 |
| 校外严格 TLS、HTTP/1.1，HTTPS 入口 | HEAD 和 GET 均为 502，证书校验结果为 0（通过）；不能推断校内 HTTPS 表现 |
| 校外独立扩展后台，HTTP HEAD 与 GET | 均得到 `type: basic`、`redirected: true`、最终 URL 为上述学校通知页、最终状态 412 |
| 校外独立扩展后台，HTTPS HEAD | 原 URL 返回 502，无跳转 |

学校通知是《关于部分信息系统在校外需通过VPN访问的通知》，日期 2026-07-09，要求校外先成功接入学校 aTrust VPN。[学校通知](https://net.cqu.edu.cn/info/1007/3056.htm)

扩展实验使用已有 Playwright 的独立 Chromium persistent context、临时 Manifest V3 扩展及其 Service Worker。仅授予 `jxzljc` 的 HTTP/HTTPS、`sso` 与 `net` 的 HTTPS host permissions；没有关闭 TLS 校验或 Web 安全。请求固定入口，`credentials: omit`、`cache: no-store`、跟随跳转、10 秒超时，仅输出协议、状态、响应类型、去除查询参数的 URL 和 Content-Type，不读取正文。实验自检确认执行环境为 `chrome-extension:` 且输出 URL 不含查询参数；完成后删除测试配置。独立配置不修改用户正在使用的浏览器。[Playwright 扩展测试](https://playwright.dev/docs/chrome-extensions)

这验证的是“扩展后台可以从这台电脑读到当前校外跳转”，不是 Tampermonkey 已安装脚本与官网通信的完整验收。Chrome 扩展权限安装提示、真实油猴版本、校内 WAF、VPN 路由和其他浏览器均不由该实验覆盖。

## 首选：利用已安装的油猴脚本

Tampermonkey 官方文档明确：`GM_xmlhttpRequest` 由扩展后台发起，使用浏览器网络栈；返回 `status`、`responseHeaders` 和重定向后的 `finalUrl`。所以它仍从用户电脑访问学校，普通官网的 HTTPS → HTTP 子资源限制并不等同于这个后台请求环境。[GM_xmlhttpRequest](https://www.tampermonkey.net/documentation.php?q=GM_xmlhttpRequest)、[Chrome 跨源扩展请求](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests)

项目当前 `jxzljc.user.js` v0.3.3 只有学校入口 `@match`、`@grant none` 和 `@noframes`。实现桥接至少要：

1. 给最终官网的精确域名添加 `@match`，在官网执行独立的探测分支；当前生产域名尚未配置，不应先写通配域名。
2. 将 `@grant none` 改为所需的显式 GM 权限，并声明有限的 `@connect` 域名。Tampermonkey 检查初始与最终 URL，当前已观察到的域名是 `jxzljc.cqu.edu.cn`、`sso.cqu.edu.cn`、`net.cqu.edu.cn`，无需 `@connect *`。
3. 通过校验来源的消息，把三态结果及时间交给官网。请求 URL 固定，不接受页面传入任意 URL，不返回正文、Cookie、完整标头或带参数的 SSO URL。
4. 保留未安装、脚本未运行、权限拒绝、超时的 `unknown` 状态；首次安装后可能需要刷新官网。权限未就绪时不能承诺全程静默。

改变 grant 会改变脚本沙箱，需要回归原有评教功能；不能只改官网而声称已接通。[Tampermonkey @grant](https://www.tampermonkey.net/documentation.php?q=meta%3Agrant)、[@connect](https://www.tampermonkey.net/documentation.php?q=connect)

请求优先不携带 Cookie：`anonymous: true` 会强制 Tampermonkey fetch 模式。但官方明确 Chrome 下该模式的 `details.timeout` 不生效，需自行定时调用返回的 `abort()`；还要处理 `onerror`、权限拒绝及结束后的清理。不携带 Cookie 可能打断学校 WAF/认证跳转，因此这类失败必须是 `unknown`，不能为了识别网络自动发送账号密码或扩大数据读取范围。[GM 请求选项](https://www.tampermonkey.net/documentation.php?q=GM_xmlhttpRequest)

建议语义：

| 结果 | 证据要求 | 点击入口时的行为建议 |
| --- | --- | --- |
| `reachable` | 已验证的正常学校 / CAS / SSO 流程；不是任意 200 | 正常打开；不代表已经登录或评教业务可提交 |
| `restricted` | 本次固定入口实际到达已知拒绝访问路径或精确通知页 | 提示需要校园网或学校 VPN，再提供继续打开 / 返回 |
| `unknown` | 无脚本、权限不足、502、超时、异常跳转、验证失败等 | 提示暂时无法确认，并说明校园网 / VPN 要求；不要宣称检测到校外 |

HTTP 响应不是可验证的网络身份凭据；该结果只能辅助打开入口，不用于账号授权或安全决策。结果在网络切换后可能过期，不应长期持久化。

## 纯网页候选：HTTPS 图片

图片可以在不设置 `crossorigin` 时跨源加载，`load/error` 可观察，不要求服务器开放 CORS 标头。它只表明浏览器取得并解码了一张图像，不能读取状态或最终跳转地址。[WHATWG 图片加载](https://html.spec.whatwg.org/multipage/images.html)、[同源策略的跨源嵌入](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy)

要用于当前任务，必须找到实际资源，并在校园网、校外、VPN 下验证：HTTPS 证书与重定向有效；资源与评教入口采用相同访问边界；不依赖登录或 WAF Cookie；校外不会被替换成另一张图片；缓存不会沿用切网前的成功；页面 CSP、COEP/CORP、浏览器策略允许加载。`<img>` 不能直接配置 Fetch 的 `cache: no-store`，需要资源自身的缓存策略或经过验证的探测键。[CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy)、[COEP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy)

目前没有经过上述验证的图片 URL；不能杜撰 `/favicon.ico` 等路径为可用探针。即使找到，加载失败仍可能来自服务故障，应返回 `unknown`。另一个校内网站的图片成功，也不能自动证明评教系统可达。

## 其他浏览器方案的限制

### fetch、iframe、popup 与 Service Worker

HTTPS 页面的 HTTP fetch 是混合内容；顶层导航不同，所以用户点击链接可以到通知页而后台读取失败。no-cors 的 opaque 响应隐藏状态、标头与正文；manual 重定向在普通浏览器 Fetch 中是 opaqueredirect；error 重定向只产生错误。校内和校外都存在重定向，不能用“有跳转”二分类。[W3C Mixed Content](https://www.w3.org/TR/mixed-content/)、[WHATWG Fetch](https://fetch.spec.whatwg.org/)、[Response.type](https://developer.mozilla.org/en-US/docs/Web/API/Response/type)

HTTP iframe 仍受混合内容限制；跨源 iframe/popup 不能读取最终 `location.href`。iframe 的 load 事件不等价于业务可用。postMessage 需要学校页面主动合作，而当前没有这种已知能力。[同源策略](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy)、[iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe)、[Web Messaging](https://html.spec.whatwg.org/multipage/web-messaging.html)

普通网页 Service Worker 可以拦截其受控页面发出的跨源子资源请求，不能因此读取 opaque 响应、绕过混合内容或控制学校页面。它与拥有 host permissions 的扩展 Service Worker 是不同权限环境。[Service Worker fetch event](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/fetch_event)、[Chrome 扩展请求](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests)

Resource Timing 的重定向详细时序需要 `Timing-Allow-Origin`；`responseStatus` 的跨源开放另受 CORS 限制，不能混为同一个标头。耗时还受缓存、DNS、连接复用和拥塞影响，不是本任务可靠的识别信号。[redirectEnd](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/redirectEnd)、[responseStatus](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/responseStatus)

### Chrome Local Network Access

LNA 给真实 local/loopback 目标提供权限机制。Chrome 文档列出私网 IP 字面量、`.local`，以及显式 `targetAddressSpace: "local"` 的 mixed-content 例外；普通域名若实际解析到 local，显式注解也可能适用。因此不能简单说“只要是公网域名就绝对不适用”。[Chrome Local Network Access](https://developer.chrome.com/blog/local-network-access)

但注解不会把公网服务器变成私网服务器，也不豁免 CORS。初次权限提示违背完全静默要求，浏览器支持和策略也不同。当前没有证据表明此方案可让普通官网读取评教跳转。

本机当前系统 DNS 返回的地址属于 benchmark/test 范围，而不是 RFC1918；只记录地址类别，未保存 IP。这可能受代理或合成 DNS 影响，不能据此推断学校实际服务的地址空间，更不能当作校园网证据。尚未验证浏览器对此目标的 LNA 地址空间分类，也不建议为本功能要求用户更改浏览器安全开关。

### 服务端、IP/ASN、DNS 与 WebRTC

服务器代发请求只能验证服务器自己的路径。Cloudflare 的 `CF-Connecting-IP`、`request.cf.asn` 等描述用户访问官网时的连接出口；学校 VPN 分流可能让官网仍走公网、评教走校内。反向情况、IPv4/IPv6、代理和多出口也会影响结论。[Cloudflare HTTP headers](https://developers.cloudflare.com/fundamentals/reference/http-headers/)、[Workers Request](https://developers.cloudflare.com/workers/runtime-apis/request/)

权威 DNS 往往看到递归解析器而非用户；ECS 并非普遍发送，Cloudflare 1.1.1.1 明确不发送它。用户 DoH、VPN DNS 或缓存均可能改变路径。[Cloudflare DNS FAQ](https://developers.cloudflare.com/1.1.1.1/faq/)

WebRTC ICE/STUN 反映自己的网络路径，不是评教 HTTP 路径；分流 VPN 可能同时暴露不同出口，浏览器还会隐藏或限制候选。[RFC 8828](https://www.rfc-editor.org/rfc/rfc8828.html)、[W3C WebRTC](https://www.w3.org/TR/webrtc/)

这些启发式增加接口或隐私成本，却不能完成可靠识别；不建议为当前官网单独引入。

## 推荐与待验收范围

优先做已安装脚本的油猴桥接验证，沿用“安装油猴 → 安装脚本 → 打开系统”的既有流程。纯网页专属 HTTPS 图片只在找到真实候选后继续实验；当前无需增加后端、IP 数据库或 WebRTC。

落地前仍需验证真实 Tampermonkey 的权限与官网通信、校内无登录跳转、校外拒绝链、学校 VPN、断网/超时/502、切换网络后结果失效，以及 grant 改动对既有单文件脚本的影响。上述均与真实评教提交分开，后者未执行。

本次仅修改研究和采集文档，未接入官网探测、弹窗或用户脚本新权限。临时实验位于忽略的 `website/.qa/`，没有增加依赖或服务；文档通过 `git diff --check`。应用源码未变，未重复官网和评教交互测试。
