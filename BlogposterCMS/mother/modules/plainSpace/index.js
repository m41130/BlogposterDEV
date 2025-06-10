// mother/modules/plainSpace/index.js
// This is our proud aggregator of meltdown madness.

require('dotenv').config();

const {
  seedAdminPages,
  checkOrCreateWidget,
  registerPlainSpaceEvents,
  MODULE,
  PUBLIC_LANE,
  ADMIN_LANE
} = require('./plainSpaceService');

const { ADMIN_PAGES }       = require('./config/adminPages');
const { DEFAULT_WIDGETS }   = require('./config/defaultWidgets');
const { getSetting, setSetting } = require('./settingHelpers');
const { onceCallback }      = require('../../emitters/motherEmitter');

module.exports = {
  async initialize({ motherEmitter, isCore, jwt }) {
    if (!isCore) {
      console.warn('[plainSpace] isCore=false – continuing, but this is unexpected.');
    }
    if (!jwt) {
      console.error('[plainSpace] No JWT => meltdown DB calls not possible. Aborting.');
      return;
    }

    console.log('[plainSpace] Initializing...');

    try {
      // 1) Check if PLAINSPACE_SEEDED is already 'true'
      const seededVal = await getSetting(motherEmitter, jwt, 'PLAINSPACE_SEEDED');
      if (seededVal === 'true') {
        console.log('[plainSpace] Already seeded (PLAINSPACE_SEEDED=true). Checking for missing admin pages...');
        if (isCore && jwt) {
          await seedAdminPages(motherEmitter, jwt, ADMIN_PAGES);
        }
      } else {
        console.log('[plainSpace] Not seeded => running seed steps...');

        // A) Seed admin pages, if they’re not found
        if (isCore && jwt) {
          await seedAdminPages(motherEmitter, jwt, ADMIN_PAGES);
        }

        // B) Seed default widgets
        for (const widgetData of DEFAULT_WIDGETS) {
          await checkOrCreateWidget(motherEmitter, jwt, widgetData);
        }
        console.log('[plainSpace] Admin pages & widgets have been seeded.');

        // C) Mark as seeded
        await setSetting(motherEmitter, jwt, 'PLAINSPACE_SEEDED', 'true');
        console.log('[plainSpace] Set "PLAINSPACE_SEEDED"=true => no more seeds next time.');
      }

      // 2) Register meltdown events for multi-viewport layouts
      registerPlainSpaceEvents(motherEmitter);

      // 3) Issue a public token for front-end usage (why not?)
      motherEmitter.emit(
        'issuePublicToken',
        { purpose: 'plainspacePublic', moduleName: 'auth' },
        (err, token) => {
          if (err || !token) {
            console.error('[plainSpace] Could not issue publicToken =>', err?.message);
          } else {
            global.plainspacePublicToken = token;
            console.log('[plainSpace] Public token for multi-viewport usage is ready ✔');
          }
        }
      );

      // 4) Ensure DB table for storing layouts (if that’s a separate table)
      motherEmitter.emit(
        'dbUpdate',
        {
          jwt,
          moduleName: MODULE,
          moduleType: 'core',
          table: '__rawSQL__',
          data: { rawSQL: 'INIT_PLAINSPACE_LAYOUTS' }
        },
        (err) => {
          if (err) {
            console.error('[plainSpace] Could not create "plainspace.layouts" table:', err.message);
          } else {
            console.log('[plainSpace] "plainspace.layouts" table creation ensured.');
          }
        }
      );

      // 4b) Ensure DB table for layout templates
      motherEmitter.emit(
        'dbUpdate',
        {
          jwt,
          moduleName: MODULE,
          moduleType: 'core',
          table: '__rawSQL__',
          data: { rawSQL: 'INIT_PLAINSPACE_LAYOUT_TEMPLATES' }
        },
        (err) => {
          if (err) {
            console.error('[plainSpace] Could not create "plainspace.layout_templates" table:', err.message);
          } else {
            console.log('[plainSpace] "plainspace.layout_templates" table creation ensured.');
          }
        }
      );

      // 4c) Ensure DB table for widget instance content
      motherEmitter.emit(
        'dbUpdate',
        {
          jwt,
          moduleName: MODULE,
          moduleType: 'core',
          table: '__rawSQL__',
          data: { rawSQL: 'INIT_PLAINSPACE_WIDGET_INSTANCES' }
        },
        (err) => {
          if (err) {
            console.error('[plainSpace] Could not create "plainspace.widget_instances" table:', err.message);
          } else {
            console.log('[plainSpace] "plainspace.widget_instances" table creation ensured.');
          }
        }
      );

      // 5) Listen for widget registry requests
      // widget.registry.request.v1 handler (plainSpace)
      motherEmitter.on('widget.registry.request.v1', (payload, callback) => {
        const { jwt, lane } = payload || {};

        // Validate lane (must be either public or admin)
        if (!['public', 'admin'].includes(lane)) {
          return callback(null, { widgets: [] });
        }

        // Forward the request to widgetManager
        motherEmitter.emit('getWidgets', {
          jwt,
          moduleName: 'widgetManager',
          moduleType: 'core',
          widgetType: lane
        }, (err, widgetRows = []) => {
          if (err) {
            console.error(`[plainSpace] Error fetching widgets from widgetManager: ${err.message}`);
            return callback(null, { widgets: [] }); // graceful degradation
          }

          // Map DB widget rows into frontend-friendly format
          const formattedWidgets = widgetRows.map(row => ({
            id: row.widgetId,           // ID from widgetManager
            lane,
            codeUrl: row.content,       // Path to widget JS file
            checksum: '',               // Optional, currently unused
            metadata: {
              label: row.label,
              category: row.category
            }
          }));

          // Send the formatted widget array to frontend
          callback(null, { widgets: formattedWidgets });
        });
      });


      console.log('[plainSpace] Initialization complete!');
    } catch (err) {
      console.error('[plainSpace] Initialization error:', err.message);
    }
  }
};
