/**
 * mother/modules/unifiedSettings/index.js
 *
 * Main entry for the "unifiedSettings" system.
 * It initializes the registry service, sets up meltdown events, and (optionally)
 * exports an Express router for /admin/settings.
 */

const { initSettingsRegistry } = require('./settingsRegistryService');

module.exports = {
  /**
   * initialize:
   *   Called by mother/index.js (or a similar loader) when loading core modules.
   *   Sets up meltdown events & optionally an admin router.
   */
  async initialize({ motherEmitter, app, isCore, jwt }) {
    if (!isCore) {
      console.error('[UNIFIED SETTINGS] Must be loaded as a core module.');
      return;
    }
    if (!jwt) {
      console.error('[UNIFIED SETTINGS] No JWT provided, cannot proceed.');
      return;
    }

    console.log('[UNIFIED SETTINGS] Initializing the Unified Settings module...');

    // 1) Set up meltdown event listeners for this module
    initSettingsRegistry(motherEmitter);

    // 2) Optionally, if you have an admin router for /admin/settings, mount it:
    //    app.use('/admin/settings', settingsRouter);

    console.log('[UNIFIED SETTINGS] Module initialized successfully.');
  }
};
