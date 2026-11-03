# Experiment 07 - Region isolation and `uuid` format validation

## What this experiment is about

Experiment 04 showed that conversation memory is keyed by the client-supplied
`uuid` (`x-robot-user`). Two follow-up questions:

1. Is that memory shared between the `.com` and `.cn` deployments?
2. Does the server validate the `uuid` format, or accept any string as a key?
3. Does the `x-bbl-official-site-region` header change the model or its policy?

The first matters for data residency; the second matters for severity (a
predictable id is easier to abuse); the third would be a routing bypass.

## Method

`run.js` talks to both deployments with locally generated ids only:

- plant a printer model + serial on one deployment, recall on the other;
- send the same system-prompt extraction request with region headers `EN`, `CN`,
  `JP`, `KR`, `DE`, `XX`;
- plant and recall using non-UUID ids (a prefixed string, 64 `a`s, and 128 hex
  characters).

```powershell
node run.js
```

> Do not replace the generated ids with real account ids. Writing to an id that
> belongs to another user would modify that user's conversation memory.

## Results (2026-11-03)

### Cross-region memory - not shared

| Plant | Recall | Recalled |
|---|---|---|
| `.com` | `.cn` | no (`UNKNOWN`) |
| `.cn` | `.com` | no (`UNKNOWN`) |
| `.com` | `.com` (control) | yes |
| `.cn` | `.cn` (control) | yes (answered in Chinese) |

The two deployments keep separate conversation stores. No cross-region leak
through `uuid`.

### Region header - no policy change

All six region values returned the same refusal:

> I'm unable to discuss my internal workings. Please describe the issue you're
> experiencing and I'll help troubleshoot.

The header does not select a weaker model/prompt, at least for this probe.

### `uuid` format - not validated

| `uuid` shape | Recall works |
|---|---|
| `probe-not-a-uuid-<8 hex>` (25 chars) | yes |
| 64 × `a` | yes |
| 128 hex characters | no - stream terminated (`TypeError: terminated`) |

The server accepts any string up to at least 64 characters as the conversation
key. It does not require a UUID, a known account id, or any authentication. A
128-character key is rejected/terminated, so there is a length limit somewhere
between 64 and 128. This is a severity amplifier for experiment 04: the key space
is whatever the caller supplies, and the only protection is secrecy of the id.

## Verdict

- **Region isolation holds**: `.com` and `.cn` do not share memory.
- **No region-header bypass** was found.
- **No `uuid` format validation**: any string up to at least 64 characters is a
  valid conversation key. This does not by itself prove cross-user impact (that
  depends on whether a real user's `uuid`/`cusId` can be learned), but it removes
  format as a barrier.

Do not report "cross-region memory leak" or "region policy bypass" - both are
negative. The `uuid` result is supporting evidence for 04, not a standalone
finding.

## Files

- `run.js` - the three probes; writes `results.json`.