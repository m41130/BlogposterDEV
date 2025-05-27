/**
 * mother/modules/databaseManager/engines/mongoEngine.js
 */
const { MongoClient } = require('mongodb');
const {
  mongoAdminUser,
  mongoAdminPassword,
  mongoHost,
  mongoPort,
  mongoUri
} = require('../config/databaseConfig');
const { generateUserAndPass } = require('../helpers/cryptoHelpers');
const { handleBuiltInPlaceholderMongo } = require('../placeholders/mongoPlaceholders');

// NEW: For typed notifications
const notificationEmitter = require('../../../emitters/notificationEmitter');

async function createMongoDatabase(moduleName) {
  const dbName = `${moduleName.toLowerCase()}_db`.substring(0, 63);
  let creds = generateUserAndPass(moduleName, 'rw');
  const adminUser = mongoAdminUser;
  const adminPass = mongoAdminPassword;

  if (!mongoUri) {
    notificationEmitter.notify({
      moduleName: 'databaseManager',
      notificationType: 'system',
      priority: 'warning',
      message: '[MongoEngine] No MONGODB_URI provided. Using fallback local approach.'
    });
  }
  const adminUri = mongoUri || `mongodb://${adminUser}:${adminPass}@${mongoHost}:${mongoPort}/admin`;

  const mongoAdminClient = new MongoClient(adminUri);
  await mongoAdminClient.connect();
  notificationEmitter.notify({
    moduleName: 'databaseManager',
    notificationType: 'info',
    priority: 'info',
    message: `[MongoEngine] Checking/creating DB "${dbName}" for module="${moduleName}"...`
  });
  try {
    const db = mongoAdminClient.db(dbName);

    if (moduleName.toLowerCase() !== 'databasemanager' && creds) {
      notificationEmitter.notify({
        moduleName: 'databaseManager',
        notificationType: 'debug',
        priority: 'debug',
        message: `Creating dbOwner user "${creds.user}" for DB "${dbName}"...`
      });
      await db.command({
        createUser: creds.user,
        pwd: creds.pass,
        roles: [{ role: 'dbOwner', db: dbName }]
      });
    }
    notificationEmitter.notify({
      moduleName: 'databaseManager',
      notificationType: 'info',
      priority: 'info',
      message: `Finished createMongoDatabase for module="${moduleName}".`
    });
  } catch (err) {
    notificationEmitter.notify({
      moduleName: 'databaseManager',
      notificationType: 'system',
      priority: 'critical',
      message: `Failed createMongoDatabase for module "${moduleName}": ${err.message}`
    });
    throw err;
  } finally {
    await mongoAdminClient.close();
  }
}

async function performMongoOperation(moduleName, operation, params = []) {
  try {
    if (await isPlaceholderOperation(operation)) {
      const db = await connectToModuleDb(moduleName);
      return await handleBuiltInPlaceholderMongo(db, operation, params);
    } else {
      // Normal ops like insertOne, find, etc.
      const db = await connectToModuleDb(moduleName);
      if (operation === 'insertOne') {
        const { collectionName, doc } = params;
        return await db.collection(collectionName).insertOne(doc);
      } else if (operation === 'find') {
        const { collectionName, query } = params;
        return await db.collection(collectionName).find(query || {}).toArray();
      }
      throw new Error(`[MongoEngine] Unsupported operation="${operation}".`);
    }
  } catch (err) {
    notificationEmitter.notify({
      moduleName: moduleName || 'databaseManager',
      notificationType: 'system',
      priority: 'critical',
      message: `Error performing Mongo operation for "${moduleName}": ${err.message}`
    });
    throw err;
  }
}

async function connectToModuleDb(moduleName) {
  let creds = generateUserAndPass(moduleName, 'rw');
  let dbUser = mongoAdminUser;
  let dbPass = mongoAdminPassword;
  const dbName = `${moduleName.toLowerCase()}_db`.substring(0, 63);

  if (moduleName.toLowerCase() !== 'databasemanager' && creds) {
    dbUser = creds.user;
    dbPass = creds.pass;
  }
  const connectUri = mongoUri
    ? mongoUri
    : `mongodb://${dbUser}:${dbPass}@${mongoHost}:${mongoPort}/${dbName}?authSource=${dbName}`;

  const client = new MongoClient(connectUri, { useUnifiedTopology: true });
  await client.connect();
  return client.db(dbName);
}

async function isPlaceholderOperation(op) {
  const { getCustomPlaceholder } = require('../placeholders/placeholderRegistry');
  const builtIns = require('../placeholders/builtinPlaceholders');
  if (builtIns.includes(op)) return true;
  if (getCustomPlaceholder(op)) return true;
  return false;
}

module.exports = {
  createMongoDatabase,
  performMongoOperation
};
