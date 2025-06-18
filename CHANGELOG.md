# Changelog
All notable changes to this project will be documented in this file.

El Psy Kongroo

## [Unreleased]
- Widgets now auto-lock only during text editing and unlock when the cursor
  leaves the widget, without closing the editor.
- Text color button now displays an underlined 'A' icon reflecting the selected color and opens the palette below the toolbar.
- Color picker in user editor now floats above fields when opened.
- Text editor toolbar now includes a floating color picker to change selected text or entire blocks.
- Added reusable color picker component that shows preset, user and theme colors.
- Fonts Manager now loads Google Fonts dynamically and can be toggled from the admin Fonts page.
- Increasing font size without a selection now affects the entire widget.
- Font size selector in the text editor now shows preset sizes below the input while typing and aligns with other toolbar controls.
- Font size tool aligns with other buttons and updates selected text directly in widgets.
- Admin token validation no longer deactivates core modules when the session token has expired.
- Font size control input now sits inside a button that toggles a preset-size dropdown and has a rounded border.
- Action bar now hides during widget drag or resize and reappears at the new position.
- User editor color picker now opens via a circle button showing the current color.
- Widget action bar and bounding box now appear when clicking text; double-click to edit.

## [0.5.2] – 2025-06-16
- Widgets auto-lock when editing text fields and unlock as soon as focus leaves
  the text, improving editing flow.
- Added font size control to the text editor toolbar for customizing widget text sizes.
- Form inputs in widgets now select and lock the widget when focused, so
  the action menu appears during text entry.
- PlainSpace initialization now registers layout events and creates tables
  before seeding pages, fixing warnings about missing listeners.
- Server initialization no longer hangs if a seeded layout triggers an event
  without listeners. `meltdownEmit` now rejects such cases, preventing staled
  promises during setup.
- Fixed seeding for the Fonts page so the Font Providers widget is available on first run.
- Bounding box respects widget lock state when editing text, preventing accidental resize.
- Fonts widget now shows toggle icons and clearer empty-state text to match other settings widgets.
- Resizing widgets via the bounding box now adjusts their grid position when using the left or top handles.
- Widget selection is restored after editing text so the action toolbar and bounding box reappear automatically.
- Added Fonts Manager core module with pluggable providers and admin page.
- GridStack resize handles are hidden in the builder; the transformable bounding box now manages resizing.
- Added login settings link in the sidebar and redesigned login strategies widget with toggle and edit icons.
- Widgets temporarily lock while editing text in the builder, enabling text selection.
- Preview mode now locks widgets and expands the builder. A new preview header
  lets you switch between desktop, tablet and mobile display ports.
- Heading widget now uses the global text editor toolbar and retains content when opening the code editor.
- User Management tables now include `ui_color` by default and migrations add
  the column if missing, preventing installer failures on SQLite.
- Text block widget reports initial HTML to the builder and is always recognized as editable.
- Fixed text block editor toolbar not opening after custom HTML edits by
  scanning shadow DOM with composedPath.
- Global text editor toolbar activates again after editing widget code by
  traversing shadow DOM to locate grid items.
- User editor now follows the global floating field styling and removes
  mandatory-field checkboxes.
- Restored styling for the user editor with new classes for delete button
  and required field checkboxes.
- Replaced Quill editor with a lightweight contenteditable toolbar (bold, italic, underline).
- Widgets show a dashed border in dashboard edit mode using the user's selected color.
- Fixed floating text editor toolbar missing default controls in builder mode.
- Text editor toolbar now floats below the builder header and edits inline.
- Added drag-and-drop module upload with ZIP validation. Modules require `moduleInfo.json` and `index.js`.
- Module uploads now enforce `version`, `developer` and `description` fields in `moduleInfo.json`.
- User editor revamped with color picker, mandatory-field toggles and delete
  button. Username and email uniqueness is validated before account creation.
- Modules page now uses the header action button for uploads and exposes
  `openUploadPopup` globally.
- Fixed canvas builder crash when adding widgets; CanvasGrid now exposes
  underlying GridStack methods.
- Builder widgets now show a transformable bounding box with resize handles for
  canvas-like editing. GridStack is wrapped via `canvasGrid.js` to keep core
  behavior intact.
