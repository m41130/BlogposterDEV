/**
 * mother/routes/csr/coreSettings.js
 *
 * JSON-based routes that wrap meltdown calls to the "settingsManager".
 * Typically used to manage core settings via the UI (like getAllSettings, setSetting, etc.).
 */

const express = require('express');
const router = express.Router();
const { motherEmitter } = require('../../emitters/motherEmitter');
const { requireAuthCookie } = require('../../modules/auth/authMiddleware');
const { requirePermission } = require('../../modules/auth/permissionMiddleware');

/**
 * GET /admin/settings/core/all
 * => meltdown => getAllSettings
 */
router.get(
  '/all',
  requireAuthCookie,
  requirePermission('settings.core.viewAll'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;

    motherEmitter.emit(
      'getAllSettings',
      {
        jwt: userToken,
        moduleName: 'settingsManager',
        moduleType: 'core'
      },
      (err, allSettings) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          settings: allSettings || []
        });
      }
    );
  }
);

/**
 * GET /admin/settings/core/one?key=someKey
 * => meltdown => getSetting
 * Example usage: /admin/settings/core/one?key=CMS_MODE
 */
router.get(
  '/one',
  requireAuthCookie,
  requirePermission('settings.core.view'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const key = req.query.key || '';

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Missing ?key= in query.'
      });
    }

    motherEmitter.emit(
      'getSetting',
      {
        jwt: userToken,
        moduleName: 'settingsManager',
        moduleType: 'core',
        key
      },
      (err, value) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          key,
          value
        });
      }
    );
  }
);

/**
 * POST /admin/settings/core/set
 * => meltdown => setSetting
 * Body: { key: 'SOME_KEY', value: 'someValue' }
 */
router.post(
  '/set',
  requireAuthCookie,
  requirePermission('settings.core.edit'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { key, value } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Missing key in body.'
      });
    }

    motherEmitter.emit(
      'setSetting',
      {
        jwt: userToken,
        moduleName: 'settingsManager',
        moduleType: 'core',
        key,
        value
      },
      (err) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          message: `Setting "${key}" updated successfully.`
        });
      }
    );
  }
);

/**
 * GET /admin/settings/core/mode
 * => meltdown => getCmsMode
 */
router.get(
  '/mode',
  requireAuthCookie,
  requirePermission('settings.core.view'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;

    motherEmitter.emit(
      'getCmsMode',
      {
        jwt: userToken,
        moduleName: 'settingsManager',
        moduleType: 'core'
      },
      (err, mode) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          mode: mode || 'cms'
        });
      }
    );
  }
);

/**
 * POST /admin/settings/core/mode
 * => meltdown => setCmsMode
 * Body: { newMode: 'headless' }
 */
router.post(
  '/mode',
  requireAuthCookie,
  requirePermission('settings.core.edit'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { newMode } = req.body;

    if (!newMode) {
      return res.status(400).json({
        success: false,
        error: 'Missing newMode in body.'
      });
    }

    motherEmitter.emit(
      'setCmsMode',
      {
        jwt: userToken,
        moduleName: 'settingsManager',
        moduleType: 'core',
        mode: newMode
      },
      (err) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          message: `CMS Mode set to "${newMode}".`
        });
      }
    );
  }
);

module.exports = router;
