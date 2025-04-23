/**
 * mother/routes/public/index.js
 *
 * Public JSON router that serves pages to your Alpine / Vue / React frontend
 * and leaves the admin area untouched.
 *
 * Routes:
 * • GET /            → start page (`is_start = true`)
 * • GET /foo-bar     → page by slug "foo-bar"
 * • /admin/**        → ignored (passed on to CSR router)
 *
 * Notes:
 * - Language is set explicitly to "en".
 */

const express = require('express');
const router  = express.Router();
const { motherEmitter } = require('../../emitters/motherEmitter');

// Middleware to check if the request is coming from a public route
router.get('*', (req, res, next) => {
  console.log(`[PUBLIC ROUTER DEBUG] Requested slug: "${req.path}"`);
  next();
});

/* ──────────────────────────────────────────────────────────────── *
 * Optional request logger – activate with DEBUG_PUBLIC_ROUTES=1
 * ──────────────────────────────────────────────────────────────── */
router.all('*', (req, _res, next) => {
  if (process.env.DEBUG_PUBLIC_ROUTES === '1') {
    console.log('[PUBLIC] %s %s', req.method, req.originalUrl);
  }
  next();
});

/* ──────────────────────────────────────────────────────────────── *
 * Catch-all GET route – everything not matching /admin/** lands here
 * ──────────────────────────────────────────────────────────────── */
router.get('*', (req, res, next) => {
  console.log('[DEBUG] Entered catch-all GET route');
  
  /* Extract slug by stripping leading slash: "/" → "" */
  const slug = req.path.substring(1);
  console.log('[DEBUG] Extracted slug:', slug);

  /* Ignore admin backend routes */
  if (slug.toLowerCase().startsWith('admin')) {
    console.log('[DEBUG] Ignoring admin route');
    return next(); // Hand over to CSR router
  }

  /* Fetch public token from global setup (required) */
  const pagesPublicToken = global.pagesPublicToken;
  console.log('[DEBUG] Public token:', pagesPublicToken);

  if (!pagesPublicToken) {
    console.error('[DEBUG] Public token is missing');
    return res.status(500).json({ error: 'Server mis-config: public token missing' });
  }

  /* Choose SQL placeholder based on requested path */
  const isStartRequest = slug === '';
  const rawSQLName = isStartRequest ? 'GET_START_PAGE' : 'GET_PAGE_BY_SLUG';
  console.log('[DEBUG] rawSQLName:', rawSQLName);

  /* Explicitly set language to "en" for consistency */
  const dataObj = isStartRequest
    ? { rawSQL: rawSQLName, 0: 'en' }
    : { rawSQL: rawSQLName, 0: slug, 1: 'en' };
  console.log('[DEBUG] Data object for DB query:', dataObj);

  /* Emit dbSelect event to query page data */
  motherEmitter.emit(
    'dbSelect',
    {
      jwt: pagesPublicToken,
      moduleName: 'pagesManager',
      moduleType: 'core',
      table: '__rawSQL__',
      data: dataObj
    },
    (err, rows) => {
      console.log('[DEBUG] dbSelect callback triggered');
      
      if (err) {
        console.error('[PUBLIC ROUTES] DB error:', err.message);
        return res.status(500).json({ error: 'DB error' });
      }

      console.log('[DEBUG] DB query result rows:', rows);

      const page = rows?.[0];
      console.log('[DEBUG] Extracted page:', page);

      /* Return 404 if page is not found */
      if (!page) {
        console.warn('[DEBUG] Page not found');
        return res.status(404).json({ error: 'Page not found' });
      }

      console.log('[DEBUG] Page found:', page);
      
      /* Return the page wrapped inside an object */
      res.json({ page });
    }
  );
});

module.exports = router;
