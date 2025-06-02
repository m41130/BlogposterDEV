# PlainSpace

Seeds default admin pages and widgets and handles multi-viewport layouts used by the drag‑and‑drop builder.

## Startup
- Core module but tolerates being loaded as community for testing.
- Issues a public JWT for front-end widget registry requests.

## Purpose
- Seeds the admin dashboard pages on first run.
- Provides `widget.registry.request.v1` for the page builder.

## Listened Events
- `widget.registry.request.v1`

This module demonstrates how non-critical features can still benefit from token verification before accessing core services.
