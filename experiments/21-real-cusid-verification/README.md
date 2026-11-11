# 21 — Controlled verification with a second test account's `cusId`

**Purpose:** verify the cross-user primitive from experiment 20 against a real,
logged-in test account's `cusId` instead of a synthetic UUID. This is the
missing severity gate: does a real account's conversation behave like the
synthetic `uuid`?

**What to provide:** only the second **test** account's numeric `cusId`. Do not
provide passwords, JWTs, cookies, or real order/ticket data. The script uses
synthetic markers and never prints or saves the full `cusId`.

**Run:**

```powershell
$env:VICTIM_CUSID="<second test account cusId>"
node experiments/21-real-cusid-verification/run.js --confirm-test-account
```

Optional: `$env:VICTIM_REGION="CN"` (default `.com` / `EN`),
`$env:SKIP_TAKEOVER="1"`.

**What each step proves:**

| Step | Test | What it verifies |
|---|---|---|
| 1 | Decode the Snowflake | account creation timestamp, worker id, sequence; lets us compare with a second account's id to estimate ID density |
| 2 | Plant a synthetic marker as the test account | establishes a known conversation turn |
| 3 | Read with an unauthenticated client using the `cusId` | whether a real logged-in conversation is readable by anyone who knows the `cusId` |
| 4 | Ask for name/email/phone, recent orders, open tickets | whether the chatbot treats the `cusId` as identity and exposes account context to an unauthenticated caller. Only classification flags are saved, never the raw answer. |
| 5 | Write with attacker header + victim body `uuid` | whether the body/header mismatch works on a real `cusId` |
| 6 | Ask the test account for the poisoned fact | whether the injected fact is used in the victim's next answer |
| 7 | Two streams with the same `cusId` | whether the latest stream takes over the victim's answer |
| 8 | Bogus `Authorization` header | whether a token is required at all for that `cusId` |

**What this cannot prove:**

- That a stranger's `cusId` can be obtained. A second account confirms the
  primitive and lets us measure the Snowflake gap, but not real-world
  enumeration or leakage.
- The agent-console rendering of report payloads.
- Rate limiting or detection behavior.

**Output:** `results.json` with the `cusId` redacted to `abc...wxyz` plus a
SHA-256 prefix. The full `cusId` is never written to disk.

**Safety:** the script only calls the chat endpoints with synthetic text. It
does not call `sse/close`, `message/recall`, order/ticket endpoints, or any
destructive API. It is intended for a test account you own.