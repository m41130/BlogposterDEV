// public/assets/admin/default/pageList.js

// Global emitter for all helper functions
const meltdownEmit = window.meltdownEmit;

export async function render(el) {
  const jwt = window.ADMIN_TOKEN;

  try {
    const res = await meltdownEmit('getPagesByLane', {
      jwt,
      moduleName: 'pagesManager',
      moduleType: 'core',
      lane: 'public'
    });

    const pages = Array.isArray(res) ? res : (res?.data ?? []);

    console.log('Pages from API:', pages);


    // Clear Element
    el.innerHTML = '';

    // Card Container
    const card = document.createElement('div');
    card.className = 'page-list-card';

    // Title
    const title = document.createElement('div');
    title.className = 'page-title';
    title.textContent = 'Pages';
    card.appendChild(title);

    // Filters
    const filters = ['All', 'Active', 'Drafts', 'Deleted'];
    const filterNav = document.createElement('nav');
    filterNav.className = 'page-filters';

    // Track current filter in closure
    let currentFilter = filters[0];

    // List element reference (so it can be reused)
    const list = document.createElement('ul');
    list.className = 'page-list';

    // Render filter buttons
    filters.forEach((filterName, idx) => {
      const filterEl = document.createElement('span');
      filterEl.className = 'filter';
      filterEl.textContent = filterName;
      if (idx === 0) filterEl.classList.add('active');
      filterEl.onclick = (e) => {
        // Remove active from all, set active on clicked
        filterNav.querySelectorAll('.filter').forEach(f => f.classList.remove('active'));
        filterEl.classList.add('active');
        currentFilter = filterName;
        renderFilteredPages();
      };
      filterNav.appendChild(filterEl);
    });

    card.appendChild(filterNav);
    card.appendChild(list);

    // Rendering function for filtered list
    function renderFilteredPages() {
      let filteredPages = pages;
      switch (currentFilter) {
        case 'Active':
          filteredPages = pages.filter(p => p.status === 'published');
          break;
        case 'Drafts':
          filteredPages = pages.filter(p => p.status === 'draft');
          break;
        case 'Deleted':
          filteredPages = pages.filter(p => p.status === 'deleted');
          break;
      }
      list.innerHTML = '';
      if (!filteredPages.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = 'No pages found.';
        list.appendChild(empty);
      } else {
        renderPages(filteredPages, list);
      }
    }

    // Initial render
    renderFilteredPages();
    el.appendChild(card);

  } catch (err) {
    el.innerHTML = `<div class="error">Error loading pages: ${err.message}</div>`;
  }
}

// Renders the page list items
function renderPages(pages, list) {
  list.innerHTML = '';
  pages.forEach(page => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="page-details">
        <div class="page-name-row">
          <span class="page-name">${page.title}</span>
          <span class="page-actions">
              ${page.is_start
                ? window.featherIcon('home', 'is-home')
                : window.featherIcon('setHome', 'set-home" title="Set as home')}
              ${window.featherIcon('edit', 'edit-page" title="Edit page')}
              ${window.featherIcon('pencil', 'edit-layout" title="Edit layout')}
              ${window.featherIcon(page.status === 'draft' ? 'draft' : 'published', 'toggle-draft" title="' + (page.status === 'draft' ? 'Mark as published' : 'Mark as draft') + '"')}
              ${window.featherIcon('delete', 'delete-page" title="Delete page')}
          </span>
        </div>
        <div class="page-slug-row">
          <span class="page-slug" contenteditable="true">${page.slug}</span>
          ${window.featherIcon('editSlug', 'edit-slug" title="Edit slug')}
        </div>
      </div>
    `;

    // Inline slug editing
    const slugEl = li.querySelector('.page-slug');
    slugEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        slugEl.blur();
      }
    });
    slugEl.addEventListener('blur', (e) => {
      const newSlug = e.target.textContent.trim();
      if (newSlug !== page.slug) {
        updateSlug(page, newSlug);
      }
    });

    // Set as home
    const setHomeBtn = li.querySelector('.set-home');
    if (setHomeBtn) setHomeBtn.addEventListener('click', () => setHomePage(page.id));

    // Edit page
    li.querySelector('.edit-page').addEventListener('click', () => editPage(page.id));

    // Edit layout
    li.querySelector('.edit-layout').addEventListener('click', () => editLayout(page.id));

    // Toggle draft
    li.querySelector('.toggle-draft').addEventListener('click', () => toggleDraft(page));

    // Delete
    li.querySelector('.delete-page').addEventListener('click', () => deletePage(page.id));

    list.appendChild(li);
  });
}


// --------- API Call Placeholders ---------

async function updateSlug(page, slug) {
  try {
    await meltdownEmit('updatePage', {
      jwt: window.ADMIN_TOKEN,
      moduleName: 'pagesManager',
      moduleType: 'core',
      pageId: page.id,
      slug,
      status: page.status,
      seo_Image: page.seo_image,
      parent_id: page.parent_id,
      is_content: page.is_content,
      lane: page.lane,
      language: page.language,
      title: page.title,
      meta: page.meta
    });
    page.slug = slug;
  } catch (err) {
    console.error('updateSlug failed', err);
    alert('Failed to update slug: ' + err.message);
  }
}

async function setHomePage(id) {
  try {
    await meltdownEmit('setAsStart', {
      jwt: window.ADMIN_TOKEN,

      moduleName: 'pagesManager',
      moduleType: 'core',
      pageId: id
    });
  } catch (err) {
    console.error('setHomePage failed', err);
    alert('Failed to set start page: ' + err.message);
  }
}

async function editPage(id) {
  window.location.href = `/admin/pages/edit/${id}`;
}

async function editLayout(id) {
  window.location.href = `/admin/builder?pageId=${id}`;
}

async function toggleDraft(page) {
  const newStatus = page.status === 'draft' ? 'published' : 'draft';
  try {
    await meltdownEmit('updatePage', {
      jwt: window.ADMIN_TOKEN,
      moduleName: 'pagesManager',
      moduleType: 'core',
      pageId: page.id,
      slug: page.slug,
      status: newStatus,
      seoImage: page.seo_image,
      parent_id: page.parent_id,
      is_content: page.is_content,
      lane: page.lane,
      language: page.language,
      title: page.title,
      meta: page.meta
    });
    page.status = newStatus;
  } catch (err) {
    console.error('toggleDraft failed', err);
    alert('Failed to update status: ' + err.message);
  }
}

async function deletePage(id) {
  if (confirm('Are you sure you want to delete this page?')) {
    try {
      await meltdownEmit('deletePage', {
        jwt: window.ADMIN_TOKEN,
        moduleName: 'pagesManager',
        moduleType: 'core',
        pageId: id
      });
    } catch (err) {
      console.error('deletePage failed', err);
      alert('Failed to delete page: ' + err.message);
    }
  }
}
