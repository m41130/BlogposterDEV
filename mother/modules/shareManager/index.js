/**
 * mother/modules/shareManager/index.js
 *
 * 1) Ensures DB creation (via meltdown => createDatabase)
 * 2) Ensures schema & table/collection (via meltdown => dbUpdate => 'INIT_SHARED_LINKS_TABLE')
 * 3) Sets up meltdown listeners for createShareLink, revokeShareLink, getShareDetails, etc.
 *
 * We follow a similar pattern to your pagesManager/index.js.
 */

require('dotenv').config();
const { ensureShareManagerDatabase, ensureShareTables } = require('./shareService');

// Because meltdown can be sneaky
const { onceCallback } = require('../../emitters/motherEmitter');
const { hasPermission } = require('../userManagement/permissionUtils');

const TIMEOUT_DURATION = 5000;

module.exports = {
  async initialize({ motherEmitter, isCore, jwt, nonce }) {
    if (!isCore) {
      console.error('[SHARE MANAGER] Must be loaded as a core module. Aborting meltdown.');
      return;
    }
    if (!jwt) {
      console.error('[SHARE MANAGER] No JWT provided, meltdown meltdown => cannot proceed.');
      return;
    }

    console.log('[SHARE MANAGER] Initializing ShareManager Module...');

    try {
      // 1) Ensure shareManager DB or schema
      await ensureShareManagerDatabase(motherEmitter, jwt, nonce);

      // 2) Ensure schema & table/collection
      await ensureShareTables(motherEmitter, jwt, nonce);

      // 3) Register meltdown events for sharing logic
      setupShareEventListeners(motherEmitter);

      console.log('[SHARE MANAGER] ShareManager Module initialized successfully.');
    } catch (err) {
      console.error('[SHARE MANAGER] Error initializing shareManager =>', err.message);
    }
  }
};

/**
 * setupShareEventListeners:
 *   Registers meltdown events:
 *     - createShareLink
 *     - revokeShareLink
 *     - getShareDetails
 *     - etc. (like getAllLinks, if you want)
 *
 * We avoid raw SQL in code. We use placeholders in dbInsert/dbSelect/dbUpdate/dbDelete
 * (e.g. "CREATE_SHARE_LINK", "REVOKE_SHARE_LINK", etc.) so the bridging can handle
 * Postgres or Mongo under the hood.
 */
