/**
 * mother/modules/databaseManager/engines/engineFactory.js
 */
const { getDbType } = require('../helpers/dbTypeHelpers');
const postgresEngine = require('./postgresEngine');
const mongoEngine = require('./mongoEngine');

function getEngine() {
  const type = getDbType();
  if (type === 'postgres') return postgresEngine;
  if (type === 'mongodb') return mongoEngine;
  throw new Error(`[engineFactory] Unknown DB type=${type}`);
}

module.exports = { getEngine };
