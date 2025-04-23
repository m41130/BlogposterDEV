/**
 * app.js
 *
 * Steps to achieve the apparently impossible:
 * 1) Load .env
 * 2) Possibly load local "secret overrides"
 * 3) Initialize Express + middlewares
 * 4) Load core modules (Auth, DB, etc.) – fatal on error
 * 5) Load optional modules (moduleLoader) – non‑fatal on error
 * 6) Mount STATIC assets (before CSRF / API routes)
 * 7) Mount CSRF guard on /admin/api
 * 8) Mount JSON‑auth, API, SPA & public routes
 * 9) Start the server
 */

'use strict';
require('dotenv').config();

const fs           = require('fs');
const path         = require('path');
const express      = require('express');
const helmet       = require('helmet');
const bodyParser   = require('body-parser');
const cookieParser = require('cookie-parser');

const { motherEmitter } = require('./mother/emitters/motherEmitter');

//───────────────────────────────────────────────────────────────────────────
// ENV sanity checks
//───────────────────────────────────────────────────────────────────────────
function abort(msg, howToFix) {
  console.error('\n==================  BLOGPOSTER CMS – CONFIG ERROR  ==================');
  console.error('✖ ' + msg);
  if (howToFix) {
    console.error('\nHow to fix:');
    console.error('  → ' + howToFix.split('\n').join('\n  '));
  }
  console.error('=====================================================================\n');
  process.exit(1);
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 64) {
  abort(
    'Missing or too‑short JWT_SECRET (min. 64 random hex chars).',
    'Run:\n' +
    '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n' +
    'and add it to .env as JWT_SECRET=<paste>'
  );
}

if (!process.env.AUTH_MODULE_INTERNAL_SECRET || process.env.AUTH_MODULE_INTERNAL_SECRET.length < 48) {
  abort(
    'Missing/short AUTH_MODULE_INTERNAL_SECRET (min. 48 chars).',
    'Run:\n' +
    '  node -e "console.log(require(\'crypto\').randomBytes(24).toString(\'hex\'))"\n' +
    'and add it to .env as AUTH_MODULE_INTERNAL_SECRET=<paste>'
  );
}

//───────────────────────────────────────────────────────────────────────────
// Salts & token configs
//───────────────────────────────────────────────────────────────────────────
const JWT_SECRET         = process.env.JWT_SECRET;
const AUTH_MODULE_SECRET = process.env.AUTH_MODULE_INTERNAL_SECRET;
const userPasswordSalt   = process.env.USER_PASSWORD_SALT || '';
const moduleDbSalt       = process.env.MODULE_DB_SALT     || '';
const tokenSalts = {
  high  : process.env.TOKEN_SALT_HIGH,
  medium: process.env.TOKEN_SALT_MEDIUM,
  low   : process.env.TOKEN_SALT_LOW
};
const jwtExpiryConfig = {
  high  : process.env.JWT_EXPIRY_HIGH,
  medium: process.env.JWT_EXPIRY_MEDIUM,
  low   : process.env.JWT_EXPIRY_LOW
};

//───────────────────────────────────────────────────────────────────────────
// Load local secret overrides (optional .secrets.js files)
//───────────────────────────────────────────────────────────────────────────
(function loadSecretsOverrides() {
  const overridesDir = path.join(__dirname, 'overrides');
  if (!fs.existsSync(overridesDir)) return;
  fs.readdirSync(overridesDir)
    .filter(f => f.endsWith('.secrets.js'))
    .forEach(f => {
      try {
        require(path.join(overridesDir, f));
        console.log(`[SECRETS] Loaded override ${f}`);
      } catch (e) {
        console.error(`[SECRETS] Failed to load ${f}:`, e.message);
      }
    });
})();

//───────────────────────────────────────────────────────────────────────────
// Helper to get a high‑trust token for DB manager
//───────────────────────────────────────────────────────────────────────────
function getModuleTokenForDbManager() {
  return new Promise((resolve, reject) => {
    motherEmitter.emit(
      'issueModuleToken',
      {
        skipJWT         : true,
        authModuleSecret: AUTH_MODULE_SECRET,
        moduleType      : 'core',
        moduleName      : 'auth',
        trustLevel      : 'high',
        signAsModule    : 'databaseManager'
      },
      (err, token) => err ? reject(err) : resolve(token)
    );
  });
}

