/**
 * mother/routes/csr/share.js
 *
 * JSON-based routes for the ShareManager module. 
 * Exposes meltdown events:
 *   - createShareLink
 *   - revokeShareLink
 *   - getShareDetails
 *
 * If you want a "list all links" endpoint, just add meltdown => getAllLinks similarly.
 */

const express = require('express');
const router = express.Router();
const { motherEmitter } = require('../../emitters/motherEmitter');
const { requireAuthCookie } = require('../../modules/auth/authMiddleware');
const { requirePermission } = require('../../modules/auth/permissionMiddleware');

/**
 * POST /admin/share
 * => meltdown => createShareLink
 * Body: { filePath, isPublic } (optional isPublic)
 */
router.post(
  '/',
  requireAuthCookie,
  requirePermission('shareManager.createLink'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const userId    = req.user?.id; // from the auth middleware
    const { filePath, isPublic = true } = req.body;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'Missing filePath in request body.'
      });
    }

    motherEmitter.emit(
      'createShareLink',
      {
        jwt: userToken,
        moduleName: 'shareManager',
        moduleType: 'core',
        filePath,
        userId,
        isPublic
      },
      (err, result) => {
        if (err) {
          console.error('[SHARE ROUTES] createShareLink =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        // result => { shortToken, shareURL, maybe bridging result }
        return res.json({
          success: true,
          ...result
        });
      }
    );
  }
);

/**
 * DELETE /admin/share/:shortToken
 * => meltdown => revokeShareLink
 * Typically used when you want to disable an existing share link.
 */
router.delete(
  '/:shortToken',
  requireAuthCookie,
  requirePermission('shareManager.revokeLink'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const userId    = req.user?.id;
    const { shortToken } = req.params;

    if (!shortToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing shortToken in URL param.'
      });
    }

    motherEmitter.emit(
      'revokeShareLink',
      {
        jwt: userToken,
        moduleName: 'shareManager',
        moduleType: 'core',
        shortToken,
        userId
      },
      (err, result) => {
        if (err) {
          console.error('[SHARE ROUTES] revokeShareLink =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          ...result
        });
      }
    );
  }
);

/**
 * GET /admin/share/:shortToken
 * => meltdown => getShareDetails
 * Allows the UI to retrieve info about a share link (e.g. filePath, isPublic).
 */
router.get(
  '/:shortToken',
  requireAuthCookie,
  requirePermission('shareManager.viewLink'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { shortToken } = req.params;

    if (!shortToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing shortToken in URL param.'
      });
    }

    motherEmitter.emit(
      'getShareDetails',
      {
        jwt: userToken,
        moduleName: 'shareManager',
        moduleType: 'core',
        shortToken
      },
      (err, row) => {
        if (err) {
          console.error('[SHARE ROUTES] getShareDetails =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        if (!row) {
          // e.g. not found or revoked
          return res.json({ success: true, details: null });
        }
        return res.json({
          success: true,
          details: row
        });
      }
    );
  }
);

module.exports = router;
