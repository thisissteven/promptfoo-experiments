# Promptfoo 11-10 - local Phase 1 pilot

Promptfoo Cloud is a paid/hosted service; the default local CLI is free and was used here (promptfoo 0.124.0). No cloud/remote generation was required for this pilot.

**Targets:** `support.bambulab.com` (EN) and `support.bambulab.cn` (CN), via `latest/bambuProvider.js`.

**Plugins:** `bfla`, `bola`, `rbac`, `tool-discovery`, `system-prompt-override`, `prompt-extraction`, `hijacking`, `cca`, `rag-source-attribution`.

**Volume:** 2 tests per plugin, 2 targets = 36 tests.

**Results:**

| Target | Pass | Fail | Error |
|---|---|---|---|
| `.com` | 16 | 0 | 2 (stream timeout 60s) |
| `.cn` | 16 | 0 | 2 (stream timeout 60s) |

No failures, so there were no findings to compare for false positives. The 4 errors are stream timeouts, not positive findings; retry/scale if needed.

**Files:** `pilot.yaml`, `pilot-results.json`, `pilot.log`, `phase1.yaml`, `phase1-results.json`, `phase1.log`, `summary*.js/log`.