- Fixed text editor overlay only activates for text inside widgets, preventing random opens in builder mode.
- Fixed duplicate key error on startup when the userManagement module
  reinitializes with existing MongoDB users lacking email addresses.
- Switching between client and server render modes now works by setting the
  `RENDER_MODE` environment variable or `features.renderMode` in
  `runtime.local.js`. The server strips `pageRenderer.js` automatically when
  `RENDER_MODE=server`.
- `runtime.local.js` overrides now merge feature flags instead of replacing
  them. The sample environment file documents `RENDER_MODE` for clarity.
- Clarified that switching render mode requires configuration changes; no
  runtime toggle exists.
- Documentation on switching the render engine with sections for SSR and CSR.
- Documented how to toggle render mode using the `RENDER_MODE` env var or runtime.local.js.
- Fixed admin layout saving on SQLite by passing placeholder parameters as arrays.
- Text block widget now preserves plain HTML when editing, working with raw text or headings.
- Added floating toolbar to text block widget that appears when editing text in the builder.
- Global text editor overlay works for all text-based widgets in the builder.
- Quill editor now loads automatically in builder mode and opens when clicking any editable text element.
=======
- Admin home screen now hides the sidebar completely.
- Admin widgets subtly adopt the user's selected color across the dashboard for a personalized UI.
- Resolved SQLite `NOT NULL` errors when creating share links; raw SQL placeholders now return parameter arrays.

## [0.5.1] – 2025-06-15
- Startup no longer marks `FIRST_INSTALL_DONE` as true when no users exist, so
  `/install` remains accessible for creating the first admin account.
- Fixed crash when hitting `/admin` or `/login` during setup. The routes now
  catch database errors and fall back to the installer instead of terminating.
- Fixed infinite redirect loop between `/install` and `/login` when
  `FIRST_INSTALL_DONE` wasn't set but user accounts existed.
- `/admin` now verifies installation and user count before redirecting,
  ensuring first-time setups reach `/install` and all subsequent access
  goes to `/login`.
- Admin home now checks installation status and redirects to `/install`
  if setup hasn't finished or no users exist.
- `/login` also redirects to `/install` when the system is not yet set up
  or no users exist.
- POST /install now checks installation status to prevent creating
- Automatically recreates `cms_settings` table if missing to avoid SQLite errors during first-time setup.
  additional admin users after setup.
- Fixed Settings Manager crash on SQLite by converting named parameters to
  positional arrays for `GET_SETTING` and `UPSERT_SETTING` queries.
- Fixed ADD_USER_FIELD placeholder to pass named parameters correctly, preventing SQLite install errors.
- Added /api/meltdown/batch endpoint and `meltdownEmitBatch` helper to reduce request spam from the admin dashboard.
- Fixed first-time install page failing due to incorrect token purpose for user count check.
- Display active public login strategies on the login page.
- Added login settings page with toggleable OAuth strategies.
- Fixed options menu button in the builder action bar to display widget actions correctly.
- Added options menu button to the builder action bar for widget actions.
- Fixed userManagement initialization failure on SQLite by checking for existing columns before adding them.
- Added /install route for first-time setup collecting admin details.
- Widget action buttons now appear as a popup toolbar when selecting a widget, offering lock, duplicate and delete options.
- Builder widgets now show a border in the active user's color on hover.
- Builder widget border is now only visible in builder mode when hovering or selecting a widget.
- Users can now select a personal UI color that sets the `--user-color` CSS variable across the dashboard.
- Theme styles in the builder no longer change menu buttons; active theme now only affects widget previews and background.
- Dynamic action button now hides unless configured and shows as a circle with hover and click animations.
- Redesigned modules list widget with activation toggles and module details.
- Content header edit icon now toggles widget drag mode and saves layout when exiting edit mode. Widgets remain fixed by default.
- Builder footer shows the Plainspace version using a server-injected variable and warns the builder is in alpha.
- Login route now redirects authenticated users and disables caching.
- Refactored page statistics widget to show live counts by lane.
- Quill text editor overlay appears above widget text but stays below menu buttons.
- Quill editor overlay no longer blocks builder menu buttons.
- Added preview mode toggle to the page builder for quick layout previews.
- Scoped theme injection in builder mode for live preview without altering the builder UI.
- Removed global theme injection in builder mode to protect the editor UX.
- Redesigned media explorer with a grid layout and folder navigation.
- Removed content sidebar from admin home screen.
- Admin dashboard now displays the current page title in the header and browser tab.
- Documentation updates for v0.5.0 features: permission groups, layout
  templates, notification hub and widget templates.
