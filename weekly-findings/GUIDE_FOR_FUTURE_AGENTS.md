# Guide for Future Agents — Finding the Next Weekly Finding

**Last updated:** 2026-11-10
**Read this before starting a new weekly finding.**

This guide explains how to turn the existing Bambu Lab work into a new,
defensible weekly finding. It is deliberately concrete: what to read, how to
pick an experiment, how to test safely, how to avoid overclaiming, and how to
write it up in the same style as the previous weekly reports.

---

## 1. The weekly loop

1. **Review** the last worklog and the last 2–3 weekly reports.
2. **Update the backlog** with open leads and untested vectors.
3. **Pick 3–5 experiments** with a clear hypothesis and a stop condition.
4. **Run them** with controls and synthetic data.
5. **Triage** the results: confirmed, lead, negative, or artifact.
6. **Write one weekly report** with only the main confirmed findings.
7. **Update the worklog** with the new experiments, results, negatives, and
   open leads.

Do not start a new experiment until you know which backlog item it closes.

---

## 2. Inputs to review first

| Input | Why |
|---|---|
| `experiments/COMPLETE_WORKLOG_*.md` | Single source of truth: confirmed findings, negatives, open leads |
| `weekly-findings/findings_*.md` | How findings are framed and scoped |
| `experiments/*/README.md` + `results*.json` | Exact methods, counts, caveats |
| Public source maps | Client-side behavior, endpoints, parsing, storage |
| HiAgent SDK/docs | Backend architecture, `UserID`, memory, tools, workflows |
| ATR / OWASP Agentic / MITRE ATLAS | Attack-surface vocabulary and categories |
| Public CVEs / papers / writeups | Concrete techniques to adapt or reproduce |
| The target’s live UI + DevTools | Real request shapes, auth headers, SSE events |

Never re-run a hypothesis listed in the worklog’s **negative results** unless you
have a new method, a new endpoint, or a change in the target.

---

## 3. How to generate new hypotheses

Use the **10-point agent attack-surface map** from ATR Table 3:

1. User input
2. Tool descriptions
3. Tool responses
4. MCP protocol
5. Agent memory
6. Inter-agent messages
7. Skill lifecycle
8. Code/file context
9. Permission/auth
10. Behavioral drift

For each point, ask:

- **What is trusted here?** (an ID, a tool result, a file name, a handoff
  summary, a memory value)
- **Who can influence it?** (anonymous user, logged-in user, human agent,
  third-party tool, public KB, uploaded file)
- **What is the worst case?** (read PII, write memory, false safety advice,
  DoS, privilege escalation)
- **What did we not test?** (check the worklog’s open leads)
- **What would a real attacker need?** (an ID, a token, a link, a file, a
  timing window)

Also use these prompts:

- **What changed?** New endpoint, new header, new feature, new region.
- **What is the trust boundary?** Client → gateway → HiAgent → tool → human.
- **What is the identifier?** Is it a secret or just a database key?
- **What is the state?** Memory, conversation, stream, queue, ticket, order.
- **What is the artifact?** SSE event, JSON field, HTML sink, file URL.
- **What happens on error?** Does it fall back to a weaker check?
- **What happens on duplicate/parallel requests?** Replay, race, latest-wins.

### Paper / CVE reproduction

Pick papers or CVEs with a **concrete technique**, not just a taxonomy:

- prompt injection via tool output
- memory poisoning across sessions
- agent-to-agent message injection
- MCP tool poisoning / rug-pull
- OAuth consent / token confusion
- RAG context poisoning
- multi-turn behavioral drift
- image/OCR prompt injection

Then map the technique to Bambu:

| Paper step | Bambu equivalent |
|---|---|
| Untrusted tool output | order/ticket/RAG/handoff content |
| Agent memory | `uuid`/`cusId` conversation memory |
| Tool description | HiAgent tool/guide/category metadata |
| Inter-agent message | AI → human handoff / workflow context |
| File context | chat upload, ticket attachment, file name |
| Auth boundary | `cusId` accepted without a token |

Define **success** and **failure** before running: “marker appears in the
victim’s next answer” is success; “model says it cannot” is failure; “the
script sent the POST itself” is an artifact, not victim interception.

---

## 4. Selecting an experiment

Score each candidate:

