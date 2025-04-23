/**
 * mother/routes/auth.js
 * ────────────────────────────────────────────────────────────────
 * A tiny JSON‑only auth router that cooperates with meltdown‑event bus
 * (because the meltdown bus demands cooperation… or else).
 *
 * Endpoints:
 *   ▸ GET  /admin/api/auth/config     → Can visitors register?
 *   ▸ POST /admin/api/auth/login      → Username/password login
 *   ▸ POST /admin/api/auth/register   → First‑user bootstrap + optional signup
 *   ▸ GET  /admin/api/auth/logout     → Nuke the session cookie
 *
 * **Note:** We rely on csurf being applied globally in `mother/routes/csr/index.js`.
 * So, if you call `req.csrfToken()` here, you'd better be sure you’re behind that unicorn.
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { rate } = require('../../../config/security');
const { motherEmitter } = require('../../emitters/motherEmitter');
const router = express.Router();

// ──────────────────────────────────────────────────────────────────────────
// Reuse the same rate‑limit settings from config/security.js
// Because if we typed them here manually, we'd inevitably forget them later.
// ──────────────────────────────────────────────────────────────────────────
const loginCfg = rate.login ?? {
  windowMs: 15 * 60 * 1000,
  max: 5
};

// ──────────────────────────────────────────────────────────────────────────
// helper – get a HIGH‑trust module token for userManagement
// because “I trust issues” (but you still gotta trust something).
// ──────────────────────────────────────────────────────────────────────────
function getModuleToken(publicJwt, cb) {
  motherEmitter.emit(
    'issueModuleToken',
    {
      jwt: publicJwt,
      moduleName: 'userManagement',
      moduleType: 'core',
      forModule: 'auth'
    },
    (err, highTok) => cb(err, highTok || publicJwt)
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 0) CONFIG – GET /admin/api/auth/config
//    Mint & return a fresh CSRF token + registration info
// ──────────────────────────────────────────────────────────────────────────
router.get('/config', (req, res) => {
  // 1) Mint CSRF token (assuming the csurf middleware actually got here first).
  const token = req.csrfToken();

  // 2) Send it in a non‑httpOnly cookie so the SPA can read it
  res.cookie('blog_csrf', token, {
    httpOnly: false,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production'
  });

  // 3) Issue a public JWT and gather registration settings
  motherEmitter.emit(
    'issuePublicToken',
    { purpose: 'authConfig', moduleName: 'auth' },
    (errPub, publicToken) => {
      if (errPub) {
        return res.json({
          success: false,
          allowRegistration: false,
          availableStrategies: []
        });
      }

      motherEmitter.emit(
        'getUserCount',
        { jwt: publicToken, moduleName: 'userManagement', moduleType: 'core' },
        (errCount, userCount = 0) => {
          if (errCount) {
            return res.json({
              success: false,
              allowRegistration: false,
              availableStrategies: []
            });
          }

          motherEmitter.emit(
            'getSetting',
            {
              jwt: publicToken,
              moduleName: 'settingsManager',
              moduleType: 'core',
              key: 'ALLOW_REGISTRATION'
            },
            (_errSet, settingValue) => {
              const allow =
                userCount === 0 || settingValue === 'true';
              const available = Object.entries(global.loginStrategies || {})
                .filter(([_, strat]) => strat.isEnabled)
                .map(([name]) => name);

              res.json({
                success: true,
                allowRegistration: allow,
                availableStrategies: available
              });
            }
          );
        }
      );
    }
  );
});

// ──────────────────────────────────────────────────────────────────────────
// 1) LOGIN – POST /admin/api/auth/login
// ──────────────────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: loginCfg.windowMs,
  max: loginCfg.max,
  standardHeaders: true, // Because the year is 2025 and we love standard headers
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts – try again later (you beast).'
  }
});

router.post('/login', loginLimiter, (req, res) => {
  const { username, password, strategy = 'adminLocal' } = req.body || {};

  motherEmitter.emit(
    'issuePublicToken',
    { purpose: 'login', moduleName: 'auth' },
    (errPub, pubJWT) => {
      if (errPub) {
        return res.status(500).json({
          success: false,
          error: errPub.message
        });
      }

      motherEmitter.emit(
        'loginWithStrategy',
        {
          jwt: pubJWT,
          moduleName: 'loginRoute',
          moduleType: 'public',
          strategy,
          payload: { username, password }
        },
        (err, finalUser) => {
          if (err || !finalUser) {
            return res.status(401).json({
              success: false,
              error: err?.message || 'Invalid credentials'
            });
          }

          // …and now, bestow the session cookie upon the user
          res.cookie('admin_jwt', finalUser.jwt, {
            httpOnly: true,
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 2 * 60 * 60 * 1000 // They get 2 hours of bliss
          });
          res.json({ success: true });
        }
      );
    }
  );
});

// ──────────────────────────────────────────────────────────────────────────
// 2) REGISTER – POST /admin/api/auth/register
// ──────────────────────────────────────────────────────────────────────────
router.post('/register', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'username & password required'
    });
  }

  motherEmitter.emit(
    'issuePublicToken',
    { purpose: 'registration', moduleName: 'auth' },
    (ePub, pubTok) => {
      if (ePub) {
        return res.status(500).json({
          success: false,
          error: ePub.message
        });
      }

      getModuleToken(pubTok, (_eMod, modTok) => {
        motherEmitter.emit(
          'getUserCount',
          {
            jwt: pubTok,
            moduleName: 'userManagement',
            moduleType: 'core'
          },
          (eCnt, userCnt = 9999) => {
            motherEmitter.emit(
              'getSetting',
              {
                jwt: pubTok,
                moduleName: 'settingsManager',
                moduleType: 'core',
                key: 'ALLOW_REGISTRATION'
              },
              (_eSet, val) => {
                const allowed =
                  userCnt === 0 || val === 'true';
                if (!allowed) {
                  return res.status(403).json({
                    success: false,
                    error: 'Registration disabled'
                  });
                }

                const role = userCnt === 0 ? 'admin' : 'user';
                motherEmitter.emit(
                  'createUser',
                  {
                    jwt: modTok,
                    moduleName: 'userManagement',
                    moduleType: 'core',
                    username,
                    password,
                    role
                  },
                  (eCreate, newUser) => {
                    if (eCreate) {
                      return res.status(500).json({
                        success: false,
                        error: eCreate.message
                      });
                    }

                    // best‑effort assign role
                    motherEmitter.emit(
                      'assignRoleToUser',
                      {
                        jwt: modTok,
                        moduleName: 'userManagement',
                        moduleType: 'core',
                        userId: newUser.id,
                        roleName: role
                      },
                      () => {
                        /* we tried, so be it */
                      }
                    );

                    // auto‑login the new user
                    motherEmitter.emit(
                      'finalizeUserLogin',
                      {
                        jwt: modTok,
                        moduleName: 'userManagement',
                        moduleType: 'core',
                        userId: newUser.id
                      },
                      (eFin, finObj) => {
                        if (eFin) {
                          return res.status(500).json({
                            success: false,
                            error: eFin.message
                          });
                        }

                        // Slap an admin_jwt cookie on 'em
                        res.cookie('admin_jwt', finObj.jwt, {
                          httpOnly: true,
                          secure: false,
                          maxAge: 24 * 60 * 60 * 1000 // 1 day
                        });
                        res.json({ success: true });
                      }
                    );
                  }
                );
              }
            );
          }
        );
      });
    }
  );
});

// ──────────────────────────────────────────────────────────────────────────
// 3) LOGOUT – GET /admin/api/auth/logout
// ──────────────────────────────────────────────────────────────────────────
router.get('/logout', (_req, res) => {
  // So long, farewell, auf Wiedersehen, goodbye…
  res.clearCookie('admin_jwt');
  res.json({ success: true });
});

module.exports = router;
