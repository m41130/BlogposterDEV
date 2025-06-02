# Choosing a Database Engine

BlogposterCMS can use either **PostgreSQL** or **MongoDB** for storing content. The selected engine is controlled through the `CONTENT_DB_TYPE` environment variable.

## PostgreSQL
- Fully tested with BlogposterCMS.
- Works with the built-in database manager modules.
- Recommended for production use.

## MongoDB
- Support is experimental and not yet thoroughly tested.
- Only choose MongoDB if you are comfortable debugging potential issues.

## How to Select
1. Open `.env` and set `CONTENT_DB_TYPE` to either `postgres` or `mongodb`.
2. Provide the matching connection credentials (`PG_*` variables for Postgres, `MONGODB_URI` for MongoDB).
3. Restart the CMS so the database manager picks up the new settings.

Keep your database credentials private and restrict access to the minimal privileges required.
