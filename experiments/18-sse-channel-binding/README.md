# 18 — SSE channel binding and client identifier handling

**Question:** Is the live SSE stream bound to the `uuid`, the `requestId`, or the
`x-robot-user` header — and can a client with a different identity receive or
take over another stream?

**Method:** Concurrent `GET /gw/robot/sse/connect` streams and
`POST /gw/robot/sse/chat` requests with controlled `uuid`/header/`requestId`
combinations:
- two streams with the same `uuid`, one chat;
- header A + body `uuid` V (mismatch);
- same `requestId` across two `uuid`s;
- connect replay without a chat;
- wildcard/pattern `uuid`s (`*`, `?`, `V*`, `%`).

**Results:**
- **Two streams, same `uuid`:** only the most recently opened stream receives the
  answer; the first gets nothing. This is the stream-takeover primitive.
- **Header/body mismatch:** the answer is not delivered to the header stream; the
  turn is stored under the **body** `uuid` (the victim's memory).
- **`requestId` collision:** the second request is effectively suppressed; no
  cross-stream leak.
- **Connect replay:** no history is replayed on connect.
- **Wildcards:** `*`, `?`, `V*`, `%` do not act as patterns.

**Verdict:** The SSE stream is keyed by the `x-robot-user` header, but memory is
keyed by the body `uuid`; the latest connection for a `uuid` wins. See the
cross-user experiment for the full read/write/takeover PoC.

**Files:** `run.js`, `results.json`, `download-bundle.js` (public source maps),
`extract.js`, `dump.js`, `sinks.js`.

**Caveat:** All ids are locally generated; no real user was targeted. The source
maps are public, so `bundle/` is not sensitive, but it is large and should not be
committed if space matters.