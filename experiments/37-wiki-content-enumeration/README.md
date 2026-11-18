# 37 - Unauthenticated Wiki.js content enumeration and staging exposure

**Question:** Does the public Wiki.js GraphQL API expose all page metadata,
including draft/staging/test pages, and are any of those pages directly
readable?

**Method:** Unauthenticated `POST https://wiki.bambulab.com/graphql` with
`{ pages { list(locale:"<locale>"){ id path title } } }`; count pages and filter
for `Staging-`, `(draft)`, and test paths. Then check a small representative set
over HTTP and compare with `/en/home`. No page content is stored here.

**Results:**

| Item | Result |
|---|---|
| EN pages listed | **3,245** |
| ZH pages listed | **3,286** |
| Strict draft/staging/test matches | **7** |
| `Staging-H2S-Network-Connection-Guide` | HTTP **200**, not linked from `/en/home` |
| `miniwiki/.../test2` | HTTP **200**, empty title |
| `a2l/...` and `p2s/...` | HTTP **200**, not in the EN home menu |
| `/en/home` | links H2S; does not link `Staging-` |

The strict matches include a `(draft)` MakerWorld release note, the
`Staging-H2S-Network-Connection-Guide`, three `miniwiki/.../test*` pages, and two
false positives (`p2s/.../extruder_motor_test` is a legitimate test method).

**Verdict:** Confirmed unauthenticated content enumeration and staging-page
exposure. The wiki is the chatbot's knowledge base; staged/draft pages are
discoverable and at least one unlinked staging page is publicly readable.
Whether the A2L/P2S pages correspond to unannounced products is outside this
test; H2S is already in the public menu.

**STAS mapping:** Source = public wiki GraphQL/HTTP; Transformation = none (page
is served as-is); Authority = the wiki is the chatbot's authoritative KB;
Sink = public users/attackers can read staging/draft content, and the bot can
retrieve it as knowledge.

**Files:** `run.js`, `results.json`, `results.txt`.

**Caveats:** Counts and status codes only; full page content and full title list
are not stored. H2S is public, so the staging page may duplicate a public guide;
treat it as staging/draft exposure, not proof of an unannounced product. Do not
scrape or republish wiki content.
