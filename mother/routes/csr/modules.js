/**
 * mother/routes/csr/modules.js
 *
 * JSON-based routes for managing module registry (list, detail, activate, etc.).
 * Replaces server-side rendering with meltdown calls that return JSON responses.
 */

const express = require('express');
const router = express.Router();
const { motherEmitter } = require('../../emitters/motherEmitter');
const { requireAuthCookie } = require('../../modules/auth/authMiddleware');
const { requirePermission } = require('../../modules/auth/permissionMiddleware');

/**
 * GET /admin/settings/modules
 * => meltdown => getModuleRegistry
 * => permission: modules.list
 * Returns the entire registry as JSON.
 */
router.get(
  '/',
  requireAuthCookie,
  requirePermission('modules.list'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;

    motherEmitter.emit(
      'getModuleRegistry',
      { jwt: userToken, moduleName: 'moduleLoader', moduleType: 'core' },
      (err, registry) => {
        if (err) {
          console.error('[MODULES ROUTER] getModuleRegistry =>', err.message);
          return res.status(500).json({ success: false, error: 'Failed to retrieve modules' });
        }
        return res.json({ success: true, registry });
      }
    );
  }
);

/**
 * GET /admin/settings/modules/active
 * => meltdown => getModuleRegistry => filter is_active
 * => permission: modules.listActive
 */
router.get(
  '/active',
  requireAuthCookie,
  requirePermission('modules.listActive'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;

    motherEmitter.emit(
      'getModuleRegistry',
      { jwt: userToken, moduleName: 'moduleLoader', moduleType: 'core' },
      (err, registry) => {
        if (err) {
          console.error('[MODULES ROUTER] getModuleRegistry =>', err.message);
          return res.status(500).json({ success: false, error: 'Error fetching modules' });
        }
        const active = registry.filter(m => m.is_active);
        return res.json({ success: true, registry: active });
      }
    );
  }
);

/**
 * GET /admin/settings/modules/inactive
 * => meltdown => getModuleRegistry => filter !is_active
 * => permission: modules.listInactive
 */
router.get(
  '/inactive',
  requireAuthCookie,
  requirePermission('modules.listInactive'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;

    motherEmitter.emit(
      'getModuleRegistry',
      { jwt: userToken, moduleName: 'moduleLoader', moduleType: 'core' },
      (err, registry) => {
        if (err) {
          console.error('[MODULES ROUTER] getModuleRegistry =>', err.message);
          return res.status(500).json({ success: false, error: 'Error fetching modules' });
        }
        const inactive = registry.filter(m => !m.is_active);
        return res.json({ success: true, registry: inactive });
      }
    );
  }
);

/**
 * GET /admin/settings/modules/errors
 * => meltdown => getModuleRegistry => filter by last_error != ''
 * => permission: modules.listErrors
 */
router.get(
  '/errors',
  requireAuthCookie,
  requirePermission('modules.listErrors'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;

    motherEmitter.emit(
      'getModuleRegistry',
      { jwt: userToken, moduleName: 'moduleLoader', moduleType: 'core' },
      (err, registry) => {
        if (err) {
          console.error('[MODULES ROUTER] getModuleRegistry =>', err.message);
          return res.status(500).json({ success: false, error: 'Error fetching modules' });
        }
        const errorMods = registry.filter(m => m.last_error && m.last_error.trim() !== '');
        return res.json({ success: true, registry: errorMods });
      }
    );
  }
);

/**
 * GET /admin/settings/modules/:modName/detail
 * => meltdown => getModuleRegistry => find the row => fetch unified settings schema & values
 * => permission: modules.viewDetail
 */
router.get(
  '/:modName/detail',
  requireAuthCookie,
  requirePermission('modules.viewDetail'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const modName   = req.params.modName;

    motherEmitter.emit(
      'getModuleRegistry',
      { jwt: userToken, moduleName: 'moduleLoader', moduleType: 'core' },
      (err, registry) => {
        if (err) {
          console.error('[MODULES ROUTER] getModuleRegistry =>', err.message);
          return res.status(500).json({ success: false, error: 'Failed to retrieve modules' });
        }

        const thisModule = registry.find(r => r.module_name === modName);
        if (!thisModule) {
          return res.status(404).json({ success: false, error: `Module "${modName}" not found in registry.` });
        }

        // meltdown => getModuleSettingsSchema => get the schema
        motherEmitter.emit(
          'getModuleSettingsSchema',
          {
            jwt: userToken,
            moduleName: 'unifiedSettings',
            moduleType: 'core',
            targetModule: modName
          },
          (err2, schema) => {
            if (err2) {
              console.error('[MODULES ROUTER] getModuleSettingsSchema =>', err2.message);
              return res.status(500).json({ success: false, error: 'Cannot fetch module settings schema.' });
            }
            // meltdown => listModuleSettings => get the stored values
            motherEmitter.emit(
              'listModuleSettings',
              {
                jwt: userToken,
                moduleName: 'unifiedSettings',
                moduleType: 'core',
                targetModule: modName
              },
              (err3, currentValues) => {
                if (err3) {
                  console.error('[MODULES ROUTER] listModuleSettings =>', err3.message);
                  return res.status(500).json({ success: false, error: 'Cannot fetch module settings values.' });
                }
                return res.json({
                  success: true,
                  registryEntry: thisModule,
                  moduleSettings: {
                    tabs: schema?.tabs || [],
                    fieldValues: currentValues || {}
                  }
                });
              }
            );
          }
        );
      }
    );
  }
);

