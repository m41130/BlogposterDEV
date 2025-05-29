export function render(el, ctx = {}) {
  const h = document.createElement('h3');
  h.textContent = ctx?.metadata?.label || 'Section Heading';
  if (ctx.jwt) {
    h.contentEditable = 'true';
    h.addEventListener('blur', async () => {
      const newText = h.textContent.trim();
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
        console.error('[headingWidget] save error', err);
      }
    });
  }
  el.innerHTML = '';
  el.appendChild(h);
}
