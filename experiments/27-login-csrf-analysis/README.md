# 27 — `?ticket=` / `?bblToken=` login-CSRF analysis

**Question:** Can the login flow be turned into a login-CSRF chain that makes
F1 practical without guessing a `cusId`?

## Code path (public source maps)

`app/lib/AuthProvider.tsx` → `checkAuth()`:

1. Reads `ticket` and `bblToken` from `window.location.search`.
2. `resolveBblTokenFromQuery(rawBblToken)`:
   - AES-GCM decrypt with the public `NEXT_PUBLIC_ENTRY_AES_KEY`.
   - Plaintext is `token|expireAtMs`; expiry is checked.
   - Returns the inner token with no signature/format validation.
3. If `ticket` exists: `POST /cus/auth/ticket/login {ticket}`; on success stores
   the returned access/refresh tokens and `cusInfo`, then removes `ticket`,
   `redirect`, and `bblToken` from the URL.
4. Else if `bblToken` exists: `POST /cus/auth/bbl-token/login` with
   `bbl_token: Bearer <inner token>`.
5. `AuthService.login()` reads `redirect` from the URL and calls
   `window.location.replace(redirect)` after a successful ticket login.

There is **no client-side binding** of the ticket/token to the browser, a
nonce, or a prior session.

## What the server rejects (tested)

| Input | Result |
|---|---|
| Forged AES-GCM `bblToken` with `DUMMY\|<future>` | `30001 Login information is invalid` |
| Forged AES-GCM `bblToken` with an `alg:none` JWT | `30001` |
| `alg:none` JWT as `ticket` | `30001` |
| `HS512` JWT signed with `secret`/`bambulab` as ticket | `30001` |
| Support JWT as `bbl_token` (worklog 11) | `30001` |
| Expired access token on refresh | `30002` |

So the server is the security boundary; the client will happily forward any
structurally valid ticket/token, but forged ones are rejected.

## The chain

If an attacker has a **valid ticket** (from their own account) or a **valid mall
token** (to build a `bblToken` with the public AES key):

1. Send the victim `https://support.bambulab.com/liveChat?ticket=<attacker's ticket>`
   (or `?bblToken=<forged-with-own-mall-token>`).
2. The victim's browser logs into the **attacker's** account.
3. The attacker knows their own `cusId`.
4. The attacker reads/poisons the victim's conversation via F1/F8, and any PII
   the victim enters lands in the attacker's account.

This would make F1 practical even if the Snowflake space is sparse. It was not
tested end-to-end because no valid ticket/mall token was available.

## Token leakage checks

- `Referrer-Policy: strict-origin-when-cross-origin` on `/liveChat`; the query
  string is not sent cross-origin.
- `trackSession.ts` / `TrackProvider.tsx` read `channel` and `from` from the URL,
  not `ticket`/`bblToken`; no analytics leak found in the client code.
- The URL params are deleted with `history.replaceState` after login, but the
  ticket may remain in browser history/server logs.

## Guest `uuid` fixation

`createSessionId()` reads/writes `sessionStorage.SESSION_ID`; no URL parameter
sets it. `useURLSearchParams` persists only `channel`/`store`. A shared link
cannot fix a guest `uuid`; only script execution on the support origin could.

## Agent-console canary

Submitted four HTML payloads (report/feedback, `<img onerror>` and `<svg onload>`)
pointing at a unique `webhook.site` canary. All four writes returned `data:true`.
No callback arrived within 2 minutes. **Inconclusive**: the agent may not have
viewed the report, or the console may sanitize. The payload did not exfiltrate
any data, only a marker.

Evidence: `26-hiagent-variables/results-agent-canary.json`.

## Conclusion

The login-CSRF chain is code-supported and is the highest-value next test, but it
requires a valid ticket or mall token. No client-side validation bypass, no
token leak via referrer/analytics, and no guest-`uuid` link fixation were found.