export async function render(el) {
  const meltdownEmit = window.meltdownEmit;
  const jwt = window.ADMIN_TOKEN;
  const pageId = window.PAGE_ID;

  let page = {};
  if (jwt && pageId) {
    try {
      const res = await meltdownEmit('getPageById', {
        jwt,
        moduleName: 'pagesManager',
        moduleType: 'core',
        pageId
      });
      page = res?.data ?? res ?? {};
    } catch (err) {
      console.error('seoImageWidget fetch error', err);
    }
  }
  const container = document.createElement('div');
  container.className = 'seo-image-widget';

  const imageLabel = document.createElement('label');
  imageLabel.textContent = 'SEO Image URL';
  const imageInput = document.createElement('input');
  imageInput.id = 'pe-image';
  imageInput.type = 'text';
  imageInput.placeholder = 'https://example.com/image.jpg';
  imageInput.value = page.seo_image || '';
  imageLabel.appendChild(document.createElement('br'));
  imageLabel.appendChild(imageInput);

  container.appendChild(imageLabel);
  el.innerHTML = '';
  el.appendChild(container);
}