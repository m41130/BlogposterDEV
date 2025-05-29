// mother/modules/dependencyLoader/index.js
require('dotenv').config();
const {
  ensureDependencyLoaderDatabase,
  ensureDependencyLoaderSchemaAndTable,
  loadDependencies,
  checkAndLoadDependency
} = require('./dependencyLoaderService');

// Import onceCallback from motherEmitter
const { onceCallback } = require('../../emitters/motherEmitter');

/**
 * The dependency loader main file:
 *   1) Ensures "dependencyloader_db"
 *   2) Ensures schema + table "dependencyloader".module_dependencies
 *   3) Loads all allowed dependencies
 *   4) meltdown => "requestDependency"
 */
module.exports = {
  async initialize({ motherEmitter, jwtToken }) {
    console.log('[DEPENDENCY LOADER] Initializing dependency loader... because apparently we need it.');

    if (!jwtToken) {
      console.error('[DEPENDENCY LOADER] No jwtToken provided => cannot proceed. Must meltdown now.');
      return;
    }

    try {
      // 1) ensure DB => "dependencyloader_db"
      await ensureDependencyLoaderDatabase(motherEmitter, jwtToken);

      // 2) ensure schema + table => "dependencyloader".module_dependencies
      await ensureDependencyLoaderSchemaAndTable(motherEmitter, jwtToken);

      // 3) load the dependencies from that table into global cache
      await loadDependencies(motherEmitter, jwtToken);

      // 4) meltdown => "requestDependency"
      motherEmitter.on('requestDependency', (payload, originalCb) => {
        // We love not double-calling the same callback => onceCallback:
        const callback = onceCallback(originalCb);

        (async () => {
          try {
            const { moduleNameToCheck, dependencyName } = payload || {};
            if (!moduleNameToCheck || !dependencyName) {
              throw new Error('moduleNameToCheck and dependencyName are required');
            }

            const allowed = await checkAndLoadDependency(motherEmitter, moduleNameToCheck, dependencyName);
            if (!allowed) {
              throw new Error(`Dependency "${dependencyName}" is not allowed for module "${moduleNameToCheck}"`);
            }
            // If allowed => require it
            const dep = require(dependencyName);
            callback(null, dep);
          } catch (err) {
            callback(err);
          }
        })();
      });

      console.log('[DEPENDENCY LOADER] Dependency loader is ready. Let the meltdown commence.');
    } catch (error) {
      console.error('[DEPENDENCY LOADER] Fatal error =>', error.message);
      // rethrow or handle as needed
      throw error;
    }
  },
};
