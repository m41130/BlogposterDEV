# Share Manager

Creates secure share links for files managed by the Media Manager.

## Startup
- Core module requiring a JWT.
- Ensures its database schema exists at startup.

## Purpose
- Generate one-time or time-limited URLs for files.
- Revoke or list existing links.

## Listened Events
- `createShareLink`
- `revokeShareLink`
- `getShareDetails`

Token permissions are checked to prevent unauthorised downloads.
