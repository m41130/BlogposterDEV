//public/assets/plainspace/admin/pageEditorWidgets/pageSettingsWidget.js
export async function render(el) {
  const meltdownEmit = window.meltdownEmit;
  const jwt = window.ADMIN_TOKEN;

  const page = await window.pageDataPromise;

  if (!jwt || !page) {
    el.innerHTML = '<p>Missing credentials or page id.</p>';
    return;
  }
  console.log('[DEBUG] pageData', page);


  const container = document.createElement('div');
  container.className = 'page-settings-widget';

  // Status dropdown
  const statusField = document.createElement('div');
  statusField.className = 'field';
  const statusSelect = document.createElement('select');
  statusSelect.id = 'pe-status';
  ['published','draft','deleted'].forEach(opt => {
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt;
    if (page.status === opt) o.selected = true;
    statusSelect.appendChild(o);
  });
  const statusLabel = document.createElement('label');
  statusLabel.setAttribute('for', 'pe-status');
  statusLabel.textContent = 'Status';
  statusField.appendChild(statusSelect);
  statusField.appendChild(statusLabel);

  // Publish at
  const publishField = document.createElement('div');
  publishField.className = 'field';
  const publishInput = document.createElement('input');
  publishInput.id = 'pe-publish-at';
  publishInput.type = 'datetime-local';
  publishInput.placeholder = ' ';
  publishInput.value = page.meta?.publish_at || '';
  const publishLabel = document.createElement('label');
  publishLabel.setAttribute('for', 'pe-publish-at');
  publishLabel.textContent = 'Publish at';
  publishField.appendChild(publishInput);
  publishField.appendChild(publishLabel);

  // Slug
  const slugField = document.createElement('div');
  slugField.className = 'field';
  const slugInput = document.createElement('input');
  slugInput.id = 'pe-slug';
  slugInput.type = 'text';
  slugInput.placeholder = ' ';
  slugInput.value = page.slug || '';
  const slugLabel = document.createElement('label');
  slugLabel.setAttribute('for', 'pe-slug');
  slugLabel.textContent = 'Slug';
  slugField.appendChild(slugInput);
  slugField.appendChild(slugLabel);

  // Layout dropdown
  const layoutField = document.createElement('div');
  layoutField.className = 'field';
  const layoutSelect = document.createElement('select');
  layoutSelect.id = 'pe-layout';
  let templates = [];
  try {
    const res = await meltdownEmit('getLayoutTemplateNames', {
      jwt,
      moduleName: 'plainspace',
      moduleType: 'core',
      lane: 'public'
    });
    templates = Array.isArray(res?.templates) ? res.templates : [];
  } catch (err) {
    console.warn('Could not fetch layout templates', err);
  }
  if (!templates.length) templates = ['default'];
  templates.forEach(name => {
    const o = document.createElement('option');
    o.value = name;
    o.textContent = name;
    if ((page.meta?.layoutTemplate || '') === name) o.selected = true;
    layoutSelect.appendChild(o);
  });
  const layoutLabel = document.createElement('label');
  layoutLabel.setAttribute('for', 'pe-layout');
  layoutLabel.textContent = 'Layout';
  layoutField.appendChild(layoutSelect);
  layoutField.appendChild(layoutLabel);

  container.appendChild(statusField);
  container.appendChild(publishField);
  container.appendChild(slugField);
  container.appendChild(layoutField);

  el.innerHTML = '';
  el.appendChild(container);
}
