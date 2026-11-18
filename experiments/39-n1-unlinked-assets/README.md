# 39 - Unlinked "n1" product asset folder before any public N1 page

**Question:** Does the public Wiki.js asset API expose a product asset folder for
an N1 model that has no public wiki page?

**Method:** Unauthenticated `assets.folders(parentFolderId:0)`; find `n1`; list
its assets; check `/en/n1`, `/zh/n1`, `/en/n1/manual`, `/zh/n1/manual`; search
pages for `N1`; request each `/n1/<filename>` and record status/content-type/
size. **No image bytes are saved.**

**Results:**

| Item | Result |
|---|---|
| `n1` folder | id **336**, name **n1** |
| Assets | **5** images (purge/wiper assembly, X-axis assembly, X-axis belt, X idler, `com.jpg`) |
| Public N1 page | **none** (`/en/n1`, `/zh/n1`, `/en/n1/manual`, `/zh/n1/manual` all 404) |
| Page search `N1` | 19 generic hits; no `n1` page |
| Downloads | **5/5 HTTP 200** (`image/jpeg`/`image/png`; 58–578 KB) |

**Verdict:** Confirmed unauthenticated access to an **unlinked `n1` product
asset folder** with five downloadable component images while no public N1 page
exists. This is a **pre-release/product-asset exposure** candidate; it is
**critical for confidentiality if N1 is unannounced**, and at minimum a high
content exposure. No user PII and no token/second account are involved.

**STAS mapping:** Source = public wiki asset GraphQL/HTTP; Transformation = none;
Authority = wiki asset namespace; Sink = public download of unlinked product
assets.

**Files:** `run.js`, `results.json`, `results.txt` (filenames/status/size only).

**Caveats:** Whether N1 is announced elsewhere was not tested; the folder could
be stale test content. Do **not** republish the images or download them in bulk.
Filenames are public; image content is not stored here.