- Corrected instructions to open the Notification Hub using the Blogposter logo
  instead of the bell icon.
- Added configurable action button in the content header with a plus icon on the
  Page Management screen for quick page creation.
- Fixed builder page missing global theme injection, ensuring widgets inherit
  active theme styles.
- Page list widget now lets admins edit page titles and slugs inline; press
  Enter or click outside to save changes.
- Fixed page statistics widget to display actual page counts on the admin
  dashboard.
- Documented the layered CSS approach for widgets in the Page Builder.
- Meltdown notifications now use concise text in the Notification Hub while logs keep full details.

## [0.5.0] – 2025-06-11
-- **Breaking change:** delete your existing database and reinitialize BlogposterCMS after upgrading for the new features to work.
- Media explorer no longer throws an error when closed; it now resolves with a `cancelled` flag. Builder and image widget updated.
- Updated all system module versions to `0.5.0`.
- Suppressed console errors when closing the media explorer without selecting an image.
- Snap to Grid option now snaps widget width and height so items align correctly.
- Set body element to use `var(--font-body)` for consistent typography across the dashboard.
- Ensured builder code editor uses global font variables for consistent typography.
- Disabled admin search when not authenticated and show "Login required" placeholder. Token errors now disable the input instead of failing silently.
- Widget list now includes a Templates tab populated from saved widget templates. Builders can save the current widget state as a template and overwrite after confirmation.
- Permissions widget now lets admins create permission groups using JSON and shows seeded groups like `admin` and `standard`.
- Permission groups can now be edited or removed in the settings UI (system groups remain locked).
- Users settings page now lists permission groups with edit and delete controls and the dedicated Permissions page was removed.
- Admin navigation now uses a gradient layout icon for improved visual consistency.
- Text block widget editing now syncs Quill output with the code editor HTML
  field in the builder, allowing manual HTML tweaks.
- Page list widget now prefixes slugs with `/` and includes new icons to view or share pages directly.
- Fixed content header disappearing when grid layout rendered.
- Optimized widget list widget to skip global widget checks when many pages exist, preventing API rate limit errors in the admin dashboard.
- Fixed new default widgets not seeding when `PLAINSPACE_SEEDED` was already set,
  ensuring `widgetList` and future widgets appear after upgrades.
- Fixed "Add new permission" button in user settings to open the Permissions page.
- Added dedicated Permissions admin page with a new widget for listing and
  creating permissions. Default permissions are seeded at startup.
- Fixed admin search not initializing when scripts load after DOMContentLoaded.
- Increased default page request limit and documented `PAGE_RATE_LIMIT_MAX` to prevent search lockouts.
- Added `widgetList` admin widget listing all seeded public widgets with tabs for global widgets. The Widgets admin page is seeded with this widget.
- User management widget now includes a Permissions tab for viewing and creating permissions.
- Widget code editor now includes an "Insert Image" button that uploads to the media explorer and injects an `<img>` tag.
- Improved media explorer usability with larger dialog and backdrop overlay.
- Text block widget now uses a single floating Quill instance instead of creating
  an editor inside each widget's shadow DOM. This avoids focus issues and
  duplicate toolbars.
- Fixed text block editor in builder to clean up tooltip overlays on close,
  preventing multiple toolbars from stacking.
- Widgets can now be marked as global in the builder. Editing a global widget updates all pages that use it.
- Removed Quill editor from the SEO description field in the page editor and
  switched to a simple textarea.
- Fixed text block editor in builder so it closes when clicking outside by
  listening for pointerdown events.
- Fixed notification hub not opening when clicking the logo by initializing after the header loads.
- Fixed text block editor in builder to remove old Quill instances on re-render,
  preventing duplicate toolbars.
