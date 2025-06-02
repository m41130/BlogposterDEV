# Database Manager

Handles creation of databases or schemas and exposes generic CRUD events for modules. It can also forward operations to remote services if configured.

## Startup
- Core module loaded at boot.
- Requires a valid JWT token for initialization.

## Purpose
- Provides `createDatabase`, `dbInsert`, `dbSelect`, `dbUpdate` and `dbDelete` events.
- Abstracts database engines so modules do not access the DB directly.

## Listened Events
- `createDatabase`
- `performDbOperation`
- `dbInsert`
- `dbSelect`
- `dbUpdate`
- `dbDelete`

Every call checks the provided JWT before executing the operation.
