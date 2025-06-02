# Meltdown Event Bus

BlogposterCMS modules communicate exclusively via the **meltdown event bus**. It
is powered by the `motherEmitter` which verifies JSON Web Tokens on every event
before dispatching them. When a module misbehaves, the emitter can trigger a
*local meltdown* for that module so it can no longer execute actions.

## Event Lifecycle

1. A module emits an event with a payload containing its `moduleName`,
   `moduleType` and a signed JWT.
2. `motherEmitter` checks whether the module is currently in meltdown. If so,
   the event is ignored.
3. If the event is public (such as `issuePublicToken`) it bypasses JWT checks
   but still logs the call.
4. Non‑public events require a valid JWT. The emitter decodes the token,
   combines the secret with the correct salt depending on `trustLevel` and then
   verifies it.
5. If verification succeeds, the event is dispatched to all listeners. Any
   thrown error triggers a meltdown for that module, removing all of its
   listeners.

## Why Meltdown?

The goal is **containment**. If a community module crashes or tries to bypass
permissions, only that module is disabled. The rest of the CMS keeps running
and administrators are notified via the notification system. This approach helps
maintain security when running untrusted code.

## Writing Safe Event Handlers

- Validate payload fields before performing actions.
- Return errors through the callback so the emitter can react properly.
- Avoid long synchronous tasks that block the event loop; they may cause
  timeouts and trigger a meltdown unintentionally.

For an overview of how modules use this bus, see [Module Architecture](modules.md).
