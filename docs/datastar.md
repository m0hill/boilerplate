# Datastar + Datastar Kit

Read for server TSX, Datastar attributes, signals, patches, streams.

## Runtime

- Effect routes return via `src/lib/datastar.ts`.
- Use `datastarPage`, `datastarPatch`, `datastarSignals`, `datastarStream`, `datastarDone`.
- Import authoring helpers from `datastar-kit`.
- Keep JSX sync.
- Load data before render.
- Check auth before render.

## Tao

- Backend state is truth.
- Start with Datastar defaults.
- Change defaults only for a known problem.
- Backend patches elements and signals.
- SSE responses stay `text/event-stream`.
- Prefer server-rendered HTML over client state.
- Use backend TSX components for repeated markup.
- Prefer fat morphs over fine-grained DOM control.
- Use `data-ignore-morph` only for browser-owned islands.
- Links navigate pages.
- Redirects navigate from backend actions.
- Do not manage browser history manually.
- Use loading indicators for pending backend requests.
- Confirm success from backend state.
- Avoid optimistic success UI.
- Use semantic HTML first.
- Patch ARIA with `data-attr` when UI state changes.

## Signals

- Signals are browser input.
- Signals are never authority.
- Page signal state and schemas live in `src/pages/<page>/state.ts`.
- Name state `<thing>Form`.
- Name state type `<Thing>FormState = typeof <thing>Form`.
- Name action schemas `<Action><Thing>Signals`.
- Avoid generic `PostSignals` and `KeySignals`.
- Decode with `decodeSignals(request, schema)`.
- Use platform readers for forms, uploads, query params, JSON APIs.
- Init grouped state with `data-signals={mod(form.defaults, { ifMissing: true })}`.
- Do not use one-arg `mod({ ifMissing: true })` for signals.
- Use `datastarSignals` for validation text, flags, resets.
- Patch HTML when backend state affects visible UI.
- Use `js` for expressions beyond bare refs.
- Pass signal refs or names as values.
- Avoid hand-written keyed attribute suffixes.

## Actions

- Forms use `data-on:submit={mod(post("/x"), { prevent: true })}`.
- Use `datastarDone()` for success with no immediate UI change.
- Recoverable errors return `200` signal or element patches.
- Non-`200` bodies are not UI patch paths.
- Use `event.*` + `datastarStream(...)` for multiple events.
- Prefer SSE helpers.
- Treat `directHtml`, `directSignals`, `directScript` as escape hatches.
- `directScript` and `unsafeHtml` need trusted content.
- Use `reply.navigate` or `event.navigate` for Datastar navigation.

## Patches

- Stable `id` is the patch contract.
- Default patch morphs the returned top-level `id`.
- Use `selector` + `mode` for containers, siblings, inserts, removes.
- Use `inner` to keep the outer node.
- Give patchable list items stable row IDs.
- Use `preserve(...)` for `data-preserve-attr`.

## Realtime

- Use `src/lib/realtime/live-view.ts`.
- First event renders current truth.
- Pulses mean only “something changed”.
- Streams re-read truth after pulses.
- Commands mutate truth.
- Commands publish pulses.
- Commands return `datastarDone()` or signal cleanup/errors.
- Commands do not patch shared live regions.
- Test subscribe-before-write by opening stream before command.
- One live view is one SSE connection per tab.
- Keep proxy buffering/timeouts safe for `text/event-stream`.

## Browser

- Prefer native inputs, `data-bind`, actions, server patches.
- Use `src/client/` only for browser APIs or complex DOM behavior.
- Do not ship `DatastarDebugger` in production.
- Render debugger before `data-init` components if it must catch those fetches.

## Tests

- Use `loadApp()` and `app.fetch(datastarPost(...))`.
- Assert status, `text/event-stream`, events, signals, patch targets, copy.
- Use e2e only for real Datastar DOM patch behavior.
