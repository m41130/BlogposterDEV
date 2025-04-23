/**
 * mother/modules/databaseManager/helpers/cryptoHelpers.js
 *
 * Helper functions for hashing names, passwords, generating usernames, etc.
 */
const crypto = require('crypto');
const { moduleDbSalt } = require('../config/databaseConfig');

function createHashedName(input, salt = '') {
  return crypto
    .createHmac('sha256', salt)
    .update(input)
    .digest('hex')
    .substring(0, 16)
    .toLowerCase();
}

function createHashedPassword(input, salt = '') {
  return crypto
    .createHmac('sha256', salt)
    .update(input)
    .digest('hex')
    .toLowerCase();
}

function generateModuleUsername(moduleName, salt = '') {
  const hashed = createHashedName(moduleName, salt);
  return hashed.substring(0, 63).toLowerCase();
}

function generateUserAndPass(moduleName) {
  // For 'databaseManager' we just use admin credentials.
  if (moduleName.toLowerCase() === 'databasemanager') {
    return null; // indicates we'll use admin user
  }
  const user = generateModuleUsername(moduleName, moduleDbSalt);
  const pass = createHashedPassword(moduleName, moduleDbSalt);
  return { user, pass };
}

module.exports = {
  createHashedName,
  createHashedPassword,
  generateModuleUsername,
  generateUserAndPass
};
