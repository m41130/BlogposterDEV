export function render(el){
  const btn=document.createElement('button');
  btn.textContent='Click me';
  btn.addEventListener('click',()=>alert('Button clicked!'));
  el.appendChild(btn);
}
