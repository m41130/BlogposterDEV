/**
 * mother/modules/databaseManager/helpers/adminPool.js
 *
 * Provides the adminPool for Postgres operations like checking DB existence,
 * creating roles, etc.
 */
const { Pool } = require('pg');
const {
  pgAdminUser,
  pgAdminPass,
  pgAdminDb,
  pgHost,
  pgPort
} = require('../config/databaseConfig');
const notificationEmitter = require('../../../emitters/notificationEmitter');

let adminPool = new Pool({
  user: pgAdminUser,
  host: pgHost,
  database: pgAdminDb,
  password: pgAdminPass,
  port: pgPort
});

async function getAdminClient() {
  try {
    return await adminPool.connect();
  } catch (err) {
    if (err.code === '3D000' && pgAdminDb !== 'postgres') {
      notificationEmitter.notify({
        moduleName: 'databaseManager',
        notificationType: 'system',
        priority: 'warning',
        message: `Admin database "${pgAdminDb}" missing, falling back to "postgres".`
      });
      adminPool = new Pool({
        user: pgAdminUser,
        host: pgHost,
        database: 'postgres',
        password: pgAdminPass,
        port: pgPort
      });
      return await adminPool.connect();
    }
    throw err;
  }
}

async function adminQuery(sql, params) {
  const client = await getAdminClient();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

module.exports = {
  getAdminClient,
  adminQuery
};
