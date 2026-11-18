# 38 - Unauthenticated Wiki.js asset enumeration

**Question:** Does the public Wiki.js GraphQL `assets.list` expose uploaded
filenames, including non-image config/script assets, without authentication?

**Method:** Unauthenticated `POST /graphql`
`{ assets { list(folderId:0, kind:ALL){ filename } } }`. Count/extensions; check
two non-image assets over HTTP:
- `/user_wifi.cfg`
- `/software/fix-bambu-studio.bat`

No bulk download and no unrelated content.

**Results:**

| Item | Result |
|---|---|
| Assets listed | **486** |
| Extensions | 171 jpg, 197 png, 36 jpeg, 44 gif, 6 jfif, 18 webp, **11 pdf**, **1 cfg**, **1 bat**, 1 mp4 |
| `/user_wifi.cfg` | **200**, `application/octet-stream`, 35 bytes; sample placeholders `ssid:wifiname` / `password:wifipassword`; **no real secret** |
| `/software/fix-bambu-studio.bat` | **200**, public Bambu Studio config-fix script |

**Verdict:** Confirmed unauthenticated asset enumeration. The exposed config is a
**sample template**, not a credential leak; the `.bat` is a public support
script. Low severity: the wiki exposes its uploaded-file inventory, and a future
real config/internal file in the asset root would be directly downloadable.

**STAS mapping:** Source = public wiki GraphQL/HTTP; Transformation = none;
Authority = wiki asset namespace; Sink = public filename enumeration and sample
asset download.

**Files:** `run.js`, `results.json`, `results.txt`.

**Caveats:** Counts/status only; no bulk download; the sample config contains
placeholders. Do not scrape or republish wiki assets.
