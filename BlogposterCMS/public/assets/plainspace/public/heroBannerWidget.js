// public/assets/plainspace/public/heroBannerWidget.js
export function render(el, ctx = {}) {
    const h = document.createElement('h2');
    // Avoid hard coded greeting that overwrites edits
    h.textContent = ctx?.metadata?.label || '';
    el.appendChild(h);
}
  