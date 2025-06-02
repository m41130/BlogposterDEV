# Module Loader

Loads optional community modules from the top-level `modules/` directory. Each module is sandboxed during a health check to prevent crashes or unsafe behaviour. The sandbox uses Node's `vm` module and only exposes `path` and `fs` as allowed dependencies.

## Startup
- Core module executed after the initial core modules are ready.
- Requires a valid JWT to register modules in the database registry.

## Purpose
- Maintains a registry of installed modules.
- Loads modules and retries failed ones automatically.
- Serves front-end assets for GrapesJS modules when present.

## Listened Events
- `getModuleRegistry`
- `listActiveGrapesModules`
- `activateModuleInRegistry`

Every module folder must export an `initialize` function and may include `moduleInfo.json` with metadata.
