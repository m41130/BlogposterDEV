(document.addEventListener('DOMContentLoaded', async () => {
  const userLink = document.getElementById('user-link');
  const logoutIcon = document.getElementById('logout-icon');
  const searchToggle = document.getElementById('search-toggle');
  const searchContainer = document.querySelector('.search-container');
  const searchInput = document.getElementById('admin-search-input');

  if (userLink && window.ADMIN_TOKEN && window.meltdownEmit) {
    try {
      const decoded = await window.meltdownEmit('validateToken', {
        jwt: window.ADMIN_TOKEN,
        moduleName: 'auth',
        moduleType: 'core',
        tokenToValidate: window.ADMIN_TOKEN
      });
      if (decoded && decoded.userId) {
        userLink.href = `/admin/settings/users/edit/${decoded.userId}`;
      }
    } catch (err) {
      console.error('[TopHeader] failed to decode token', err);
    }
  }

  if (logoutIcon) {
    logoutIcon.addEventListener('click', () => {
      window.location.href = '/admin/logout';
    });
  }

  if (searchToggle && searchContainer && searchInput) {
    searchToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      searchContainer.classList.toggle('open');
      if (searchContainer.classList.contains('open')) {
        searchInput.focus();
      } else {
        searchContainer.classList.remove('active');
      }
    });

    document.addEventListener('click', (e) => {
      if (!searchContainer.contains(e.target)) {
        searchContainer.classList.remove('open', 'active');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchContainer.classList.remove('open', 'active');
      }
    });
  }
}));
