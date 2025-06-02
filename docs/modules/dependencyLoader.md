# Dependency Loader

Maintains a whitelist of allowed Node.js dependencies for community modules. This prevents arbitrary `require()` calls from untrusted code.

## Startup
- Loaded as a core module when the server starts.
- Loads allowed dependencies from its registry table.

## Purpose
- Provides the `requestDependency` event so modules can dynamically require approved packages.

## Listened Events
- `requestDependency`

If a module asks for a package that is not whitelisted, the request is rejected to maintain security.
