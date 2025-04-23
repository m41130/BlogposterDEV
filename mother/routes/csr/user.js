/**
 * mother/routes/csr/settings/user.js
 *
 * JSON-based routes for user & role management using meltdown events.
 * Everything from the userManagement module EXCEPT the login events
 * (userLogin, finalizeUserLogin) is placed here.
 *
 * Endpoints below assume:
 *   - requireAuthCookie + requirePermission for protected routes
 *   - meltdown calls to userManagement (createUser, getAllUsers, etc.)
 */

const express = require('express');
const router = express.Router();
const { motherEmitter } = require('../../emitters/motherEmitter');
const { requireAuthCookie } = require('../../modules/auth/authMiddleware');
const { requirePermission } = require('../../modules/auth/permissionMiddleware');

/** ===========================
 *  ====  USER OPERATIONS  ====
 *  =========================== */

/**
 * GET /admin/settings/user
 * meltdown => getAllUsers
 */
router.get(
  '/',
  requireAuthCookie,
  requirePermission('userManagement.listUsers'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    motherEmitter.emit(
      'getAllUsers',
      {
        jwt: userToken,
        moduleName: 'userManagement',
        moduleType: 'core'
      },
      (err, users) => {
        if (err) {
          console.error('[USER ROUTES] getAllUsers error =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          users: users || []
        });
      }
    );
  }
);

/**
 * POST /admin/settings/user
 * meltdown => createUser
 * If you want to create users from the admin UI.
 */
router.post(
  '/',
  requireAuthCookie,
  requirePermission('userManagement.createUser'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const {
      username,
      password,
      email,
      firstName,
      lastName,
      displayName,
      phone,
      company,
      website,
      avatarUrl,
      bio,
      role
    } = req.body;

    motherEmitter.emit(
      'createUser',
      {
        jwt: userToken,
        moduleName: 'userManagement',
        moduleType: 'core',
        username,
        password,
        email,
        firstName,
        lastName,
        displayName,
        phone,
        company,
        website,
        avatarUrl,
        bio,
        role
      },
      (err, newUser) => {
        if (err) {
          console.error('[USER ROUTES] createUser =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          user: newUser
        });
      }
    );
  }
);

/**
 * PATCH /admin/settings/user/:userId/profile
 * meltdown => updateUserProfile
 */