| Criterion | Question |
|---|---|
| Impact | Does it read/write sensitive data, change behavior, or affect safety? |
| Novelty | Is it absent from the worklog’s confirmed and negative lists? |
| Feasibility | Can it be tested with one test account and local IDs? |
| Evidence | Will the result be visible in raw HTTP/SSE/JSON, not just model prose? |
| Safety | Can it be tested without real users, destructive actions, or key theft? |

Prefer experiments that produce a **binary, reproducible result** (marker
present/absent, 200/403, same/different answer) over ones that rely on model
self-report.

---

## 5. Experiment design

Each experiment must have:

- **Hypothesis** — one sentence.
- **Control** — the same request without the variable.
- **Variables** — header, body field, order, timing, region.
- **Trials** — at least 3 for a finding; 2 is a lead.
- **Success metric** — exact string, status code, event, or count.
- **Stop condition** — when to stop and write it up.
- **Safety plan** — synthetic data, test account only, no destructive calls.

Rules:

- Use **fresh sessions** for every trial; reuse of `uuid` carries state.
- Use **synthetic markers**, not real PII.
- Use **local IDs** (`crypto.randomUUID()`, fake `test@example.com`).
- Do not enumerate real users, `cusId`s, orders, or tickets.
- Do not call `sse/close`, `message/recall`, `closeConversation`,
  `cancelQueue`, or other destructive endpoints against anything but your own
  stream.
- Wait for **connection readiness** before sending; fixed sleeps cause races.
- Prefer **waiting for a marker/`[DONE]`** over a fixed 9-second sleep.
- Check the **raw protocol** (SSE events, JSON body) separately from the UI.
- Check the **UI** separately: sanitization, rendering, auth state.
- Record the **HTTP status** and **SSE stream** in the output.

### Artifact checklist

Before calling something a finding, ask:

- Did the **victim** send the request, or did my script?
- Did the server route by `uuid`, `requestId`, `x-robot-user`, or the latest
  connection?
- Did the UI render it, or only the raw API?
- Did the server accept the request, or did the client fall back?
- Did the model confabulate, or is the output stable across runs?
- Did the target change region, auth state, or version?

---

## 6. Confirmation standards

A finding is **confirmed** only when all are true:

1. It reproduces in at least 3 trials, with a control.
2. The evidence is raw protocol data, not only the model’s prose.
3. The impact is demonstrated, not inferred.
4. The preconditions are stated (known `cusId`, valid token, region, account).
5. The limitation is stated (expired token, UI sanitization, unconfirmed sink).
6. The files and commands are reproducible.

A finding is a **lead** when:

- it reproduced once or twice,
- the sink was not observed,
- the precondition was not available,
- the result is a timing/race artifact.

A finding is **negative** when:

- the control also triggers,
- the behavior is expected,
- the target rejects the request,
- the result is confabulation or an artifact.

Do not upgrade a lead to a finding in the weekly report just because it is
interesting.

---

## 7. Overclaiming traps

| Trap | Correct framing |
|---|---|
| “Attacker steals the victim’s next answer” | Only if the **victim** sent the POST and the attacker stream received it. A script-sent POST is a routing test. |
| “Snowflake IDs are insecure” | Snowflake is a fine DB key; the flaw is using it as an unauthenticated access key. |
| “`JSON.parse` rounds `cusId`” | Only if the client stores a number. Check `localStorage.login_info`; if quoted, it is a string. |
| “The model leaked the system prompt” | Distinguish stable instruction text from confabulation; repeat in fresh sessions. |
| “Stored XSS” | The write endpoint accepting HTML is not the sink; observe execution in the agent console. |
| “Cross-user” | Use “unauthenticated access to an authenticated session” unless two authenticated users are involved. |
| “Open redirect” | Verify the redirect actually follows the attacker-controlled value after login. |

---

## 8. Safety and ethics

- Only test accounts you own or that the user explicitly authorized.
- Use synthetic PII and markers.
- Do not access real users’ orders, tickets, messages, or `cusId`s.
- Do not enumerate IDs.
- Do not steal, brute-force, or paste credentials/keys.
- Do not run destructive or account-changing endpoints unless the test account
  is explicitly for that purpose.
