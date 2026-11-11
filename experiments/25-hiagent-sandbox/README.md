# 25 — HiAgent platform checks (blocked on an app key)

**Status:** the public-docs part is done. The live `get_app_config_preview`,
`TracingJsonStr`, long-term memory, variables, and `UserID`-binding tests are
**blocked** because no HiAgent app key or API base was found in the Bambu client.

## What was searched

| Source | Result |
|---|---|
| Support-app JS + source maps (`18-sse-channel-binding/bundle/`) | No `app_key`, `appKey`, `X-App-Key`, `hiagent`, `volcengine`, `get_app_config_preview`, or `TracingJsonStr` strings |
| Main-site HTML (`bambulab.com/zh`, 1.2 MB) | No hits for the same keywords |
| Main-site JS chunks (partial fetch; Cloudflare reset/timeouts) | No hits in the chunks that loaded |
| Error responses (`/gw/robot/*`, `/cus/*`) | Generic `B00999` / `500`; no stack traces or config |
| Public HiAgent SDK / docs | App key and API base are required; no Bambu key published |

The support app calls `oepa.bblops.com/csm/gateway`, which likely injects the
HiAgent app key server-side. The key is not in the browser bundle.

## What the public HiAgent API says

From the Volcengine HiAgent SDK/docs:

- `POST /get_app_config_preview` — body `AppKey`, `UserID`; header `Apikey`.
  Returns variable config and the opening statement.
- `POST /create_conversation` — creates an `AppConversationID`.
- `POST /chat_query` — body `AppKey`, `AppConversationID`, `Query`,
  `ResponseMode` (`blocking`/`streaming`), `UserID`; header `Apikey`.
  `MessageAnswerInfo` includes `TracingJsonStr` (debug trace information).
- `POST /update_conversation` — modify conversation name and variables.
- `POST /run_app_workflow` — synchronous workflow test; `NoDebug` toggles
  debug mode.
- SDK resources: `client.v1.sessions` (chat/history), `client.v1.memories`
  (MemoryStore/MemoryFile CRUD/search), `client.v1.observations` (trace/span),
  `client.v1.runs`, `client.v1.workflows`, `client.v1.knowledgebase`.

## What the harness tests (once a key is provided)

`run.js` calls, in order:

1. `get_app_config_preview` — does it return variables, opening statement, tool
   or KB configuration?
2. `create_conversation` — obtain an `AppConversationID`.
3. `chat_query` with `ResponseMode: "blocking"` — inspect `TracingJsonStr` for
   tool calls, retrieval, model parameters, and internal prompts.
4. `run_app_workflow` with `NoDebug: false` — workflow debug output.

Not in the HTTP harness yet (needs the Python SDK): `client.v1.memories` for
long-term memory read/write, `client.v1.observations` for trace/span access, and
`client.v1.sessions` for session history.

## `UserID` binding test

With a sandbox key, run `get_app_config_preview` / `chat_query` twice with two
**test** `UserID`s (e.g., two test accounts) and compare:

- Does `UserID` alone select a session/memory without an auth binding?
- Can `UserID` A read or continue `UserID` B's conversation?
- Do variables set in `update_conversation` persist across sessions or leak to
  another `UserID`?

This is the HiAgent equivalent of the `uuid` finding and the highest-value test.

## What is needed

- `HIAGENT_API_BASE` — the HiAgent app base URL (sandbox/test, not production).
- `HIAGENT_APP_KEY` — a sandbox app key you own.
- `HIAGENT_USER_ID` — a test user id.
- Optional: `HIAGENT_APIKEY`, `HIAGENT_CONVERSATION_ID`, `HIAGENT_WORKSPACE_ID`,
  `HIAGENT_APP_ID` for the SDK memory/trace tests.

Do **not** provide production keys, real user ids, or another user's data. The
script redacts the app key and user id in output and refuses to run without
`--confirm-sandbox`.

## Run

```powershell
$env:HIAGENT_API_BASE="https://<sandbox-hiagent-base>"
$env:HIAGENT_APP_KEY="<sandbox app key>"
$env:HIAGENT_USER_ID="test-user"
node experiments/25-hiagent-sandbox/run.js --confirm-sandbox
```

Without the env vars it prints the plan and sends nothing.