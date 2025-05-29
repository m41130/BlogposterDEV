//public/assets/plainspace/admin/pageEditorWidgets/seoImageWidget.js
export async function render(el) {
  const page = await window.pageDataPromise;

  if (!page) {
    el.innerHTML = '<p>Missing credentials or page id.</p>';
    return;
  }
  console.log('[DEBUG] pageData', page);

  
  const container = document.createElement('div');
  container.className = 'seo-image-widget';

  const imageField = document.createElement('div');
  imageField.className = 'field';
  const imageInput = document.createElement('input');
  imageInput.id = 'pe-image';
  imageInput.type = 'text';
  imageInput.placeholder = ' ';
  imageInput.value = page.seo_image || '';
  const imageLabel = document.createElement('label');
  imageLabel.setAttribute('for', 'pe-image');
  imageLabel.textContent = 'SEO Image URL';
  imageField.appendChild(imageInput);
  imageField.appendChild(imageLabel);

  container.appendChild(imageField);
  el.innerHTML = '';
  el.appendChild(container);
}