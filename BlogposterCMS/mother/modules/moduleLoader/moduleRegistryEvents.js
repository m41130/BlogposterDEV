/**
 * mother/modules/moduleLoader/moduleRegistryEvents.js
 *
 * meltdown events for admin actions on the module registry:
 *   1) 'activateModuleInRegistry'
 *   2) 'deactivateModuleInRegistry'
 *
 * Also includes attemptSingleLoad to require & initialize the module immediately (one-off).
 */

const path = require('path');
const fs = require('fs');
const { onceCallback } = require('../../emitters/motherEmitter');
const { hasPermission } = require('../userManagement/permissionUtils');
const {
  updateModuleLastError,
  deactivateModule
} = require('./moduleRegistryService');
const { sanitizeModuleName } = require('../../utils/moduleUtils');

function initModuleRegistryAdminEvents(motherEmitter, app) {
  // meltdown => 'activateModuleInRegistry'
  motherEmitter.on('activateModuleInRegistry', async (payload, originalCb) => {
    const callback = onceCallback(originalCb);

    try {
      const { jwt, moduleName, moduleType, targetModuleName } = payload;
      if (!jwt || moduleName !== 'moduleLoader' || moduleType !== 'core') {
        return callback(new Error('[REGISTRY EVENTS] meltdown => must come from moduleLoader/core.'));
      }

      if (payload.decodedJWT && !hasPermission(payload.decodedJWT, 'modules.activate')) {
        return callback(new Error('Forbidden – missing permission: modules.activate'));
      }

      // meltdown => dbUpdate => set is_active=TRUE
      motherEmitter.emit(
        'dbUpdate',
        {
          jwt,
          moduleName: 'moduleLoader',
          moduleType: 'core',
          table: 'module_registry',
          where: { module_name: targetModuleName },
          data: {
            is_active: true,
            last_error: null,
            updated_at: new Date()
          }
        },
        async (err) => {
          if (err) return callback(err);

          console.log(`[REGISTRY EVENTS] Attempting immediate load => ${targetModuleName}`);
          const success = await attemptSingleLoad(targetModuleName, motherEmitter, app, jwt);
          if (!success) {
            return callback(new Error('Module load failed again. We tried.'));
          }
          callback(null);
        }
      );
    } catch (ex) {
      callback(ex);
    }
  });

  // meltdown => 'deactivateModuleInRegistry'
  motherEmitter.on('deactivateModuleInRegistry', (payload, originalCb) => {
    const callback = onceCallback(originalCb);

    try {
      const { jwt, moduleName, moduleType, targetModuleName } = payload;
      if (!jwt || moduleName !== 'moduleLoader' || moduleType !== 'core') {
        return callback(new Error('[REGISTRY EVENTS] meltdown => must come from moduleLoader/core.'));
      }

      if (payload.decodedJWT && !hasPermission(payload.decodedJWT, 'modules.deactivate')) {
        return callback(new Error('Forbidden – missing permission: modules.deactivate'));
      }

      // meltdown => dbUpdate => is_active=FALSE
      motherEmitter.emit(
        'dbUpdate',
        {
          jwt,
          moduleName: 'moduleLoader',
          moduleType: 'core',
          table: 'module_registry',
          where: { module_name: targetModuleName },
          data: {
            is_active: false,
            updated_at: new Date()
          }
        },
        (err) => {
          if (err) return callback(err);
          console.log(`[REGISTRY EVENTS] Deactivated module => ${targetModuleName}`);
          callback(null);
        }
      );
    } catch (ex) {
      callback(ex);
    }
  });
}

async function attemptSingleLoad(moduleName, motherEmitter, app, jwt) {
  // attempt to require & initialize the module
  try {
    moduleName = sanitizeModuleName(moduleName);
    const modulesDir = path.resolve(__dirname, '../../../modules');
    const modulePath = path.resolve(modulesDir, moduleName);
    if (!modulePath.startsWith(modulesDir + path.sep)) {
      throw new Error('Invalid module name path');
    }
    const indexJs = path.join(modulePath, 'index.js');

    if (!fs.existsSync(indexJs)) {
      console.warn(`[REGISTRY EVENTS] No index.js => ${moduleName}`);
      await deactivateModule(motherEmitter, jwt, moduleName, 'Missing index.js');
      return false;
    }

    const modEntry = require(indexJs);
    if (typeof modEntry.initialize === 'function') {
      await modEntry.initialize({
        motherEmitter,
        app,
        isCore: false,
        jwt
      });
    } else {
      console.warn(`[REGISTRY EVENTS] Module '${moduleName}' has no initialize(). We'll just keep going...`);
    }

    // set last_error=null on success
    await updateModuleLastError(motherEmitter, jwt, moduleName, null);
    console.log(`[REGISTRY EVENTS] Activated & loaded => ${moduleName}`);
    return true;
  } catch (err) {
    console.error('[REGISTRY EVENTS] attemptSingleLoad => meltdown meltdown =>', err.message);
    await deactivateModule(motherEmitter, jwt, moduleName, err.message);
    return false;
  }
}

module.exports = {
  initModuleRegistryAdminEvents
};
