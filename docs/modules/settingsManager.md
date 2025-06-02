# Settings Manager

Centralized storage of CMS settings. It offers CRUD events for configuration values and exposes a limited public settings API.

## Startup
- Core module that creates its tables on boot.
- Requires a JWT to operate.

## Purpose
- Allows modules to read or change settings using events instead of direct DB access.

## Listened Events
- `getSetting`
- `getPublicSetting`
- `setSetting`
- `getAllSettings`
- `setCmsMode`
- `getCmsMode`

Permission checks ensure only authorised callers can modify core settings.
