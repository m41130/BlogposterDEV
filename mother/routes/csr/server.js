/**
 * mother/routes/csr/server.js
 *
 * JSON-based routes for the ServerManager module.
 * Exposes meltdown events:
 *   - addServerLocation
 *   - getServerLocation
 *   - listServerLocations
 *   - updateServerLocation
 *   - deleteServerLocation
 *
 * Example usage:
 *   POST   /admin/server/locations       => addServerLocation
 *   GET    /admin/server/locations       => listServerLocations
 *   GET    /admin/server/locations/:id   => getServerLocation
 *   PATCH  /admin/server/locations/:id   => updateServerLocation
 *   DELETE /admin/server/locations/:id   => deleteServerLocation
 */

const express = require('express');
const router = express.Router();
const { motherEmitter } = require('../../emitters/motherEmitter');

const { requireAuthCookie } = require('../../modules/auth/authMiddleware');
const { requirePermission } = require('../../modules/auth/permissionMiddleware');

/**
 * GET /admin/server/locations
 * => meltdown => listServerLocations
 */
router.get(
  '/locations',
  requireAuthCookie,
  requirePermission('serverManager.viewLocations'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;

    motherEmitter.emit(
      'listServerLocations',
      { jwt: userToken },
      (err, locations) => {
        if (err) {
          console.error('[SERVER ROUTES] listServerLocations =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({ success: true, locations: locations || [] });
      }
    );
  }
);

/**
 * POST /admin/server/locations
 * => meltdown => addServerLocation
 * Body: { serverName, ipAddress, notes } (notes optional)
 */
router.post(
  '/locations',
  requireAuthCookie,
  requirePermission('serverManager.createLocation'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { serverName, ipAddress, notes } = req.body;

    if (!serverName || !ipAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing serverName or ipAddress in body.'
      });
    }

    motherEmitter.emit(
      'addServerLocation',
      {
        jwt: userToken,
        serverName,
        ipAddress,
        notes
      },
      (err, result) => {
        if (err) {
          console.error('[SERVER ROUTES] addServerLocation =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({ success: true, ...result });
      }
    );
  }
);

/**
 * GET /admin/server/locations/:locationId
 * => meltdown => getServerLocation
 */
router.get(
  '/locations/:locationId',
  requireAuthCookie,
  requirePermission('serverManager.viewLocations'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { locationId } = req.params;

    if (!locationId) {
      return res.status(400).json({
        success: false,
        error: 'Missing :locationId parameter.'
      });
    }

    motherEmitter.emit(
      'getServerLocation',
      { jwt: userToken, locationId },
      (err, location) => {
        if (err) {
          console.error('[SERVER ROUTES] getServerLocation =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({ success: true, location: location || null });
      }
    );
  }
);

/**
 * PATCH /admin/server/locations/:locationId
 * => meltdown => updateServerLocation
 * Body: { newName, newIp, newNotes } (whatever fields you want to update)
 */
router.patch(
  '/locations/:locationId',
  requireAuthCookie,
  requirePermission('serverManager.editLocation'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { locationId } = req.params;
    const { newName, newIp, newNotes } = req.body;

    if (!locationId) {
      return res.status(400).json({ success: false, error: 'Missing :locationId in URL.' });
    }

    motherEmitter.emit(
      'updateServerLocation',
      {
        jwt: userToken,
        locationId,
        newName,
        newIp,
        newNotes
      },
      (err, result) => {
        if (err) {
          console.error('[SERVER ROUTES] updateServerLocation =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({ success: true, ...result });
      }
    );
  }
);

/**
 * DELETE /admin/server/locations/:locationId
 * => meltdown => deleteServerLocation
 */
router.delete(
  '/locations/:locationId',
  requireAuthCookie,
  requirePermission('serverManager.deleteLocation'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { locationId } = req.params;

    if (!locationId) {
      return res.status(400).json({
        success: false,
        error: 'Missing :locationId parameter.'
      });
    }

    motherEmitter.emit(
      'deleteServerLocation',
      { jwt: userToken, locationId },
      (err) => {
        if (err) {
          console.error('[SERVER ROUTES] deleteServerLocation =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({ success: true, message: `Deleted location ${locationId}.` });
      }
    );
  }
);

module.exports = router;
