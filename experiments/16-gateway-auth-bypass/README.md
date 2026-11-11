# 16 — CSM gateway auth and IP-allowlist probes

**Question:** Are the `/cus/*` APIs reachable without login, and can the gateway's
IP allowlist (which protects `actuator`/`swagger`) be bypassed with forwarding
headers or path normalization?

**Method:** Requests to `https://oepa.bblops.com/csm/gateway` with:
- `/cus/*` path variants (`//`, `//cus`, `;.js`, `%63us`, `%6dessage`, `..`, `.`,
  uppercase `CUS`, trailing slash);
- forwarding headers (`X-Forwarded-For`, `X-Real-IP`, `X-Client-IP`,
  `CF-Connecting-IP`, `True-Client-IP`, `Forwarded`, `X-Original-URL`,
  `X-Rewrite-URL`, `X-Forwarded-Host`);
- `Host: localhost` / `Host: 127.0.0.1`;
- traversal from the allowlisted `/cus/` prefix to `actuator`/`swagger`;
- unauthenticated calls to newly found `/cus/*` endpoints.

**Results:**
- `actuator`, `swagger-ui`, `v3/api-docs`, `health`, `metrics` → `403 IP address
  not allowed: <our exit IP>`; no header/Host bypass worked.
- `/cus/*` → `403 {"code":"30003","data":"not login"}`; path/case variants did not
  bypass. Uppercase `CUS` falls outside the allowlist and is IP-blocked.
- New endpoints: `GET /cus/dutyRoster/config/list` is **unauthenticated** and
  returns roster HTML/config. `POST /cus/auth/ticket/login` is reachable and
  validates a ticket (`30001` for fake values). All other tested `/cus/*`
  endpoints are login-gated.
- Upload endpoint `POST /gw/file/fileRecord/csm/uploadWithName` works
  unauthenticated; `.html`/`.svg` are served as `application/octet-stream` +
  `Content-Disposition: attachment`, so no XSS. Traversal filenames were blocked
  by Cloudflare or stored literally (no traversal).

**Verdict:** Gateway auth and IP allowlist hold. The only new gaps are the
unauthenticated roster config and the ticket-login surface.

**Files:** `probe-discovery.js`, `probe-auth.js`, `probe-ip-bypass.js`,
`probe-cus-endpoints.js`, `probe-upload2.js`, `probe-roster-config.js`,
`results-*.txt`.

**Caveat:** Do not brute-force `/cus/auth/ticket/login`; ticket format and
rate-limiting were not tested. Do not test uploads against other users' buckets.