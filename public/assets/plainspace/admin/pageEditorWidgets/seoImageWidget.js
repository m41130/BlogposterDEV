export async function render(el) {
  const page = await window.pageDataPromise;

  if (!page) {
    el.innerHTML = '<p>Missing credentials or page id.</p>';
    return;
  }
  const container = document.createElement('div');
  container.className = 'seo-image-widget';

  const imageLabel = document.createElement('label');
  imageLabel.textContent = 'SEO Image URL';
  const imageInput = document.createElement('input');
  imageInput.id = 'pe-image';
  imageInput.type = 'text';
  imageInput.placeholder = 'https://example.com/image.jpg';
  imageInput.value = page.seo_image || '';
  imageLabel.appendChild(document.createElement('br'));
  imageLabel.appendChild(imageInput);

  container.appendChild(imageLabel);
  el.innerHTML = '';
  el.appendChild(container);
}