//───────────────────────────────────────────────────────────────────────────
// MAIN async IIFE
//───────────────────────────────────────────────────────────────────────────
(async () => {
  // Instantiate Express
  const app  = express();
  const port = process.env.PORT || 3000;

  // Trust reverse proxy headers
  app.enable('trust proxy');

  // Security headers
  app.use(helmet());

  // HTTPS redirect in production
  if (process.env.NODE_ENV === 'production') {
    const httpsRedirect = require('./mother/utils/httpsRedirect');
    app.use(httpsRedirect);
  }

  // Body parser + cookies
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());

  // 1) Load core Auth module
  console.log('[SERVER INIT] Loading Auth module…');
  require(path.join(__dirname, 'mother', 'modules', 'auth', 'index.js'))
    .initialize({
      motherEmitter,
      isCore: true,
      JWT_SECRET,
      userPasswordSalt,
      moduleDbSalt,
      tokenSalts,
      jwtExpiryConfig
    });
  console.log('[SERVER INIT] Auth module loaded.');

  // 2) Obtain DB‑manager token
  console.log('[SERVER INIT] Requesting DB‑manager token…');
  const dbManagerToken = await getModuleTokenForDbManager();
  console.log('[SERVER INIT] dbManagerToken obtained.');

  // 3) Load other core modules
  const coreList = [
    { name:'databaseManager',     path:'mother/modules/databaseManager',     extra:{ app } },
    { name:'userManagement',      path:'mother/modules/userManagement',      extra:{ app } },
    { name:'pagesManager',        path:'mother/modules/pagesManager',        extra:{} },
    { name:'settingsManager',     path:'mother/modules/settingsManager',     extra:{} },
    { name:'notificationManager', path:'mother/modules/notificationManager', extra:{ app } },
    { name:'dependencyLoader',    path:'mother/modules/dependencyLoader',    extra:{} },
    { name:'unifiedSettings',     path:'mother/modules/unifiedSettings',     extra:{ app } },
    { name:'serverManager',       path:'mother/modules/serverManager',       extra:{ app } },
    { name:'mediaManager',        path:'mother/modules/mediaManager',        extra:{ app } },
    { name:'shareManager',        path:'mother/modules/shareManager',        extra:{ app } },
    { name:'widgetManager',       path:'mother/modules/widgetManager',       extra:{} },
    { name:'translationManager',  path:'mother/modules/translationManager',  extra:{} }
  ];

  for (const mod of coreList) {
    console.log(`[SERVER INIT] Loading ${mod.name}…`);
    await require(path.join(__dirname, mod.path, 'index.js'))
      .initialize({
        motherEmitter,
        isCore: true,
        jwt: dbManagerToken,
        moduleDbSalt,
        ...mod.extra
      });
    console.log(`[SERVER INIT] ${mod.name} loaded.`);
  }

  // 4) Optional moduleLoader
  try {
    console.log('[SERVER INIT] Loading optional moduleLoader…');
    const loader = require(path.join(__dirname, 'mother', 'modules', 'moduleLoader', 'index.js'));
    await loader.loadAllModules({ emitter: motherEmitter, app, jwt: dbManagerToken });
    console.log('[SERVER INIT] moduleLoader done.');
  } catch (e) {
    console.error('[SERVER INIT] moduleLoader fizzled →', e.message);
  }

  // 5) Determine active UI theme
  console.log('[SERVER INIT] Fetching active UI theme…');
  const activeUI = await new Promise((resolve, reject) => {
    motherEmitter.emit(
      'getSetting',
      {
        jwt        : dbManagerToken,
        moduleName : 'settingsManager',
        moduleType : 'core',
        key        : 'activeAdminUI'
      },
      (err, ui) => err ? reject(err) : resolve(ui || 'PlainSpaceUI')
    );
  });

  // 6) Static assets (no CSRF)
  console.log('[SERVER INIT] Mounting static assets (no CSRF)…');
  const globalAssetsPath   = path.join(__dirname, 'assets');
  const activeAssetsPath   = path.join(__dirname, 'adminui', activeUI, 'assets');
  const adminViewsPath     = path.join(__dirname, 'views', 'admin-partials');
  const publicPath         = path.join(__dirname, '..', 'public');

  app.get('/favicon.ico', (_req, res) => res.sendStatus(204));
  app.use('/admin/assets', express.static(activeAssetsPath));
  app.use('/admin/assets', express.static(globalAssetsPath));
  app.use('/admin/ui',     express.static(path.join(__dirname, 'adminui')));
  app.use('/admin/views',  express.static(adminViewsPath, { index:false }));
  app.use(express.static(publicPath));
  console.log('[SERVER INIT] Static mounts armed.');

  // 7) Content‑Security‑Policy
  app.use((_, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval'",
        "style-src  'self' 'unsafe-inline'",
        "object-src 'none'",
        "base-uri   'self'",
        "frame-ancestors 'none'"
      ].join('; ')
    );
    next();
  });

  // 8) CSRF protection on /admin/api
  app.use('/admin/api', require('./mother/routes/csr'));

  const publicRouter = require('./mother/routes/public');
app.use('/', publicRouter);          


  // 9) Lift‑off
  app.listen(port, () => {
    console.log(`[SERVER] BlogPosterCMS is listening on http://localhost:${port}/`);
  });

})().catch(err => {
  console.error('[SERVER INIT] Catastrophic failure:', err);
  process.exit(1);
});