- Rate-limit your tests; do not flood the production chatbot.
- Redact `cusId`, phone, name, JWTs, cookies, tokens, presigned URL signatures.
- Delete temporary credential files; never commit them.

---

## 9. Writing the weekly report

File: `weekly-findings/findings_MM_DD_YYYY.md`

Style, based on `findings_11_03_2026.md`:

- Title: `# Findings MM-DD-YYYY` and `# YYYY-MM-DD 发现`
- Short intro: what you tested and the scope.
- One section per confirmed finding; English paragraph then Chinese paragraph.
- Tables for endpoint/auth/result matrices.
- Small JSON or HTTP snippets as evidence.
- Screenshots **inline**, after the relevant section, not all at the end.
- A short “Key takeaway” section.
- Final link to the experiments repo.

Keep it **concise**: only the main confirmed findings. Move details, dead ends,
and raw results to the experiment README/worklog.

### Finding section template

```md
## <Finding title>

## <Chinese title>

<What the attacker does, in 2–3 sentences.>

<What happened, with counts: 2/2, 3/3, 0/2.>

<Why it matters and the precondition.>

```text
<exact request / event / command>
```

<img width="..." alt="..." src="..." />

<Chinese translation of the same.>
```

### Screenshots

- DevTools → Network → `sse/chat`: request headers + payload.
- DevTools → Network → `sse/connect` → EventStream: `data:` events.
- Terminal: decode/takeover/access output.
- Redact IDs, tokens, cookies, PII.
- Place each image after the section it supports.

---

## 10. Updating the worklog

For every experiment:

1. Create `experiments/NN-name/`.
2. Add `README.md` with question, method, results, verdict, caveats.
3. Add `run.js` and `results*.json`.
4. Update `COMPLETE_WORKLOG_*.md`:
   - confirmed findings table,
   - negative-results table,
   - open leads,
   - experiment folder list.

A future agent should be able to read the worklog and know exactly what not to
re-run.

---

## 11. Reusable checklists

### New finding checklist

- [ ] Hypothesis is one sentence.
- [ ] Control exists.
- [ ] At least 3 trials.
- [ ] Raw protocol evidence saved.
- [ ] UI checked separately.
- [ ] Preconditions stated.
- [ ] Limitations stated.
- [ ] No real user data.
- [ ] Report is concise and bilingual.
- [ ] Screenshots are inline and redacted.
- [ ] Worklog updated.

### Experiment README template

```md
# NN — Title

**Question:** ...

**Method:** ...

**Results:**
- ...

**Verdict:** Confirmed / Lead / Negative.

**Files:** `run.js`, `results.json`.

**Caveats:** ...
```

### Weekly report checklist

- [ ] Only confirmed findings.
- [ ] Counts and preconditions.
- [ ] One table and one snippet per finding, max.
- [ ] Screenshots inline.
- [ ] Chinese translation.
- [ ] Key takeaway.
- [ ] Experiments link.
- [ ] No credentials/PII/IDs.

---

## 12. Common failure modes

- **Fixed sleeps** — race conditions; wait for the stream/marker.
- **Stale tokens** — check expiry before authenticated tests.
- **Wrong region** — `.com` and `.cn` have different memory/guardrails.
- **Wrong tool** — `agent-browser` cannot screenshot DevTools/terminal panes;
  use the browser for pages, terminal for SSE/decode.
- **Script-sent POST** — not victim interception.
- **Model self-report** — not evidence; use raw events.
- **Confabulation** — repeat in fresh sessions; compare exact wording.
- **Duplicate dead ends** — read the negative-results table first.
- **Overbroad claim** — separate root cause from amplifier.

---

## 13. Good sources for the next idea

- ATR rules / ATD techniques: https://github.com/Agent-Threat-Rule/agent-threat-rules
- OWASP Agentic Top 10 (2026)
- MITRE ATLAS
- HiAgent Python SDK/docs: https://github.com/volcengine/hiagent-python-sdk
- Public CVEs for agent frameworks
- The worklog’s **Open leads** section
- The worklog’s **Negative results** section (to avoid repeats)
- The last weekly report’s “Screenshots to add” and “Limitations”
- Target source maps and public client bundles

When in doubt, pick one trust boundary, one identifier, and one stateful
behavior; test it with a control and a marker. That is how the strongest
findings in this repository were found.
