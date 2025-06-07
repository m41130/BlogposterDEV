/**
 * mother/modules/translationManager/translationCrudEvents.js
 *
 * Provides meltdown events for storing and retrieving translation_texts
 * from the DB (Postgres or Mongo).
 */

// We'll import onceCallback to avoid meltdown meltdown
const { onceCallback } = require('../../emitters/motherEmitter');
const { hasPermission } = require('../userManagement/permissionUtils');

function setupTranslationCrudEvents(motherEmitter, jwt) {
  console.log('[TRANSLATION MANAGER] Setting up translation CRUD meltdown events...');

  // CREATE
  motherEmitter.on('createTranslatedText', (payload, originalCb) => {
    const callback = onceCallback(originalCb);

    try {
      const {
        jwt,
        moduleName,
        moduleType,
        objectId,
        fieldName,
        languageCode,
        textValue
      } = payload || {};

      if (!jwt || moduleName !== 'translationManager' || moduleType !== 'core') {
        return callback(new Error('[TRANSLATION CRUD] createTranslatedText => invalid meltdown payload.'));
      }
      if (!objectId || !fieldName || !languageCode) {
        return callback(new Error('objectId, fieldName, and languageCode are required.'));
      }

      const { decodedJWT } = payload;
      if (decodedJWT && !hasPermission(decodedJWT, 'translations.create')) {
        return callback(new Error('Forbidden – missing permission: translations.create'));
      }

      motherEmitter.emit(
        'dbInsert',
        {
          jwt,
          moduleName: 'translationManager',
          table: 'translation_texts',
          data: {
            object_id: objectId,
            field_name: fieldName,
            language_code: languageCode,
            text_value: textValue || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        },
        (err, insertedRow) => {
          if (err) return callback(err);
          callback(null, insertedRow);
        }
      );
    } catch (ex) {
      callback(ex);
    }
  });

  // READ (getTranslatedText)
  motherEmitter.on('getTranslatedText', (payload, originalCb) => {
    const callback = onceCallback(originalCb);

    try {
      const {
        jwt,
        moduleName,
        moduleType,
        objectId,
        fieldName,
        languageCode
      } = payload || {};

      if (!jwt || moduleName !== 'translationManager' || moduleType !== 'core') {
        return callback(new Error('[TRANSLATION CRUD] getTranslatedText => invalid meltdown payload.'));
      }
      if (!objectId || !fieldName || !languageCode) {
        return callback(new Error('objectId, fieldName, and languageCode are required.'));
      }

      const { decodedJWT } = payload;
      if (decodedJWT && !hasPermission(decodedJWT, 'translations.read')) {
        return callback(new Error('Forbidden – missing permission: translations.read'));
      }

      motherEmitter.emit(
        'dbSelect',
        {
          jwt,
          moduleName: 'translationManager',
          table: 'translation_texts',
          where: {
            object_id: objectId,
            field_name: fieldName,
            language_code: languageCode
          }
        },
        (err, rows) => {
          if (err) return callback(err);
          if (!rows || rows.length === 0) {
            return callback(null, null); // no record found
          }
          callback(null, rows[0]);
        }
      );
    } catch (ex) {
      callback(ex);
    }
  });

  // UPDATE
  motherEmitter.on('updateTranslatedText', (payload, originalCb) => {
    const callback = onceCallback(originalCb);

    try {
      const {
        jwt,
        moduleName,
        moduleType,
        textId,       // or objectId + fieldName + languageCode
        newTextValue
      } = payload || {};

      if (!jwt || moduleName !== 'translationManager' || moduleType !== 'core') {
        return callback(new Error('[TRANSLATION CRUD] updateTranslatedText => invalid meltdown payload.'));
      }
      if (!textId || !newTextValue) {
        return callback(new Error('Missing textId or newTextValue.'));
      }

      const { decodedJWT } = payload;
      if (decodedJWT && !hasPermission(decodedJWT, 'translations.update')) {
        return callback(new Error('Forbidden – missing permission: translations.update'));
      }

      motherEmitter.emit(
        'dbUpdate',
        {
          jwt,
          moduleName: 'translationManager',
          table: 'translation_texts',
          where: { id: textId },
          data: {
            text_value: newTextValue,
            updated_at: new Date().toISOString()
          }
        },
        (err, result) => {
          if (err) return callback(err);
          callback(null, { success: true });
        }
      );
    } catch (ex) {
      callback(ex);
    }
  });

  // DELETE
  motherEmitter.on('deleteTranslatedText', (payload, originalCb) => {
    const callback = onceCallback(originalCb);

    try {
      const {
        jwt,
        moduleName,
        moduleType,
        textId
      } = payload || {};

      if (!jwt || moduleName !== 'translationManager' || moduleType !== 'core') {
        return callback(new Error('[TRANSLATION CRUD] deleteTranslatedText => invalid meltdown payload.'));
      }
      if (!textId) {
        return callback(new Error('Missing textId.'));
      }

      const { decodedJWT } = payload;
      if (decodedJWT && !hasPermission(decodedJWT, 'translations.delete')) {
        return callback(new Error('Forbidden – missing permission: translations.delete'));
      }

      motherEmitter.emit(
        'dbDelete',
        {
          jwt,
          moduleName: 'translationManager',
          table: 'translation_texts',
          where: { id: textId }
        },
        (err, result) => {
          if (err) return callback(err);
          callback(null, { success: true });
        }
      );
    } catch (ex) {
      callback(ex);
    }
  });

  // addLanguage
  motherEmitter.on('addLanguage', (payload, originalCb) => {
    const callback = onceCallback(originalCb);

    try {
      const {
        jwt,
        moduleName,
        moduleType,
        languageCode,
        languageName
      } = payload || {};

      if (!jwt || moduleName !== 'translationManager' || moduleType !== 'core') {
        return callback(new Error('[TRANSLATION CRUD] addLanguage => invalid meltdown payload.'));
      }
      if (!languageCode || !languageName) {
        return callback(new Error('languageCode and languageName are required.'));
      }

      const { decodedJWT } = payload;
      if (decodedJWT && !hasPermission(decodedJWT, 'translations.addLanguage')) {
        return callback(new Error('Forbidden – missing permission: translations.addLanguage'));
      }

      motherEmitter.emit(
        'dbInsert',
        {
          jwt,
          moduleName: 'translationManager',
          table: 'translation_languages',
          data: {
            language_code: languageCode,
            language_name: languageName,
            created_at: new Date().toISOString()
          }
        },
        (err, inserted) => {
          if (err) return callback(err);
          callback(null, inserted);
        }
      );
    } catch (ex) {
      callback(ex);
    }
  });

  // listLanguages
  motherEmitter.on('listLanguages', (payload, originalCb) => {
    const callback = onceCallback(originalCb);

    try {
      const { jwt, moduleName, moduleType } = payload || {};
      if (!jwt || moduleName !== 'translationManager' || moduleType !== 'core') {
        return callback(new Error('[TRANSLATION CRUD] listLanguages => invalid meltdown payload.'));
      }

      const { decodedJWT } = payload;
      if (decodedJWT && !hasPermission(decodedJWT, 'translations.listLanguages')) {
        return callback(new Error('Forbidden – missing permission: translations.listLanguages'));
      }

      motherEmitter.emit(
        'dbSelect',
        {
          jwt,
          moduleName: 'translationManager',
          table: 'translation_languages'
        },
        (err, rows) => {
          if (err) return callback(err);
          callback(null, rows || []);
        }
      );
    } catch (ex) {
      callback(ex);
    }
  });
}

module.exports = { setupTranslationCrudEvents };
