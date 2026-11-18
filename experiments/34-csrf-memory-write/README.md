# 34 - Cross-site memory write via CORS (CSRF)

**Question:** Can a malicious web origin write into a victim's chatbot
conversation using only the body `uuid`, with no custom header and no token?

**Method:** `.com`, fresh UUID per trial.

1. Preflight `OPTIONS /gw/robot/sse/chat` with `Origin: https://evil.example`,
   `Access-Control-Request-Method: POST`, `Access-Control-Request-Headers:
   content-type`.
2. Cross-origin `POST /gw/robot/sse/chat` with `Origin: https://evil.example`,
   `Content-Type: application/json`, **no `x-robot-user` header**, and a body
   containing `uuid: <victim>` and a synthetic serial.
3. Wait 9 s; the victim recalls with normal headers.

Controls: write to a different UUID, then recall the victim UUID; and a
same-origin write/recall.

**Results:**

| Check | Result |
|---|---|
| Preflight | `200`, `ACAO: https://evil.example`, `ACAC: true`, `ACAM: POST`, `ACAH: content-type` |
| Cross-site write | `200` in **3/3** |
| Victim recall | **3/3** |
| Different-UUID control | not recalled (good) |
| Same-origin control | recalled (good) |

Sample recall: “The printer serial number you provided earlier is
**CSRF-B76228**.”

**Verdict:** Confirmed. Memory is keyed by the body `uuid`; the CORS policy
reflects the attacker origin with credentials and allows `content-type`; the
endpoint has no CSRF token. A malicious page can therefore poison a victim's
conversation if it knows the victim UUID. This is a browser-driven **CSRF**
variant of the 2026-11-10 direct write, not a repeat of it.

**STAS mapping:** Source = cross-site POST from a malicious origin;
Transformation = persistent memory; Authority = the assistant's own answer;
Sink = false data in the victim's next answer/context.

**Files:** `run.js`, `results.json`, `results.txt`.

**Caveats:** Known `uuid` required; victim must visit the attacker page; `.com`
only; synthetic serial. A random-token payload recalled **2/3** with the same
write path (timing/model variance); the serial-fact payload recalled **3/3**.
The test used the exact browser-equivalent preflight/JSON requests, not a real
browser.
