/**
 * mother/routes/csr/translation.js
 *
 * JSON-based routes for the translationManager module. 
 * Exposes meltdown events and also a direct "translate" endpoint using 
 * translateText(...) from translationService.
 */

const express = require('express');
const router = express.Router();
const { motherEmitter } = require('../../emitters/motherEmitter');

// We import the translationService to call translateText directly:
const { translateText } = require('../../modules/translationManager/translationService');

// Standard middlewares for auth + permission:
const { requireAuthCookie } = require('../../modules/auth/authMiddleware');
const { requirePermission } = require('../../modules/auth/permissionMiddleware');

/** ===========================================
 *  ============ LANGUAGE MANAGEMENT ==========
 *  ===========================================
 */

/**
 * GET /admin/translation/languages
 * => meltdown => listLanguages
 */
router.get(
  '/languages',
  requireAuthCookie,
  requirePermission('translationManager.viewLanguages'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;

    motherEmitter.emit(
      'listLanguages',
      {
        jwt: userToken,
        moduleName: 'translationManager',
        moduleType: 'core'
      },
      (err, languages) => {
        if (err) {
          console.error('[TRANSLATION ROUTES] listLanguages =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          languages: languages || []
        });
      }
    );
  }
);

/**
 * POST /admin/translation/languages
 * => meltdown => addLanguage
 * Body: { languageCode, languageName }
 */
router.post(
  '/languages',
  requireAuthCookie,
  requirePermission('translationManager.editLanguages'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { languageCode, languageName } = req.body;

    if (!languageCode || !languageName) {
      return res.status(400).json({ success: false, error: 'Missing languageCode or languageName.' });
    }

    motherEmitter.emit(
      'addLanguage',
      {
        jwt: userToken,
        moduleName: 'translationManager',
        moduleType: 'core',
        languageCode,
        languageName
      },
      (err, inserted) => {
        if (err) {
          console.error('[TRANSLATION ROUTES] addLanguage =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          language: inserted
        });
      }
    );
  }
);

/** ===========================================
 *  ========== TRANSLATED TEXT CRUD ===========
 *  ===========================================
 */

/**
 * GET /admin/translation/text
 * => meltdown => getTranslatedText
 * Query: { objectId, fieldName, languageCode }
 */
router.get(
  '/text',
  requireAuthCookie,
  requirePermission('translationManager.viewTranslations'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { objectId, fieldName, languageCode } = req.query;

    if (!objectId || !fieldName || !languageCode) {
      return res.status(400).json({
        success: false,
        error: 'Missing objectId, fieldName, or languageCode in query.'
      });
    }

    motherEmitter.emit(
      'getTranslatedText',
      {
        jwt: userToken,
        moduleName: 'translationManager',
        moduleType: 'core',
        objectId,
        fieldName,
        languageCode
      },
      (err, row) => {
        if (err) {
          console.error('[TRANSLATION ROUTES] getTranslatedText =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        // row may be null if no translation found
        return res.json({
          success: true,
          translation: row || null
        });
      }
    );
  }
);

/**
 * POST /admin/translation/text
 * => meltdown => createTranslatedText
 * Body: { objectId, fieldName, languageCode, textValue }
 */
router.post(
  '/text',
  requireAuthCookie,
  requirePermission('translationManager.editTranslations'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const {
      objectId,
      fieldName,
      languageCode,
      textValue
    } = req.body;

    if (!objectId || !fieldName || !languageCode) {
      return res.status(400).json({
        success: false,
        error: 'Missing objectId, fieldName, or languageCode in body.'
      });
    }

    motherEmitter.emit(
      'createTranslatedText',
      {
        jwt: userToken,
        moduleName: 'translationManager',
        moduleType: 'core',
        objectId,
        fieldName,
        languageCode,
        textValue
      },
      (err, insertedRow) => {
        if (err) {
          console.error('[TRANSLATION ROUTES] createTranslatedText =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          translation: insertedRow
        });
      }
    );
  }
);

/**
 * PATCH /admin/translation/text/:textId
 * => meltdown => updateTranslatedText
 * Body: { newTextValue }
 */
router.patch(
  '/text/:textId',
  requireAuthCookie,
  requirePermission('translationManager.editTranslations'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { textId } = req.params;
    const { newTextValue } = req.body;

    if (!newTextValue) {
      return res.status(400).json({ success: false, error: 'Missing newTextValue in body.' });
    }

    motherEmitter.emit(
      'updateTranslatedText',
      {
        jwt: userToken,
        moduleName: 'translationManager',
        moduleType: 'core',
        textId,
        newTextValue
      },
      (err, result) => {
        if (err) {
          console.error('[TRANSLATION ROUTES] updateTranslatedText =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          result
        });
      }
    );
  }
);

/**
 * DELETE /admin/translation/text/:textId
 * => meltdown => deleteTranslatedText
 */
router.delete(
  '/text/:textId',
  requireAuthCookie,
  requirePermission('translationManager.deleteTranslations'),
  (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const { textId } = req.params;

    motherEmitter.emit(
      'deleteTranslatedText',
      {
        jwt: userToken,
        moduleName: 'translationManager',
        moduleType: 'core',
        textId
      },
      (err, result) => {
        if (err) {
          console.error('[TRANSLATION ROUTES] deleteTranslatedText =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        return res.json({
          success: true,
          result
        });
      }
    );
  }
);

/** ===========================================
 *  ======== ON-DEMAND TEXT TRANSLATION =======
 *  ===========================================
 */

/**
 * POST /admin/translation/translate
 * => calls translateText(...) from translationService
 *
 * Body: { provider, text, fromLang, toLang, apiKey }
 *   - provider: 'openai' (for now)
 *   - text: The source text to translate
 *   - fromLang: e.g. 'en'
 *   - toLang: e.g. 'de'
 *   - apiKey: e.g. OpenAI key
 */
router.post(
  '/translate',
  requireAuthCookie,
  requirePermission('translationManager.translate'),
  async (req, res) => {
    const userToken = req.cookies?.admin_jwt;
    const userId    = req.user?.id; // from requireAuthCookie => sets req.user
    const {
      provider = 'openai',
      text,
      fromLang,
      toLang,
      apiKey
    } = req.body;

    if (!text || !fromLang || !toLang) {
      return res.status(400).json({
        success: false,
        error: 'Missing text, fromLang, or toLang.'
      });
    }

    try {
      // We pass motherEmitter + meltdown-related fields:
      const translated = await translateText({
        provider,
        text,
        fromLang,
        toLang,
        apiKey,
        motherEmitter,
        userJwt: userToken,
        userId
      });
      return res.json({
        success: true,
        translated
      });
    } catch (err) {
      console.error('[TRANSLATION ROUTES] /translate =>', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

module.exports = router;
