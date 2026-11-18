# 40 - Unauthenticated Wiki.js asset-folder enumeration

**Question:** Does `assets.folders` expose asset folders that have no matching
page path, and are their assets downloadable without authentication?

**Method:** Unauthenticated `assets.folders(parentFolderId:0)` and
`pages.list(locale:"en"|"zh")`; a folder is “unlinked” if no page path equals or
starts with its name. For each unlinked folder with assets, list the count and
check the first asset URL. No image bytes are stored.

**Results:**

| Item | Result |
|---|---|
| Root folders | **78** |
| Unlinked folders with assets | **40** |
| First-asset URL status | **200** for all tested examples |
| Largest examples | `screen-operation` 186, `material` 136, `wiki` 102, `create-ticket` 79 |
| Product-specific | `n1` 5 (see experiment 39) |

**Verdict:** Confirmed unauthenticated folder/asset enumeration. Most folders are
shared image/topic buckets used by pages under other paths; the `n1` folder is the
high-impact product-specific case. Low severity for the shared buckets; 39 covers
the N1 product exposure.

**Files:** `run.js`, `results.json`, `results.txt` (examples, no image bytes).

**Caveats:** Examples only; one asset per folder; no bulk download. “Unlinked”
means no page path equals the folder name, not that every asset is unpublished.
