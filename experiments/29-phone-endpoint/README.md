# 29 - Phone-keyed ticket lookup (authorized phone only)

**Question:** Does `/gw/robot/ticket/unclosed/list` allow enumeration, or only an exact-match existence check?

**Method:** Used the account owner's own phone only (redacted), with formatting variants and fake values. Tested `.com` and `.cn`. No other user's phone was used.

**Results:**

| Input | `.com` | `.cn` |
|---|---|---|
| Own phone | `null` | `null` |
| `+86` / `86` prefix | `null` | `null` |
| Spaces / dashes / leading 0 | `null` | `null` |
| Last digit changed | `null` | `null` |
| Fake phone | `null` | `null` |
| Empty | `B00110` | `B00110` |

Timing was flat/noisy (own ~380-574 ms; fake ~421-6728 ms with one outlier). No enumeration or data leak was observed. The account has no unclosed tickets, so the exact-match/normalization behavior could not be confirmed; the endpoint returned no data for any variant.

**Verdict:** No confirmed enumeration or data leak for this account. The endpoint behaves like a keyed lookup that returned `null`; a phone with a known ticket would be needed to distinguish exact-match from normalization.

**Files:** `run.js`, `results.json`, `results.txt`.
