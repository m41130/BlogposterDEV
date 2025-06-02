# Importer

Loads content importers from the `importers` subdirectory. Importers can migrate data from other platforms such as WordPress.

## Startup
- Core module.
- Requires a valid JWT.

## Purpose
- Lists available importers via `listImporters`.
- Runs a named importer with `runImport`.

## Listened Events
- `listImporters`
- `runImport`

Importers are executed inside the server process but must conform to the security rules of the event bus.
