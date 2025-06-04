/**
 * mother/modules/databaseManager/placeholders/sqlitePlaceholders.js
 *
 * Handles built-in placeholder operations for the SQLite engine.
 * Only a subset of operations are fully implemented. Others will
 * log a debug message and return a generic result so modules do
 * not crash when SQLite is selected.
 */
const notificationEmitter = require('../../../emitters/notificationEmitter');

function sanitizeIdentifier(name) {
  if (typeof name !== 'string' || !/^[A-Za-z0-9_]+$/.test(name)) {
    throw new Error('Invalid identifier');
  }
  return name;
}

async function handleBuiltInPlaceholderSqlite(db, operation, params = []) {
  switch (operation) {
    /* ----------------------------- User Management --------------------------- */
    case 'INIT_USER_MANAGEMENT': {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS usermanagement_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE,
          password TEXT NOT NULL,
          first_name TEXT,
          last_name TEXT,
          display_name TEXT,
          phone TEXT,
          company TEXT,
          website TEXT,
          avatar_url TEXT,
          bio TEXT,
          token_version INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS usermanagement_roles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          role_name TEXT UNIQUE NOT NULL,
          is_system_role INTEGER DEFAULT 0,
          description TEXT,
          permissions TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS usermanagement_user_roles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          role_id INTEGER,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);
      return { done: true };
    }

    case 'ADD_USER_FIELD': {
      const fieldName = sanitizeIdentifier(params.fieldName || 'extra_field');
      const allowed = ['TEXT', 'INTEGER', 'REAL', 'BLOB'];
      const fieldType = allowed.includes((params.fieldType || '').toUpperCase())
        ? params.fieldType.toUpperCase()
        : 'TEXT';
      await db.exec(`ALTER TABLE usermanagement_users ADD COLUMN ${fieldName} ${fieldType};`);
      return { done: true };
    }

    /* ------------------------------ Settings -------------------------------- */
    case 'INIT_SETTINGS_TABLES': {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS settingsManager_cms_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE NOT NULL,
          value TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);
      return { done: true };
    }

    case 'GET_SETTING': {
      const settingKey = params[0];
      return new Promise((resolve, reject) => {
        db.get(
          `SELECT value FROM settingsManager_cms_settings WHERE key = ? LIMIT 1;`,
          [settingKey],
          (err, row) => {
            if (err) return reject(err);
            resolve(row ? [row] : []);
          }
        );
      });
    }

    case 'UPSERT_SETTING': {
      const settingKey = params[0];
      const settingValue = params[1];
      await db.run(
        `INSERT INTO settingsManager_cms_settings (key, value, created_at, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;`,
        [settingKey, settingValue]
      );
      return { done: true };
    }

    case 'GET_ALL_SETTINGS': {
      return new Promise((resolve, reject) => {
        db.all(
          `SELECT key, value FROM settingsManager_cms_settings ORDER BY id ASC;`,
          [],
          (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
          }
        );
      });
    }

    /* ------------------------------ Default --------------------------------- */
    default:
      notificationEmitter.notify({
        moduleName: 'databaseManager',
        notificationType: 'debug',
        priority: 'debug',
        message: `[PLACEHOLDER][SQLite] Unhandled built-in placeholder "${operation}". Doing nothing...`
      });
      return { message: `No SQLite handler for ${operation}` };
  }
}

module.exports = { handleBuiltInPlaceholderSqlite };
