/**
 * mother/modules/databaseManager/engines/sqliteEngine.js
 *
 * Provides minimal SQLite support for BlogposterCMS.
 * Creates database files per module and performs basic SQL operations.
 */
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const {
  sqliteStorage,
  sqliteMainFile
} = require('../config/databaseConfig');
const { sanitizeModuleName } = require('../../utils/moduleUtils');
const notificationEmitter = require('../../../emitters/notificationEmitter');
const builtinPlaceholders = require('../placeholders/builtinPlaceholders');
const { getCustomPlaceholder } = require('../placeholders/placeholderRegistry');
const { handleBuiltInPlaceholderSqlite } = require('../placeholders/sqlitePlaceholders');

function getDbPath(moduleName, isOwnDb) {
  const safeName = sanitizeModuleName(moduleName).toLowerCase();
  const file = isOwnDb ? `${safeName}.sqlite` : sqliteMainFile;
  return path.resolve(sqliteStorage, file);
}

function ensureDbFile(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  if (!fs.existsSync(dbPath)) {
    fs.closeSync(fs.openSync(dbPath, 'w'));
  }
}

async function createOrFixSqliteDatabaseForModule(moduleName, isOwnDb) {
  const dbPath = getDbPath(moduleName, isOwnDb);
  ensureDbFile(dbPath);
  notificationEmitter.notify({
    moduleName: 'databaseManager',
    notificationType: 'info',
    priority: 'info',
    message: `[SQLiteEngine] Using database at ${dbPath}`
  });
  return { dbPath };
}

function performSqliteOperation(moduleName, operation, params = [], isOwnDb) {
  return new Promise((resolve, reject) => {
    const dbPath = getDbPath(moduleName, isOwnDb);
    const db = new sqlite3.Database(
      dbPath,
      sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
      async err => {
        if (err) return reject(err);

        try {
          if (typeof operation === 'string' && await isPlaceholderOperation(operation)) {
            const result = await handleBuiltInPlaceholderSqlite(db, operation, params);
            db.close();
            return resolve(result);
          }

          db.all(operation, params, (err2, rows) => {
            db.close();
            if (err2) return reject(err2);
            resolve({ rows });
          });
        } catch (e) {
          db.close();
          reject(e);
        }
      }
    );
  });
}

function isPlaceholderOperation(op) {
  if (builtinPlaceholders.includes(op)) return true;
  if (getCustomPlaceholder(op)) return true;
  return false;
}

module.exports = {
  createOrFixSqliteDatabaseForModule,
  performSqliteOperation
};
