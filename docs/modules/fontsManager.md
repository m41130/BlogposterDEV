# Fonts Manager

Registers font providers such as Google Fonts or Adobe Fonts and allows enabling
or disabling them via the admin settings.

## Startup
- Loaded as a core module during server initialization.
- Requires `FONTS_MODULE_INTERNAL_SECRET` in the environment.

## Purpose
- Keeps a registry of available font providers.
- Lets admins toggle providers on or off for privacy.
- Additional providers can register themselves using the
  `registerFontProvider` event. The built-in **Google Fonts** provider is
  disabled by default for privacy. When enabled, the front-end dynamically loads
  the fonts via `fontsLoader.js` so no external requests occur unless
  explicitly allowed.

## Listened Events
- `listFontProviders`
- `setFontProviderEnabled`
- `registerFontProvider`
