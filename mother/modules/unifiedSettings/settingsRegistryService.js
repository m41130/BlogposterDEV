/**
 * mother/modules/unifiedSettings/settingsRegistryService.js
 *
 * This service sets up meltdown events to register/load/update a module's
 * settings schemas (tabs/fields, etc.) and retrieve them at runtime.
 *
 * Actual key-value pairs are stored in "settingsManager" DB (or bridging).
 *
 * Provided meltdown events:
 *   1) registerModuleSettingsSchema
 *   2) getModuleSettingValue
 *   3) getModuleSettingsSchema
 *   4) updateModuleSettingValue
 *   5) listModuleSettings
 */

require('dotenv').config();

// We'll import onceCallback from motherEmitter to avoid meltdown meltdown.
const { onceCallback } = require('../../emitters/motherEmitter');
const { hasPermission } = require('../userManagement/permissionUtils');

// Simple in-memory registry => { moduleName: settingsSchemaObject }
let schemaRegistry = {};

/**
 * initSettingsRegistry:
 *   Called once on system startup by unifiedSettings/index.js.
 *   Sets up meltdown events for module settings management.
 *
 * @param {object} motherEmitter - The global meltdown EventEmitter
 */
function initSettingsRegistry(motherEmitter) {

  // ---------------------------------------------------------
  // 1) registerModuleSettingsSchema
  // ---------------------------------------------------------
  motherEmitter.on('registerModuleSettingsSchema', (payload, originalCb) => {
    const callback = onceCallback(originalCb);

    try {
      if (!payload || typeof payload !== 'object') {
        return callback(new Error(
          '[UNIFIED SETTINGS] Invalid meltdown payload (registerModuleSettingsSchema).'
        ));
      }

      const { jwt, moduleName, moduleType, settingsSchema } = payload;
      if (!jwt || moduleType !== 'core' || !moduleName || !settingsSchema) {
        return callback(new Error(
          '[UNIFIED SETTINGS] Missing or invalid fields in registerModuleSettingsSchema payload.'
        ));
      }

      if (payload.decodedJWT && !hasPermission(payload.decodedJWT, 'settings.unified.editSchemas')) {
        return callback(new Error('Forbidden – missing permission: settings.unified.editSchemas'));
      }

      // Store in the in-memory registry
      schemaRegistry[moduleName] = settingsSchema;

      console.log(`[UNIFIED SETTINGS] Registered settings schema for module "${moduleName}".`);
      return callback(null, { success: true });

    } catch (ex) {
      console.error('[UNIFIED SETTINGS] Error in registerModuleSettingsSchema:', ex.message);
      callback(ex);
    }
  });


  // ---------------------------------------------------------
  // 2) getModuleSettingValue
  // ---------------------------------------------------------
  motherEmitter.on('getModuleSettingValue', (payload, originalCb) => {
    const settingCallback = onceCallback(originalCb);

    /**
     * Expected payload:
     * {
     *   jwt,
     *   moduleName: 'someModule',
     *   moduleType: 'core',
     *   settingKey: 'enableFeature'
     * }
     */
    const { jwt, moduleName, moduleType, settingKey } = payload || {};
    if (!jwt || moduleType !== 'core' || !moduleName || !settingKey) {
      return settingCallback(
        new Error('[UNIFIED SETTINGS] meltdown check failed in getModuleSettingValue')
      );
    }

    if (payload.decodedJWT && !hasPermission(payload.decodedJWT, 'settings.unified.viewSettings')) {
      return settingCallback(new Error('Forbidden – missing permission: settings.unified.viewSettings'));
    }

    // Retrieve the stored value via meltdown => 'getSetting'
    motherEmitter.emit(
      'getSetting',
      {
        jwt,
        // must pass meltdown checks => moduleName='settingsManager'
        moduleName: 'settingsManager',
        moduleType: 'core',
        key: `${moduleName}.${settingKey}`
      },
      (err, value) => {
        if (err) return settingCallback(err);
        // bridging decides if value is plain text, JSON, etc.
        settingCallback(null, value);
      }
    );
  });


  // ---------------------------------------------------------
  // 3) getModuleSettingsSchema
  // ---------------------------------------------------------
  motherEmitter.on('getModuleSettingsSchema', (payload, originalCb) => {
    const callback = onceCallback(originalCb);

    /**
     * Expected payload:
     * {
     *   jwt,
     *   moduleName: 'unifiedSettings',
     *   moduleType: 'core',
     *   targetModule: 'someModuleName'
     * }
     */
    const { jwt, moduleName, moduleType, targetModule } = payload || {};
    if (!jwt || moduleName !== 'unifiedSettings' || moduleType !== 'core') {
      return callback(new Error(
        '[UNIFIED SETTINGS] meltdown check failed in getModuleSettingsSchema'
      ));
    }
    if (!targetModule) {
      return callback(new Error(
        '[UNIFIED SETTINGS] Missing targetModule in getModuleSettingsSchema payload'
      ));
    }

    if (payload.decodedJWT && !hasPermission(payload.decodedJWT, 'settings.unified.viewSettings')) {
      return callback(new Error('Forbidden – missing permission: settings.unified.viewSettings'));
    }

    const schema = retrieveSchemaForModule(targetModule);
    if (!schema) {
      return callback(
        new Error(`[UNIFIED SETTINGS] No registered schema found for "${targetModule}".`)
      );
    }
    callback(null, schema);
  });


  // ---------------------------------------------------------
  // 4) updateModuleSettingValue
  // ---------------------------------------------------------
  motherEmitter.on('updateModuleSettingValue', (payload, originalCb) => {
    const settingCallback = onceCallback(originalCb);

    /**
     * Expected payload:
     * {
     *   jwt,
     *   moduleName: 'someModule',
     *   moduleType: 'core',
     *   settingKey: 'enableFeature',
     *   newValue: true
     * }
     */
    const { jwt, moduleName, moduleType, settingKey, newValue } = payload || {};
    if (!jwt || moduleType !== 'core' || !moduleName || !settingKey) {
      return settingCallback(
        new Error('[UNIFIED SETTINGS] meltdown check failed in updateModuleSettingValue')
      );
    }

    if (payload.decodedJWT && !hasPermission(payload.decodedJWT, 'settings.unified.editSettings')) {
      return settingCallback(new Error('Forbidden – missing permission: settings.unified.editSettings'));
    }

    // We'll store the value in "settingsManager" DB via meltdown => 'setSetting'
    motherEmitter.emit(
      'setSetting',
      {
        jwt,
        moduleName: 'settingsManager',
        moduleType: 'core',
        key: `${moduleName}.${settingKey}`,
        value: JSON.stringify(newValue)
      },
      (err) => {
        if (err) return settingCallback(err);
        settingCallback(null, { success: true });
      }
    );
  });


  // ---------------------------------------------------------
  // 5) listModuleSettings
  // ---------------------------------------------------------
  motherEmitter.on('listModuleSettings', (payload, originalCb) => {
    const callback = onceCallback(originalCb);

    /**
     * Expected payload:
     * {
     *   jwt,
     *   moduleName: 'unifiedSettings',
     *   moduleType: 'core',
     *   targetModule: 'someModuleName'
     * }
     */
    const { jwt, moduleName, moduleType, targetModule } = payload || {};
    if (!jwt || moduleName !== 'unifiedSettings' || moduleType !== 'core') {
      return callback(new Error('[UNIFIED SETTINGS] meltdown check failed in listModuleSettings'));
    }
    if (!targetModule) {
      return callback(new Error(
        '[UNIFIED SETTINGS] Missing targetModule field in listModuleSettings payload'
      ));
    }

    if (payload.decodedJWT && !hasPermission(payload.decodedJWT, 'settings.unified.viewSettings')) {
      return callback(new Error('Forbidden – missing permission: settings.unified.viewSettings'));
    }

    // meltdown => dbSelect => bridging can do Postgres or Mongo
    motherEmitter.emit(
      'dbSelect',
      {
        jwt,
        moduleName: 'settingsManager',
        moduleType: 'core',
        table: '__rawSQL__',
        data: {
          rawSQL: 'LIST_MODULE_SETTINGS',
          targetModule
        }
      },
      (err, result) => {
        if (err) return callback(err);

        // bridging may return an array of { key, value } or an object. We'll assume array.
        const rows = Array.isArray(result) ? result : (result?.rows || []);

        // Build a map: { shortKey: storedValue }
        const map = {};
        rows.forEach((row) => {
          // e.g. if row.key = "myModule.foo", remove "myModule."
          const shortKey = row.key.replace(`${targetModule}.`, '');
          map[shortKey] = row.value; // could be JSON or plain text
        });

        callback(null, map);
      }
    );
  });
}

/**
 * retrieveSchemaForModule:
 *  Returns the registered schema object for the given moduleName,
 *  or null if no schema is registered.
 */
function retrieveSchemaForModule(moduleName) {
  return schemaRegistry[moduleName] || null;
}

/**
 * retrieveAllRegisteredModules:
 *  Returns an array of all moduleNames that have a registered schema.
 */
function retrieveAllRegisteredModules() {
  return Object.keys(schemaRegistry);
}

module.exports = {
  initSettingsRegistry,
  retrieveSchemaForModule,
  retrieveAllRegisteredModules
};
