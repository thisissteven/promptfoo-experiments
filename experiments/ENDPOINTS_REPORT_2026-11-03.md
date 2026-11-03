# Findings 11-03-2026

# 2026-11-03 发现

This week I went back to the `.com` liveChat client bundle and mapped the second
API surface behind the chatbot. Besides the AI SSE chat, the bundle exposes a
customer live-chat API under `/cus/*` and a set of robot helper endpoints under
`/gw/robot/*`. I tested the high-value ones on `.com` with locally generated ids
and fake values only.

本周我回到 `.com` 的 liveChat 前端 bundle，梳理了聊天机器人背后的第二套 API 面。
除 AI SSE 聊天外，bundle 还暴露了 `/cus/*` 下的客户在线聊天 API，以及 `/gw/robot/*`
下的一组机器人辅助端点。我只在 `.com` 上用本地生成的标识符和伪造值测试了高价值
接口。

## New endpoints/新发现的端点

<img width="1626" height="966" alt="image" src="https://gist.github.com/user-attachments/assets/418ffc3c-463a-40f4-875a-ca3381462ec1" />

---

Observed/confirmed finding: the following routes are present in the `.com` client
bundle and reachable on `.com`.

观察/确认的发现：以下路由存在于 `.com` 前端 bundle 中，并且在 `.com` 上可达。

| Endpoint / 端点 | Method | Auth / 鉴权 | Result / 结果 |
|---|---|---|---|
| `/cus/message/page` | POST | login | `403 not login` |
| `/cus/message/recall` | POST | login | `403 not login` |
| `/cus/message/maskAsRead` | POST | login | `403 not login` |
| `/cus/conversation/hasActiveConversation` | GET | login | `403 not login` |
| `/cus/conversation/closeConversation` | POST | login | `403 not login` |
| `/cus/conversation/cancelQueue` | POST | login | `403 not login` |
| `/cus/context/jumpUrl` | GET | login | `403 not login` |
| `/cus/message/robot-message` | POST | login (same gateway) | identified, not tested |
| `/cus/ticket/unclosed/list` | POST | login (same gateway) | identified, not tested |
| `/cus/ticket/reminder` | POST | login (same gateway) | identified, not tested |
| `/cus/dutyRoster/config/list` | GET | login (same gateway) | identified, not tested |
| `/cus/issueType/list` | GET | login (same gateway) | identified, not tested |
| `/gw/robot/sse/close?requestId=` | GET | `uuid`-bound | same `uuid` closed; different `uuid` did not |
| `/gw/robot/front/order/query` | POST | none | requires `email` + `orderNum`; fake pair `false` |
| `/gw/robot/ticket/unclosed/list` | POST | none | fake email/phone `null` |
| `/gw/robot/im/mall/card/snapshot` | POST | token | `30002 Token expiration` |
| `/file/fileRecord/uploadFile?storageType=1` | POST | not tested (write) | identified |
| `/gw/robot/guide/show` | GET | none | public |
| `/gw/robot/guide/menu/show` | GET | none | public |
| `/gw/robot/front/category/list` | GET | none | public |
| `/gw/robot/duty/roster/show` | GET | none | `data:null` |
| `/gw/robot/ai/key/list` | GET | none | `service.error` with current params |
| `/gw/robot/front/feedback` | POST | none | requires fields; not tested for writes |

The `/cus/*` routes are served by the CSM gateway
(`oepa.bblops.com/csm/gateway`); the `/gw/robot/*` routes are served by
`support.bambulab.com`. This survey was run against `.com` only. `.cn` was used
earlier for the cross-region memory check, not for this endpoint survey; its
bundle/gateway may expose the same or a different route set.

`/cus/*` 路由由 CSM 网关（`oepa.bblops.com/csm/gateway`）提供；`/gw/robot/*`
路由由 `support.bambulab.com` 提供。本次调查仅针对 `.com`。`.cn` 此前只用于
跨区域记忆检查，未包含在本次端点调查中；其 bundle/网关可能暴露相同或不同的路由。

## Access-control results/鉴权测试结果

The `/cus/*` endpoints all require a login. I called them without logging in and
got `403 {"code":"30003","data":"not login"}`. So without a customer account I
could not read the message history, mark messages as read, or delete a message
by ID. This is not a vulnerability, but it is useful: it shows those parts are
protected.

`/cus/*` 这些接口都需要登录。我在未登录的情况下调用，返回
`403 {"code":"30003","data":"not login"}`。所以没有客户账号就无法读取消息历史、
标记已读，也无法按 ID 删除消息。这不是漏洞，但很有用：说明这些功能是受保护的。

From `experiments/08-im-endpoints/results.json`:

来自 `experiments/08-im-endpoints/results.json`：

```json
{
  "name": "message page",
  "method": "POST",
  "url": "https://oepa.bblops.com/csm/gateway/cus/message/page",
  "status": 403,
  "body": "{\"msg\":\"Have no authority\",\"code\":\"30003\",\"data\":\"not login\"}"
}
```

```json
{
  "name": "message recall (invalid id)",
  "method": "POST",
  "url": "https://oepa.bblops.com/csm/gateway/cus/message/recall",
  "status": 403,
  "body": "{\"msg\":\"Have no authority\",\"code\":\"30003\",\"data\":\"not login\"}"
}
```

