// mother/modules/plainSpace/plainSpaceService.js
// Because obviously we can’t keep these little helpers in index.js. That would be too straightforward.

require('dotenv').config();
const { onceCallback } = require('../../emitters/motherEmitter');

const MODULE      = 'plainspace';
const PUBLIC_LANE = 'public';
const ADMIN_LANE  = 'admin';

/**
 * seedAdminPages:
 * For each admin page, check if it exists by slug.
 * If it doesn’t, meltdown => createPage. Because the world needs more admin pages.
 */
// plainSpaceService.js
async function seedAdminPages(motherEmitter, jwt, adminPages = []) {
  const makeSlug = (str) =>
    String(str)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 96);

  for (const page of adminPages) {
    let slugPath = page.slug;
    let parentId = null;

    if (page.parentSlug) {
      const parentSlugSan = makeSlug(page.parentSlug);
      const parentPage = await new Promise((resolve) => {
        motherEmitter.emit(
          'getPageBySlug',
          {
            jwt,
            moduleName: 'pagesManager',
            moduleType: 'core',
            slug: parentSlugSan,
            lane: page.lane
          },
          onceCallback((_err, existing) => resolve(existing || null))
        );
      });

      if (parentPage?.id) {
        parentId = parentPage.id;
        slugPath = `${parentPage.slug}/${page.slug}`;
      } else {
        console.warn(`[plainSpace] Parent page "${page.parentSlug}" not found for "${page.slug}".`);
      }
    }

    const finalSlug = makeSlug(slugPath);

    const exists = await new Promise((resolve) => {
      motherEmitter.emit(
        'getPageBySlug',
        {
          jwt,
          moduleName: 'pagesManager',
          moduleType: 'core',
          slug: finalSlug,
          lane: page.lane
        },
        onceCallback((_err, existingPage) => {
          const found = Array.isArray(existingPage)
            ? existingPage.length > 0
            : Boolean(existingPage);
          resolve(found);
        })
      );
    });

    if (exists) {
      console.log(`[plainSpace] Admin page "${finalSlug}" already exists.`);
      continue;
    }

    await new Promise((resolve) => {
      motherEmitter.emit(
        'createPage',
        {
          jwt,
          moduleName: 'pagesManager',
          moduleType: 'core',
          title: page.title,
          slug: slugPath,
          parent_id: parentId,
          lane: page.lane,
          status: 'published',
          meta: page.config,
          translations: [
            {
              language: 'en',
              title: page.title,
              html: '<div id="root"></div>',
              css: '',
              metaDesc: '',
              seoTitle: page.title,
              seoKeywords: ''
            }
          ]
        },
        onceCallback((err2) => {
          if (err2) {
            console.error(`[plainSpace] Error creating "${slugPath}":`, err2.message);
          } else {
            console.log(`[plainSpace] ✅ Admin page "${slugPath}" successfully created.`);
          }
          resolve();
        })
      );
    });
  }
}


/**
 * checkOrCreateWidget:
 * 1) dbSelect => see if a widget with { widgetId } already exists.
 * 2) If not, meltdown => createWidget.
 */
async function checkOrCreateWidget(motherEmitter, jwt, widgetData) {
  const { widgetId, widgetType } = widgetData;
  const tableName = (widgetType === ADMIN_LANE) ? 'widgets_admin' : 'widgets_public';

  // 1) Check if the widget already exists
  const widgetExists = await new Promise((resolve) => {
    motherEmitter.emit(
      'dbSelect',
      {
        jwt,
        moduleName: 'widgetManager',
        moduleType: 'core',
        table: tableName,
        where: { widget_id: widgetId }
      },
      onceCallback((err, rows) => {
        if (err) {
          console.error(`[plainSpace] Error checking widget "${widgetId}":`, err.message);
          return resolve(false);
        }
        resolve(Array.isArray(rows) && rows.length > 0);
      })
    );
  });

  if (widgetExists) {
    console.log(`[plainSpace] Widget "${widgetId}" already exists. Skipping creation.`);
    return;
  }

  // 2) If not, create the widget
  await new Promise((resolve) => {
    motherEmitter.emit(
      'createWidget',
      {
        jwt,
        moduleName: 'widgetManager',
        moduleType: 'core',
        ...widgetData
      },
      onceCallback((err) => {
        if (err) {
          console.error(`[plainSpace] createWidget failed for "${widgetId}":`, err.message);
        } else {
          console.log(`[plainSpace] Widget "${widgetId}" successfully created.`);
        }
        resolve();
      })
    );
  });
}

/**
 * registerPlainSpaceEvents:
 * meltdown events for multi-viewport layout storage:
 *   - saveLayoutForViewport
 *   - getLayoutForViewport
 *   - getAllLayoutsForPage
 *   - saveLayoutTemplate
 *   - getLayoutTemplate
 */
