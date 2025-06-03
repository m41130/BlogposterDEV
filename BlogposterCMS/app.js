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
const csurf        = require('csurf');
const { apiLimiter, loginLimiter } = require('./mother/utils/rateLimiters');
const crypto = require('crypto');
const { sanitizeCookieName, sanitizeCookiePath, sanitizeCookieDomain } = require('./mother/utils/cookieUtils');






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

  // Set up paths
  const publicPath = path.join(__dirname, 'public');
  const assetsPath = path.join(publicPath, 'assets');
  app.use('/admin/assets', express.static(path.join(publicPath, 'assets')));
  app.use('/assets/plainspace', express.static(path.join(assetsPath, 'plainspace')));
  app.use('/assets', express.static(assetsPath));
  app.use('/themes', express.static(path.join(publicPath, 'themes')));
  app.use('/favicon.ico', express.static(path.join(publicPath,'favicon.ico')));
  app.use('/fonts', express.static(path.join(publicPath,'fonts')));

  // Trust reverse proxy headers only if explicitly allowed
  if (process.env.TRUST_PROXY) {
    app.set('trust proxy', process.env.TRUST_PROXY.split(',').map(x => x.trim()));
  } else {
    app.set('trust proxy', false);
  }

  // Security headers
  app.use(helmet());

  // HTTPS redirect in production
  if (process.env.NODE_ENV === 'production') {
    const httpsRedirect = require('./mother/utils/httpsRedirect');
    app.use(httpsRedirect);
  }

  // Body parser + cookies (allow larger payloads for media uploads)
  const bodyLimit = process.env.BODY_LIMIT || '20mb';
  app.use(bodyParser.json({ limit: bodyLimit }));
  app.use(bodyParser.urlencoded({ extended: true, limit: bodyLimit }));
  app.use(cookieParser());

  // Rate limiting provided by utils/rateLimiters.js

  // CSRF protection
  const csrfProtection = csurf({
    cookie: { httpOnly: true, sameSite: 'strict' }
  })

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
    { name:'notificationManager', path:'mother/modules/notificationManager', extra:{ app } },
    { name:'settingsManager',     path:'mother/modules/settingsManager',     extra:{} },
    { name:'widgetManager',       path:'mother/modules/widgetManager',       extra:{} },
    { name:'userManagement',      path:'mother/modules/userManagement',      extra:{ app } },
    { name:'pagesManager',        path:'mother/modules/pagesManager',        extra:{} },
    { name:'dependencyLoader',    path:'mother/modules/dependencyLoader',    extra:{} },
    { name:'unifiedSettings',     path:'mother/modules/unifiedSettings',     extra:{ app } },
    { name:'serverManager',       path:'mother/modules/serverManager',       extra:{ app } },
    { name:'mediaManager',        path:'mother/modules/mediaManager',        extra:{ app } },
    { name:'shareManager',        path:'mother/modules/shareManager',        extra:{ app } },
    { name:'translationManager',  path:'mother/modules/translationManager',  extra:{} },
    { name:'plainSpace',          path:'mother/modules/plainSpace',          extra:{ app } },
    { name:'themeManager',        path:'mother/modules/themeManager',        extra:{} },
    { name:'importer',            path:'mother/modules/importer',            extra:{} }
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



  // ──────────────────────────────────────────────────────────────────────────
  // 4) Load optional modules
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('[SERVER INIT] Loading optional moduleLoader…');
    const loader = require(path.join(__dirname, 'mother', 'modules', 'moduleLoader', 'index.js'));
    await loader.loadAllModules({ emitter: motherEmitter, app, jwt: dbManagerToken });
    console.log('[SERVER INIT] moduleLoader done.');
  } catch (e) {
    console.error('[SERVER INIT] moduleLoader fizzled →', e.message);
  }

  

// ──────────────────────────────────────────────────────────────────────────
// 5) Meltdown API – proxy front-end requests into motherEmitter events
// ──────────────────────────────────────────────────────────────────────────

