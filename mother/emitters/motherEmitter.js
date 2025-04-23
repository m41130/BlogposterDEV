/**
 * mother/emitters/motherEmitter.js
 *
 * The central meltdown event emitter that applies:
 *   - Public events (no JWT required)
 *   - skipJWT logic for certain 'auth' events
 *   - JWT validation for recognized "core" modules (or "community" for others)
 *   - meltdownSystem if any critical error occurs for a core module
 *   - Deactivation for community modules if invalid usage
 *   - onceCallback to ensure meltdown callbacks only fire once
 *   - Replaces 'jwt' in logs with '<JWT-REDACTED>'
 *   - Optionally sends critical meltdown notifications via notificationEmitter
 */

require('dotenv').config();
const EventEmitter = require('events');
const jwt = require('jsonwebtoken');

// We'll import notificationEmitter so we can send a "critical meltdown" alert
const notificationEmitter = require('./notificationEmitter');

/** Base JWT secret (from .env or fallback) */
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

/** Additional salts for trust levels (e.g. TOKEN_SALT_HIGH, etc.) */
const TOKEN_SALT_HIGH   = process.env.TOKEN_SALT_HIGH   || '';
const TOKEN_SALT_MEDIUM = process.env.TOKEN_SALT_MEDIUM || '';
const TOKEN_SALT_LOW    = process.env.TOKEN_SALT_LOW    || '';

/** Auth module internal secret => used only by skipJWT meltdown calls (like issueModuleToken). */
const AUTH_MODULE_SECRET = process.env.AUTH_MODULE_INTERNAL_SECRET || '';

/**
 * PUBLIC_EVENTS => meltdown checks are skipped entirely.
 * e.g. 'removeListenersByModule', 'deactivateModule' => no "No JWT" logs.
 */
const PUBLIC_EVENTS = [
  'issuePublicToken',
  'removeListenersByModule',
  'deactivateModule'
];

/**
 * skipJWT events that are allowed only if moduleName='auth' AND matching authModuleSecret.
 */
const ALLOWED_SKIPJWT_EVENTS = [
  'issueUserToken',
  'issueModuleToken',
  'registerLoginStrategy'
];

/**
 * onceCallback(cb):
 * Ensures that `cb` is only called once, to prevent meltdown recursion.
 */
function onceCallback(originalCb) {
  let hasFired = false;
  return (...args) => {
    if (hasFired) return;
    hasFired = true;

    if (typeof originalCb === 'function') {
      originalCb(...args);
    } else {
      console.warn('[MotherEmitter] WARNING: No valid callback provided to meltdown event.');
      console.warn('[MotherEmitter] Potential missing second parameter in meltdown usage. Arguments =>', args);
    }
  };
}

/**
 * MotherEmitter class with meltdown logic in the overridden emit()
 */
class MotherEmitter extends EventEmitter {
  constructor() {
    super();
    console.log('[MotherEmitter] Initialized motherEmitter instance.');

    // A map that decides if a module is "core" or "community" => used in meltdown checks
    this._moduleTypes = Object.create(null);
  }

  /**
   * registerModuleType(moduleName, 'core'|'community'):
   *   Called from moduleLoader or main server
   */
  registerModuleType(moduleName, type) {
    this._moduleTypes[moduleName] = type;
    console.log(`[MotherEmitter] Registered module "${moduleName}" => type="${type}"`);
  }

