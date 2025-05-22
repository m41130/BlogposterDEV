//public/assets/plainspace/admin/pageEditorWidgets/savePageWidget.js
export async function render(el) {
  const meltdownEmit = window.meltdownEmit;
  const jwt = window.ADMIN_TOKEN;

  const page = await window.pageDataPromise;

  if (!jwt || !page) {
    el.innerHTML = '<p>Missing credentials or page id.</p>';
    return;
  }
  console.log('[DEBUG] pageData', page);

  const pageId = window.PAGE_ID;
  const trans = {
    html: page.html || '',
    css: page.css || '',
    seo_title: page.seo_title || '',
    seo_keywords: page.seo_keywords || ''
  };

  const button = document.createElement('button');
  button.id = 'pe-save';
  button.textContent = 'Save';
  el.innerHTML = '';
  el.appendChild(button);

  button.addEventListener('click', async () => {
    const title = document.getElementById('pe-title')?.value.trim() || '';
    const seoImage = document.getElementById('pe-image')?.value.trim() || '';
    const seoDesc = document.getElementById('pe-desc')?.value || '';
    const status = document.getElementById('pe-status')?.value || page.status;
    const slug = document.getElementById('pe-slug')?.value.trim() || page.slug;
    const publishAt = document.getElementById('pe-publish-at')?.value || '';
    const layoutName = document.getElementById('pe-layout')?.value || '';

    try {
      await meltdownEmit('updatePage', {
        jwt,
        moduleName: 'pagesManager',
        moduleType: 'core',
        pageId,
        slug,
        status,
        seo_image: seoImage,
        parent_id: page.parent_id,
        is_content: page.is_content,
        lane: page.lane,
        language: page.language,
        title,
        translations: [{
          language: page.language,
          title,
          html: trans.html,
          css: trans.css,
          metaDesc: seoDesc,
          seoTitle: trans.seo_title,
          seoKeywords: trans.seo_keywords
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
}