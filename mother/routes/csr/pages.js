/**
 * mother/routes/csr/pages.js
 *
 * JSON‐based routes for the pagesManager module.
 * All server–side security (JWT + permissions) stays here;
 * the client only talks JSON.
 */

const express           = require('express');
const router            = express.Router();
const { motherEmitter } = require('../../emitters/motherEmitter');

// Auth & Permissions
const { requireAuthCookie } = require('../../modules/auth/authMiddleware');
const { requirePermission } = require('../../modules/auth/permissionMiddleware');

/**
 * GET /admin/api/pages
 * → meltdown => getAllPages
 * Returns all pages except those marked 'deleted'
 */
router.get(
  '/',
  requireAuthCookie,
  requirePermission('content.pages.list'),
  (req, res) => {
    const jwt = req.cookies.admin_jwt;
    motherEmitter.emit(
      'getAllPages',
      { jwt, moduleName: 'pagesManager', moduleType: 'core' },
      (err, pages) => {
        if (err) {
          console.error('[PAGE ROUTES] getAllPages =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        const nonDeleted = (pages || []).filter(p => p.status !== 'deleted');
        res.json({ success: true, pages: nonDeleted });
      }
    );
  }
);

/**
 * GET /admin/api/pages/drafts
 * → meltdown => getAllPages
 * Returns only pages with status === 'draft'
 */
router.get(
  '/drafts',
  requireAuthCookie,
  requirePermission('content.pages.list'),
  (req, res) => {
    const jwt = req.cookies.admin_jwt;
    motherEmitter.emit(
      'getAllPages',
      { jwt, moduleName: 'pagesManager', moduleType: 'core' },
      (err, pages) => {
        if (err) {
          console.error('[PAGE ROUTES] getAllPages (drafts) =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        const drafts = (pages || []).filter(p => p.status === 'draft');
        res.json({ success: true, pages: drafts });
      }
    );
  }
);

/**
 * GET /admin/api/pages/trash
 * → meltdown => getAllPages
 * Returns only pages with status === 'deleted'
 */
router.get(
  '/trash',
  requireAuthCookie,
  requirePermission('content.pages.list'),
  (req, res) => {
    const jwt = req.cookies.admin_jwt;
    motherEmitter.emit(
      'getAllPages',
      { jwt, moduleName: 'pagesManager', moduleType: 'core' },
      (err, pages) => {
        if (err) {
          console.error('[PAGE ROUTES] getAllPages (trash) =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        const trashed = (pages || []).filter(p => p.status === 'deleted');
        res.json({ success: true, pages: trashed });
      }
    );
  }
);

/**
 * GET /admin/api/pages/published
 * → meltdown => getAllPages
 * Returns only pages with status === 'published'
 */
router.get(
  '/published',
  requireAuthCookie,
  requirePermission('content.pages.list'),
  (req, res) => {
    const jwt = req.cookies.admin_jwt;
    motherEmitter.emit(
      'getAllPages',
      { jwt, moduleName: 'pagesManager', moduleType: 'core' },
      (err, pages) => {
        if (err) {
          console.error('[PAGE ROUTES] getAllPages (published) =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        const published = (pages || []).filter(p => p.status === 'published');
        res.json({ success: true, pages: published });
      }
    );
  }
);

/**
 * GET /admin/api/pages/new
 * → (no DB call) just instruct the client to render a “new page” form
 */
router.get(
  '/new',
  requireAuthCookie,
  requirePermission('content.pages.create'),
  (_req, res) => {
    res.json({
      success: true,
      message: 'Render “New Page” form on client'
    });
  }
);

/**
 * POST /admin/api/pages
 * → meltdown => createPage
 * Body: { title, slug, html, css }
 */
// POST /admin/api/pages
router.post(
  '/',
  requireAuthCookie,
  requirePermission('content.pages.create'),
  (req, res) => {
    const jwt = req.cookies.admin_jwt;
    const { slug, status, seo_image, translations, parent_id, is_content } = req.body;

    motherEmitter.emit(
      'createPage',
      {
        jwt,
        moduleName: 'pagesManager',
        moduleType: 'core',
        slug,
        status,
        seo_image,
        translations,
        parent_id: parent_id || null,
        is_content: is_content || false // hinzugefügt!
      },
      err => {
        if (err) {
          console.error('[PAGE ROUTES] createPage =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true, message: 'Page created successfully' });
      }
    );
  }
);


/**
 * POST /admin/api/pages/edit/:pageId
 * → meltdown => updatePage
 * Body: any of { title, slug, html, css }
 */
/**
 * POST /admin/api/pages/edit/:pageId
 * → meltdown => updatePage
 * Body: any of { title, slug, html, css, parent_id }
 */
router.post(
  '/edit/:pageId',
  requireAuthCookie,
  requirePermission('content.pages.edit'),
  (req, res) => {
    const jwt = req.cookies.admin_jwt;
    const pageId = req.params.pageId;
    const { slug, status, seo_image, translations, parent_id, is_content } = req.body;

    motherEmitter.emit(
      'updatePage',
      { 
        jwt, 
        moduleName: 'pagesManager', 
        moduleType: 'core', 
        pageId, 
        slug,
        status,
        seo_image,
        translations,
        parent_id: parent_id || null,
        is_content: is_content || false // hinzugefügt
      },
      (err, updated) => {
        if (err) {
          console.error('[PAGE ROUTES] updatePage =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true, message: 'Page updated successfully' });
      }
    );
  }
);



/**
 * POST /admin/api/pages/edit/:pageId/save
 * → meltdown => updatePage (html+css only)
 * Body: { newHtml, newCss }
 */
router.post(
  '/edit/:pageId/save',
  requireAuthCookie,
  requirePermission('content.pages.edit'),
  (req, res) => {
    const jwt    = req.cookies.admin_jwt;
    const pageId = req.params.pageId;
    const { newHtml, newCss } = req.body;

    motherEmitter.emit(
      'updatePage',
      { jwt, moduleName: 'pagesManager', moduleType: 'core', pageId, html: newHtml, css: newCss },
      (err, updated) => {
        if (err) {
          console.error('[PAGE ROUTES] save =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        if (!updated) {
          return res.status(404).json({ success: false, error: 'No changes applied' });
        }
        res.json({ success: true, message: 'Page saved successfully' });
      }
    );
  }
);

/**
 * POST /admin/api/pages/bulk
 * → (stub) perform bulk action on multiple pages
 * Body: { action, pageIds: [] }
 */
router.post(
  '/bulk',
  requireAuthCookie,
  requirePermission('content.pages.edit'),
  (req, res) => {
    const { action, pageIds } = req.body;
    if (!Array.isArray(pageIds)) {
      return res.status(400).json({ success: false, error: 'pageIds must be an array' });
    }
    console.log(`[PAGE ROUTES] bulk action "${action}" on:`, pageIds);
    res.json({ success: true, message: `Bulk action "${action}" executed` });
  }
);

/**
 * POST /admin/api/pages/:pageId/trash
 * → meltdown => updatePage(status='deleted', slug=trashed-<timestamp>)
 */
router.post(
  '/:pageId/trash',
  requireAuthCookie,
  requirePermission('content.pages.delete'),
  (req, res) => {
    const jwt    = req.cookies.admin_jwt;
    const pageId = req.params.pageId;

    motherEmitter.emit(
      'updatePage',
      {
        jwt,
        moduleName: 'pagesManager',
        moduleType: 'core',
        pageId,
        status: 'deleted',
        slug: `trashed-${Date.now()}`
      },
      err => {
        if (err) {
          console.error('[PAGE ROUTES] trash =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true, message: 'Page moved to trash' });
      }
    );
  }
);

/**
 * POST /admin/api/pages/:pageId/restore
 * → meltdown => updatePage(status='draft')
 */
router.post(
  '/:pageId/restore',
  requireAuthCookie,
  requirePermission('content.pages.edit'),
  (req, res) => {
    const jwt    = req.cookies.admin_jwt;
    const pageId = req.params.pageId;

    motherEmitter.emit(
      'updatePage',
      { jwt, moduleName: 'pagesManager', moduleType: 'core', pageId, status: 'draft' },
      err => {
        if (err) {
          console.error('[PAGE ROUTES] restore =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true, message: 'Page restored to draft' });
      }
    );
  }
);

/**
 * POST /admin/api/pages/:pageId/publish
 * → meltdown => updatePage(status='published')
 */
router.post(
  '/:pageId/publish',
  requireAuthCookie,
  requirePermission('content.pages.edit'),
  (req, res) => {
    const jwt    = req.cookies.admin_jwt;
    const pageId = req.params.pageId;

    motherEmitter.emit(
      'updatePage',
      { jwt, moduleName: 'pagesManager', moduleType: 'core', pageId, status: 'published' },
      (err, updated) => {
        if (err) {
          console.error('[PAGE ROUTES] publish =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        if (!updated) {
          return res.status(404).json({ success: false, error: 'No changes applied' });
        }
        res.json({ success: true, message: 'Page published' });
      }
    );
  }
);

/**
 * POST /admin/api/pages/:pageId/setAsStart
 * → meltdown => setAsStart
 */
router.post(
  '/:pageId/setAsStart',
  requireAuthCookie,
  requirePermission('content.pages.edit'),
  (req, res) => {
    const jwt    = req.cookies.admin_jwt;
    const pageId = req.params.pageId;

    motherEmitter.emit(
      'setAsStart',
      { jwt, moduleName: 'pagesManager', moduleType: 'core', pageId },
      err => {
        if (err) {
          console.error('[PAGE ROUTES] setAsStart =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true, message: 'Page set as start page' });
      }
    );
  }
);

/**
 * POST /admin/api/pages/:pageId/archive
 * → meltdown => updatePage(status='draft')
 */
router.post(
  '/:pageId/archive',
  requireAuthCookie,
  requirePermission('content.pages.edit'),
  (req, res) => {
    const jwt    = req.cookies.admin_jwt;
    const pageId = req.params.pageId;

    motherEmitter.emit(
      'updatePage',
      { jwt, moduleName: 'pagesManager', moduleType: 'core', pageId, status: 'draft' },
      err => {
        if (err) {
          console.error('[PAGE ROUTES] archive =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true, message: 'Page archived back to draft' });
      }
    );
  }
);

/**
 * PATCH /admin/api/pages/inline-edit/:pageId
 * → meltdown => updatePage({ title, slug })
 * Body: { title, slug }
 */
router.patch(
  '/inline-edit/:pageId',
  requireAuthCookie,
  requirePermission('content.pages.edit'),
  (req, res) => {
    const jwt    = req.cookies.admin_jwt;
    const pageId = req.params.pageId;
    const { title, slug, parent_id, is_content } = req.body;

    motherEmitter.emit(
      'updatePage',
      { 
        jwt, 
        moduleName: 'pagesManager', 
        moduleType: 'core', 
        pageId, 
        title, 
        slug,
        parent_id: parent_id || null,
        is_content: is_content || false
      },
      (err, updated) => {
        if (err) {
          console.error('[PAGE ROUTES] inlineEdit =>', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true, updatedId: updated.id });
      }
    );
  }
);


module.exports = router;
