'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { onceCallback } = require('../../emitters/motherEmitter');

module.exports = {
  initialize({ motherEmitter, isCore }) {
    if (!isCore) {
      console.error('[FONTS MANAGER] Must be loaded as a core module.');
      return;
    }
    if (!motherEmitter) {
      console.error('[FONTS MANAGER] motherEmitter missing');
      return;
    }

    console.log('[FONTS MANAGER] Initializing...');

    if (!global.fontProviders) {
      global.fontProviders = {};
    }

    motherEmitter.on('listFontProviders', (payload, cb) => {
      cb = onceCallback(cb);
      if (!payload || !payload.jwt || payload.moduleName !== 'fontsManager' || payload.moduleType !== 'core') {
        return cb(new Error('[FONTS MANAGER] listFontProviders => invalid payload.'));
      }
      const list = Object.entries(global.fontProviders).map(([name, obj]) => ({
        name,
        description: obj.description || '',
        isEnabled: !!obj.isEnabled
      }));
      cb(null, list);
    });

    motherEmitter.on('setFontProviderEnabled', (payload, cb) => {
      cb = onceCallback(cb);
      if (!payload || payload.moduleName !== 'fontsManager' || payload.moduleType !== 'core') {
        return cb(new Error('[FONTS MANAGER] setFontProviderEnabled => invalid payload.'));
      }
      const { providerName, enabled } = payload;
      if (!providerName || !Object.prototype.hasOwnProperty.call(global.fontProviders, providerName)) {
        return cb(new Error('Provider not found.'));
      }
      global.fontProviders[providerName].isEnabled = !!enabled;
      cb(null, { success: true });
    });

    motherEmitter.on('registerFontProvider', (payload, cb) => {
      cb = onceCallback(cb);
      const secret = process.env.FONTS_MODULE_INTERNAL_SECRET;
      const { skipJWT, moduleType, providerName, description, isEnabled = false, initFunction, fontsModuleSecret } = payload || {};
      if (fontsModuleSecret !== secret) {
        return cb(new Error('Invalid or missing fonts module secret.'));
      }
      if (moduleType !== 'core' || skipJWT !== true || !providerName || typeof initFunction !== 'function') {
        return cb(new Error('Invalid registerFontProvider payload.'));
      }
      const disallowed = ['__proto__','prototype','constructor'];
      if (disallowed.includes(providerName)) {
        return cb(new Error('Invalid provider name.'));
      }
      global.fontProviders[providerName] = { description, isEnabled, initFunction };
      cb(null, true);
    });

    const strategiesPath = path.join(__dirname, 'strategies');
    if (fs.existsSync(strategiesPath)) {
      fs.readdirSync(strategiesPath).filter(f => f.endsWith('.js')).forEach(file => {
        const strategy = require(path.join(strategiesPath, file));
        if (typeof strategy.initialize === 'function') {
          strategy.initialize({ motherEmitter, fontsModuleSecret: process.env.FONTS_MODULE_INTERNAL_SECRET });
          console.log(`[FONTS MANAGER] Loaded provider => ${file}`);
        }
      });
    }

    console.log('[FONTS MANAGER] Initialized.');
  }
};
