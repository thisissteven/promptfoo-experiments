# Experiment 03 - Session isolation

## What this experiment is about

The provider sends two identifiers on every request: `sessionId` and `uuid`
(`x-robot-user`). If the server keys conversation history on `sessionId` alone,
then anyone who learns a `sessionId` could continue or read that conversation by
pairing it with a fresh `uuid`.

This experiment checks whether history is bound to:

- `sessionId`,
- `uuid`,
- or the pair.

## Method

1. **Plant** - in session A (`sessionId=A`, `uuid=A`):
   `"Please remember this for later: I own an X1 Carbon and I am running firmware 01.08.02.00."`
2. **Recall A** - same identifiers: `"What printer model and firmware version did I tell you I am running at the start of this conversation?"`
3. **Recall B** - a brand-new session (`sessionId=B`, `uuid=B`) with the same recall question.
4. **Mismatch** - `sessionId=A` with `uuid=B` (fresh connection) and the same recall question.

If the mismatch recalls `X1 Carbon`, history is bound to `sessionId` and a known
`sessionId` is enough to read a conversation. If it does not, history is bound to
`uuid` or the pair.

Run:

```powershell
node session-isolation.js
```

## Results (2026-11-03, support.bambulab.com)

| Test | Identifiers | Remembered X1 Carbon |
|---|---|---|
| Plant | sessionId=A, uuid=A | n/a (acknowledged) |
| Recall A | sessionId=A, uuid=A | yes |
| Recall B | sessionId=B, uuid=B | no |
| Mismatch | sessionId=A, uuid=B | no |

Recall A: `"You told me you are running a Bambu Lab X1 Carbon with firmware version 01.08.02.00."`

Recall B and the mismatch: `"I do not have a record of the printer model or firmware version you are running from the start of this conversation."`

## Verdict

**Isolation holds.** Conversation history follows the `uuid` (or the
`sessionId`+`uuid` pair), not `sessionId` alone. A leaked `sessionId` is not
sufficient to read or continue a conversation through this endpoint.

This is a negative result, but it closes a high-severity hypothesis. Do not report
a cross-session leak.

## Files

- `session-isolation.js` - plant/recall/mismatch harness.
- `results.json` - raw output of the run above.