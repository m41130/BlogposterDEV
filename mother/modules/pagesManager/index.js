/**
 * mother/modules/pagesManager/index.js
 *
 * 1) Ensures DB creation (via meltdown => createDatabase)
 * 2) Ensures schema & table (via meltdown => dbUpdate => 'INIT_PAGES_TABLE')
 * 3) Registers meltdown events for CRUD + advanced features
 */

require('dotenv').config();
const {
  ensurepagesManagerDatabase,
  ensurePageSchemaAndTable
} = require('./pagesService');

// We import onceCallback so meltdown doesn’t double-call your poor callbacks
const { onceCallback } = require('../../emitters/motherEmitter');

const TIMEOUT_DURATION = 5000;

/**
 * Because meltdown demands we call it "pagesManager" instead of just "pages."
 */
module.exports = {
  async initialize({ motherEmitter, isCore, jwt, nonce }) {
    if (!isCore) {
      console.error('[PAGE MANAGER] Must be loaded as a core module. Sorry, meltdown not for you.');
      return;
    }
    if (!jwt) {
      console.error('[PAGE MANAGER] No JWT provided. meltdown meltdown => cannot proceed.');
      return;
    }

    console.log('[PAGE MANAGER] Initializing Page Manager...');

    try {
      // 1) Database or schema creation
      await ensurepagesManagerDatabase(motherEmitter, jwt, nonce);

      // 2) Table/collection creation
      await ensurePageSchemaAndTable(motherEmitter, jwt, nonce);

      // 3) Register meltdown events for all your page needs
      setuppagesManagerEvents(motherEmitter);

      // 4) Obtain the public token for the pagesManager
      motherEmitter.emit(
        'issuePublicToken',
        { purpose: 'pagesPublic', moduleName: 'auth' },
        (err, tok) => {
          if (err || !tok) {
            console.error('[PAGE MANAGER] Could not obtain pagesPublicToken:',
                          err?.message || 'no token');
          } else {
            global.pagesPublicToken = tok;
            console.log('[PAGE MANAGER] pagesPublicToken initialised ✔');
          }
        }
      );

      console.log('[PAGE MANAGER] Initialized successfully. Ready to meltdown pages.');
    } catch (err) {
      console.error('[PAGE MANAGER] Error initializing =>', err.message);
    }


  }
};

/**
 * setuppagesManagerEvents:
 *   meltdown events for:
 *     - createPage, getAllPages, getPageById, getPageBySlug,
 *     - updatePage, deletePage, setAsStart,
 *     - generateXmlSitemap
 *
 * We specifically switch to using meltdown placeholders for "createPage," etc.
 * That means the actual SQL insertion is handled by 'CREATE_PAGE' in:
 *   mother/modules/databaseManager/placeholders/postgresPlaceholders.js
 */
