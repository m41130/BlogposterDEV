/**
 * modules/importer/index.js
 *
 * Loads importer mappings from ./importers and exposes them via meltdown events.
 * Importers can handle WordPress, HTML themes, and more.
 */
const fs = require('fs');
const path = require('path');
const { onceCallback } = require('../../mother/emitters/motherEmitter');

function loadImporters(dir) {
  const map = {};
  if (!fs.existsSync(dir)) return map;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.js')) continue;
    try {
      const imp = require(path.join(dir, file));
      if (imp && imp.name && typeof imp.import === 'function') {
        map[imp.name] = imp;
      }
    } catch (e) {
      console.error(`[IMPORTER] Failed to load ${file}:`, e.message);
    }
  }
  return map;
}

module.exports = {
  async initialize({ motherEmitter }) {
    if (!motherEmitter) {
      console.error('[IMPORTER] motherEmitter missing');
      return;
    }
    console.log('[IMPORTER] Initializing...');

    const baseDir = path.join(__dirname, 'importers');
    const importers = loadImporters(baseDir);

    motherEmitter.on('listImporters', (payload, cb) => {
      cb = onceCallback(cb);
      if (!payload || payload.moduleName !== 'importer') {
        return cb(new Error('[importer] invalid payload'));
      }
      cb(null, Object.keys(importers));
    });

    motherEmitter.on('runImport', async (payload, cb) => {
      cb = onceCallback(cb);
      const { importerName, options = {} } = payload || {};
      const importer = importers[importerName];
      if (!importer) {
        return cb(new Error(`Unknown importer: ${importerName}`));
      }
      try {
        const result = await importer.import(options);
        cb(null, result);
      } catch (e) {
        cb(e);
      }
    });

    console.log('[IMPORTER] Ready.');
  }
};
