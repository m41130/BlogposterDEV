/**
 * mother/routes/csr/widgets.js
 *
 * JSON-based routes for managing widgets (creator + adminUI).
 * We use meltdown => createWidget, getWidgets, updateWidget, deleteWidget.
 */

const express = require('express');
const router = express.Router();
const { motherEmitter } = require('../../emitters/motherEmitter');
const { requireAuthCookie } = require('../../modules/auth/authMiddleware');
const { requirePermission } = require('../../modules/auth/permissionMiddleware');

/**
 * GET /admin/widgets
 * => meltdown => getWidgets
 * => permission: widgets.list
 */
router.get(
  '/',
  requireAuthCookie,
  requirePermission('widgets.list'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const widgetType = req.query.type || null;

    motherEmitter.emit(
      'getWidgets',
      { jwt: userToken, widgetType },
      (err, widgets) => {
        if (err) {
          console.error('[WIDGETS ROUTER] getWidgets =>', err.message);
          return res.status(500).json({ success: false, error: 'Failed to retrieve widgets' });
        }
        return res.json({ success: true, widgets });
      }
    );
  }
);

/**
 * POST /admin/widgets
 * => meltdown => createWidget
 * => permission: widgets.create
 */
router.post(
  '/',
  requireAuthCookie,
  requirePermission('widgets.create'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const {
      widgetId,
      widgetType,
      label,
      content,
      category
    } = req.body;

    motherEmitter.emit(
      'createWidget',
      {
        jwt: userToken,
        widgetId,
        widgetType,
        label,
        content,
        category
      },
      (err) => {
        if (err) {
          console.error('[WIDGETS ROUTER] createWidget =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({ success: true, message: `Widget "${widgetId}" created.` });
      }
    );
  }
);

/**
 * PATCH /admin/widgets/:widgetId
 * => meltdown => updateWidget
 * => permission: widgets.update
 */
router.patch(
  '/:widgetId',
  requireAuthCookie,
  requirePermission('widgets.update'),
  (req, res) => {
    const userToken   = req.cookies?.admin_jwt;
    const widgetIdUrl = req.params.widgetId; // from URL
    const {
      widgetType,
      newLabel,
      newContent,
      newCategory
    } = req.body;

    // widgetId kommt aus URL, widgetType aus body
    motherEmitter.emit(
      'updateWidget',
      {
        jwt: userToken,
        widgetId: widgetIdUrl,
        widgetType,
        newLabel,
        newContent,
        newCategory
      },
      (err) => {
        if (err) {
          console.error('[WIDGETS ROUTER] updateWidget =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({ success: true, message: `Widget "${widgetIdUrl}" updated.` });
      }
    );
  }
);

/**
 * DELETE /admin/widgets/:widgetId
 * => meltdown => deleteWidget
 * => permission: widgets.delete
 */
router.delete(
  '/:widgetId',
  requireAuthCookie,
  requirePermission('widgets.delete'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const widgetIdUrl = req.params.widgetId;
    const widgetType = req.query.type || req.body.widgetType; 
    // oder man erwartet es im Body oder Query, je nach Geschmack

    motherEmitter.emit(
      'deleteWidget',
      {
        jwt: userToken,
        widgetId: widgetIdUrl,
        widgetType
      },
      (err) => {
        if (err) {
          console.error('[WIDGETS ROUTER] deleteWidget =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({ success: true, message: `Widget "${widgetIdUrl}" deleted.` });
      }
    );
  }
);

module.exports = router;
