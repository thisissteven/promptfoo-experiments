# Experiment 08 - IM / robot endpoint survey

## What this experiment is about

The liveChat bundle (`370-*.js`, `3659-*.js`) exposes a second API surface
besides the AI SSE chat:

- customer IM history / recall / conversation control under `/cus/*`;
- robot helpers under `/gw/robot/*` (order query, ticket list, guide, feedback,
  mall card, SSE close, file upload).

The question is which of these are reachable without a customer login, and
whether any of them is keyed by a caller-supplied identifier instead of an
authenticated session.

## Method

`run.js` calls each endpoint with a locally generated `x-robot-user` and **no
login**. It uses only:

- reserved/fake emails (`test@example.com`, `nobody@example.com`);
- fake order numbers (`TEST-000000`);
- fake phone numbers (`00000000000`);
- message/conversation ids that cannot exist
  (`00000000-0000-0000-0000-000000000000`);
- an SSE stream created by the script itself for the `sse/close` test.

It does **not** enumerate real users, emails, phones, orders, tickets or
messages, and it does not delete or modify anything.

> Do not change the fake identifiers to real ones. Querying a real email, phone
> or order would read another customer's data.

```powershell
node run.js
```

## Results (2026-11-03)

### `/cus/*` - login required

All of these returned `403 {"code":"30003","data":"not login"}`:

| Endpoint | Status |
|---|---|
| `POST /cus/message/page` | 403 |
| `POST /cus/message/recall` | 403 |
| `POST /cus/message/maskAsRead` | 403 |
| `GET /cus/conversation/hasActiveConversation` | 403 |
| `POST /cus/conversation/closeConversation` | 403 |
| `POST /cus/conversation/cancelQueue` | 403 |
| `GET /cus/context/jumpUrl` | 403 |

The CSM gateway (`oepa.bblops.com/csm/gateway`) checks the customer auth token
before any of the history, delete-by-id, or conversation-control logic runs. No
unauthenticated history or delete primitive.

### `/gw/robot/*` - mixed

| Endpoint | Auth | Result |
|---|---|---|
| `POST /gw/robot/front/order/query` | none | requires `email` + `orderNum`; fake pair returns `data:false` |
| `POST /gw/robot/ticket/unclosed/list` | none | accepts `email`/`phone`; fake values return `data:null` |
| `POST /gw/robot/im/mall/card/snapshot` | token | `30002 Token expiration` |
| `POST /gw/robot/front/feedback` | none | `B00009 must not be blank` (accepts fields) |
| `GET /gw/robot/guide/menu/show` | none | public menu content |
| `GET /gw/robot/front/category/list` | none | public categories |
| `GET /gw/robot/duty/roster/show` | none | `data:null` |

The two interesting ones are the email-keyed endpoints:

- **order/query** requires `email` and `orderNum` and answers with a boolean.
  For a fake pair it returns `false`. It is an unauthenticated
  order-existence oracle **if** a valid pair returns `true`; that was not tested
  because it needs a real order.
- **ticket/unclosed/list** accepts an email or phone and returns `null` for fake
  values. It is an unauthenticated ticket-lookup surface **if** a real email or
  phone returns ticket data; that was not tested for the same reason.

Neither is confirmed as a data leak. Both need a controlled account (the
tester's own email/order/phone) to decide whether they return someone else's
data or just a boolean/empty result.

### `GET /gw/robot/sse/close?requestId=...` - bound to `uuid`

| Close request | Result |
|---|---|
| same `uuid` + matching `requestId` | stream closed (0 events, no `[DONE]`) |
| different `uuid` + same `requestId` | stream completed normally (40 events, `[DONE]`) |

The close endpoint requires both the request's `requestId` and the matching
`x-robot-user` uuid. Knowing a `requestId` alone is not enough to close another
identity's stream. No cross-user stream DoS.

## Verdict

- `/cus/message/page`, `/cus/message/recall` and the conversation-control
  endpoints are **properly auth-gated**; the "paginated history" and
  "delete-by-id" hypotheses are negative for an unauthenticated attacker.
- `sse/close` is **bound to the uuid**; no cross-user DoS through a leaked
  requestId.
- The public guide/category endpoints are expected to be public.
- `order/query` and `ticket/unclosed/list` are the only unauthenticated,
  identifier-keyed surfaces found. They are **leads, not confirmed findings**.
  Confirm with a controlled account before reporting.

## Files

- `run.js` - the safe survey; writes `results.json`.