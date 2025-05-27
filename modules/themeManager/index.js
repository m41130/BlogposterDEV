/**
 * modules/themeManager/index.js
 *
 * Enumerates themes from public/themes and exposes them via meltdown events.
 */
const fs = require('fs');
const path = require('path');
const { onceCallback } = require('../../mother/emitters/motherEmitter');

function readThemeMeta(dir) {
  const themeDir = path.join(__dirname, '../../public/themes', dir);
  const meta = { name: dir };
  const jsonPath = path.join(themeDir, 'theme.json');
  if (fs.existsSync(jsonPath)) {
    try {
      Object.assign(meta, JSON.parse(fs.readFileSync(jsonPath, 'utf8')));
    } catch (e) {
      console.error(`[THEME MANAGER] Failed to read ${jsonPath}:`, e.message);
    }
  }
  return meta;
}

function listThemes() {
  const themesBase = path.join(__dirname, '../../public/themes');
  if (!fs.existsSync(themesBase)) return [];
  return fs.readdirSync(themesBase, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => readThemeMeta(d.name));
}

module.exports = {
  async initialize({ motherEmitter }) {
    if (!motherEmitter) {
      console.error('[THEME MANAGER] motherEmitter missing');
      return;
    }
    console.log('[THEME MANAGER] Initializing...');

    motherEmitter.on('listThemes', (payload, cb) => {
      cb = onceCallback(cb);
      if (!payload || payload.moduleName !== 'themeManager') {
        return cb(new Error('[themeManager] invalid payload'));
      }
      try {
        const themes = listThemes();
        cb(null, themes);
      } catch (e) {
        cb(e);
      }
    });

    console.log('[THEME MANAGER] Ready.');
  }
};
