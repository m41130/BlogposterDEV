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
        <label>Title<br><input id="pe-title" type="text" value="${page.title || ''}"></label><br>
        <label>SEO Image URL<br><input id="pe-image" type="text" value="${page.seo_image || ''}"></label><br>
        <label>SEO Description<br><textarea id="pe-desc">${trans.meta_desc || ''}</textarea></label><br>
        <label>Layout JSON<br><textarea id="pe-layout" placeholder='[]'></textarea></label><br>
        <button id="pe-save">Save</button>
      </div>
    `;

    document.getElementById('pe-save').addEventListener('click', async () => {
      const title = document.getElementById('pe-title').value.trim();
      const seoImage = document.getElementById('pe-image').value.trim();
      const seoDesc = document.getElementById('pe-desc').value;
      const layoutText = document.getElementById('pe-layout').value;
      try {
        await meltdownEmit('updatePage', {
          jwt,
          moduleName: 'pagesManager',
          moduleType: 'core',
          pageId,
          slug: page.slug,
          status: page.status,
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
          meta: page.meta
        });

        if (layoutText.trim()) {
          const layout = JSON.parse(layoutText);
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
