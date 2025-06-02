# BlogposterCMS Architecture Overview

BlogposterCMS is designed around a modular core that communicates exclusively via a JWT-secured event bus. Each module emits or listens for events on the `motherEmitter`. Every payload contains a signed token which declares the module name and required permissions. The emitter validates these tokens before dispatching any action, isolating modules from each other and providing a strong security boundary.

## Core vs Community Modules

- **Core modules** ship with the CMS and live in `mother/modules`. They are loaded at server start and receive a high-trust token so they can perform privileged operations.
- **Community modules** live under `modules/`. They are sandboxed during the health check phase, then loaded if they pass. These modules run with lower trust tokens and are restricted to the permissions granted in their JWT.

## Event Driven Workflow

1. Modules register listeners on the event bus using `motherEmitter.on()`.
2. When a module needs to perform an action (for example a DB query) it emits an event such as `dbSelect` with its token.
3. The emitter checks the token, verifies the module and permission, then routes the request to the appropriate handler.
4. Results are returned via callback, keeping modules loosely coupled.

This design ensures that even optional modules cannot bypass security rules or directly access the internals of other modules.

## Security Layers

- **JWT Signatures** – Every event payload must include a signed token. Invalid or missing tokens cause the request to be rejected.
- **Sandboxing** – Optional modules are executed inside a VM sandbox during the health check. If a module throws errors or tries unsafe operations it is deactivated.
- **Permission Checks** – Many events verify explicit permissions before executing. Admin routes require valid credentials and user roles.

By layering these protections the CMS aims to remain robust even when running untrusted community modules.
