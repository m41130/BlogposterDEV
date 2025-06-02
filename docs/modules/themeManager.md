# Theme Manager

Lists installed themes located under `public/themes` and provides metadata about each theme.

## Startup
- Core module with JWT requirement.

## Purpose
- Reads `theme.json` from each theme directory and returns the list via an event.

## Listened Events
- `listThemes`

The file system is read-only for untrusted callers; modifications require server access.
