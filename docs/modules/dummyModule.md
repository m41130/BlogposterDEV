# dummyModule

The `dummyModule` is a minimal no‑UI module used as a learning template.
It demonstrates how community modules interact with BlogposterCMS using the meltdown event bus.
The module's `apiDefinition.json` shows how to declare external services and actions.

## Startup
- Loaded from `modules/dummyModule` when present.
- Only requires the `motherEmitter` object during initialization.

## Purpose
- Logs whenever a page is published using a fictional external service.
- Shows how to perform simple database operations.
- Listens for a custom `dummyAction` event that inserts data into a table.

## Listened Events
- `pagePublished`
- `dummyAction`

## Security Notes
- Sanitises page titles and IDs before logging.
- Never store real API tokens in `apiDefinition.json`—use environment variables instead.

Use this module as a starting point for your own experiments. Copy the folder,
update the service definitions and event names in `apiDefinition.json`, and wire
your own handlers to the events you care about. Environment variables are the
preferred way to inject API tokens or other secrets.
