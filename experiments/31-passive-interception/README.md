# 31 - Passive interception of a victim-initiated chat turn

**Question:** Does an attacker who only opens an SSE stream, and never sends a
chat request, receive the answer to a question the victim sends?

**Method:** Three trials on `https://support.bambulab.com` with a fresh UUID per
trial. In each trial:

1. The victim client opens `GET /gw/robot/sse/connect` with `x-robot-user: <uuid>`.
2. A control client opens a stream with a different UUID.
3. The attacker client opens a second stream with the victim UUID.
4. The **victim** sends `POST /gw/robot/sse/chat` with a random marker.
5. The attacker sends nothing.

Controls: a victim-only trial per trial number (no attacker/control stream), and
a wrong-UUID control stream that must receive nothing.

**Results:**

| Mode | Victim got marker | Attacker got marker | Wrong-UUID control got marker |
|---|---|---|---|
| Victim only (control) | **3/3** | n/a | n/a |
| Victim + passive listener | **0/3** | **3/3** | **0/3** |

The victim-only control proves the chat path works. In every matched trial the
victim's own answer went to the attacker's listener and the victim's stream got
nothing.

**Verdict:** Confirmed. With a known `uuid` (the account `cusId` for a logged-in
user), a second stream takes the next answer even though the attacker sends no
`/sse/chat` request. This closes the “script-sent POST” artifact from the
2026-11-10 takeover test.

**Files:** `run.js`, `results.json`, `results.txt`.

**Caveats:** The attacker must know the victim `uuid` and must be the latest
stream for it when the victim sends. All UUIDs in this run are locally
generated; no real user was targeted. Tested on `.com` only.

**Related negative (2026-11-18):** the `uuid` is treated as an opaque string.
A control key recalled 1/1; leading zero, `+` prefix, trailing space, `X` suffix,
and scientific-notation variants did not recall. An empty key and an omitted key
did not create a shared conversation. There is no numeric/JSON rounding shortcut
to a victim's key.
