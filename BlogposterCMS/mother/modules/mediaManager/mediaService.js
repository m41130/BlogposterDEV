/**
 * mother/modules/mediaManager/mediaService.js
 *
 * This file has two simple functions:
 *   1) ensureMediaManagerDatabase => meltdown => createDatabase
 *   2) ensureMediaTables => meltdown => dbUpdate => 'INIT_MEDIA_SCHEMA'
 *
 * Because what's a CMS without a lavish place to store pictures of cats?
 */

require('dotenv').config();

function ensureMediaManagerDatabase(motherEmitter, jwt) {
  return new Promise((resolve, reject) => {
    console.log('[MEDIA MANAGER] Ensuring mediaManager DB/Schema via createDatabase meltdown...');

    motherEmitter.emit(
      'createDatabase',
      {
        jwt,
        moduleName : 'mediaManager',
        moduleType : 'core'
      },
      (err) => {
        if (err) {
          console.error('[MEDIA MANAGER] Error creating/fixing mediaManager DB:', err.message);
          return reject(err);
        }
        console.log('[MEDIA MANAGER] DB/Schema creation done (if needed).');
        resolve();
      }
    );
  });
}

function ensureMediaTables(motherEmitter, jwt) {
  return new Promise((resolve, reject) => {
    console.log('[MEDIA MANAGER] Creating schema & table/collection for mediaManager...');

    motherEmitter.emit(
      'dbUpdate',
      {
        jwt,
        moduleName : 'mediaManager',
        moduleType : 'core',
        table      : '__rawSQL__',
        data       : { rawSQL: 'INIT_MEDIA_SCHEMA' }
      },
      (err) => {
        if (err) {
          console.error('[MEDIA MANAGER] Error creating media schema/tables:', err.message);
          return reject(err);
        }
        console.log('[MEDIA MANAGER] Placeholder "INIT_MEDIA_SCHEMA" done. Possibly cats included.');
        resolve();
      }
    );
  });
}

module.exports = {
  ensureMediaManagerDatabase,
  ensureMediaTables
};
