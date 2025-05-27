/**
 * mother/modules/databaseManager/engines/postgresEngine.js
 *
 * Logic for creating/fixing a dedicated DB, or a schema in the main DB,
 * plus performing normal queries or placeholders.
 */
const { Pool } = require('pg');
const { adminPool } = require('../helpers/adminPool');
const { generateUserAndPass } = require('../helpers/cryptoHelpers');
const { pgHost, pgPort, pgMainDb, pgMainUser, pgMainPass } = require('../config/databaseConfig');
const { handleBuiltInPlaceholderPostgres } = require('../placeholders/postgresPlaceholders');

// --- NEW: notificationEmitter for typed notifications! ---
const notificationEmitter = require('../../../emitters/notificationEmitter');

/* ------------------------------------------------------------------
   1) CREATE/FIX => "own DB" approach
   ------------------------------------------------------------------ */
async function createOrFixPostgresDatabaseForOwnModule(moduleName) {
  const dbName = `${moduleName.toLowerCase()}_db`.substring(0, 63);

  let rwCreds = generateUserAndPass(moduleName, 'rw');
  let roCreds = generateUserAndPass(moduleName, 'ro');
  let dbUser = rwCreds ? rwCreds.user : (process.env.PG_ADMIN_USER || '').toLowerCase();
  let dbPassword = rwCreds ? rwCreds.pass : process.env.PG_ADMIN_PASSWORD || '';

  try {
    // Check existence
    const exists = await checkIfDbExists(dbName);
    if (!exists) {
      await adminPool.query(`CREATE DATABASE "${dbName}"`);
      notificationEmitter.notify({
        moduleName: 'databaseManager',
        notificationType: 'system',
        priority: 'info',
        message: `Created new Postgres DB "${dbName}".`
      });
    } else {
      notificationEmitter.notify({
        moduleName: 'databaseManager',
        notificationType: 'debug',
        priority: 'debug',
        message: `Database "${dbName}" already exists.`
      });
    }

    // If not 'databasemanager', create user & fix ownership
    if (moduleName.toLowerCase() !== 'databasemanager') {
      const rwExists = await checkIfUserExists(rwCreds.user);
      if (!rwExists) {
        await adminPool.query(`CREATE USER "${rwCreds.user}" WITH ENCRYPTED PASSWORD '${rwCreds.pass}';`);
      }
      const roExists = await checkIfUserExists(roCreds.user);
      if (!roExists) {
        await adminPool.query(`CREATE USER "${roCreds.user}" WITH ENCRYPTED PASSWORD '${roCreds.pass}';`);
      }
      await adminPool.query(`
        GRANT CONNECT, TEMPORARY ON DATABASE "${dbName}" TO "${rwCreds.user}", "${roCreds.user}";
        GRANT USAGE ON SCHEMA public TO "${rwCreds.user}", "${roCreds.user}";
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${rwCreds.user}";
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO "${roCreds.user}";
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO "${roCreds.user}";
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "${rwCreds.user}";
      `);
    }
  } catch (err) {
    notificationEmitter.notify({
      moduleName: 'databaseManager',
      notificationType: 'system',
      priority: 'critical',
      message: `Failed to create/fix DB for module "${moduleName}": ${err.message}`
    });
    throw err;
  }
  return {
    user: dbUser,
    password: dbPassword,
    host: pgHost,
    database: dbName,
    port: pgPort
  };
}

/* ------------------------------------------------------------------
   2) CREATE/FIX => "shared DB + schema" approach
   ------------------------------------------------------------------ */
