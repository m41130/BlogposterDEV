# Notification Manager

Dispatches system notifications to configured integrations such as email or web hooks.

## Startup
- Core module loaded during boot.
- Loads integrations defined in its configuration.

## Purpose
- Listens to the internal `notificationEmitter` and forwards messages to active integrations.

## Listened Events
- This module does not expose meltdown events directly. Instead it listens on `notificationEmitter` for `notify` events.

Each integration can perform its own security checks before sending data externally.