function setuppagesManagerEvents(motherEmitter) {

  // ─────────────────────────────────────────────────────────────────
  // CREATE PAGE (with auto‑dedupe slug logic)
  // ─────────────────────────────────────────────────────────────────
  motherEmitter.on('createPage', (payload, originalCb) => {
    const callback = onceCallback(originalCb);

    // 1) Destructure the meltdown payload
    const {
      jwt,
      moduleName,
      moduleType,
      title: rawTitle = '',   // top-level title
      slug: rawSlug  = '',    // optional user-defined slug
      status = 'draft',
      seo_image = '',
      translations = [],
      parent_id = null,
      is_content= false 
    } = payload || {};

    // 2) Basic meltdown checks
    if (!jwt || moduleName !== 'pagesManager' || moduleType !== 'core') {
      return callback(new Error('Invalid payload for createPage'));
    }

    // We need some kind of title
    const title = rawTitle.trim() || (translations[0]?.title ?? '').trim();
    if (!title) {
      return callback(new Error('A valid "title" is required'));
    }

    // 3) Slug builder
    const makeSlug = str =>
      str
        .toLowerCase()
        .normalize('NFKD')             // strip fancy diacritics
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')   // only letters/numbers/hyphens
        .replace(/^-+|-+$/g, '')       // drop leading/trailing hyphens
        .substring(0, 96);            // keep slugs shortish

    // If user gave a rawSlug, use it – otherwise generate from title
    const baseSlug = rawSlug.trim() ? makeSlug(rawSlug) : makeSlug(title);
    if (!baseSlug) {
      return callback(new Error('Slug could not be generated'));
    }

    // ─────────────────────────────────────────────────────────────────
    // 4) Insert page shell – with auto‑dedupe on collisions
    //    We rely on meltdown placeholders for the DB insertion.
    // ─────────────────────────────────────────────────────────────────
    let finalSlug = baseSlug;
    let tries     = 0;

    const attemptInsert = () => {
      motherEmitter.emit(
        'dbUpdate',
        {
          jwt,
          moduleName : 'pagesManager',
          moduleType : 'core',
          table      : '__rawSQL__',       // So meltdown calls the "CREATE_PAGE" placeholder
          data       : {
          rawSQL      : 'CREATE_PAGE',
          params:   {
          slug         : finalSlug,
          status       : status,
          seo_image    : seo_image,
          translations : translations,
          parent_id    : parent_id || null,
          is_content   : is_content || false
          }
        }
        },
        (err, createRes) => {
          // Check for unique violation
          if (err && err.code === '23505') {
            // "23505" = Postgres unique_violation
            // meltdown apparently just returns it, so we can do a dedupe attempt.
            tries += 1;
            if (tries > 20) {
              return callback(new Error(
                'Could not generate a unique slug after 20 attempts'
              ));
            }
            finalSlug = `${baseSlug}-${tries}`;  // foo => foo-1 => foo-2 => ...
            return attemptInsert();              // try again
          }
          if (err) return callback(err);

          // meltdown placeholders should return the newly created page's ID
          // e.g. { done: true, insertedId: 42 }
          const pageId = createRes?.insertedId ?? null;
          if (!pageId) {
            return callback(new Error('Could not retrieve new page ID'));
          }

          // Finally, success
          callback(null, { pageId });
        }
      );
    };

    // Kick off the first attempt
    attemptInsert();
  });

  // ─────────────────────────────────────────────────────────────────
  // GET ALL PAGES
  // ─────────────────────────────────────────────────────────────────
  motherEmitter.on('getAllPages', (payload, originalCb) => {
    const callback = onceCallback(originalCb);
    try {
      const { jwt, moduleName, moduleType } = payload || {};
      if (!jwt || moduleName !== 'pagesManager' || moduleType !== 'core') {
        return callback(new Error('[PAGE MANAGER] getAllPages => invalid meltdown payload.'));
      }

      const to = setTimeout(() => {
        callback(new Error('Timeout while fetching all pages.'));
      }, TIMEOUT_DURATION);

      motherEmitter.emit(
        'dbSelect',
        {
          jwt,
          moduleName : 'pagesManager',
          moduleType : 'core',
          table      : '__rawSQL__',
          data       : { rawSQL: 'GET_ALL_PAGES' }
        },
        (err, result) => {
          clearTimeout(to);
          if (err) return callback(err);
          callback(null, result || []);
        }
      );
    } catch (ex) {
      callback(ex);
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // GET PAGE BY ID
  // ─────────────────────────────────────────────────────────────────
  motherEmitter.on('getPageById', (payload, originalCb) => {
    const callback = onceCallback(originalCb);
    try {
      const { jwt, moduleName, moduleType, pageId } = payload || {};
      if (!jwt || moduleName !== 'pagesManager' || moduleType !== 'core') {
        return callback(new Error('[PAGE MANAGER] getPageById => invalid meltdown payload.'));
      }
      if (!pageId) {
        return callback(new Error('Missing pageId.'));
      }

      const to = setTimeout(() => {
        callback(new Error('Timeout while fetching page by ID.'));
      }, TIMEOUT_DURATION);

      motherEmitter.emit(
        'dbSelect',
        {
          jwt,
          moduleName : 'pagesManager',
          moduleType : 'core',
          table      : '__rawSQL__',
          data       : {
            rawSQL: 'GET_PAGE_BY_ID',
            0: pageId,
            1: 'en'     
          }
        },
        (err, result) => {
          clearTimeout(to);
          if (err) return callback(err);
          callback(null, result || null);
        }
      );
    } catch (ex) {
      callback(ex);
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // GET PAGE BY SLUG
  // ─────────────────────────────────────────────────────────────────
  motherEmitter.on('getPageBySlug', (payload, originalCb) => {
    const callback = onceCallback(originalCb);
    try {
      const { jwt, moduleName, moduleType, slug } = payload || {};
      if (!jwt || moduleName !== 'pagesManager' || moduleType !== 'core') {
        return callback(new Error('[PAGE MANAGER] getPageBySlug => invalid meltdown payload.'));
      }
      if (!slug) {
        return callback(new Error('A valid slug is required.'));
      }

      const to = setTimeout(() => {
        callback(new Error('Timeout while fetching page by slug.'));
      }, TIMEOUT_DURATION);

      motherEmitter.emit(
        'dbSelect',
        {
          jwt,
          moduleName : 'pagesManager',
          moduleType : 'core',
          table      : '__rawSQL__',
          data       : {
            rawSQL: 'GET_PAGE_BY_SLUG',
            0: slug,
            1: 'en'   // pass your language code if needed
          }
        },
        (err, result) => {
          clearTimeout(to);
          if (err) return callback(err);
          callback(null, result || null);
        }
      );
    } catch (ex) {
      callback(ex);
    }
  });

  // ─────────────────────────────────────────────────────────────────
// GET CHILD PAGES BY PARENT ID
// ─────────────────────────────────────────────────────────────────
motherEmitter.on('getChildPages', (payload, originalCb) => {
  const callback = onceCallback(originalCb);
  try {
    const { jwt, moduleName, moduleType, parentId } = payload || {};
    if (!jwt || moduleName !== 'pagesManager' || moduleType !== 'core') {
      return callback(new Error('Invalid payload.'));
    }
    if (!parentId) {
      return callback(new Error('parentId required.'));
    }

    motherEmitter.emit(
      'dbSelect',
      {
        jwt,
        moduleName: 'pagesManager',
        moduleType: 'core',
        table: '__rawSQL__',
        data: {
          rawSQL: 'GET_CHILD_PAGES',
          params: [parentId]
        }
      },
      callback
    );
  } catch (ex) {
    callback(ex);
  }
});

  // ─────────────────────────────────────────────────────────────────
  // UPDATE PAGE
  // ─────────────────────────────────────────────────────────────────
  motherEmitter.on('updatePage', (payload, originalCb) => {
    const callback = onceCallback(originalCb);
    try {
      const {
        jwt, moduleName, moduleType, pageId,
        slug, status, seoImage,
        translations,
        parent_id  
      } = payload || {};
  
      if (!jwt || moduleName !== 'pagesManager' || moduleType !== 'core') {
        return callback(new Error('[PAGE MANAGER] updatePage => invalid meltdown payload.'));
      }
      if (!pageId) {
        return callback(new Error('pageId is required.'));
      }
  
      const to = setTimeout(() => {
        callback(new Error('Timeout while updating page.'));
      }, TIMEOUT_DURATION);
  
      motherEmitter.emit(
        'dbUpdate',
        {
          jwt,
          moduleName : 'pagesManager',
          moduleType : 'core',
          table      : '__rawSQL__',
          data       : {
            rawSQL      : 'UPDATE_PAGE',
            pageId,
            slug,
            status,
            seo_image: seoImage,
            translations,
            parent_id: parent_id || null,
            is_content: payload.is_content || false        }
        },
        (err, result) => {
          clearTimeout(to);
          if (err) return callback(err);
          callback(null, result || null);
        }
      );
    } catch (ex) {
      callback(ex);
    }
  });
  
  // ─────────────────────────────────────────────────────────────────
  // DELETE PAGE
  // ─────────────────────────────────────────────────────────────────
  motherEmitter.on('deletePage', (payload, originalCb) => {
    const callback = onceCallback(originalCb);
    try {
      const { jwt, moduleName, moduleType, pageId } = payload || {};
      if (!jwt || moduleName !== 'pagesManager' || moduleType !== 'core') {
        return callback(new Error('[PAGE MANAGER] deletePage => invalid meltdown payload.'));
      }
      if (!pageId) {
        return callback(new Error('pageId is required to delete a page.'));
      }

      const to = setTimeout(() => {
        callback(new Error('Timeout while deleting page.'));
      }, TIMEOUT_DURATION);

      motherEmitter.emit(
        'dbDelete',
        {
          jwt,
          moduleName : 'pagesManager',
          moduleType : 'core',
          table      : '__rawSQL__',
          where      : {
            rawSQL : 'DELETE_PAGE',
            0      : pageId
          }
        },
        (err, result) => {
          clearTimeout(to);
          if (err) return callback(err);
          callback(null, result || null);
        }
      );
    } catch (ex) {
      callback(ex);
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // SET PAGE AS START
  // ─────────────────────────────────────────────────────────────────
  motherEmitter.on('setAsStart', (payload, originalCb) => {
    const callback = onceCallback(originalCb);
    try {
      const { jwt, moduleName, moduleType, pageId, language = 'en' } = payload || {};
      if (!jwt || moduleName !== 'pagesManager' || moduleType !== 'core') {
        return callback(new Error('Invalid payload.'));
      }
      if (!pageId) {
        return callback(new Error('pageId required.'));
      }
  
      motherEmitter.emit('getPageById',
        { jwt, moduleName, moduleType, pageId },
        (err, page) => {
          if (err || !page) return callback(new Error('Page not found.'));
          if (page.status !== 'published') {
            return callback(new Error('Only published pages can become the start page.'));
          }
  
          motherEmitter.emit('dbUpdate',
            {
              jwt,
              moduleName,
              moduleType,
              table: '__rawSQL__',
              data: {
                rawSQL: 'SET_AS_START',
                params: [pageId, language]
              }
            },
            callback
          );
        }
      );
    } catch (ex) {
      callback(ex);
    }
  });
  

  // ─────────────────────────────────────────────────────────────────
  // GENERATE XML SITEMAP
  // ─────────────────────────────────────────────────────────────────
  motherEmitter.on('generateXmlSitemap', (payload, originalCb) => {
    const callback = onceCallback(originalCb);
    try {
      const { jwt, moduleName, moduleType, languages } = payload || {};
      if (!jwt || moduleName !== 'pagesManager' || moduleType !== 'core') {
        return callback(new Error('[PAGE MANAGER] generateXmlSitemap => invalid meltdown payload.'));
      }

      motherEmitter.emit(
        'dbSelect',
        {
          jwt,
          moduleName: 'pagesManager',
          moduleType: 'core',
          table: '__rawSQL__',
          data: { rawSQL: 'GENERATE_XML_SITEMAP', languages: languages || [] }
        },
        (err, sitemapXml) => {
          if (err) return callback(err);
          callback(null, sitemapXml);
        }
      );
    } catch (ex) {
      callback(ex);
    }
  });
}
