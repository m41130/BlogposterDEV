import { initQuill } from '../../../js/quillEditor.js';

export async function render(el) {
  const pageData = await window.pageDataLoader.load('getPageById', {
    moduleName: 'pagesManager',
    moduleType: 'core',
    pageId: window.PAGE_ID
  });

  console.log('[Widget DEBUG] pageData:', pageData);

  if (!pageData) {
    el.innerHTML = '<p>Missing credentials or page id.</p>';
    return;
  }

  const container = document.createElement('div');
  container.className = 'page-info-widget';

  const titleLabel = document.createElement('label');
  titleLabel.textContent = 'Title';
  const titleInput = document.createElement('input');
  titleInput.id = 'pe-title';
  titleInput.type = 'text';
  titleInput.placeholder = 'Title';
  titleInput.value = pageData.trans_title || pageData.title || '';
  titleLabel.appendChild(document.createElement('br'));
  titleLabel.appendChild(titleInput);

  const descLabel = document.createElement('label');
  descLabel.textContent = 'SEO Description';
  const descDiv = document.createElement('div');
  descDiv.id = 'pe-desc';
  descDiv.innerHTML = pageData.meta_desc || '';
  descLabel.appendChild(document.createElement('br'));
  descLabel.appendChild(descDiv);

  container.appendChild(titleLabel);
  container.appendChild(document.createElement('br'));
  container.appendChild(descLabel);

  el.innerHTML = '';
  el.appendChild(container);

  // Initialize Quill editor for SEO description
  window.peDescEditor = initQuill(descDiv);
}
