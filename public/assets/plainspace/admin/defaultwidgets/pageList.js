// public/assets/admin/default/pageList.js
export async function render(el) {
  try {
    const res = await meltdownEmit('getAllPages', {
      moduleName: 'pagesManager',
      moduleType: 'core'
    });

    const pages = res?.data ?? [];

    if (!pages.length) {
      el.innerHTML = '<div>No pages found.</div>';
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'page-list-widget';

    pages.forEach(page => {
      const li = document.createElement('li');
      li.textContent = `${page.title} (${page.slug})`;
      ul.appendChild(li);
    });

    el.appendChild(ul);
  } catch (err) {
    el.innerHTML = `<div class="error">Error loading pages: ${err.message}</div>`;
  }
}
