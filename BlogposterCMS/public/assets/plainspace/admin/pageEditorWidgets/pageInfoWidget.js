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

  const descField = document.createElement('div');
  descField.className = 'field';
  const descInput = document.createElement('textarea');
  descInput.id = 'pe-desc';
  descInput.placeholder = ' ';
  descInput.value = pageData.meta_desc || '';
  const descLabel = document.createElement('label');
  descLabel.setAttribute('for', 'pe-desc');
  descLabel.textContent = 'SEO Description';
  descField.appendChild(descInput);
  descField.appendChild(descLabel);

  container.appendChild(titleField);
  container.appendChild(descField);

  el.innerHTML = '';
  el.appendChild(container);

}
