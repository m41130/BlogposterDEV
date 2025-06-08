/**
 * mother/modules/dummyModule/index.js
 *
 * Ein Minimal-Beispiel, wie ein NO-UI-Modul aufgebaut sein kann.
 * 
 * - Keine Express-Routen, da wir KEIN `app` übergeben.
 * - Nur motherEmitter => DB, Hooks, apiCoreRequest.
 */

'use strict';

module.exports = {
    /**
     * Wird vom moduleLoader aufgerufen:
     *    await dummyModule.initialize({ motherEmitter });
     *
     * Hier darf man:
     *   - Events registrieren
     *   - "apiCoreRequest" aufrufen
     *   - "performDbOperation" / "createDatabase" auslösen
     */
    async initialize({ motherEmitter }) {
      console.log('[DUMMY MODULE] Initializing dummyModule...');
  
      // 1) Beispiel-Hook: pagePublished
      motherEmitter.on('pagePublished', (pageObj) => {
        const safeId = String(pageObj.id).replace(/[\n\r]/g, '');
        const safeTitle = String(pageObj.title || '').replace(/[\n\r]/g, '');
        console.log('[DUMMY MODULE] Detected pagePublished => id=%s title=%s', safeId, safeTitle);
        // => Z.B. wir rufen eine (erfundene) externe API
        // => motherEmitter.emit('apiCoreRequest', { service, action, payload }, cb)
        motherEmitter.emit(
          'apiCoreRequest',
          {
            service: 'dummyService',    // => in apiDefinition.json definiert
            action : 'logPagePublish',  // => "actionName": "logPagePublish"
            payload: { pageId: pageObj.id, title: pageObj.title }
          },
          (err, result) => {
            if (err) {
              console.error('[DUMMY MODULE] dummyService.logPagePublish error: %s', err.message);
            } else {
              console.log('[DUMMY MODULE] dummyService.logPagePublish result: %o', result);
            }
          }
        );
      });
  
      // 2) Beispiel: DB-Operation
      //    Angenommen wir wollen ein "dummy table" anlegen (hier sehr vereinfacht):
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS dummy_dummytable (
          id SERIAL PRIMARY KEY,
          data TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `;
      motherEmitter.emit(
        'performDbOperation',
        {
          moduleName: 'dummyModule',
          moduleType: 'community',
          operation: createTableSQL,
          params: []
        },
        (err) => {
          if (err) {
            console.error('[DUMMY MODULE] Error creating dummy_dummytable: %s', err.message);
          } else {
            console.log('[DUMMY MODULE] dummy_dummytable ensured/created in dummymodule_db.');
          }
        }
      );
  
      // 3) Beispiel: Wir lauschen auf custom-event "dummyAction"
      motherEmitter.on('dummyAction', (payload, callback) => {
        console.log('[DUMMY MODULE] got dummyAction');
        // => Mach irgendwas
        // => z.B. Insert in unsere Dummy-Tabelle
        const insertSQL = 'INSERT INTO dummy_dummytable(data) VALUES($1)';
        motherEmitter.emit(
          'performDbOperation',
          {
            moduleName: 'dummyModule',
            moduleType: 'community',
            operation: insertSQL,
            params: [ JSON.stringify(payload) ]
          },
          (dbErr) => {
            if (typeof callback !== 'function') return;
            if (dbErr) return callback(dbErr);
            callback(null, { success: true });
          }
        );
      });
  
      // => Fertig
      console.log('[DUMMY MODULE] dummyModule initialized. (No UI)');
    }
  };
  