# 17 — Agent tool / IDOR and unauthenticated writes

**Question:** Can the chatbot's order/ticket tools be driven with attacker data,
and are the robot write endpoints authenticated?

**Method:**
- Chat prompts asking the bot to check an order/ticket with a fake
  `test@example.com` and order number; inspect SSE events for tool metadata.
- Type-confusion payloads (`__proto__`, `constructor`, arrays, numbers, null,
  deep objects, long strings, null bytes) against `order/query`,
  `ticket/unclosed/list`, `feedback`, `report`, and the chat body.
- Valid-shape writes to `front/report`, `front/feedback`, `ticket/reminder`.
- `chatType` continuations (`interactionCardSubmitted`,
  `sellingLogisticsSubmitted`, `sellingOrdersSubmitted`) with arbitrary
  `interactionCardClientId` / `submissionId`.

**Results:**
- Order status is gated: the bot answers “Please log in and select your order”.
  No tool-level IDOR observed.
- `POST /gw/robot/front/report` accepts arbitrary `reportDetail`,
  `messageContent`, `extendField4`, `userId`, `sessionId`, `requestId` and
  returns `data:true` with **no auth**. Both benign and `<img onerror>` payloads
  were accepted.
- `POST /gw/robot/front/feedback` also returns `data:true` with **no auth** for
  valid-shape payloads, including an arbitrary 19-digit `userId` and an
  `<img onerror>` payload (6/6 variants succeeded).
- `POST /gw/robot/ai/key/collect` also accepts unauthenticated writes.
- Type confusion returns generic `B00999`/validation errors; no stack traces.
- `chatType` continuations return empty answers; no order/card data.
- `ticket/reminder` returns “工单不存在” for fake IDs.

**Verdict:** No AI tool IDOR. The report and feedback endpoints are real
unauthenticated writes; the feedback endpoint also accepts an arbitrary
`userId`, so attribution is unverified. The sink (agent console/review UI) was
not accessible, so stored XSS is unproven.

**Files:** `probe-tools.js`, `probe-type-confusion.js`, `probe-writes.js`,
`probe-chattypes.js`, `probe-interaction-card.js`, `results-*.txt`.