- Fixed SEO description editor in builder to remove old Quill instances before
  creating a new one, preventing duplicate toolbars.
- Layout templates widget header reorganized: add button moved next to title and filter tabs aligned left.
- Modules settings widget now separates Installed and System modules.
- Added `moduleInfo.json` to system modules with version `0.3.2`.
- Database initialization now adds missing `preview_path` column for layout templates.
- Sanitized user management event logs to avoid JWT exposure.
- Added notification hub UI and meltdown event `getRecentNotifications`.
- Layout template previews now stored via `preview_path`; widget shows preview images.
- Layout templates widget now includes a create button and rearranged filters below it.
- Increased text block auto-save delay to 1.5s and skip identical saves to reduce API load.
- Added "Layouts" admin page with a layout templates widget.
- Text block editor now closes when clicking outside and uses an empty placeholder.
- Builder widgets no longer lock when using resize handles; only clicks on widget content toggle locking.
- Fixed plainSpace widget instance database operations across all engines.
- Widget instance API now enforces `plainspace.widgetInstance` permission.
- Text block widget content is stored per instance so seeded widgets remain unchanged.
- Debounced text block widget updates to avoid rate limiting while typing.
- Theme stylesheet now loads globally when the builder is active so widgets use
  site colors and fonts.
- Quill editor styles are injected into widget shadow roots for consistent text
  editing.
- Locking now sets GridStack's `noMove` and `noResize` flags to completely disable widget movement while locked.
- Lock icon overlay now uses SCSS with a higher z-index so it always appears above widgets.
- Locked widgets now display a lock icon overlay in place of the resize arrow and cannot be dragged or resized.
- Builder widgets unlock when clicking outside and show a lock icon while active.
- Widgets now lock on click in the builder so they can be edited globally.
- Fixed theme styles not applying in the builder by importing the active theme stylesheet inside widget shadow roots.
- Resolved blank widgets when opening the code editor by loading widget scripts using absolute URLs.
- Fixed builder widgets showing blank when CSS was injected before widget content.
- Text block widget now loads the Quill library and styles on demand so editing
  works in sandboxed widgets.
- Builder widget CSS now loads gridstack and admin styles before the active theme
  to avoid layout conflicts.
- Active theme CSS is now injected into public pages and builder grid only.
- Builder widgets preview using theme styles without affecting the admin UI.
- Implemented "Hello World" default theme with Inter typography, electric-purple accent and micro-interactions.
- Fixed text block widget not showing the Lorem Ipsum placeholder when first
  added and ensured the Quill editor initializes on click.
- Text block widget now displays a Lorem Ipsum placeholder and activates the
  Quill editor on click. Edits are sanitized before being stored.
- Improved text block widget sanitization and only load the Quill editor when
  editing to reduce attack surface.
- Fixed widget code editor so unsaved JS doesn't overwrite HTML when closing the
  builder edit overlay.
- Removed placeholder text from all public widgets to preserve user edits.
- Moved text block widget styles to SCSS for easier maintenance.
- Text block widget now uses a Quill editor with dynamic sizing and HTML
  sanitation.
- Removed Quill from the builder widget HTML editor; now a simple textarea is used.
- Options menu in the builder now appears outside widgets for better visibility.
- Builder widgets now have a three-dot menu with edit and duplicate actions, and the remove button moved to the left.
- Updated README: linked to bp-cli, collapsed screenshots in a details section, added GridStack reference and license header note.
- Improved README structure with an alpha badge, quick install snippet and more descriptive screenshot alt text.
- Added a CONTRIBUTING guide and linked it from the README.
- Styled modules settings widget to match page manager.
- Hardened dummyModule logging and made callbacks optional.
- Fixed dummyModule initialization by using payload-based `performDbOperation` calls.
- Documented dummyModule usage and added developer-friendly comments.
- Translated dummyModule comments to English and expanded template guide.

