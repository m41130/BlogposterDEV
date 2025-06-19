export function render(el) {
  const img = document.createElement('img');
  img.src = '/assets/images/abstract-gradient-bg.png';
  img.alt = 'Image';
  img.style.width = '100%';

  el.innerHTML = '';
  el.appendChild(img);
}