`GET /gw/robot/sse/close?requestId=<id>` is bound to the `uuid`. With the same
`uuid` and matching `requestId`, the stream closed (0 events, no output). With a
different `uuid` and the same `requestId`, the stream continued (19 events, 2041
characters). Knowing a `requestId` alone is not enough.

`GET /gw/robot/sse/close?requestId=<id>` 绑定 `uuid`。相同 `uuid` 和匹配的
`requestId` 会关闭流（0 个事件，无输出）。不同 `uuid` 和相同 `requestId` 时，
流继续（19 个事件，2041 个字符）。仅知道 `requestId` 不足以关闭。

```json
"sseClose": {
  "sameUuid": {
    "closeWith": "same",
    "closeStatus": 200,
    "events": 0,
    "done": false,
    "outputLen": 0
  },
  "differentUuid": {
    "closeWith": "different",
    "closeStatus": 200,
    "events": 19,
    "done": false,
    "outputLen": 2041
  }
}
```

Two endpoints do not require a login, but they are keyed by an email:
`/gw/robot/front/order/query` requires `email` + `orderNum` and returns a boolean
(a fake pair returned `false`), and `/gw/robot/ticket/unclosed/list` accepts
`email` or `phone` and returned `null` for fake values. These could be used to
check whether an email or order exists, but they are not confirmed data leaks,
because no real identifier was used. They should be tested with a controlled
account.

两个端点无需登录，但以 email 为键：`/gw/robot/front/order/query` 要求 `email` +
`orderNum` 并返回布尔值（伪造组合返回 `false`），`/gw/robot/ticket/unclosed/list`
接受 `email` 或 `phone`，对伪造值返回 `null`。这些可能可以用来检查某个 email
或订单是否存在，但不是已确认的数据泄露，因为未使用真实标识符。应使用受控账户测试。

```json
{
  "name": "order query (email + fake orderNum)",
  "method": "POST",
  "url": "https://support.bambulab.com/gw/robot/front/order/query",
  "status": 200,
  "body": "{\"code\":\"000000\",\"msg\":\"操作成功\",\"traceId\":\"...\",\"data\":false}"
}
```

```json
{
  "name": "ticket unclosed (fake email)",
  "method": "POST",
  "url": "https://support.bambulab.com/gw/robot/ticket/unclosed/list",
  "status": 200,
  "body": "{\"code\":\"000000\",\"msg\":\"操作成功\",\"traceId\":\"...\",\"data\":null}"
}
```

`/gw/robot/im/mall/card/snapshot` requires a token (`30002 Token expiration`). The
guide/category/duty endpoints return public content; this is expected.

`/gw/robot/im/mall/card/snapshot` 需要 token（`30002 Token expiration`）。
guide/category/duty 端点返回公开内容，符合预期。

```json
{
  "name": "mall card snapshot (invalid)",
  "method": "POST",
  "url": "https://support.bambulab.com/gw/robot/im/mall/card/snapshot",
  "status": 200,
  "body": "{\"code\":\"30002\",\"msg\":\"Token expiration\",\"data\":\"Not Authenticated\"}"
}
```

## HTML exfiltration attempt/HTML 外泄尝试

Another finding this week is that the HTML/data-exfiltration attempt did not
work. I tried to make the model output HTML tags and attributes: event handlers
(`onload`, `onerror`), image URLs carrying context data, CSS, links and forms.
The API returned the tags, but the UI sanitizes them with DOMPurify 3.3.3.
Event-handler attributes are stripped, so the attempt did not work in the
browser.

本周的另一个发现是 HTML/数据外泄尝试没有成功。我尝试让模型输出 HTML 标签和属性：
事件处理器（`onload`、`onerror`）、携带上下文数据的图片 URL、CSS、链接和表单。
API 返回了这些标签，但 UI 使用 DOMPurify 3.3.3 进行净化。事件处理器属性被剥离，
因此该尝试在浏览器中没有成功。

From `experiments/05-html-injection/results.json`:

来自 `experiments/05-html-injection/results.json`：

```json
{
  "name": "details ontoggle",
  "survived": ["<details", "ontoggle"],
  "outputHead": "<details open ontoggle=\"document.title='XSS-CANARY'\">test</details>
PLA (Polylactic Acid) is a type of filament derived from natural sources such as corn and
sugarcane. According to the documentation for **Bambu Lab PLA Pure**, it is a material designed with"
}
```

<img width="1050" height="593" alt="image" src="https://gist.github.com/user-attachments/assets/a4811ec2-5008-4e41-a3bd-9f7c8371743a" />

## Key takeaway/关键结论

The main result is the endpoint map: a second API surface with a clear
access-control boundary. The customer live-chat history/delete/conversation endpoints
require a login; `sse/close` is tied to the `uuid`; the public endpoints are
expected. The two email-keyed endpoints that do not require a login are leads,
not confirmed findings. The HTML/data-exfiltration attempt did not work because
of DOMPurify.

主要结果是端点清单：一个此前未记录的 API 面，具有清晰的访问控制边界。客户在线聊天
历史/删除/会话端点需要登录；`sse/close` 绑定 `uuid`；公开端点符合预期。两个
无需登录的 email 端点是线索，不是已确认发现。HTML/数据外泄尝试未成功，因为 UI
使用 DOMPurify。