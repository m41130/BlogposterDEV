export function render(el, ctx = {}) {
  const p = document.createElement('p');
  p.textContent = ctx?.metadata?.label || 'Sample text block';
  if (ctx.jwt) {
    p.contentEditable = 'true';
    p.addEventListener('blur', async () => {
      const newText = p.textContent.trim();
      try {
        await window.meltdownEmit('updateWidget', {
          jwt: ctx.jwt,
          moduleName: 'widgetManager',
          moduleType: 'core',
          widgetId: ctx.id,
          widgetType: 'public',
          newLabel: newText
        });
      } catch (err) {
        console.error('[textBlockWidget] save error', err);
      }
    });
  }
  el.innerHTML = '';
  el.appendChild(p);
}
