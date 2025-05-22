/**
 * mother/modules/notificationManager/integrations/fileLog.js
 *
 * Simple integration that logs notifications to a file. Acts as a safe default
 * so that important events are persisted even without external services.
 */
const fs = require('fs');
const path = require('path');

module.exports = {
  integrationName: 'FileLog',

  initialize: async (config = {}) => {
    const logPath = config.logPath || path.join(__dirname, '..', 'server.log');
    return {
      notify: async ({ moduleName = 'unknown', message = '', priority = 'info', timestamp }) => {
        const line = `[${priority.toUpperCase()}] ${timestamp} | Module: ${moduleName} | ${message}\n`;
        try {
          fs.appendFileSync(logPath, line, 'utf8');
        } catch (err) {
          console.error('[FileLog Integration] Failed to write to log =>', err.message);
        }
      }
    };
  }
};