function setupShareEventListeners(motherEmitter) {
  console.log('[SHARE MANAGER] Setting up meltdown event listeners for share links...');

  // CREATE SHARE LINK
  motherEmitter.on('createShareLink', (payload, originalCb) => {
    // Wrapping meltdown callback
    const callback = onceCallback(originalCb);

    try {
      const {
        jwt,
        moduleName,
        moduleType,
        filePath,
        userId,         // who is creating
        isPublic = true, // optional flag
        expiresAt       // optional timestamp
      } = payload || {};

      if (!jwt || moduleName !== 'shareManager' || moduleType !== 'core') {
        return callback(new Error('[SHARE MANAGER] createShareLink => meltdown check failed.'));
      }
      if (!filePath || !userId) {
        return callback(new Error('Missing filePath or userId.'));
      }

      const { decodedJWT } = payload;
      if (decodedJWT && !hasPermission(decodedJWT, 'share.create')) {
        return callback(new Error('Forbidden – missing permission: share.create'));
      }

      // We'll create a short token ourselves, or rely on bridging code
      const shortToken = generateRandomToken(8);

      // Data object
      const dataObj = {
        shortToken,
        filePath,
        userId,
        isPublic,
        expiresAt: expiresAt || null
      };

      const to = setTimeout(() => {
        callback(new Error('Timeout while creating share link.'));
      }, TIMEOUT_DURATION);

      // meltdown => dbInsert => table='__rawSQL__', data.rawSQL='CREATE_SHARE_LINK'
      motherEmitter.emit(
        'dbInsert',
        {
          jwt,
          moduleName: 'shareManager',
          moduleType: 'core',
          table: '__rawSQL__',
          data: {
            rawSQL: 'CREATE_SHARE_LINK',
            ...dataObj
          }
        },
        (err, result) => {
          clearTimeout(to);
          if (err) return callback(err);

          // Suppose bridging returns something, or we just build a final URL
          const baseDomain = process.env.APP_BASE_URL || 'https://myapp.com';
          const fileName = extractFileName(filePath);
          const shareURL = `${baseDomain}/s/${shortToken}/${fileName}`;

          callback(null, { shortToken, shareURL, expiresAt: dataObj.expiresAt, result });
        }
      );
    } catch (ex) {
      callback(ex);
    }
  });

  // REVOKE SHARE LINK
  motherEmitter.on('revokeShareLink', (payload, originalCb) => {
    const callback = onceCallback(originalCb);

    try {
      const {
        jwt,
        moduleName,
        moduleType,
        shortToken,
        userId // who is revoking
      } = payload || {};

      if (!jwt || moduleName !== 'shareManager' || moduleType !== 'core') {
        return callback(new Error('[SHARE MANAGER] revokeShareLink => meltdown check failed.'));
      }
      if (!shortToken || !userId) {
        return callback(new Error('Missing shortToken or userId.'));
      }

      const { decodedJWT } = payload;
      if (decodedJWT && !hasPermission(decodedJWT, 'share.revoke')) {
        return callback(new Error('Forbidden – missing permission: share.revoke'));
      }

      const to = setTimeout(() => {
        callback(new Error('Timeout while revoking share link.'));
      }, TIMEOUT_DURATION);

      // meltdown => dbUpdate or dbDelete with placeholder
      motherEmitter.emit(
        'dbUpdate',
        {
          jwt,
          moduleName: 'shareManager',
          moduleType: 'core',
          table: '__rawSQL__',
          data: {
            rawSQL: 'REVOKE_SHARE_LINK',
            shortToken,
            userId
          }
        },
        (err, result) => {
          clearTimeout(to);
          if (err) return callback(err);
          callback(null, { success: true, shortToken, result });
        }
      );
    } catch (ex) {
      callback(ex);
    }
  });

  // GET SHARE DETAILS
  motherEmitter.on('getShareDetails', (payload, originalCb) => {
    const callback = onceCallback(originalCb);

    try {
      const { jwt, moduleName, moduleType, shortToken } = payload || {};
      if (!jwt || moduleName !== 'shareManager' || moduleType !== 'core') {
        return callback(new Error('[SHARE MANAGER] getShareDetails => meltdown check failed.'));
      }
      if (!shortToken) {
        return callback(new Error('Missing shortToken.'));
      }

      const { decodedJWT } = payload;
      if (decodedJWT && !hasPermission(decodedJWT, 'share.read')) {
        return callback(new Error('Forbidden – missing permission: share.read'));
      }

      const to = setTimeout(() => {
        callback(new Error('Timeout while getting share details.'));
      }, TIMEOUT_DURATION);

      // meltdown => dbSelect => table='__rawSQL__', data.rawSQL='GET_SHARE_LINK'
      motherEmitter.emit(
        'dbSelect',
        {
          jwt,
          moduleName: 'shareManager',
          moduleType: 'core',
          table: '__rawSQL__',
          data: {
            rawSQL: 'GET_SHARE_LINK',
            shortToken
          }
        },
        (err, rows) => {
          clearTimeout(to);
          if (err) return callback(err);
          if (!rows || rows.length === 0) {
            return callback(null, null);
          }
          const row = rows[0];
          if (row.expiresAt && Date.now() > new Date(row.expiresAt).getTime()) {
            return callback(null, null);
          }
          callback(null, row);
        }
      );
    } catch (ex) {
      callback(ex);
    }
  });
}

/**
 * generateRandomToken:
 *   Creates a random base62 string of given length for short tokens.
 */
function generateRandomToken(length = 8) {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const bytes = require('crypto').randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/**
 * extractFileName:
 *   e.g. "public/images/mycat.png" => "mycat.png"
 */
function extractFileName(filePath) {
  return filePath.split('/').pop();
}
