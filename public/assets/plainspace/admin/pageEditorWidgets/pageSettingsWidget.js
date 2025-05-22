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
  const statusLabel = document.createElement('label');
  statusLabel.textContent = 'Status';
  const statusSelect = document.createElement('select');
  statusSelect.id = 'pe-status';
  ['published','draft','deleted'].forEach(opt => {
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt;
    if (page.status === opt) o.selected = true;
    statusSelect.appendChild(o);
  });
  statusLabel.appendChild(document.createElement('br'));
  statusLabel.appendChild(statusSelect);

  // Publish at
  const publishLabel = document.createElement('label');
  publishLabel.textContent = 'Publish at';
  const publishInput = document.createElement('input');
  publishInput.id = 'pe-publish-at';
  publishInput.type = 'datetime-local';
  publishInput.value = page.meta?.publish_at || '';
  publishLabel.appendChild(document.createElement('br'));
  publishLabel.appendChild(publishInput);

  // Slug
  const slugLabel = document.createElement('label');
  slugLabel.textContent = 'Slug';
  const slugInput = document.createElement('input');
  slugInput.id = 'pe-slug';
  slugInput.type = 'text';
  slugInput.placeholder = 'slug';
  slugInput.value = page.slug || '';
  slugLabel.appendChild(document.createElement('br'));
  slugLabel.appendChild(slugInput);

  // Layout dropdown
  const layoutLabel = document.createElement('label');
  layoutLabel.textContent = 'Layout';
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
  layoutLabel.appendChild(document.createElement('br'));
  layoutLabel.appendChild(layoutSelect);

  container.appendChild(statusLabel);
  container.appendChild(document.createElement('br'));
  container.appendChild(publishLabel);
  container.appendChild(document.createElement('br'));
  container.appendChild(slugLabel);
  container.appendChild(document.createElement('br'));
  container.appendChild(layoutLabel);

  el.innerHTML = '';
  el.appendChild(container);
}
