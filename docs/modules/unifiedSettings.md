# Unified Settings

Provides a registry of settings categories that other modules can contribute to. Optionally exposes an admin UI router.

## Startup
- Core module loaded with a JWT.

## Purpose
- Registers settings sections and their form fields.
- Allows the admin interface to present a unified settings area.

## Listened Events
- The module exposes events via its `settingsRegistryService`, e.g. `registerSettingsSection`.

It relies on the Settings Manager for actual persistence and uses JWTs for all event payloads.
