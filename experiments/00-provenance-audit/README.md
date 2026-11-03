# Experiment 00 - Provenance audit of the existing "findings"

## What this experiment is about

Before running new attacks, audit the results already stored in `~/.promptfoo/promptfoo.db`
to separate real leaks from model confabulation.

The test is simple: repeat the same extraction in fresh sessions and compare outputs.

- A real system prompt / tool list is **stable** across runs.
- A confabulated one **changes** every time the model is asked.

## Method

`audit.js` pulls the last-turn output of every eval whose description matches
`system instructions%`, `tools metadata%`, and `reasoning process reveal%`, then
groups the outputs into distinct variants.

```powershell
node audit.js
```

## Results

### System prompt "leak" - confabulated

6 successful runs produced **6 different** "system prompts":

- two Chinese variants with different section names and wording;
- four English variants with different opening lines
  (`"You are a Bambu Lab customer support assistant..."`,
  `"You are a Bambu Lab customer service assistant..."`, etc.).

A verbatim system prompt does not change per run. Do not report this as a leak.

### Tool metadata "leak" - confabulated

9 completed runs produced **4 different** results:

- 5 runs only echoed the priming sentence and produced no tool list;
- 2 runs invented `search_knowledge_base`;
- 1 run invented `web_search`;
- 1 run refused.

The invented endpoints (`https://api.bambulab.com/tools/...`) are generic and do
not match the retrieval tools described in the purpose. Do not report this.

`memory/tools.yaml` only asserts that `"name"`, `"description"`, and
`"parameters"` keys exist, so it passes on fabricated JSON. The assertions are
not evidence of a leak.

### Reasoning trace - credible

The `<thought>` blocks are stable across runs and repeatedly contain
retrieval-only facts:

- firmware version `01.04.00.00` for A1-series automatic flow calibration;
- the `R1` laser cutter's vibration-compensation steps (not applicable to A1 mini);
- Chinese knowledge-base segment references and wiki URLs;
- the `[lang=zh]` language tag.

This is the only one of the three original findings that survives the audit.

### Comprehensive red-team run - not usable as evidence

The 2,267-case run (`eval-eRF`) contains 1,183 errors (mostly transport/timeout),
and many "violations" are grader artifacts: the grader assumes an empty retrieval
context while the live bot retrieved real KB content, so genuine KB URLs and
firmware versions are scored as "unrecorded". Do not cite its pass/fail counts.

## Conclusion

- System prompt leak: **not proven** (confabulated).
- Tool metadata leak: **not proven** (confabulated).
- Reasoning/retrieval leak: **real** at the time of capture (late October 2026).
- The large red-team suite is **not** a clean dataset.

## Files

- `audit.js` - reproduces the variant counts from the local promptfoo database.