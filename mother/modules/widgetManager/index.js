require('dotenv').config();

module.exports = {
  async initialize({ motherEmitter, isCore, jwt, nonce }) {
    // 1) Check if core module?
    if (!isCore) {
      console.error('[WIDGET MANAGER] Must be loaded as core module.');
      return;
    }
    // 2) JWT vorhanden?
    if (!jwt) {
      console.error('[WIDGET MANAGER] No JWT provided, cannot proceed.');
      return;
    }

    console.log('[WIDGET MANAGER] Initializing...');

    try {
      // DB/Tabelle anlegen per meltdown (analog zu pagesManager)
      await ensureWidgetDatabase(motherEmitter, jwt, nonce);

      // meltdown-Events registrieren
      setupWidgetManagerEvents(motherEmitter);

      console.log('[WIDGET MANAGER] Initialized successfully.');
    } catch (err) {
      console.error('[WIDGET MANAGER] Error =>', err.message);
    }
  }
};

/**
 * ensureWidgetDatabase:
 *   Erzeugt (falls nötig) die DB/Table "widgets".
 */
async function ensureWidgetDatabase(motherEmitter, jwt, nonce) {
  return new Promise((resolve, reject) => {
    console.log('[WIDGET SERVICE] Ensuring widget DB/Schema...');
    // Meldown => dbUpdate => rawSQL: 'INIT_WIDGETS_TABLE'
    motherEmitter.emit(
      'dbUpdate',
      {
        jwt,
        moduleName: 'widgetManager',
        moduleType: 'core',
        nonce,
        table: '__rawSQL__',
        data: { rawSQL: 'INIT_WIDGETS_TABLE' }
      },
      (err) => {
        if (err) {
          console.error('[WIDGET SERVICE] Table creation failed:', err.message);
          return reject(err);
        }
        console.log('[WIDGET SERVICE] Table "widgets" ensured/created.');
        resolve();
      }
    );
  });
}

/**
 * setupWidgetManagerEvents:
 *   Registriert meltdown-Events: createWidget, getWidgets, updateWidget, deleteWidget
 */
function setupWidgetManagerEvents(motherEmitter) {
  console.log('[WIDGET MANAGER] Setting up meltdown events...');

  // CREATE WIDGET
  motherEmitter.on('createWidget', (payload, callback) => {
    try {
      const {
        jwt,
        widgetId,
        widgetType,
        label,
        content,
        category
      } = payload || {};

      if (!jwt || !widgetId || !widgetType || !content) {
        return callback(new Error('[WM] createWidget => invalid payload.'));
      }

      motherEmitter.emit(
        'dbInsert',
        {
          jwt,
          moduleName: 'widgetManager',
          moduleType: 'core',
          table: 'widgets',
          data: {
            widgetId,
            widgetType,
            label     : label || '',
            content   : content || '',
            category  : category || '',
            createdAt : new Date()
          }
        },
        callback
      );
    } catch (err) {
      callback(err);
    }
  });

  // GET WIDGETS
  motherEmitter.on('getWidgets', (payload, callback) => {
    try {
      const { jwt, widgetType } = payload || {};
      if (!jwt) {
        return callback(new Error('[WM] getWidgets => No JWT provided.'));
      }
      // widgetType ist optional → kann man filtern, muss man aber nicht
      const filter = widgetType ? { widgetType } : {};

      motherEmitter.emit(
        'dbSelect',
        {
          jwt,
          moduleName: 'widgetManager',
          moduleType: 'core',
          table: 'widgets',
          data: filter
        },
        callback
      );
    } catch (err) {
      callback(err);
    }
  });

  // UPDATE WIDGET
  motherEmitter.on('updateWidget', (payload, callback) => {
    try {
      const {
        jwt,
        widgetId,
        widgetType,
        newLabel,
        newContent,
        newCategory
      } = payload || {};

      if (!jwt || !widgetId || !widgetType) {
        return callback(new Error('[WM] updateWidget => missing widgetId or widgetType.'));
      }

      motherEmitter.emit(
        'dbUpdate',
        {
          jwt,
          moduleName: 'widgetManager',
          moduleType: 'core',
          table: '__rawSQL__', // rawSQL => 'UPDATE_WIDGET'
          data: {
            rawSQL: 'UPDATE_WIDGET',
            widgetId,
            widgetType,
            newLabel,
            newContent,
            newCategory
          }
        },
        callback
      );
    } catch (err) {
      callback(err);
    }
  });

  // DELETE WIDGET
  motherEmitter.on('deleteWidget', (payload, callback) => {
    try {
      const {
        jwt,
        widgetId,
        widgetType
      } = payload || {};

      if (!jwt || !widgetId || !widgetType) {
        return callback(new Error('[WM] deleteWidget => missing widgetId or widgetType.'));
      }

      motherEmitter.emit(
        'dbDelete',
        {
          jwt,
          moduleName: 'widgetManager',
          moduleType: 'core',
          table: '__rawSQL__', // rawSQL => 'DELETE_WIDGET'
          where: {
            rawSQL: 'DELETE_WIDGET',
            widgetId,
            widgetType
          }
        },
        callback
      );
    } catch (err) {
      callback(err);
    }
  });
}
