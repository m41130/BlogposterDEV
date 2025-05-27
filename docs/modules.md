# Module Architecture

BlogposterCMS follows a modular design. Core features and optional extensions are implemented as individual modules. Each module registers event listeners on the `motherEmitter` and performs its work in response to these events.

- **Core modules** live under `mother/modules`. They are loaded during server startup and have access to the main event system with a high-trust JWT.
- **Optional modules** can be placed in the top-level `modules/` directory. The Module Loader runs a health check in a sandbox before activating them. This isolation prevents a bad plugin from crashing the whole system.
- **Events** are used instead of direct function calls. Modules emit events to perform actions such as database operations, authentication or theme management. Tokens in the payload ensure that only authorised modules can request sensitive operations.

When creating your own modules, start by exporting an `initialize` function that receives `{ motherEmitter, jwt, isCore }`. See the existing modules for reference.