  /**
   * meltdownSystem(reason, moduleName):
   *   Called when a critical meltdown occurs in a core module.
   *   Logs an error, emits 'criticalError', and also sends a "critical meltdown" notification.
   */
  meltdownSystem(reason, moduleName) {
    console.error(`[MotherEmitter] CRITICAL ERROR => ${reason} (Module: ${moduleName || 'unknown'})`);

    // Optionally dispatch a notification about this meltdown
    notificationEmitter.notify({
      moduleName: 'motherEmitter',
      notificationType: 'system',
      priority: 'critical',
      message: `CRITICAL meltdown from core module='${moduleName}' => ${reason}`
    });

    this.emit('criticalError', {
      moduleName: moduleName || 'unknown',
      errorCode: 'CORE_JWT_ERROR',
      message: reason,
      severity: 'critical',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * combineSecretWithSalt:
   *   Merges JWT_SECRET with a salt for trustLevel (high/medium/low).
   */
  combineSecretWithSalt(baseSecret, trustLevel) {
    switch ((trustLevel || '').toLowerCase()) {
      case 'high':   return baseSecret + TOKEN_SALT_HIGH;
      case 'medium': return baseSecret + TOKEN_SALT_MEDIUM;
      default:       return baseSecret + TOKEN_SALT_LOW;
    }
  }

  /**
   * Overridden emit() applying meltdown checks
   */
  emit(eventName, ...args) {

    // (1) If eventName==='criticalError' => skip meltdown checks
    if (eventName === 'criticalError') {
      console.log('[MotherEmitter] Skipping meltdown checks for "criticalError" event.');
      return super.emit(eventName, ...args);
    }

    // (2) Preliminary check => if firstArg missing or no moduleName => ignore
    const firstArg = args[0];
    if (!firstArg || typeof firstArg !== 'object' || !firstArg.moduleName) {
      console.warn(`[MotherEmitter] WARNING: Event "${eventName}" emitted with invalid or missing payload.moduleName. Ignoring event.`);
      return false;
    }

    // (3) If no listeners => just warn
    if (!this.listenerCount(eventName)) {
      console.warn(`[MotherEmitter] WARNING: No listeners for event="${eventName}".`);
      return false;
    }

    // meltdown payload
    const moduleName        = firstArg.moduleName;
    const providedJwt       = firstArg.jwt;
    const providedSecret    = firstArg.authModuleSecret || '';
    const isExternalRequest = !!firstArg.isExternalRequest;

    // (4) If event is in PUBLIC_EVENTS => skip meltdown checks
    if (PUBLIC_EVENTS.includes(eventName)) {
      console.log(`[MotherEmitter] Public event => skipping meltdown checks for "${eventName}"`);
      console.log(`[MotherEmitter] Emitting: "${eventName}" =>`, maskJwtInArgs(args));
      return super.emit(eventName, ...args);
    }

    // (5) Distinguish 'core' vs. 'community'
    const forcedType = this._moduleTypes[moduleName] || 'community';
    const isCoreModule = (forcedType === 'core');

    // (6) skipJWT logic
    if (firstArg.skipJWT) {
      // Only valid if (moduleName==='auth' && event in ALLOWED_SKIPJWT_EVENTS)
      if (moduleName === 'auth' && ALLOWED_SKIPJWT_EVENTS.includes(eventName)) {
        if (providedSecret !== AUTH_MODULE_SECRET) {
          const reason = `Invalid authModuleSecret for skipJWT event="${eventName}" (module='auth')`;
          if (isCoreModule && !isExternalRequest) {
            this.meltdownSystem(reason, moduleName);
          } else {
            console.warn(`[MotherEmitter] WARNING: ${reason} => forcing deactivateModule("${moduleName}")`);
            super.emit('deactivateModule', { moduleName, reason });
          }
          return false;
        }
        console.log(`[MotherEmitter] skipJWT => authorized for event="${eventName}". Normal emit.`);
        return super.emit(eventName, ...args);
      } else {
        // skipJWT used incorrectly
        const reason = `Unauthorized skipJWT usage => event="${eventName}" by module="${moduleName}"`;
        if (isCoreModule && !isExternalRequest) {
          this.meltdownSystem(reason, moduleName);
        } else {
          console.warn(`[MotherEmitter] WARNING: ${reason} => deactivating module="${moduleName}"`);
          super.emit('deactivateModule', { moduleName, reason });
        }
        return false;
      }
    }

    // (7) If no skipJWT => require a valid JWT if it's a core module
    if (!providedJwt) {
      if (isCoreModule && !isExternalRequest) {
        this.meltdownSystem(`Core event "${eventName}" has no JWT`, moduleName);
      } else {
        // community => just "deactivateModule"
        console.warn(`[MotherEmitter] WARNING: No JWT for "${eventName}". Deactivating the module.`);
        super.emit('deactivateModule', {
          moduleName,
          reason: `Missing JWT for "${eventName}"`
        });
      }
      return false;
    }

    // (8) decode the provided JWT
    let decodedUnverified;
    try {
      decodedUnverified = jwt.decode(providedJwt) || {};
    } catch (decodeErr) {
      const reason = `Could not decode token => ${decodeErr.message}`;
      if (isCoreModule && !isExternalRequest) {
        this.meltdownSystem(reason, moduleName);
      } else {
        console.warn(`[MotherEmitter] WARNING: ${reason}. Deactivating module.`);
        super.emit('deactivateModule', { moduleName, reason });
      }
      return false;
    }

    // fallback trustLevel
    if (!decodedUnverified.trustLevel) {
      decodedUnverified.trustLevel = 'low';
    }

    // (9) verify the JWT
    const finalSecret = this.combineSecretWithSalt(JWT_SECRET, decodedUnverified.trustLevel);
    try {
      firstArg.decodedJWT = jwt.verify(providedJwt, finalSecret);
    } catch (verifyErr) {
      const reason = `Invalid JWT => ${verifyErr.message}`;
      if (isCoreModule && !isExternalRequest) {
        this.meltdownSystem(reason, moduleName);
      } else {
        console.warn(`[MotherEmitter] WARNING: ${reason}. Deactivating module.`);
        super.emit('deactivateModule', { moduleName, reason });
      }
      return false;
    }

    // (10) If all checks pass => normal emit
    const maskedArgs = maskJwtInArgs(args);
    console.log(`[MotherEmitter] Emitting event="${eventName}" =>`, maskedArgs);
    return super.emit(eventName, ...args);
  }
}

// The main motherEmitter instance
const motherEmitter = new MotherEmitter();

/**
 * removeListenersByModule: a public event => meltdown checks are skipped
 */
motherEmitter.on('removeListenersByModule', (payload) => {
  const moduleName = (typeof payload === 'string') ? payload : payload?.moduleName;
  if (!moduleName) {
    console.warn('[MotherEmitter] removeListenersByModule => missing moduleName in payload.');
    return;
  }
  console.warn(`[MotherEmitter] Removing all event listeners for broken module => ${moduleName}`);

  motherEmitter.eventNames().forEach(eventName => {
    motherEmitter.listeners(eventName).forEach(listener => {
      if (listener.moduleName === moduleName) {
        motherEmitter.removeListener(eventName, listener);
        console.warn(`[MotherEmitter] Removed listener from event="${eventName}" for module="${moduleName}"`);
      }
    });
  });
});

/**
 * deactivateModule => also a public event => meltdown checks are skipped
 */
motherEmitter.on('deactivateModule', (payload) => {
  const { moduleName, reason } = payload || {};
  console.warn(`[MotherEmitter] Deactivating module "${moduleName}" => ${reason}`);

  // remove any listeners for that module
  motherEmitter.emit('removeListenersByModule', { moduleName });
});

/**
 * maskJwtInArgs(args): replaces any .jwt in meltdown payload with "<JWT-REDACTED>"
 */
function maskJwtInArgs(args) {
  try {
    return args.map(arg => {
      if (arg && typeof arg === 'object') {
        const clone = { ...arg };
        if (clone.jwt) {
          clone.jwt = '<JWT-REDACTED>';
        }
        return clone;
      }
      return arg;
    });
  } catch {
    return args;
  }
}

module.exports = {
  motherEmitter,
  onceCallback
};
