export function render(el, page, trans) {
  const container = document.createElement('div');
  container.className = 'page-info-widget';

  const titleLabel = document.createElement('label');
  titleLabel.textContent = 'Title';
  const titleInput = document.createElement('input');
  titleInput.id = 'pe-title';
  titleInput.type = 'text';
  titleInput.placeholder = 'Title';
  titleInput.value = page.title || '';
  titleLabel.appendChild(document.createElement('br'));
  titleLabel.appendChild(titleInput);

  const descLabel = document.createElement('label');
  descLabel.textContent = 'SEO Description';
  const descTextarea = document.createElement('textarea');
  descTextarea.id = 'pe-desc';
  descTextarea.placeholder = 'Description';
  descTextarea.textContent = trans.meta_desc || '';
  descLabel.appendChild(document.createElement('br'));
  descLabel.appendChild(descTextarea);

  container.appendChild(titleLabel);
  container.appendChild(document.createElement('br'));
  container.appendChild(descLabel);

  el.innerHTML = '';
  el.appendChild(container);
}

