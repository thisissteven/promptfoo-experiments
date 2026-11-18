# 42 - Unauthenticated store guest identity creation on a GET

**Question:** Does `GET /mall-userms/user/ms/user/info` create a new guest user
on every call, with an arbitrary `x-bbl-account-access` and no auth?

**Method:** Unauthenticated `GET /mall-userms/user/ms/user/info` on
`na-store-api.bambulab.com` with `x-bbl-account-access: DEFAULT_C`, 3 times;
record status/code, 18-digit `userId` length, and SHA-256 prefix only (no PII).
Also check `shippingAddress/queryList`, `cart/size`, `checkout/token/create`,
and a synthetic `cart/add`.

**Results:**

| Check | Result |
|---|---|
| 3 `user/info` calls | **3/3 code 1**, 18-digit `userId` each |
| Distinct `userId` hashes | **3/3 distinct** with the same header |
| `shippingAddress/queryList` | `40100 Unauthorized` |
| `cart/size` | `cartSize: 0` |
| `checkout/token/create` | `token: null` (empty cart) |
| `cart/add` (synthetic SKU) | `10012` business error |
| Test-account `cusId` as access key | **did not match**; a new guest was created |

**Severity:** Low/Medium. Not critical: no auth bypass, no PII, no cross-account access, and no measured rate-limit/DoS impact. This is a lead, not a confirmed critical finding.

**Verdict:** Lead. The store mints a **new guest identity on every GET** for the
same `x-bbl-account-access` value, with no auth and no rate limit observed. This
is a **mass guest-account/ID creation (DoS/business abuse) lead**, not a
cross-account data leak: the test `cusId` did not match a store user, and
shipping addresses are 401.

**Caveats:** 3 calls only; no flood test. No PII values stored; only hashes and
status. If the store intends to create a guest per request, impact is resource
exhaustion/DB growth, not user-data access.

**Files:** `run.js`, `results.json`, `results.txt`.
