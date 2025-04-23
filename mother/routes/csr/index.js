// mother/routes/csr/index.js
// ─────────────────────────────────────────────────────────────────────────────
// The “Client‑Side Render” router: JSON APIs for the admin SPA.
// We now protect everything with CSRF magic, including your precious /config route.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router  = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// 1) BRING IN THE CSRF UNICORN FIRST 🦄
//    This little beast will guard all write operations from evil XSS attacks,
//    and also let you do req.csrfToken() for GET routes if you so desire.
// ─────────────────────────────────────────────────────────────────────────────
const csurf = require('csurf');
const { csrf } = require('../../../config/security');

// mount the csurf middleware right away so subsequent routes can call req.csrfToken()
router.use(
  csurf({
    cookie: {
      key: csrf.cookieName, // 🍪 cookie name
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production' // HTTPS-only in prod
    },
    value: req => req.headers[csrf.headerName.toLowerCase()] // SPA sends token in header
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// 2) LOGIN ROUTER (NOW WITH CSRF!).
//    Because apparently we do want a CSRF token in /auth/config – oh, the irony.
// ─────────────────────────────────────────────────────────────────────────────
const loginRouter = require('./auth');
router.use('/auth', loginRouter);

// ─────────────────────────────────────────────────────────────────────────────
// 3) MOUNT ALL THE OTHER CSR SUB‑ROUTERS 🗺️ (they're all behind CSRF now).
//    Media, modules, pages, server, share, translation, unified-settings,
//    user, widgets, admin‑SSR, core‑settings… we got you covered, safe & sound.
// ─────────────────────────────────────────────────────────────────────────────
const routes = {
  '/media':            require('./media'),
  '/modules':          require('./modules'),
  '/pages':            require('./pages'),
  '/server':           require('./server'),
  '/share':            require('./share'),
  '/translation':      require('./translation'),
  '/unified-settings': require('./unifiedSettings'),
  '/user':             require('./user'),
  '/widgets':          require('./widgets'),
  '/admin':            require('./admin'),       // SSR HTML fragments
  '/core-settings':    require('./coreSettings')
};

// ─────────────────────────────────────────────────────────────────────────────
// 4) DEBUG CHECK: Make sure every mount is a valid router. If not, meltdown time.
// ─────────────────────────────────────────────────────────────────────────────
Object.entries(routes).forEach(([path, routeModule]) => {
  if (typeof routeModule !== 'function') {
    console.error(`[CSR ROUTER DEBUG] 🚨 Invalid router at "${path}"!`);
    throw new Error(`Invalid router at "${path}"`);
  } else {
    console.log(`[CSR ROUTER DEBUG] ✅ Router at "${path}" loaded.`);
    router.use(path, routeModule);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5) EXPORT THE ROUTER
//    Ready to safeguard your admin API routes with the magic of csurf.
// ─────────────────────────────────────────────────────────────────────────────
module.exports = router;