async function createOrFixSchemaInMainDb(moduleName) {
  const schemaName = moduleName.toLowerCase();

  // Connect as admin
  try {
    const client = await adminPool.connect();
    const dbExistsRes = await client.query('SELECT 1 FROM pg_database WHERE datname = $1;', [pgMainDb]);
    if (dbExistsRes.rows.length === 0) {
      await client.query(`CREATE DATABASE "${pgMainDb}"`);
      notificationEmitter.notify({
        moduleName: 'databaseManager',
        notificationType: 'system',
        priority: 'info',
        message: `Created main DB "${pgMainDb}".`
      });
    }
    await client.release();

    // Now connect as admin to main DB
    const { Pool } = require('pg');
    const mainPool = new Pool({
      user: (process.env.PG_ADMIN_USER || '').toLowerCase(),
      password: process.env.PG_ADMIN_PASSWORD || '',
      host: pgHost,
      port: pgPort,
      database: pgMainDb
    });
    const mainClient = await mainPool.connect();

    // Create schema if not exists
    const schemaExistsRes = await mainClient.query(
      'SELECT 1 FROM pg_namespace WHERE nspname = $1;',
      [schemaName]
    );
    if (schemaExistsRes.rows.length === 0) {
      await mainClient.query(`CREATE SCHEMA "${schemaName}";`);
      notificationEmitter.notify({
        moduleName: 'databaseManager',
        notificationType: 'info',
        priority: 'info',
        message: `Created schema "${schemaName}" in DB "${pgMainDb}".`
      });
    } else {
      notificationEmitter.notify({
        moduleName: 'databaseManager',
        notificationType: 'debug',
        priority: 'debug',
        message: `Schema "${schemaName}" already exists in DB "${pgMainDb}".`
      });
    }

    await mainClient.query(`ALTER SCHEMA "${schemaName}" OWNER TO "${pgMainUser}";`);
    await mainClient.release();
    await mainPool.end();
  } catch (err) {
    notificationEmitter.notify({
      moduleName: 'databaseManager',
      notificationType: 'system',
      priority: 'critical',
      message: `Failed to create/fix schema in main DB for module "${moduleName}": ${err.message}`
    });
    throw err;
  }
}

/* ------------------------------------------------------------------
   3) performPostgresOperation
   ------------------------------------------------------------------ */
async function performPostgresOperation(moduleName, operation, params, isOwnDb) {
  try {
    // Check placeholders
    if (typeof operation === 'string') {
      if (await isPlaceholderOperation(operation)) {
        const pool = getGlobalMainDbPool();
        const client = await pool.connect();
        try {
          const result = await handleBuiltInPlaceholderPostgres(client, operation, params);
          return result;
        } finally {
          client.release();
        }
      }
    }

    // Not a recognized placeholder => normal SQL
    if (isOwnDb) {
      const dbName = `${moduleName.toLowerCase()}_db`;
      let moduleCreds = generateUserAndPass(moduleName, 'rw');
      let dbUser, dbPassword;
      if (!moduleCreds) {
        dbUser = (process.env.PG_ADMIN_USER || '').toLowerCase();
        dbPassword = process.env.PG_ADMIN_PASSWORD || '';
      } else {
        dbUser = moduleCreds.user;
        dbPassword = moduleCreds.pass;
      }

      const dbPool = new Pool({
        user: dbUser,
        host: pgHost,
        database: dbName,
        password: dbPassword,
        port: pgPort
      });
      const client = await dbPool.connect();
      try {
        const result = await client.query(operation, params);
        return result;
      } finally {
        client.release();
        dbPool.end();
      }
    } else {
      const pool = getGlobalMainDbPool();
      const client = await pool.connect();
      try {
        const result = await client.query(operation, params);
        return result;
      } finally {
        client.release();
      }
    }
  } catch (err) {
    // New: Send CRITICAL notification if something fails
    notificationEmitter.notify({
      moduleName: moduleName || 'databaseManager',
      notificationType: 'system',
      priority: 'critical',
      message: `Error performing Postgres operation for "${moduleName}": ${err.message}`
    });
    throw err;
  }
}

/* ------------------------------------------------------------------
   4) Utility
   ------------------------------------------------------------------ */
async function checkIfDbExists(dbName) {
  const res = await adminPool.query('SELECT 1 FROM pg_database WHERE datname = $1;', [dbName.toLowerCase()]);
  return res.rows.length > 0;
}
async function checkIfUserExists(dbUser) {
  const res = await adminPool.query('SELECT 1 FROM pg_roles WHERE rolname = $1;', [dbUser]);
  return res.rows.length > 0;
}
let globalMainPool = null;
function getGlobalMainDbPool() {
  if (!globalMainPool) {
    globalMainPool = new Pool({
      user: pgMainUser,
      password: pgMainPass,
      host: pgHost,
      port: pgPort,
      database: pgMainDb,
      max: 10
    });
    notificationEmitter.notify({
      moduleName: 'databaseManager',
      notificationType: 'debug',
      priority: 'debug',
      message: `[PostgresEngine] Created global main DB pool => ${pgMainDb}`
    });
  }
  return globalMainPool;
}

async function isPlaceholderOperation(op) {
  const { getCustomPlaceholder } = require('../placeholders/placeholderRegistry');
  const builtIns = require('../placeholders/builtinPlaceholders');
  if (builtIns.includes(op)) return true;
  if (getCustomPlaceholder(op)) return true;
  return false;
}

module.exports = {
  createOrFixPostgresDatabaseForOwnModule,
  createOrFixSchemaInMainDb,
  performPostgresOperation
};