app.post('/api/meltdown', apiLimiter, (req, res) => {
  // 1) Read event name first so we know if it is public
  const { eventName, payload = {} } = req.body || {};
  const PUBLIC_EVENTS = [
    'issuePublicToken',
    'ensurePublicToken',
    'removeListenersByModule',
    'deactivateModule'
  ];

  // 2) Extract the JWT. Explicit header token overrides the cookie
  //    to allow public operations even if a stale admin cookie exists.
  const headerJwt = req.get('X-Public-Token') || null;
  const cookieJwt = req.cookies?.admin_jwt || null;
  const jwt = headerJwt || cookieJwt;

  // 3) If no JWT and this is not a public event => reject
  if (!jwt && !PUBLIC_EVENTS.includes(eventName)) {
    return res.status(401).json({ error: 'Authentication required: missing JWT.' });
  }

  if (jwt) {
    payload.jwt = jwt;
  }

  // 4) Emit the event and return JSON
  motherEmitter.emit(eventName, payload, (err, data) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    return res.json({ eventName, data });
  });
});


// ─────────────────────────────────────────────────────────────────
// 6) CSRF-protected login endpoint
// ─────────────────────────────────────────────────────────────────

app.post('/admin/api/login', loginLimiter, csrfProtection, async (req, res) => {

  const { username, password } = req.body;
  try {
    // 1) Issue a “login” public JWT that’s safe for CSRF-guarded flows
    const loginJwt = await new Promise((resolve, reject) => {
      motherEmitter.emit(
        'issuePublicToken',
        { purpose: 'login', moduleName: 'auth' },
        (err, token) => err ? reject(err) : resolve(token)
      );
    });

    // 2) Perform the adminLocal authentication strategy
    const user = await new Promise((resolve, reject) => {
      motherEmitter.emit(
        'loginWithStrategy',
        {
          jwt: loginJwt,
          moduleName: 'loginRoute',
          moduleType: 'public',
          strategy: 'adminLocal',
          payload: { username, password }
        },
        (err, user) => err || !user ? reject(err || new Error('Invalid credentials')) : resolve(user)
      );
    });

    // 3) Set the HttpOnly admin_jwt cookie and return success
    res.cookie(sanitizeCookieName('admin_jwt'), user.jwt, {
      path: sanitizeCookiePath('/'),
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 2 * 60 * 60 * 1000  // 2 hours
    });

    return res.json({ success: true });

  } catch (err) {
    return res.status(401).json({ success: false, error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 6b) Logout endpoint - clears admin cookie and redirects to login
// -----------------------------------------------------------------------------
app.get('/admin/logout', (req, res) => {
  res.clearCookie('admin_jwt', {
    path: sanitizeCookiePath('/'),
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production'
  });
  res.redirect('/login');
});



// ──────────────────────────────────────────────────────────────────────────
// 7a) Admin entry point: redirect to /admin/home and render shell
// ──────────────────────────────────────────────────────────────────────────

// Redirect plain /admin to /admin/home
app.get('/admin', (_req, res) => {
  // immediate redirect
  return res.redirect('/admin/home');
});

// Admin Home Route
app.get('/admin/home', csrfProtection, async (req, res) => {
  try {
    const publicJwt = await new Promise((resolve, reject) => {
      motherEmitter.emit(
        'issuePublicToken',
        { purpose: 'login', moduleName: 'auth' },
        (err, tok) => err ? reject(err) : resolve(tok)
      );
    });

    const userCount = await new Promise((resolve, reject) => {
      motherEmitter.emit(
        'getUserCount',
        { jwt: publicJwt, moduleName: 'userManagement', moduleType: 'core' },
        (err, count = 0) => err ? reject(err) : resolve(count)
      );
    });

    // User existiert noch nicht, zeige register.html
    if (userCount === 0) {
      return res.sendFile(path.join(publicPath, 'register.html'));
    }

    // Wenn Nutzer bereits authentifiziert ist, zeige admin.html
    if (req.cookies?.admin_jwt) {
      let html = fs.readFileSync(path.join(publicPath, 'admin.html'), 'utf8');
      html = html.replace(
        '</head>',
        `<meta name="csrf-token" content="${req.csrfToken()}"></head>`
      );
      return res.send(html);
    }

    // User nicht eingeloggt, sende login.html mit CSRF-Token
    let html = fs.readFileSync(path.join(publicPath, 'login.html'), 'utf8');
    html = html.replace(
      '{{CSRF_TOKEN}}', 
      req.csrfToken()
    );
    return res.send(html);

  } catch (err) {
    console.error('[ADMIN /home] Error:', err);
    let html = fs.readFileSync(path.join(publicPath, 'login.html'), 'utf8');
    html = html.replace('{{CSRF_TOKEN}}', req.csrfToken());
    return res.send(html);
  }
});



// ──────────────────────────────────────────────────────────────────────────
// 7b) Admin SPA shell for any /admin/<slug> path
// ──────────────────────────────────────────────────────────────────────────

// Capture any admin page slug via wildcard and parse req.params[0]
app.get('/admin/*', async (req, res, next) => {

  const adminJwt = req.cookies?.admin_jwt;

  if (!adminJwt) {
    const jump = `/login?redirectTo=${encodeURIComponent(req.originalUrl)}`;
    return res.redirect(jump);
  }

  let rawSlug = req.params[0] || '';
  let pageId = null;
  const idMatch = rawSlug.match(/(.+?)\/(\d+)$/);
  if (idMatch) {
    rawSlug = idMatch[1];
    pageId = parseInt(idMatch[2], 10) || null;
  }

  const sanitize = (str) => String(str)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 96);

  const slug = sanitize(rawSlug);

  try {
    const page = await new Promise((resolve, reject) => {
      motherEmitter.emit(
        'getPageBySlug',
        {
          jwt: adminJwt,
          moduleName: 'pagesManager',
          moduleType: 'core',
          slug,
          lane: 'admin'
        },
        (err, result) => (err ? reject(err) : resolve(result))
      );
    });

    if (!page?.id || page.lane !== 'admin') {
      return next();
    }

    const nonce = crypto.randomBytes(16).toString('base64');

    let html = fs.readFileSync(
      path.join(__dirname, 'public', 'admin.html'),
      'utf8'
    );

    const inject = `
      <script nonce="${nonce}">
        window.PAGE_ID     = ${pageId ?? page.id};
        window.PAGE_SLUG   = '${slug}';
        window.ADMIN_TOKEN = '${adminJwt}';
        window.NONCE       = '${nonce}';
      </script>
    </head>`;
    html = html.replace('</head>', inject);

    res.setHeader('Content-Security-Policy', `script-src 'self' blob: 'nonce-${nonce}';`);
    res.send(html);

  } catch (err) {
    console.error('[ADMIN /admin/*] Error:', err);
    next(err);
  }
});




// ─────────────────────────────────────────────────────────────────
// 8) Explicit /login route
// ─────────────────────────────────────────────────────────────────
app.get('/login', csrfProtection, (req, res) => {
  let html = fs.readFileSync(path.join(publicPath, 'login.html'), 'utf8');
  html = html.replace('{{CSRF_TOKEN}}', req.csrfToken());
  res.send(html);
});

// Convenience redirect for first-time registration
app.get('/register', (_req, res) => {
  res.redirect('/admin/home');
});




// ─────────────────────────────────────────────────────────────────
// 9) Maintenance mode middleware
// ─────────────────────────────────────────────────────────────────
app.use(async (req, res, next) => {
  // skip admin + assets
  if (
    req.path.startsWith('/admin') ||
    req.path.startsWith('/assets') ||
    req.path.startsWith('/api') ||
    req.path === '/login' ||
    req.path === '/favicon.ico'
    ) return next();
  

  // check the flag
  const isMaintenance = await new Promise((Y, N) =>
    motherEmitter.emit(
      'getSetting',
      {
        jwt: dbManagerToken,
        moduleName: 'settingsManager',
        moduleType: 'core',
        key: 'MAINTENANCE_MODE'
      },
      (err, val) => err ? N(err) : Y(val === 'true')
    )
  ).catch(() => false);

  if (isMaintenance) {
    // if we're not already on /coming-soon, rewrite there:
    if (req.path !== '/coming-soon') {
      return res.redirect('/coming-soon');
    }
    // if path IS /coming-soon, let the normal dynamic page renderer handle it:
  }

  next();
});


// ─────────────────────────────────────────────────────────────────
// 11) Public pages
// ─────────────────────────────────────────────────────────────────
const pageHtmlPath = path.join(__dirname, 'public', 'index.html');

// Handle public pages ("/" or "/:slug")
app.get('/:slug?', async (req, res, next) => {
  try {
    const requestedSlug = req.params.slug;

    const slug = typeof requestedSlug === 'string' ? requestedSlug : '';

    // Ensure a valid public token is available (refresh when expired)
    try {
      global.pagesPublicToken = await new Promise((resolve, reject) => {
        motherEmitter.emit(
          'ensurePublicToken',
          { 
            currentToken: global.pagesPublicToken, 
            purpose: 'public',
            moduleName: 'publicRoute',
            moduleType: 'core'
          },
          (err, data) => (err ? reject(err) : resolve(data))

        );
      });
    } catch (tokenErr) {
      console.error('[SERVER] Failed to obtain public token →', tokenErr);

      return res.status(500).send('Server misconfiguration');
    }

    // 1) Get the page object via meltdown (direct object, not {data:…}!)
    const page = await new Promise((resolve, reject) => {
      const eventName = slug ? 'getPageBySlug' : 'getStartPage';
      const payload = slug
        ? { jwt: global.pagesPublicToken, moduleName: 'pagesManager', moduleType: 'core', slug }
        : { jwt: global.pagesPublicToken, moduleName: 'pagesManager', moduleType: 'core' };

      motherEmitter.emit(eventName, payload, (err, record) => {
        if (err) return reject(err);
        resolve(record);
      });
    });

    // 2) If no row or missing .id => 404 fallback
    if (!page?.id) {
      return next();  // triggers your 404 fallback or next route
    }

    // 3) Build your dynamic injection with a nonce for CSP
    const pageId = page.id;
    const lane   = 'public';
    const token  = global.pagesPublicToken;
    const slugToUse = slug || page.slug;

    const nonce = crypto.randomBytes(16).toString('base64');

    let html = fs.readFileSync(pageHtmlPath, 'utf8');
    const inject = `<script nonce="${nonce}">
      window.PAGE_ID = ${pageId};
      window.PAGE_SLUG = '${slugToUse}';
      window.LANE    = '${lane}';
      window.PUBLIC_TOKEN = '${token}';
      window.NONCE  = '${nonce}';
    </script>`;
    html = html.replace('</head>', inject + '</head>');

    res.setHeader('Content-Security-Policy', `script-src 'self' blob: 'nonce-${nonce}';`);

    // 4) Send the patched HTML
    res.send(html);

  } catch (err) {
    console.error('[SERVER] /:slug render error →', err);
    next(err);
  }
});


// ─────────────────────────────────────────────────────────────────
// 12) First-time setup
// ─────────────────────────────────────────────────────────────────
try {
  const firstInstallDone = await new Promise((resolve, reject) => {
    motherEmitter.emit(
      'getSetting',
      {
        jwt         : dbManagerToken,
        moduleName  : 'settingsManager',
        moduleType  : 'core',
        key         : 'FIRST_INSTALL_DONE'
      },
      (err, val) => err ? reject(err) : resolve(val)
    );
  });

  if (firstInstallDone !== 'true') {
    console.log('[APP] Detected FIRST_INSTALL_DONE is false => running initial seeding now...');
    
    // 1) Perform any "only once" tasks:
    //    - e.g. meltdown calls to create certain pages or roles, etc.

    // 2) Then set FIRST_INSTALL_DONE => 'true'
    await new Promise((resolve, reject) => {
      motherEmitter.emit(
        'setSetting',
        {
          jwt         : dbManagerToken,
          moduleName  : 'settingsManager',
          moduleType  : 'core',
          key         : 'FIRST_INSTALL_DONE',
          value       : 'true'
        },
        err => err ? reject(err) : resolve()
      );
    });

    console.log('[APP] Finished first-time setup => FIRST_INSTALL_DONE is now "true".');
  } else {
    console.log('[APP] FIRST_INSTALL_DONE is "true" => skipping initial seeding.');
  }
} catch (err) {
  console.error('[APP] Could not check/set FIRST_INSTALL_DONE:', err.message);
}

// ─────────────────────────────────────────────────────────────────
// 13) Lift-off
// ─────────────────────────────────────────────────────────────────

const server = app.listen(port, () => {
  console.log(`[SERVER] BlogPosterCMS is listening on http://localhost:${port}/`);
});

process.on('SIGINT', () => {
  console.log('Shutting down server (SIGINT)...');
  server.close(() => {
    console.log('Server shutdown complete!');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Shutting down server (SIGINT)...');
  server.close(() => {
    console.log('Server shutdown complete!');
    process.exit(0);
  });
});

})().catch(err => {
  console.error('[SERVER INIT] Shit happens..:', err);
  process.exit(1);
});
