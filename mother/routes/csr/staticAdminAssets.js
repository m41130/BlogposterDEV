// mother/routes/staticAdminAssets.js
const express = require('express');
const path    = require('path');
const { requireAuthCookie } =
        require('../../modules/auth/authMiddleware');

module.exports = function mountProtectedAssets(app) {
  const guard = requireAuthCookie;               // cookie middleware
  const uiDir = path.join(__dirname, '..', 'adminui');

  // every request to /admin/ui/** must have a valid admin_jwt cookie
  app.use('/admin/ui', guard, express.static(uiDir, { index:false }));
};
