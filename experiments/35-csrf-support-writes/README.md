# 35 - Cross-site support writes via CORS (report/feedback CSRF)

**Question:** Can a malicious web origin submit support reports and feedback
with an arbitrary `userId`, without authentication or a CSRF token?

**Method:** `.com`. Preflight `OPTIONS` on `/gw/robot/front/report` and
`/gw/robot/front/feedback` with `Origin: https://evil.example`,
`Access-Control-Request-Method: POST`, `Access-Control-Request-Headers:
content-type`. Then 3 cross-origin JSON POSTs per endpoint with synthetic
`CSRF-...` markers as `userId`.

**Results:**

| Endpoint | Preflight | Cross-origin writes |
|---|---|---|
| `/gw/robot/front/report` | `ACAO: https://evil.example`, `ACAC: true`, `ACAM: POST`, `ACAH: content-type` | **3/3 `data:true`** |
| `/gw/robot/front/feedback` | same | **3/3 `data:true`** |

No victim `uuid` is needed; the `userId` is attacker-chosen.

**Verdict:** Confirmed CSRF. Any website can make a visitor's browser submit
reports/feedback with an arbitrary `userId`. Impact is support-queue spam and
attribution poisoning; the agent-console sink was not observed. This is a
browser-driven variant of the 2026-11-10 direct unauthenticated writes, with a
lower precondition (no known `uuid`).

**Files:** `run.js`, `results.json`, `results.txt`.

**Caveats:** `.com` only; synthetic `userId` markers only; no real user IDs; the
support console/review UI was not accessible, so stored XSS or agent-side
rendering is unconfirmed. Do not flood the production queue.
