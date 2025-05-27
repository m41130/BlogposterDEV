(document.addEventListener('DOMContentLoaded', () => {
  const builderLink = document.getElementById('builder-link');
  if (builderLink && window.PAGE_ID) {
    builderLink.href = `/admin/builder?pageId=${window.PAGE_ID}`;
  }
}));