router.patch(
  '/:userId/profile',
  requireAuthCookie,
  requirePermission('userManagement.editUser'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { userId } = req.params;
    const {
      newUsername,
      newEmail,
      newPassword,
      newFirstName,
      newLastName,
      newDisplayName,
      newPhone,
      newCompany,
      newWebsite,
      newAvatarUrl,
      newBio
    } = req.body;

    motherEmitter.emit(
      'updateUserProfile',
      {
        jwt: userToken,
        moduleName: 'userManagement',
        moduleType: 'core',
        userId,
        newUsername,
        newEmail,
        newPassword,
        newFirstName,
        newLastName,
        newDisplayName,
        newPhone,
        newCompany,
        newWebsite,
        newAvatarUrl,
        newBio
      },
      (err, result) => {
        if (err) {
          console.error('[USER ROUTES] updateUserProfile =>', err.message);
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
 * GET /admin/settings/user/details/username/:username
 * meltdown => getUserDetailsByUsername
 */
router.get(
  '/details/username/:username',
  requireAuthCookie,
  requirePermission('userManagement.listUsers'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { username } = req.params;

    motherEmitter.emit(
      'getUserDetailsByUsername',
      {
        jwt: userToken,
        moduleName: 'userManagement',
        moduleType: 'core',
        username
      },
      (err, userRecord) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }
        if (!userRecord) {
          return res.status(404).json({ success: false, error: 'No user found.' });
        }
        return res.json({
          success: true,
          user: userRecord
        });
      }
    );
  }
);

/**
 * GET /admin/settings/user/details/id/:userId
 * meltdown => getUserDetailsById
 */
router.get(
  '/details/id/:userId',
  requireAuthCookie,
  requirePermission('userManagement.listUsers'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { userId } = req.params;

    motherEmitter.emit(
      'getUserDetailsById',
      {
        jwt: userToken,
        moduleName: 'userManagement',
        moduleType: 'core',
        userId
      },
      (err, userRecord) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }
        if (!userRecord) {
          return res.status(404).json({ success: false, error: 'No user found for that ID.' });
        }
        return res.json({
          success: true,
          user: userRecord
        });
      }
    );
  }
);

/**
 * POST /admin/settings/user/:userId/delete
 * meltdown => deleteUser
 */
router.post(
  '/:userId/delete',
  requireAuthCookie,
  requirePermission('userManagement.deleteUser'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { userId } = req.params;

    motherEmitter.emit(
      'deleteUser',
      {
        jwt: userToken,
        moduleName: 'userManagement',
        moduleType: 'core',
        userId
      },
      (err) => {
        if (err) {
          console.error('[USER ROUTES] deleteUser =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          message: `User ${userId} deleted.`
        });
      }
    );
  }
);

/**
 * GET /admin/settings/user/count
 * meltdown => getUserCount
 */
router.get(
  '/count',
  requireAuthCookie,
  requirePermission('userManagement.listUsers'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;

    motherEmitter.emit(
      'getUserCount',
      {
        jwt: userToken,
        moduleName: 'userManagement',
        moduleType: 'core'
      },
      (err, userCount) => {
        if (err) {
          console.error('[USER ROUTES] getUserCount =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          userCount
        });
      }
    );
  }
);

/**
 * POST /admin/settings/user/:userId/increment-token-version
 * meltdown => incrementUserTokenVersion
 */
router.post(
  '/:userId/increment-token-version',
  requireAuthCookie,
  requirePermission('userManagement.editUser'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { userId } = req.params;

    motherEmitter.emit(
      'incrementUserTokenVersion',
      {
        jwt: userToken,
        moduleName: 'userManagement',
        moduleType: 'core',
        userId
      },
      (err, result) => {
        if (err) {
          console.error('[USER ROUTES] incrementUserTokenVersion =>', err.message);
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
 * GET /admin/settings/user/me
 * meltdown => getUserDetailsById
 * This is the current user, so we don't need to pass the userId.
 */

router.get('/me', requireAuthCookie, (req, res) => {
  const userToken = req.headers.authorization.replace(/^Bearer\s+/i, '');

  motherEmitter.emit(
    'getUserDetailsById',
    {
      jwt: userToken,                  
      moduleName: 'userManagement',
      moduleType: 'core',
      userId: req.user.userId          
    },
    (err, userObj) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true, user: userObj });
    }
  );
});

/** ===========================
 *  ====   ROLE OPERATIONS ====
 *  =========================== */

/**
 * GET /admin/settings/user/roles
 * meltdown => getAllRoles
 */
router.get(
  '/roles',
  requireAuthCookie,
  requirePermission('userManagement.listRoles'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    motherEmitter.emit(
      'getAllRoles',
      {
        jwt: userToken,
        moduleName: 'userManagement',
        moduleType: 'core'
      },
      (err, roles) => {
        if (err) {
          console.error('[USER ROUTES] getAllRoles =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          roles: roles || []
        });
      }
    );
  }
);

/**
 * POST /admin/settings/user/roles
 * meltdown => createRole
 */
router.post(
  '/roles',
  requireAuthCookie,
  requirePermission('userManagement.createRole'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { roleName, description, permissions } = req.body;

    let parsedPerms = {};
    if (permissions) {
      try {
        parsedPerms = JSON.parse(permissions);
      } catch (parseErr) {
        console.error('[USER ROUTES] createRole => invalid JSON perms:', parseErr.message);
        return res.status(400).json({ success: false, error: 'Invalid JSON for permissions.' });
      }
    }

    motherEmitter.emit(
      'createRole',
      {
        jwt: userToken,
        moduleName: 'userManagement',
        moduleType: 'core',
        roleName,
        description,
        permissions: parsedPerms
      },
      (err) => {
        if (err) {
          console.error('[USER ROUTES] createRole =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          message: `Role "${roleName}" created.`
        });
      }
    );
  }
);

/**
 * POST /admin/settings/user/roles/:roleId/update
 * meltdown => updateRole
 */
router.post(
  '/roles/:roleId/update',
  requireAuthCookie,
  requirePermission('userManagement.editRole'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { roleId } = req.params;
    const { newRoleName, newDescription, newPermissions } = req.body;

    let parsedPerms = null;
    if (newPermissions) {
      try {
        parsedPerms = JSON.parse(newPermissions);
      } catch (errParse) {
        return res.status(400).json({ success: false, error: 'Invalid JSON for permissions.' });
      }
    }

    motherEmitter.emit(
      'updateRole',
      {
        jwt: userToken,
        moduleName: 'userManagement',
        moduleType: 'core',
        roleId,
        newRoleName: newRoleName || null,
        newDescription: newDescription || null,
        newPermissions: parsedPerms
      },
      (err) => {
        if (err) {
          console.error('[USER ROUTES] updateRole =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          message: `Role ${roleId} updated.`
        });
      }
    );
  }
);

/**
 * POST /admin/settings/user/roles/:roleId/delete
 * meltdown => deleteRole
 */
router.post(
  '/roles/:roleId/delete',
  requireAuthCookie,
  requirePermission('userManagement.deleteRole'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { roleId } = req.params;

    motherEmitter.emit(
      'deleteRole',
      {
        jwt: userToken,
        moduleName: 'userManagement',
        moduleType: 'core',
        roleId
      },
      (err) => {
        if (err) {
          console.error('[USER ROUTES] deleteRole =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          message: `Role ${roleId} deleted.`
        });
      }
    );
  }
);

/** ===========================
 *  ===  USER-ROLE ASSIGN  ===
 *  =========================== */

/**
 * GET /admin/settings/user/:userId/roles
 * meltdown => getRolesForUser
 */
router.get(
  '/:userId/roles',
  requireAuthCookie,
  requirePermission('userManagement.listRoles'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { userId } = req.params;

    motherEmitter.emit(
      'getRolesForUser',
      {
        jwt: userToken,
        moduleName: 'userManagement',
        moduleType: 'core',
        userId
      },
      (err, rolesArr) => {
        if (err) {
          console.error('[USER ROUTES] getRolesForUser =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          roles: rolesArr || []
        });
      }
    );
  }
);

/**
 * POST /admin/settings/user/:userId/assign-role
 * meltdown => assignRoleToUser
 */
router.post(
  '/:userId/assign-role',
  requireAuthCookie,
  requirePermission('userManagement.editRole'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { userId } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({ success: false, error: 'Missing roleId.' });
    }

    motherEmitter.emit(
      'assignRoleToUser',
      {
        jwt: userToken,
        moduleName: 'userManagement',
        moduleType: 'core',
        userId,
        roleId
      },
      (err) => {
        if (err) {
          console.error('[USER ROUTES] assignRoleToUser =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          message: `Role ${roleId} assigned to user ${userId}.`
        });
      }
    );
  }
);

/**
 * POST /admin/settings/user/:userId/remove-role
 * meltdown => removeRoleFromUser
 */
router.post(
  '/:userId/remove-role',
  requireAuthCookie,
  requirePermission('userManagement.editRole'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { userId } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({ success: false, error: 'Missing roleId.' });
    }

    motherEmitter.emit(
      'removeRoleFromUser',
      {
        jwt: userToken,
        moduleName: 'userManagement',
        moduleType: 'core',
        userId,
        roleId
      },
      (err) => {
        if (err) {
          console.error('[USER ROUTES] removeRoleFromUser =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          message: `Role ${roleId} removed from user ${userId}.`
        });
      }
    );
  }
);

module.exports = router;
