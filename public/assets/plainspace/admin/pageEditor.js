import { render as renderInfo } from './pageEditorWidgets/pageInfoWidget.js';
import { render as renderSettings } from './pageEditorWidgets/pageSettingsWidget.js';
import { render as renderSeoImage } from './pageEditorWidgets/seoImageWidget.js';

export async function initPageEditor(contentEl) {
  const meltdownEmit = window.meltdownEmit;
  const jwt = window.ADMIN_TOKEN;
  const pageId = window.PAGE_ID;

  if (!jwt || !pageId) {
    contentEl.innerHTML = '<p>Missing credentials or page id.</p>';
    return;
  }

  try {
    const res = await meltdownEmit('getPageById', {
      jwt,
      moduleName: 'pagesManager',
      moduleType: 'core',
      pageId
    });
    const page = res?.data ?? res ?? {};
    const trans = (page.translations && page.translations[0]) || {};

    contentEl.innerHTML = `
      <div class="page-editor-form">
        <div id="widget-info"></div>
        <div id="widget-settings"></div>
        <div id="widget-image"></div>
        <button id="pe-save">Save</button>
      </div>
    `;
    renderInfo(document.getElementById('widget-info'), page, trans);
    await renderSettings(document.getElementById('widget-settings'), page, meltdownEmit, jwt);
    renderSeoImage(document.getElementById('widget-image'), page);

    document.getElementById('pe-save').addEventListener('click', async () => {
      const title = document.getElementById('pe-title').value.trim();
      const seoImage = document.getElementById('pe-image').value.trim();
      const seoDesc = document.getElementById('pe-desc').value;
      const status = document.getElementById('pe-status').value;
      const slug = document.getElementById('pe-slug').value.trim();
      const publishAt = document.getElementById('pe-publish-at').value;
      const layoutName = document.getElementById('pe-layout').value;
      try {
        await meltdownEmit('updatePage', {
          jwt,
          moduleName: 'pagesManager',
          moduleType: 'core',
          pageId,
          slug,
          status,
          seoImage,
          parent_id: page.parent_id,
          is_content: page.is_content,
          lane: page.lane,
          language: page.language,
          title,
          translations: [{
            language: page.language,
            title,
            html: trans.html || '',
            css: trans.css || '',
            metaDesc: seoDesc,
            seoTitle: trans.seo_title || '',
            seoKeywords: trans.seo_keywords || ''
          }],
          meta: { ...(page.meta || {}), publish_at: publishAt, layoutTemplate: layoutName }
        });
        if (layoutName) {
          const layoutRes = await meltdownEmit('getLayoutTemplate', {
            jwt,
            moduleName: 'plainspace',
            moduleType: 'core',
            name: layoutName
          }).catch(() => ({ layout: [] }));
          const layout = Array.isArray(layoutRes?.layout) ? layoutRes.layout : [];
          if (layout.length) {
            await meltdownEmit('saveLayoutForViewport', {
              jwt,
              moduleName: 'plainspace',
              moduleType: 'core',
              pageId,
              lane: 'public',
              viewport: 'desktop',
              layout
            });
          }
        }

        await meltdownEmit('generateXmlSitemap', {
          jwt,
          moduleName: 'pagesManager',
          moduleType: 'core',
          languages: [page.language]
        });

        alert('Saved');
      } catch (err) {
        console.error('Save failed', err);
        alert('Error: ' + err.message);
      }
    });
  } catch (err) {
    console.error('Editor init failed', err);
    contentEl.innerHTML = '<p>Error loading page data.</p>';
  }
}
