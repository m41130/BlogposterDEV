# Notification Manager

Dispatches system notifications to configured integrations such as email or web hooks.

## Startup
- Core module loaded during boot.
- Loads integrations defined in its configuration.

## Purpose
- Listens to the internal `notificationEmitter` and forwards messages to active integrations.

## Listened Events
- The manager primarily listens on `notificationEmitter` for `notify` events. It also exposes a meltdown event `getRecentNotifications` to fetch log entries for the admin UI.

Each integration can perform its own security checks before sending data externally.

See the high level [Notification System](../notification_system.md) guide for configuration examples.
