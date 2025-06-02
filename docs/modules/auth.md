# Auth Module

The authentication module validates credentials and issues JWTs for other modules. It must be loaded as a core module so it can register login strategies and manage tokens securely.

## Startup
- Loaded during server boot by the core loader.
- Requires `JWT_SECRET` and `AUTH_MODULE_INTERNAL_SECRET` in the environment.

## Purpose
- Provides login strategies (local, OAuth etc.).
- Verifies tokens for the event bus.

## Listened Events
- `listActiveLoginStrategies`
- `setLoginStrategyEnabled`
- `registerLoginStrategy`
- `loginWithStrategy`

All payloads must include a valid JWT and the correct `moduleName`/`moduleType`. Invalid calls are rejected.
