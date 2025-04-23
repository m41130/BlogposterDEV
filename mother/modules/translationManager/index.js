/**
 * mother/modules/translationManager/index.js
 *
 * 1) Possibly ensures DB schema/tables via 'initTranslationTables'
 * 2) Registers meltdown events for:
 *    - createTranslatedText
 *    - getTranslatedText
 *    - updateTranslatedText
 *    - deleteTranslatedText
 *    - addLanguage
 *    - etc.
 */

const { initTranslationTables } = require('./dbInit');
const { setupTranslationCrudEvents } = require('./translationCrudEvents');

module.exports = {
  async initialize({ motherEmitter, isCore, jwt }) {
    if (!isCore) {
      console.error('[TRANSLATION MANAGER] Must be core module => aborting...');
      return;
    }
    if (!jwt) {
      console.error('[TRANSLATION MANAGER] No JWT provided => aborting...');
      return;
    }

    console.log('[TRANSLATION MANAGER] Initializing...');

    // 1) Optionally ensure DB schema
    await initTranslationTables(motherEmitter, jwt);

    // 2) Setup meltdown events
    setupTranslationCrudEvents(motherEmitter, jwt);

    console.log('[TRANSLATION MANAGER] Initialized successfully.');
  }
};
