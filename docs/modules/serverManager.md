# Server Manager

Stores and retrieves server location information used for distributed setups.

## Startup
- Core module with JWT required.

## Purpose
- Allows adding, updating and deleting server locations.

## Listened Events
- `addServerLocation`
- `getServerLocation`
- `listServerLocations`
- `deleteServerLocation`
- `updateServerLocation`

Only callers with the appropriate permission can modify server records.
