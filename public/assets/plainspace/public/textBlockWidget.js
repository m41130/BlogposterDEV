export function render(el){
  const p=document.createElement('p');
  p.textContent='Sample text block';
  el.appendChild(p);
}