## [0.4.2] – 2025-06-07
- Fixed admin wildcard route to parse hex page IDs for MongoDB.
- Sanitized meltdown event logs to prevent format string injection.
- Mongo page queries now include an `id` field so admin edit links work.
- Marked `touchstart` handlers as passive in builder and page renderers to avoid scroll-blocking warnings.
- Fixed builder layout saves on MongoDB by preserving string page IDs.
- Kept builder pageId query params as strings so Mongo ObjectIds save correctly without affecting Postgres.
- Logged failed meltdown events to server console for easier debugging when layout saves fail.
- Fixed SQLite "SELECT_MODULE_BY_NAME" to accept array or object params like other drivers.
- Fixed regression test by stubbing `db.run` in the SQLite placeholder test.
- Added example `MONGODB_URI` with `replicaSet` parameter in env.sample and
  updated docs to clarify replica set usage.
- Documented MongoDB replica set requirement for transaction-based modules to prevent startup failures.
- Timestamps now stored in UTC using `new Date().toISOString()` for all `created_at` and `updated_at` fields.
- Ensured Mongo unique indexes are created foreground with retry logic for
  user, page and widget collections to avoid race-condition duplicates.
- Fixed Mongo `SET_AS_START` to run within a transaction using
  `session.withTransaction()` so the previous start page flag can't remain
  active when the update partially fails.
- Fixed Mongo `CREATE_SHARE_LINK` to return the inserted document for driver v4 compatibility.
- Unified ID handling across Server-, Media- and ShareManager for Mongo. Inserts now store an `id` string matching the ObjectId and all queries use that field.
- Fixed Mongo pages missing an `id` field which broke layout loading in `getLayoutForViewport`.
- Mongo `GET_PAGES_BY_LANE` now returns the same structure as Postgres with `trans_*` fields for each translation.
- Unified `GET_PAGE_BY_SLUG` across all databases to return a single page object instead of an array.
- Normalized Mongo `CHECK_MODULE_REGISTRY_COLUMNS` to return `{ column_name }` rows like other drivers.
- Removed legacy Mongo placeholders `SET_AS_SUBPAGE`, `ASSIGN_PAGE_TO_POSTTYPE` and `INIT_WIDGETS_TABLE` to match Postgres parity.
- Fixed "SELECT_MODULE_BY_NAME" placeholder reading undefined variable `data`.
  Both Postgres and Mongo drivers now extract `moduleName` from `params`.
- Added ObjectId validation in Mongo placeholders to prevent crashes from invalid IDs.
- Fixed MongoDB page creation to store lane, language and title so seeded pages
  and widgets appear correctly.
- Fixed MongoDB logins failing when userId strings were not converted to ObjectId.
- Added warnings when admin_jwt cookies are cleared due to invalid tokens.
- Removed `config/environment.js`; `isProduction` now comes from `config/runtime.js`.
- Documented HTTPS requirement for login cookies in `docs/security.md`.
- Added warning when secure login cookies are set over HTTP.
- Added `APP_ENV` variable to toggle production mode via `.env` and updated
  `config/runtime.js` plus documentation to use it.
- Masked password fields in updateUserProfile and user creation logs to prevent
  leaking credentials during debugging.
- Fixed MongoDB logins failing after role assignments. `localDbUpdate` now
  interprets `{__raw_expr}` increment expressions and new users start with
  `token_version` set to `0`.
- Fixed token_version updates on MongoDB. Role assignments now use `_id` when
  incrementing the version so user tokens invalidate correctly.
- Masked passwords in userManagement logs to avoid credential leaks.

- Fixed pagesManager start page setup on MongoDB. `SET_AS_START` no longer uses
  an undefined `client` object, preventing module meltdown and login failures.
- Fixed role lookup when logging in on MongoDB setups. Role IDs are now compared as strings to avoid ObjectId mismatches.
- Fixed user login failing on MongoDB setups. `getUserDetailsById` now queries `_id` instead of `id`, so finalize login works properly.
- Removed deprecated `useUnifiedTopology` option from MongoDB connections to avoid warnings.
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
- Fixed role assignment on MongoDB. `dbSelect` now normalizes `_id` to `id`,
  ensuring roles attach correctly during user creation.
- Added test verifying Mongo user collections match PostgreSQL tables.
- Extended parity test to cover all Mongo collections across modules.

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