/**
 * POST /admin/settings/modules/:modName/detail/save
 * => meltdown => updateModuleSettingValue for each field
 * => permission: modules.updateDetail
 */
router.post(
  '/:modName/detail/save',
  requireAuthCookie,
  requirePermission('modules.updateDetail'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const modName   = req.params.modName;
    const updatedFields = req.body; // { settingKey: newValue, ... }

    const tasks = Object.entries(updatedFields).map(([fieldKey, rawVal]) => {
      // meltdown => updateModuleSettingValue
      return new Promise((resolve, reject) => {
        motherEmitter.emit(
          'updateModuleSettingValue',
          {
            jwt: userToken,
            moduleName: modName,
            moduleType: 'core',
            settingKey: fieldKey,
            newValue: parsePossibleBooleanOrNumber(rawVal)
          },
          (err) => {
            if (err) return reject(err);
            resolve();
          }
        );
      });
    });

    Promise.allSettled(tasks).then(results => {
      const errors = results
        .filter(r => r.status === 'rejected')
        .map(r => r.reason?.message || 'Unknown error');

      if (errors.length) {
        console.error('[MODULES ROUTER] Some field updates failed =>', errors);
        return res.status(500).json({ success: false, error: errors.join('; ') });
      }
      return res.json({ success: true, message: 'Settings saved successfully.' });
    });
  }
);

/**
 * POST /admin/settings/modules/:modName/activate
 * => meltdown => activateModuleInRegistry
 * => permission: modules.activate
 */
router.post(
  '/:modName/activate',
  requireAuthCookie,
  requirePermission('modules.activate'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const modName   = req.params.modName;

    motherEmitter.emit(
      'activateModuleInRegistry',
      {
        jwt: userToken,
        moduleName: 'moduleLoader',
        moduleType: 'core',
        targetModuleName: modName
      },
      (err) => {
        if (err) {
          console.error('[MODULES ROUTER] activateModuleInRegistry =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({ success: true, message: `Module "${modName}" activated.` });
      }
    );
  }
);

/**
 * POST /admin/settings/modules/:modName/deactivate
 * => meltdown => deactivateModuleInRegistry
 * => permission: modules.deactivate
 */
router.post(
  '/:modName/deactivate',
  requireAuthCookie,
  requirePermission('modules.deactivate'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const modName   = req.params.modName;

    motherEmitter.emit(
      'deactivateModuleInRegistry',
      {
        jwt: userToken,
        moduleName: 'moduleLoader',
        moduleType: 'core',
        targetModuleName: modName
      },
      (err) => {
        if (err) {
          console.error('[MODULES ROUTER] deactivateModuleInRegistry =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({ success: true, message: `Module "${modName}" deactivated.` });
      }
    );
  }
);

/**
 * POST /admin/settings/modules/:modName/uninstall
 * => meltdown => uninstallModule
 * => permission: modules.uninstall
 */
router.post(
  '/:modName/uninstall',
  requireAuthCookie,
  requirePermission('modules.uninstall'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const modName   = req.params.modName;

    motherEmitter.emit(
      'uninstallModule',
      {
        jwt: userToken,
        moduleName: 'moduleLoader',
        moduleType: 'core',
        targetModuleName: modName
      },
      (err) => {
        if (err) {
          console.error('[MODULES ROUTER] uninstallModule =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({ success: true, message: `Module "${modName}" uninstalled.` });
      }
    );
  }
);

/**
 * parsePossibleBooleanOrNumber:
 *  Converts 'on' -> true, numeric strings -> numbers, else returns rawVal
 */
function parsePossibleBooleanOrNumber(rawVal) {
  if (rawVal === 'on') return true;
  if (!isNaN(rawVal) && rawVal.trim() !== '') {
    return parseFloat(rawVal);
  }
  return rawVal;
}

module.exports = router;
