/**
 * mother/modules/auth/index.js
 *
 * The main Auth Module:
 *   1) Validates the JWT_SECRET
 *   2) Sets up meltdown events for the Auth Module (issueToken, validateToken, etc.)
 *   3) Dynamically loads & registers login strategies from ./strategies
 *   4) Provides meltdown events to enable/disable or list login strategies
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { motherEmitter, onceCallback } = require('../../emitters/motherEmitter');
const { setupEventListeners } = require('./authService');

module.exports = {
  initialize({ motherEmitter, JWT_SECRET, isCore }) {
    if (!isCore) {
      console.error('[AUTH MODULE] Must be loaded as a core module. No casual usage allowed, sorry.');
      return;
    }
    if (!JWT_SECRET) {
      console.error('[AUTH MODULE] Missing JWT_SECRET, so we can’t sign tokens. Bummer.');
      return;
    }
    const authModuleSecret = process.env.AUTH_MODULE_INTERNAL_SECRET;
    if (!authModuleSecret) {
      console.error('[AUTH MODULE] Missing AUTH_MODULE_INTERNAL_SECRET => cannot proceed securely.');
      return;
    }

    console.log('[AUTH MODULE] Initializing core Auth Module...');
    setupEventListeners({ motherEmitter, JWT_SECRET });

    // A global place to store login strategies
    if (!global.loginStrategies) {
      global.loginStrategies = {};
    }

    // meltdown => listActiveLoginStrategies
    motherEmitter.on('listActiveLoginStrategies', (payload, cb) => {
      const callback = onceCallback(cb);
      if (!payload || !payload.jwt || payload.moduleName !== 'auth' || payload.moduleType !== 'core') {
        return callback(new Error('[AUTH MODULE] listActiveLoginStrategies => invalid meltdown payload.'));
      }
      const activeStrategies = [];
      Object.entries(global.loginStrategies).forEach(([strategyName, strategyObj]) => {
        if (strategyObj.isEnabled) {
          activeStrategies.push({
            name: strategyName,
            description: strategyObj.description || '(No description)'
          });
        }
      });

      callback(null, activeStrategies);
    });

    // meltdown => setLoginStrategyEnabled
    motherEmitter.on('setLoginStrategyEnabled', (payload, cb) => {
      const callback = onceCallback(cb);
      if (!payload || payload.moduleName !== 'auth' || payload.moduleType !== 'core') {
        return callback(new Error('[AUTH MODULE] setLoginStrategyEnabled => invalid meltdown payload.'));
      }
      const { strategyName, enabled } = payload;
      if (!strategyName) {
        return callback(new Error('No strategyName specified.'));
      }
      if (!Object.prototype.hasOwnProperty.call(global.loginStrategies, strategyName)) {
        return callback(new Error(`Strategy "${strategyName}" not found.`));
      }
      global.loginStrategies[strategyName].isEnabled = !!enabled;
      console.log(`[AUTH MODULE] Strategy "${strategyName}" => isEnabled=${enabled}`);
      return callback(null, { success: true });
    });

    // meltdown => registerLoginStrategy
    motherEmitter.on('registerLoginStrategy', (payload, cb) => {
      const callback = onceCallback(cb);
      const {
        skipJWT,
        moduleType,
        strategyName,
        description,
        loginFunction,
        authModuleSecret: providedSecret
      } = payload || {};

      if (providedSecret !== authModuleSecret) {
        return callback(new Error('Invalid or missing auth module secret.'));
      }
      if (moduleType !== 'core' || skipJWT !== true) {
        return callback(new Error('Unauthorized login strategy registration.'));
      }
      if (!strategyName || typeof loginFunction !== 'function') {
        return callback(new Error('Invalid login strategy registration payload.'));
      }
      const disallowed = ['__proto__', 'prototype', 'constructor'];
      if (disallowed.includes(strategyName)) {
        return callback(new Error('Invalid strategy name.'));
      }

      global.loginStrategies[strategyName] = {
        description,
        loginFunction,
        isEnabled: strategyName === 'adminLocal'
      };
      console.log(`[AUTH MODULE] Registered login strategy => ${strategyName}`);
      return callback(null, true);
    });

    // Finally, load all strategy files from ./strategies => e.g. google.js, facebook.js, etc.
    const strategiesPath = path.join(__dirname, 'strategies');
    if (fs.existsSync(strategiesPath)) {
      const strategyFiles = fs.readdirSync(strategiesPath).filter(file => file.endsWith('.js'));
      strategyFiles.forEach(file => {
        const strategy = require(path.join(strategiesPath, file));
        if (typeof strategy.initialize === 'function') {
          strategy.initialize({
            motherEmitter,
            JWT_SECRET,
            authModuleSecret
          });
          console.log(`[AUTH MODULE] Loaded strategy => ${file}`);
        }
      });
    } else {
      console.log('[AUTH MODULE] No additional OAuth strategies folder found.');
    }


// ─────────────────────────────────────────────────────────────
//  PUBLIC + CORE  loginWithStrategy listener
// ─────────────────────────────────────────────────────────────
motherEmitter.on('loginWithStrategy', (raw, cb) => {
  const callback = onceCallback(cb);

  /* unpack meltdown meta + user payload */
  const {
    skipJWT,
    moduleName,
    moduleType,
    decodedJWT,                 //  <-- now captured!
    strategy   = 'adminLocal',
    payload    = {}
  } = raw || {};

  /* allow three legitimate callers */
  const isCoreAuth  = moduleName === 'auth'  && moduleType === 'core';
  const isPublicLogin =
        decodedJWT?.isPublic === true && decodedJWT?.purpose === 'login';

  if (!(skipJWT === true || isCoreAuth || isPublicLogin)) {
    return callback(
      new Error('[AUTH] loginWithStrategy ⇒ invalid payload / not authorized')
    );
  }

  /* look‑up strategy */
  const strat = global.loginStrategies[strategy];
  if (!strat || !strat.isEnabled) {
    return callback(new Error(`Strategy "${strategy}" disabled or unknown`));
  }

  /* safe execute */
  try {
    strat.loginFunction(payload, callback);
  } catch (ex) {
    console.error('[AUTH] Strategy "%s" threw:', strategy, ex);
    callback(ex);
  }
});

    
    console.log('[AUTH MODULE] Core Auth Module initialized successfully.');
  }
};
