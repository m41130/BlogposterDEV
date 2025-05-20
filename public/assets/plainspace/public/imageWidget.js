export function render(el){
  const img=document.createElement('img');
  img.src='/assets/images/abstract-gradient-bg.png';
  img.alt='Sample image';
  img.style.width='100%';
  el.appendChild(img);
}
