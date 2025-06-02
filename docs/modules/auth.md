# Auth Module

The Auth Module validates credentials and issues JWTs for the rest of the system. It **must** run as a core module so it can manage login strategies and sign tokens securely.

## Startup
- Loaded during server boot by the core loader.
- Requires `JWT_SECRET` and `AUTH_MODULE_INTERNAL_SECRET` in the environment.
- Automatically loads any strategy files under `mother/modules/auth/strategies`.

## Purpose
- Provides login strategies (local and OAuth) that modules or the public API can use.
- Issues and validates tokens for modules and users.
- Stores refresh tokens in the database and supports token revocation.
- Offers helpers to check or extend token lifetimes.

## Listened Events
- `listActiveLoginStrategies`
- `setLoginStrategyEnabled`
- `registerLoginStrategy`
- `loginWithStrategy`
- `issueModuleToken`
- `issueUserToken`
- `issuePublicToken`
- `ensurePublicToken`
- `validateToken`
- `revokeToken`
- `revokeAllTokensForUser`
- `issueRefreshToken`
- `refreshAccessToken`
- `revokeRefreshToken`
- `setModuleTokenExpiry`
- `setUserTokenExpiry`

All payloads must include a valid JWT and the correct `moduleName`/`moduleType`. Invalid calls are rejected.

## Adding Login Strategies
See [Adding OAuth and Custom Login Strategies](../how_login_strategies_work.md) for a step‑by‑step guide on implementing new strategies and keeping secrets safe.
