/**
 * mother/modules/databaseManager/engines/engineFactory.js
 */
const { getDbType } = require('../helpers/dbTypeHelpers');

function getEngine() {
  const type = getDbType();
  if (type === 'postgres') return require('./postgresEngine');
  if (type === 'mongodb') return require('./mongoEngine');
  if (type === 'sqlite') return require('./sqliteEngine');
  throw new Error(`[engineFactory] Unknown DB type=${type}`);
}

module.exports = { getEngine };
