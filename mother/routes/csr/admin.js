/*  mother/routes/csr/admin.js
 *  ──────────────────────────────────────────────────────────────────────────
 *  The (slightly snarky) Admin‑router
 *  * first‑run registration
 *  * login / logout views
 *  * every SPA‑HTML‑fragment you ever dreamed of
 *  * permission checks on top of a REAL JWT‑middleware
 *  ------------------------------------------------------------------------*/

const express  = require('express');
const path     = require('path');
const router   = express.Router();

const { motherEmitter }     = require('../../emitters/motherEmitter');
const notificationEmitter   = require('../../emitters/notificationEmitter');
const { requirePermission } = require('../../modules/auth/permissionMiddleware');

/* ------------------------------------------------------------------------ */
/* 1 ▸ Auth‑middleware – REAL version                                       */
/* ------------------------------------------------------------------------ */
 const {
   requireAuthCookie,
    requireAuthHeader   // for JSON endpoints
   } = require('../../modules/auth/authMiddleware');
  
   const requireAuth    = requireAuthCookie;   // plain cookie middleware
   const requireAuthAPI = requireAuthHeader;   // header / JSON 401s
  

/* ------------------------------------------------------------------------ */
/* 2 ▸ helpers                                                              */
/* ------------------------------------------------------------------------ */

/** query the settings‑service for the currently active Admin UI */
function getActiveUI (jwt) {
  return new Promise((resolve, reject) => {
    motherEmitter.emit('getSetting',
      { jwt, moduleName:'settingsManager', moduleType:'core', key:'activeAdminUI' },
      (err, ui) => err ? reject(err) : resolve(ui || 'PlainSpaceUI')
    );
  });
}

/* ------------------------------------------------------------------------ */
/* 3 ▸ first run : login / register                                         */
/* ------------------------------------------------------------------------ */

/** root – redirects either to /register (when no users) or /login */
router.get('/', (_, res) => {
  motherEmitter.emit('getUserCount',
    { jwt:global.pagesPublicToken, moduleName:'userManagement', moduleType:'core' },
    (err, count = 1) => {
      if (err) return res.status(500).send('Error checking user count');
      res.redirect(count === 0 ? '/admin/register' : '/admin/login');
    });
});

/** simple static login page */
router.get('/login', (_req, res) =>
  res.sendFile(path.join(__dirname, '../../adminui/PlainSpaceUI/login.html')));

/** first‑time registration page (only shown if no users exist) */
router.get('/register', (_req, res) => {
  motherEmitter.emit('getUserCount',
    { jwt:global.pagesPublicToken, moduleName:'userManagement', moduleType:'core' },
    (err, count = 1) => {
      if (err) return res.status(500).send('Error checking user count');
      if (count > 0) return res.redirect('/admin/login');

      res.sendFile(path.join(__dirname, '../../adminui/PlainSpaceUI/register.html'));
    });
});

/** POST /api/register – bootstrap very first admin user */
router.post('/api/register', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error:'username + password required' });
  }

  motherEmitter.emit('getUserCount',
    { jwt:global.pagesPublicToken, moduleName:'userManagement', moduleType:'core' },
    (err, count = 1) => {
      if (err)  return res.status(500).json({ error:err.message });
      if (count > 0) return res.status(403).json({ error:'Registration closed' });

      motherEmitter.emit('createUser',
        { jwt:global.pagesPublicToken, moduleName:'userManagement', moduleType:'core',
          username, password, role:'admin' },
        (eCreate, user) => {
          if (eCreate) return res.status(500).json({ error:eCreate.message });

          notificationEmitter.notify({
            moduleName:'adminRoutes',
            notificationType:'system',
            priority:'info',
            message:`New admin "${user.username}" created`
          });
          res.json({ success:true, user });
        });
    });
});

/* ------------------------------------------------------------------------ */
/* 4 ▸ tiny JSON helper route                                               */
/* ------------------------------------------------------------------------ */
router.get('/api/activeUI',
  requireAuthAPI,                                           // <‑‑ secure
  async (req, res) => {
    try { res.json({ activeUI: await getActiveUI(req.cookies.admin_jwt) }); }
    catch { res.json({ activeUI:'PlainSpaceUI' }); }
  });

/* ------------------------------------------------------------------------ */
/* 5 ▸ dashboard shell (needs any valid JWT)                                */
/* ------------------------------------------------------------------------ */
router.get('/dashboard',
  requireAuth,                                              // <‑‑ secure
  (_req, res) =>
    res.sendFile(path.join(__dirname, '../../views/admin-partials/dashboard.html')));

/* ------------------------------------------------------------------------ */
/* 6 ▸ the *real* admin routes – one liner galore                           */
/* ------------------------------------------------------------------------ */
/* pattern:  URL ➜ requireAuth ➜ requirePermission ➜ serve HTML fragment */

router.get('/content',
  requireAuth,
  requirePermission('content.pages.list'),
  (_,res)=>res.sendFile(path.join(__dirname, '../../views/admin-partials/content/contentIndex.html')));

router.get('/content/media',
  requireAuth,
  requirePermission('content.media.list'),
  (_,res)=>res.sendFile(path.join(__dirname, '../../views/admin-partials/content/media/mediaExplorer.html')));

router.get('/content/pages',
  requireAuth,
  requirePermission('content.pages.list'),
  (_,res)=>res.sendFile(path.join(__dirname, '../../views/admin-partials/content/pages/pagesExplorer.html')));

router.get('/content/pages/new',
  requireAuth,
  requirePermission('content.pages.create'),
  (_,res)=>res.sendFile(path.join(__dirname, '../../views/admin-partials/content/pages/pageEditor.html')));

router.get('/content/pages/edit/:pageId',
  requireAuth,
  requirePermission('content.pages.edit'),
  (_,res)=>res.sendFile(path.join(__dirname, '../../views/admin-partials/content/pages/pageEditor.html')));

router.get('/settings',
  requireAuth,
  requirePermission('settings.view'),
  (_,res)=>res.sendFile(path.join(__dirname, '../../views/admin-partials/settings/settingsindex.html')));

router.get('/settings/users',
  requireAuth,
  requirePermission('settings.users.list'),
  (_,res)=>res.sendFile(path.join(__dirname, '../../views/admin-partials/settings/users/usersExplorer.html')));

router.get('/settings/modules',
  requireAuth,
  requirePermission('settings.modules.list'),
  (_,res)=>res.sendFile(path.join(__dirname, '../../views/admin-partials/settings/modules/modulesExplorer.html')));

/* ------------------------------------------------------------------------ */
/* 7 ▸ catch‑all – send the SPA shell                                       */
/* ------------------------------------------------------------------------ */
router.get('*',
  requireAuth,
  requirePermission('admin.access'),
  (_,res)=>res.sendFile(path.join(__dirname, '../../views/admin-partials/admin.html')));

/* ------------------------------------------------------------------------ */
module.exports = router;
/*  fin. Nothing to see beyond this line – move along, citizen.             */

