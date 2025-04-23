/**
 * mother/routes/csr/unifiedSettings.js
 *
 * JSON-based routes that wrap meltdown events from "unifiedSettings" module.
 * Allows the UI to manage or view module settings schemas, retrieve and update
 * module-specific settings, etc.
 */

const express = require('express');
const router = express.Router();
const { motherEmitter } = require('../../emitters/motherEmitter');
const { requireAuthCookie } = require('../../modules/auth/authMiddleware');
const { requirePermission } = require('../../modules/auth/permissionMiddleware');

// Direct import for retrieveAllRegisteredModules (currently a direct function call).
// If you want meltdown for this, you can create a meltdown event or do a direct import:
const {
  retrieveAllRegisteredModules
} = require('../../modules/unifiedSettings/settingsRegistryService');

/**
 * GET /admin/settings/unified/registered-schemas
 * => returns the list of modules that have registered a settings schema
 * Currently uses a direct function call (not meltdown).
 */
router.get(
  '/registered-schemas',
  requireAuthCookie,
  requirePermission('settings.unified.viewSchemas'),
  (req, res) => {
    try {
      const modules = retrieveAllRegisteredModules(); // direct in-memory
      return res.json({
        success: true,
        registeredModules: modules
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }
);

/**
 * GET /admin/settings/unified/schema?targetModule=MODULE_NAME
 * => meltdown => getModuleSettingsSchema
 */
router.get(
  '/schema',
  requireAuthCookie,
  requirePermission('settings.unified.viewSchemas'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const targetModule = req.query.targetModule || '';

    if (!targetModule) {
      return res.status(400).json({
        success: false,
        error: 'Missing ?targetModule='
      });
    }

    motherEmitter.emit(
      'getModuleSettingsSchema',
      {
        jwt: userToken,
        moduleName: 'unifiedSettings',
        moduleType: 'core',
        targetModule
      },
      (err, schema) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          schema
        });
      }
    );
  }
);

/**
 * POST /admin/settings/unified/register
 * => meltdown => registerModuleSettingsSchema
 * Allows the UI to register a new schema for a given module.
 */
router.post(
  '/register',
  requireAuthCookie,
  requirePermission('settings.unified.editSchemas'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { moduleName, settingsSchema } = req.body;

    if (!moduleName || !settingsSchema) {
      return res.status(400).json({
        success: false,
        error: 'Missing moduleName or settingsSchema.'
      });
    }

    motherEmitter.emit(
      'registerModuleSettingsSchema',
      {
        jwt: userToken,
        moduleType: 'core',
        moduleName,
        settingsSchema
      },
      (err, result) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          result
        });
      }
    );
  }
);

/**
 * GET /admin/settings/unified/list?targetModule=MODULE_NAME
 * => meltdown => listModuleSettings
 * Returns actual stored settings (key-value pairs) for that module.
 */
router.get(
  '/list',
  requireAuthCookie,
  requirePermission('settings.unified.viewSettings'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const targetModule = req.query.targetModule || '';

    if (!targetModule) {
      return res.status(400).json({
        success: false,
        error: 'Missing ?targetModule='
      });
    }

    motherEmitter.emit(
      'listModuleSettings',
      {
        jwt: userToken,
        moduleName: 'unifiedSettings',
        moduleType: 'core',
        targetModule
      },
      (err, map) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }
        // map => { key1: 'value1', key2: 'value2', ... }
        return res.json({
          success: true,
          settings: map
        });
      }
    );
  }
);

/**
 * GET /admin/settings/unified/value?moduleName=NAME&settingKey=KEY
 * => meltdown => getModuleSettingValue
 * Fetches a single setting's value for the given moduleName & settingKey
 */
router.get(
  '/value',
  requireAuthCookie,
  requirePermission('settings.unified.viewSettings'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const moduleName = req.query.moduleName || '';
    const settingKey = req.query.settingKey || '';

    if (!moduleName || !settingKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing ?moduleName=... & ?settingKey=...'
      });
    }

    motherEmitter.emit(
      'getModuleSettingValue',
      {
        jwt: userToken,
        moduleType: 'core',
        moduleName,
        settingKey
      },
      (err, value) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          value
        });
      }
    );
  }
);

/**
 * POST /admin/settings/unified/update
 * => meltdown => updateModuleSettingValue
 */
router.post(
  '/update',
  requireAuthCookie,
  requirePermission('settings.unified.editSettings'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { moduleName, settingKey, newValue } = req.body;

    if (!moduleName || !settingKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing moduleName or settingKey in body.'
      });
    }

    motherEmitter.emit(
      'updateModuleSettingValue',
      {
        jwt: userToken,
        moduleType: 'core',
        moduleName,
        settingKey,
        newValue
      },
      (err, result) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          result
        });
      }
    );
  }
);

module.exports = router;
