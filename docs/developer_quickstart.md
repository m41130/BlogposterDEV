# Developer Quickstart

This page summarises the steps to spin up BlogposterCMS for local development and run the included tests. Make sure you have Node.js installed.
First follow the [Installation](installation.md) guide if you have not yet set up the project.

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd BlogposterCMS
   npm install
   ```

2. **Create `.env`**
   ```bash
   cp env.sample .env
   # edit .env and replace the placeholder secrets
   ```
  Use strong random values for `JWT_SECRET` and the various *_SALT variables.
  The application no longer provides fallback secrets, so missing values will
  cause startup errors.

3. **Build assets and start the server**
   ```bash
   npm run build
   npm start
   ```
   The server listens on the port configured in `.env` (default `3000`). Visit
   `http://localhost:3000/` to access the CMS.

4. **Run tests**
   ```bash
   npm test
   ```
   The test suite now uses **Jest**. All tests reside in the `tests/` directory.
   Ensure the server is **not** already running when you execute them.
   A dedicated command is provided to verify database placeholder parity across
   Postgres, MongoDB and SQLite:

   ```bash
   npm run placeholder-parity
   ```

5. **Coding conventions**
   - Keep modules self-contained and communicate only via meltdown events.
   - Check `npm audit` regularly to catch vulnerable dependencies.
   - We recommend using `eslint` (not included by default) to maintain
     consistent style.
