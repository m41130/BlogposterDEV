/**
 * mother/modules/moduleLoader/moduleUninstaller.js
 *
 * 1) Deactivate or remove from registry
 * 2) Optionally remove the DB
 * 3) Remove the folder from /modules
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  updateModuleLastError,
  deactivateModule
} = require('./moduleRegistryService');

async function uninstallModule(motherEmitter, jwt, moduleName, options = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      // 1) remove or deactivate from registry
      if (options.removeRegistryRow) {
        // meltdown => 'dbDelete'
        motherEmitter.emit(
          'dbDelete',
          {
            jwt,
            moduleName: 'moduleLoader',
            moduleType: 'core',
            table: 'module_registry',
            where: { module_name: moduleName }
          },
          (err) => {
            if (err) {
              console.error('[UNINSTALL MODULE] DB error:', err.message);
            }
          }
        );
      } else {
        // meltdown => standard approach => set is_active=false
        await deactivateModule(motherEmitter, jwt, moduleName, 'User uninstalled module');
      }

      // 2) drop module database if requested
      if (options.removeDatabase) {
        const safeModuleName = moduleName.toLowerCase();
        await new Promise((resolvePlaceholder, rejectPlaceholder) => {
          motherEmitter.emit(
            'dbUpdate',
            {
              jwt,
              moduleName: 'moduleLoader',
              moduleType: 'core',
              table: '__rawSQL__',
              data: {
                rawSQL: 'DROP_MODULE_DATABASE',
                params: [safeModuleName]
              }
            },
            (err) => {
              if (err) {
                console.error('[UNINSTALL MODULE] Error dropping database/schema:', err.message);
                return rejectPlaceholder(err);
              }
              resolvePlaceholder();
            }
          );
        });
      }

      // 3) remove folder from /modules
      const moduleFolder = path.resolve(__dirname, `../../../modules/${moduleName}`);
      if (fs.existsSync(moduleFolder)) {
        fs.rmSync(moduleFolder, { recursive: true, force: true });
      }

      resolve({ success: true });
    } catch (err) {
      console.error('[UNINSTALL MODULE] meltdown meltdown =>', err.message);
      await updateModuleLastError(motherEmitter, jwt, moduleName, err.message).catch(() => {});
      reject(err);
    }
  });
}

module.exports = {
  uninstallModule
};
