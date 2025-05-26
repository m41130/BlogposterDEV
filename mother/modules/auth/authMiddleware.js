/**
 * mother/modules/auth/authMiddleware.js
 *
 * Exports (same names as before, so nothing breaks):
 *   ▸ requireAuthCookie   – for SSR / HTML routes (redirects on 401)
 *   ▸ requireAuthHeader   – for API routes with Bearer token (JSON 401)
 *   ▸ requireAdminRole    – simple role‑check
 *   ▸ requireRole(role)   – parametric role‑check
 *
 * Yes, we save the kingdom with middleware. You’re welcome.
 */

require('dotenv').config();
const { motherEmitter } = require('../../emitters/motherEmitter');

/* ──────────────────────────────────────────────────────────────── *
 *  Helper #1 – centralised token validation so we don’t copy‑paste
 * ──────────────────────────────────────────────────────────────── */
function verifyToken(token, cb) {
  motherEmitter.emit(
    'validateToken',
    {
      jwt            : token,
      moduleName     : 'auth',
      moduleType     : 'core',
      tokenToValidate: token
    },
    cb
  );
}

/* ──────────────────────────────────────────────────────────────── *
 *  Helper #2 – if it quacks like an admin, give it the wildcard
 * ──────────────────────────────────────────────────────────────── */
function attachWildcardIfAdmin(decoded) {
  const isAdmin = decoded.role === 'admin'
               || decoded.roles?.includes('admin');
  if (isAdmin) decoded.permissions = { '*': true };
}

/* ──────────────────────────────────────────────────────────────── *
 *  1) Cookie‑based auth for SSR routes
 *     – No token? → polite redirect to /login
 * ──────────────────────────────────────────────────────────────── */
function requireAuthCookie(req, res, next) {
  const token = req.cookies?.admin_jwt;

  if (!token) {
    const jump =
      `/login?redirectTo=${encodeURIComponent(req.originalUrl)}`;
    return res.redirect(jump);
  }

  verifyToken(token, (err, decoded) => {
    if (err || !decoded) {
      const jump =
        `/login?redirectTo=${encodeURIComponent(req.originalUrl)}`;
      return res.redirect(jump);
    }

    attachWildcardIfAdmin(decoded);
    req.user = decoded;
    next();
  });
}

/* ──────────────────────────────────────────────────────────────── *
 *  2) Header‑based auth for JSON APIs
 *     – Missing / bad token? → 401 JSON
 * ──────────────────────────────────────────────────────────────── */
function requireAuthHeader(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  if (!token)
    return res.status(401).json({ error: 'Unauthorized – no token' });

  verifyToken(token, (err, decoded) => {
    if (err || !decoded)
      return res.status(401).json({ error: 'Unauthorized – invalid token' });

    attachWildcardIfAdmin(decoded);
    req.user = decoded;
    next();
  });
}

/* ──────────────────────────────────────────────────────────────── *
 *  3) Role guards – because sometimes you need a bouncer
 * ──────────────────────────────────────────────────────────────── */
function requireAdminRole(req, res, next) {
  if (!req.user)
    return res.status(401).json({ error: 'Unauthorized – no user' });

  if (!Array.isArray(req.user.roles) || !req.user.roles.includes('admin'))
    return res.status(403).json({ error: 'Forbidden – not an admin' });

  next();
}

function requireRole(desiredRole) {
  return (req, res, next) => {
    if (!req.user)
      return res.status(401).json({ error: 'Unauthorized – no user' });

    if (!Array.isArray(req.user.roles) || !req.user.roles.includes(desiredRole))
      return res
        .status(403)
        .json({ error: `Forbidden – requires role=${desiredRole}` });

    next();
  };
}

/* ──────────────────────────────────────────────────────────────── */
module.exports = {
  requireAuthCookie,
  requireAuthHeader,
  requireAdminRole,
  requireRole,
};
