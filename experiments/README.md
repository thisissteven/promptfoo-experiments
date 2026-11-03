# Bambu Lab experiments

Each folder is a self-contained experiment with a README describing what it is
about and what the results were.

| Folder | Question | Result |
|---|---|---|
| [`00-provenance-audit`](00-provenance-audit/README.md) | Are the existing "leaks" real or confabulated? | System prompt and tool list are confabulated; reasoning trace was real. |
| [`01-cot-membership-oracle`](01-cot-membership-oracle/README.md) | Can the reasoning trace confirm specific system-prompt sentences? | Yes, historically (section-level leakage). Blocked as of 2026-11-03. |
| [`02-persistent-instruction-injection`](02-persistent-instruction-injection/README.md) | Does accumulated-sentence priming control later behavior? | **Confirmed 3/3** - suppressed the mandatory power-off warning. |
| [`03-session-isolation`](03-session-isolation/README.md) | Can a known `sessionId` read another conversation? | No - history follows `uuid`, not `sessionId`. |
| [`04-uuid-keyed-memory`](04-uuid-keyed-memory/README.md) | Is memory keyed by `uuid` or `sessionId`? | **`uuid` alone** - new chats recall old turns; cross-session priming works 3/3. |
| [`05-html-injection`](05-html-injection/README.md) | Does model HTML reach an unsanitized DOM sink? | API-level yes, but the **live UI strips `on*` attributes** - XSS not confirmed. Payload carried across sessions 2/3. |
| [`06-negative-probes`](06-negative-probes/README.md) | Are client-controlled fields / channels exploitable? | No - history/chatbot rejected, machineModel ignored, control tokens and lang tags inert, cache and SSE scoped. |
| [`07-region-and-format`](07-region-and-format/README.md) | Is memory shared across regions; is `uuid` validated? | No cross-region memory; no region-header bypass; **any string** is accepted as `uuid`. |
| [`08-im-endpoints`](08-im-endpoints/README.md) | Are the IM / robot endpoints reachable without login? | `/cus/*` is auth-gated; `sse/close` is bound to `uuid`; `order/query` and `ticket/unclosed/list` are unauthenticated but only lead-level. |
| [`09-image-exfil`](09-image-exfil/README.md) | Can the model put context data into an `<img src>` URL? | Yes (serial 3/3, victim-data 3/3), but this is a **mechanism, not a standalone finding** - redundant with 04's read primitive. |

## The short version

- The strongest finding is **04**: conversation memory is keyed by the
  client-supplied `uuid` (`x-robot-user`), so a new `sessionId` keeps the last
  nine turns and a shared `uuid` allows cross-session priming.
- **05** is only an API-level HTML-emission result. The live UI strips
  `onload`/`onerror`, so it is **not** a confirmed XSS unless a sanitizer bypass
  is found.
- **09** is a mechanism, not a standalone finding: the model will put context
  data into an allowed `<img src>` URL, but if the attacker can query the model
  they already see the data in the response, and if they cannot, the `uuid` write
  channel is also a read channel. It only matters with a non-read injection
  channel, which has not been found.
- **Experiment 02** remains a standalone persistent instruction-injection
  primitive that suppressed a safety warning on a hardware disassembly answer.
- The system-prompt and tool-list "leaks" should not be reported; the model
  invents them (experiment 00).
- The reasoning/CoT channel was real but has been closed (experiment 01).
- `sessionId` is not a conversation key (experiment 03); `uuid` is (experiment 04).
- The client-controlled fields and channels in experiment 06 are not exploitable.
- `.com` and `.cn` keep separate memory and the region header does not change
  policy, but the server accepts any string as `uuid` (experiment 07).
- The IM history/delete/conversation endpoints are auth-gated, and `sse/close`
  is bound to `uuid`; `order/query` and `ticket/unclosed/list` are unauthenticated
  but not confirmed to return another customer's data (experiment 08).

## Reproducing

Experiments 01-06 need Node 18+ and the repo's `undici` dependency:

```powershell
npm install
node experiments/00-provenance-audit/audit.js
node experiments/02-persistent-instruction-injection/run.js
node experiments/03-session-isolation/session-isolation.js
node experiments/04-uuid-keyed-memory/run.js
node experiments/04-uuid-keyed-memory/run.js --eviction
node experiments/05-html-injection/run.js
node experiments/05-html-injection/run-followup.js
node experiments/06-negative-probes/run.js
node experiments/07-region-and-format/run.js
node experiments/08-im-endpoints/run.js
node experiments/09-image-exfil/run.js
```

Promptfoo configs are also provided for 01 and 02; run them from their folders.

All live tests use only sessions created by the script. No third-party data is
read.