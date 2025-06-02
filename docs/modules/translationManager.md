# Translation Manager

Stores translations for content strings and provides CRUD events for managing them.

## Startup
- Core module; creates its tables on initialization.

## Purpose
- Add, retrieve, update and delete translated texts.
- Manage supported languages.

## Listened Events
- `createTranslatedText`
- `getTranslatedText`
- `updateTranslatedText`
- `deleteTranslatedText`
- `addLanguage`

All events require a valid JWT and verify permissions before touching the database.
