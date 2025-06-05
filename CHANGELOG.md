# Changelog
All notable changes to this project will be documented in this file.

## [Unreleased]
- Fixed false "Invalid parameters" errors when MongoDB operations passed an
  object instead of an array to `performDbOperation`. The listener now accepts
  both formats and no longer deactivates modules like `widgetManager` during
  startup.
- Fixed registration on MongoDB setups. `createUser` now recognizes
  `insertOne` results and reconstructs the created user object while
  preserving compatibility with PostgreSQL and SQLite responses.
- Fixed MongoDB database initialization failing when a module user already exists.
  Settings manager now loads correctly and registers event listeners.
- Fixed MongoDB integration. Local CRUD events now translate to Mongo operations
  instead of raw SQL, enabling proper widget management and other features when
  `CONTENT_DB_TYPE` is set to `mongodb`.
- Resolved open handle warning in Jest by stubbing `dbSelect` in the
  `setAsStart` test.
- Updated placeholder parity check to invoke Jest so the script works again.
- Switched test runner to Jest and converted all integration tests.
- Adjusted release workflow to read the changelog from the repository root.
- Fixed default share link domain; now uses `APP_BASE_URL` or `https://example.com`.
- Ensured `library/public` directory is created during startup so media uploads don't fail.
- Fixed image widget state persistence by passing `widgetId` to widgets.

## [0.4.1] – 2025-06-05
- Fixed missing CSRF token on admin subpages causing 403 errors when uploading media.
- Added token validation on all admin routes and the meltdown API to prevent
  unauthorized access after a database reset.
- Centralized DB placeholder logic for better maintainability.
- Fixed widget loading on SQLite by using `?` placeholders for generic CRUD helpers.
- Fixed pagesManager meta data on SQLite. Objects are now stored as JSON
  and parsed when reading back.
- Fixed plainSpace layout loading on SQLite. Layout JSON is now parsed when
  fetching to match Postgres behavior.
- Added release workflow that publishes zipped build assets and release notes after running security audits, tests and CodeQL analysis.
- Removed the `cms.sqlite` database from version control and now ignore
  `BlogposterCMS/data` to prevent accidental leaks of local data.
- Prevent logging of full public tokens during pagesManager initialization.
- Verified all SQLite placeholders across modules to ensure inserted IDs use the new return value.
- SQLite engine now returns `{ lastID, changes }` for write operations,
  preventing `Cannot destructure property 'lastID'` errors during page creation.
- Resolved SQLite errors on startup by avoiding `ALTER TABLE ... IF NOT EXISTS`
  and by removing Postgres schema notation when using SQLite.
- Fixed database engine selection. The `.env` variable `CONTENT_DB_TYPE`
  now overrides the legacy `DB_TYPE` to match the documentation.
- The internal database manager no longer requires PostgreSQL when
  `CONTENT_DB_TYPE` is set to `mongodb` or `sqlite`.
- Fixed SQLite initialization race for settingsManager tables and added
  compatibility with older SQLite versions.

### Fixed
- Resolved SyntaxError in SQLite placeholder handler causing server startup failure.

## [0.4.0] – 2025-06-04
- CI now verifies placeholder parity for Postgres, MongoDB and SQLite on every
  push.
- Replaced SQLite placeholder handler with full Postgres parity and added
  automated parity test.
- Added Mongo placeholder parity test and CLI command to validate database placeholders.
- Documentation on why custom post types aren't necessary (see `docs/custom_post_types.md`).
- Added UI screenshots to the README and usage guide for easier onboarding.
- Expanded dashboard screenshot series to illustrate widget arrangement.
- Experimental SQLite support added alongside Postgres and MongoDB.
- Added SQLite placeholder handler to support built-in operations.


## [0.3.1] – 2025-06-03

### 🛡️ Security

- **🔥 Big Fat Security Patch™ Edition:**
  Closed **29 security issues** in one glorious cleanup session.
  No, we won’t list every file. Just know: it was ugly, it’s clean now.

- Highlights:
  - Removed **hard-coded credentials** (yes, seriously… 😬)
  - Fixed multiple **XSS vectors** (reflected *and* client-side)
  - Blocked **prototype pollution** (because `__proto__` is nobody’s friend)
  - Added **rate limiting** and **CSRF protection** (finally acting like adults)
  - Sanitized **format strings**, **random sources**, **URL redirects**, and more
  - Killed dangerous **regexes** before they killed your server
  
> If you downloaded BlogposterCMS before this patch, consider it a collectible item.  
> Like a vintage car – dangerous but historically significant.

---

*Commit responsibly. Sanitize often.*


## [0.3] - 2024-05-13
### Added
- Initial changelog file.
- Improved admin widget editing and grid interactions.

### Changed
- Updated form input behavior and label interactions.
- Upgraded Quill editor integration and page list controls.

