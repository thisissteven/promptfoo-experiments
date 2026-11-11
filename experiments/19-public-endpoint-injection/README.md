# 19 — Public `/gw/robot/*` endpoints, reflection, and CORS

**Question:** Are the public support endpoints injectable, do they expose
internal data, and which new endpoints exist?

**Method:**
- Reflection/fuzz payloads (`<script>`, `"><img onerror>`, `${7*7}`, `{{7*7}}`,
  `%00`, `../`) on `guide/menu/show`, `guide/show`, `front/category/list`,
  `duty/roster/show`, `knowledge/tag/list`, `banner/list`, `ai/key/list`.
- `POST /gw/robot/front/fuzzy` with benign, injection, SQLi/NoSQLi, traversal,
  and long inputs.
- `POST /gw/robot/ai/key/collect` with arbitrary ids.
- CORS preflight from `https://evil.example` on the robot write/chat endpoints.
- Endpoint inventory extracted from the public source maps.

**Results:**
- `languageCode` payloads are not reflected; Cloudflare blocks `<script>`/`../`.
  Valid values return server-side Lark HTML or `data:null`/`[]`.
- `front/fuzzy` returns KB question topics with server-generated highlight
  `<span>` tags; no HTML injection or SQL errors. It is a public KB search.
- `ai/key/collect` accepts unauthenticated writes.
- CORS reflects any origin with credentials on `front/report`,
  `ai/key/collect`, `front/fuzzy`, and `sse/chat`.
- New endpoints: `knowledge/tag/list`, `banner/list`, `front/fuzzy`,
  `ai/key/collect`, and several `/cus/*` endpoints (see `endpoints.txt`).

**Verdict:** No injection in the public content endpoints. The CORS
misconfiguration is real but mostly affects unauthenticated endpoints; `/cus/*`
auth is an `Authorization` header, not an `oepa` cookie.

**Files:** `probe-public.js`, `probe-reflection.js`, `probe-new-endpoints.js`,
`probe-preflight.js`, `list-endpoints.js`, `endpoints.txt`, `results-*.txt`.