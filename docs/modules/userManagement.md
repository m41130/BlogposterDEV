# User Management

Provides CRUD operations for users and roles and handles login sessions.

## Startup
- Core module that ensures its own database and default roles.

## Purpose
- Manage users and their roles.
- Handle login and registration events.

## Listened Events
- `createUser`
- `updateUser`
- `deleteUser`
- `getUser`
- `listUsers`
- `loginUser`
- `createRole`
- `updateRole`
- `deleteRole`
- `listRoles`

Passwords are hashed using bcrypt and all events validate permissions before modification.
