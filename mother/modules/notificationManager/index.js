/**
 * mother/modules/notificationManager/index.js
 */
const notificationEmitter = require('../../emitters/notificationEmitter');
const { loadIntegrations } = require('./notificationManagerService');

module.exports = {
  async initialize({ motherEmitter, app, isCore, jwt }) {
    if (!isCore) {
      console.error('[NOTIFICATION MANAGER] Must be loaded as a core module.');
      return;
    }

    console.log('[NOTIFICATION MANAGER] Initializing...');

    // Lade alle Integrationen
    const integrations = await loadIntegrations();

    // NotificationEmitter-Listener => verarbeiten Notifications
    notificationEmitter.on('notify', async (payload) => {
      const { notificationType, priority, message } = payload;
      console.log('[NOTIFICATION MANAGER] Received notification =>', { notificationType, priority });

      // Finde alle aktiven Integrationen
      for (const name of Object.keys(integrations)) {
        const integration = integrations[name];
        if (!integration.active) continue; // nur aktive Integrationen

        try {
          const instance = await integration.module.initialize(integration.config);
          // Sende Notification
          await instance.notify(payload);
        } catch (err) {
          console.error(`[NOTIFICATION MANAGER] Integration "${name}" error =>`, err.message);
        }
      }
    });

    console.log('[NOTIFICATION MANAGER] Ready.');
  }
};
