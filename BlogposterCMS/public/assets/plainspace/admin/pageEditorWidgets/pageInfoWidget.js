// The builder may execute this code from a `blob:` URL. Loading Quill
// dynamically with a full URL ensures the import succeeds in that case.
// Dynamically import Quill so this widget works when executed from a blob URL.
const quillUrl = new URL('/assets/js/quillEditor.js', document.baseURI).href;

export async function render(el) {
  const { initQuill } = await import(quillUrl);
  // Clean up any existing editor instance to avoid duplicates
  if (window.peDescEditor) {
    try {
      const oldRoot = window.peDescEditor.root;
      if (oldRoot && oldRoot.parentNode) {
        oldRoot.parentNode.remove();
      }
    } catch (err) {
      console.warn('[pageInfoWidget] failed to remove previous editor', err);
    }
    window.peDescEditor = null;
  }
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

  const titleField = document.createElement('div');
  titleField.className = 'field';
  const titleInput = document.createElement('input');
  titleInput.id = 'pe-title';
  titleInput.type = 'text';
  titleInput.placeholder = ' ';
  titleInput.value = pageData.trans_title || pageData.title || '';
  const titleLabel = document.createElement('label');
  titleLabel.setAttribute('for', 'pe-title');
  titleLabel.textContent = 'Title';
  titleField.appendChild(titleInput);
  titleField.appendChild(titleLabel);

  const descLabel = document.createElement('label');
  descLabel.textContent = 'SEO Description';
  const descDiv = document.createElement('div');
  descDiv.id = 'pe-desc';
  descDiv.innerHTML = pageData.meta_desc || '';
  descLabel.appendChild(document.createElement('br'));
  descLabel.appendChild(descDiv);

  container.appendChild(titleField);
  container.appendChild(descLabel);

  el.innerHTML = '';
  el.appendChild(container);

  // Initialize Quill editor for SEO description
  window.peDescEditor = initQuill(descDiv);
}
