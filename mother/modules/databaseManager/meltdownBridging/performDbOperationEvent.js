/**
 * mother/modules/databaseManager/meltdownBridging/performDbOperationEvent.js
 * * Registers the meltdown event listener for 'performDbOperation'.
 * This allows other modules to request database operations through the databaseManager.
 * It validates parameters, determines the correct engine (Postgres, Mongo), 
 * performs the operation, handles timeouts, and manages errors, including
 * emitting 'deactivateModule' if a module causes an error.
 */

const { getEngine } = require('../engines/engineFactory');
const { moduleHasOwnDb, getDbType } = require('../helpers/dbTypeHelpers');
const { onceCallback } = require('../../../emitters/motherEmitter');
const { sanitize } = require('../../../utils/logSanitizer');

const RAW_TIMEOUT = Number(process.env.DB_OP_TIMEOUT_MS || 5000);
const TIMEOUT_DURATION = RAW_TIMEOUT === 0 ? null : RAW_TIMEOUT;

/**
 * Registers the listener for the 'performDbOperation' meltdown event.
 * * @param {MotherEmitter} motherEmitter The central event emitter instance.
 */
function registerPerformDbOperationEvent(motherEmitter) {
  // Listen for database operation requests from other modules
  motherEmitter.on('performDbOperation', Object.assign(async (payload, originalCb) => {
    // Ensure the callback is only called once, even if errors/timeouts occur
    const callback = onceCallback(originalCb); 

    // Set a timeout for the database operation if configured
    const timeout = TIMEOUT_DURATION === null ? null : setTimeout(() => {
      const errorMsg = `Timeout while performing db operation for module "${payload?.moduleName || 'unknown'}".`;
      console.error(`[DB MANAGER] ${errorMsg}`);
      if (payload?.moduleName) {
        motherEmitter.emit(
          'deactivateModule',
          { moduleName: payload.moduleName, reason: errorMsg },
          () => {}
        );
      }
      callback(new Error(errorMsg));
    }, TIMEOUT_DURATION);

    try {
      // Validate the payload structure
      if (!payload || typeof payload !== 'object') {
          throw new Error('Invalid payload received for db operation.');
      }
      const { moduleName, operation, params } = payload;

      // Basic validation of required parameters
      if (!moduleName || !operation || !Array.isArray(params)) {
        // This error will be caught by the catch block below
        throw new Error(`Invalid parameters received from module "${moduleName}". Operation or params missing/invalid.`);
      }

      // Get the appropriate database engine based on configuration
      const engine = getEngine();
      // Check if the module uses its own dedicated database/schema
      const isOwnDb = moduleHasOwnDb(moduleName);
      // Get the configured database type (e.g., 'postgres', 'mongodb')
      const dbType = getDbType();

      let result;
      // Execute the operation using the corresponding engine method
      if (dbType === 'postgres') {
        result = await engine.performPostgresOperation(moduleName, operation, params, isOwnDb);
      } else if (dbType === 'mongodb') {
        // Assuming performMongoOperation doesn't need isOwnDb logic for this example
        result = await engine.performMongoOperation(moduleName, operation, params); 
      } else {
        // Handle unsupported database types
        throw new Error(`Unsupported DB type configured: ${dbType}`);
      }

      // Operation successful, clear the timeout and send result via callback
      if (timeout) clearTimeout(timeout);
      callback(null, result);

    } catch (err) {
      // An error occurred either during parameter validation or DB execution
      if (timeout) clearTimeout(timeout); // Ensure timeout is cleared on error too
      console.error(`[DB MANAGER] Error performing db operation for module "${payload?.moduleName || 'unknown'}":`, sanitize(err.message));
      
      // Attempt to deactivate the module that caused the error
      // *** This is the line that was fixed ***
      if (payload?.moduleName) {
          motherEmitter.emit(
              'deactivateModule', 
              { moduleName: payload.moduleName, reason: err.message },
              () => {} // Added empty callback here to prevent the warning
          );
      }

      // Pass the error back to the original caller
      callback(err); 
    } 
    // 'finally' block is removed as clearTimeout is handled in both success and error paths now.
    
  // Assign metadata to the listener function (used by MotherEmitter)
  }, { moduleName: 'databaseManager' })); 
}

module.exports = { registerPerformDbOperationEvent };