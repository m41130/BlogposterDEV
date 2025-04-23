/**
 * mother/routes/csr/dbmanager.js
 *
 * JSON-basierte Routen für den DatabaseManager – extrem gefährlich, 
 * daher standardmäßig auskommentiert. Nur für Superadmin-Tasks zu verwenden,
 * falls überhaupt.
 */

// const express = require('express');
// const router = express.Router();
// const motherEmitter = require('../../emitters/motherEmitter');
// const { requireAuthCookie } = require('../../modules/auth/authMiddleware');
// const { requirePermission } = require('../../modules/auth/permissionMiddleware');

/*
// Beispiel-Endpunkt 1: Quick-Test
router.get(
  '/test',
  requireAuthCookie,
  requirePermission('dbmanager.testSuperadmin'),
  (req, res) => {
    return res.json({
      success: true,
      message: 'DBManager test – nur für Superadmins. Wenn du das siehst, hast du alles (zu viele) Rechte.'
    });
  }
);

// Beispiel-Endpunkt 2: createDatabase
router.post(
  '/create',
  requireAuthCookie,
  requirePermission('dbmanager.createDatabase'), 
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { targetModuleName } = req.body || {};

    if (!targetModuleName) {
      return res.status(400).json({ success: false, error: 'Missing targetModuleName in body.' });
    }

    motherEmitter.emit(
      'createDatabase',
      {
        jwt: userToken,
        moduleName: 'databaseManager',  // meltdown logic checks dies
        moduleType: 'core',
        // Achtung: Das meltdown-Event "createDatabase" nutzt "payload.moduleName" 
        //   um zu entscheiden, welche DB angelegt wird (eigene DB vs. shared Schema).
        // Hier also: moduleName = targetModuleName 
        //  ... oder du änderst "createDatabase" code an, dass es ein "targetModuleName" Feld benutzt.
        moduleName: targetModuleName
      },
      (err, result) => {
        if (err) {
          console.error('[DBMANAGER ROUTE] createDatabase =>', err.message);
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

// Beispiel-Endpunkt 3: Raw-SQL ausführen (wirklich gefährlich!)
router.post(
  '/raw-sql',
  requireAuthCookie,
  requirePermission('dbmanager.performRawSql'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { sql, params } = req.body || {};

    if (!sql) {
      return res.status(400).json({ success: false, error: 'Missing SQL statement in body.' });
    }

    // Optional: targetModuleName => um zu entscheiden, ob wir z.B. ins "pagesManager_db" oder so schreiben.

    motherEmitter.emit(
      'performDbOperation',
      {
        jwt: userToken,
        moduleName: 'databaseManager',
        operation: sql,
        params: Array.isArray(params) ? params : []
      },
      (err, result) => {
        if (err) {
          console.error('[DBMANAGER ROUTE] raw-sql =>', err.message);
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
*/

/* 
  Wenn du diese Routen wirklich anbieten willst, musst du die Kommentarzeichen entfernen, 
  den Code mounten:

  const dbManagerRouter = require('./mother/routes/csr/admin/dbmanager');
  app.use('/admin/dbmanager', dbManagerRouter);

  ... und sehr sicherstellen, dass nur ein "Superadmin" (o.Ä.) Zugriffsrechte hat!
*/