function registerPlainSpaceEvents(motherEmitter) {
  // 1) saveLayoutForViewport
  motherEmitter.on('saveLayoutForViewport', (payload, cb) => {
    try {
      const { jwt, moduleName, pageId, lane, viewport, layout } = payload || {};
      if (!jwt || !moduleName || !pageId || !lane || !viewport || !Array.isArray(layout)) {
        return cb(new Error('[plainSpace] Invalid payload in saveLayoutForViewport.'));
      }
      motherEmitter.emit(
        'dbUpdate',
        {
          jwt,
          moduleName,
          moduleType: 'core',
          table: '__rawSQL__',
          data: {
            rawSQL: 'UPSERT_PLAINSPACE_LAYOUT',
            params: { pageId, lane, viewport, layoutArr: layout }
          }
        },
        cb
      );
    } catch (err) {
      cb(err);
    }
  });

  // 2) getLayoutForViewport
  motherEmitter.on('getLayoutForViewport', (payload, cb) => {
    try {
      const { jwt, pageId, lane, viewport } = payload || {};
      if (!jwt || !pageId || !lane || !viewport) {
        return cb(new Error('[plainSpace] Missing arguments in getLayoutForViewport.'));
      }
      motherEmitter.emit(
        'dbSelect',
        {
          jwt,
          moduleName: MODULE,
          moduleType: 'core',
          table: '__rawSQL__',
          data: {
            rawSQL: 'GET_PLAINSPACE_LAYOUT',
            params: { pageId, lane, viewport }
          }
        },
        (err, rows = []) => {
          if (err) return cb(err);
          if (!rows.length) {
            return cb(null, { layout: [] });
          }
          const layoutArr = rows[0].layout_json || [];
          cb(null, { layout: layoutArr });
        }
      );
    } catch (err) {
      cb(err);
    }
  });

  // 3) getAllLayoutsForPage
  motherEmitter.on('getAllLayoutsForPage', (payload, cb) => {
    try {
      const { jwt, pageId, lane } = payload || {};
      if (!jwt || !pageId || !lane) {
        return cb(new Error('[plainSpace] Invalid payload in getAllLayoutsForPage.'));
      }
      motherEmitter.emit(
        'dbSelect',
        {
          jwt,
          moduleName: MODULE,
          moduleType: 'core',
          table: '__rawSQL__',
          data: {
            rawSQL: 'GET_ALL_PLAINSPACE_LAYOUTS',
            params: { pageId, lane }
          }
        },
        (err, rows = []) => {
          if (err) return cb(err);
          const layouts = rows.map((r) => ({
            viewport: r.viewport,
            layout: r.layout_json || []
          }));
          cb(null, { layouts });
        }
      );
    } catch (err) {
      cb(err);
    }
  });

  // 4) saveLayoutTemplate
  motherEmitter.on('saveLayoutTemplate', (payload, cb) => {
    try {
      const { jwt, name, lane, viewport, layout } = payload || {};
      if (!jwt || !name || !lane || !viewport || !Array.isArray(layout)) {
        return cb(new Error('[plainSpace] Invalid payload in saveLayoutTemplate.'));
      }
      motherEmitter.emit(
        'dbUpdate',
        {
          jwt,
          moduleName: MODULE,
          moduleType: 'core',
          table: '__rawSQL__',
          data: {
            rawSQL: 'UPSERT_PLAINSPACE_LAYOUT_TEMPLATE',
            params: { name, lane, viewport, layoutArr: layout }
          }
        },
        cb
      );
    } catch (err) {
      cb(err);
    }
  });

  // 5) getLayoutTemplate
  motherEmitter.on('getLayoutTemplate', (payload, cb) => {
    try {
      const { jwt, name } = payload || {};
      if (!jwt || !name) {
        return cb(new Error('[plainSpace] Invalid payload in getLayoutTemplate.'));
      }
      motherEmitter.emit(
        'dbSelect',
        {
          jwt,
          moduleName: MODULE,
          moduleType: 'core',
          table: '__rawSQL__',
          data: {
            rawSQL: 'GET_PLAINSPACE_LAYOUT_TEMPLATE',
            params: { name }
          }
        },
        (err, rows = []) => {
          if (err) return cb(err);
          if (!rows.length) {
            return cb(null, { layout: [] });
          }
          cb(null, { layout: rows[0].layout_json || [] });
        }
      );
    } catch (err) {
      cb(err);
    }
  });
}

module.exports = {
  seedAdminPages,
  checkOrCreateWidget,
  registerPlainSpaceEvents,
  MODULE,
  PUBLIC_LANE,
  ADMIN_LANE
};
