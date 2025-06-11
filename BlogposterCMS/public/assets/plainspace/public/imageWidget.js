export function render(el, ctx = {}) {
  const img = document.createElement('img');
  img.src = ctx?.metadata?.category || '/assets/images/abstract-gradient-bg.png';
  img.alt = 'Image';
  img.style.width = '100%';

  el.innerHTML = '';
  el.appendChild(img);

  if (ctx.jwt) {
    const btn = document.createElement('button');
    btn.textContent = 'Choose Image';
    btn.addEventListener('click', async () => {
      try {
        const { shareURL } = await window.meltdownEmit('openMediaExplorer', { jwt: ctx.jwt });
        if (shareURL) {
          img.src = shareURL;
          await window.meltdownEmit('updateWidget', {
            jwt: ctx.jwt,
            moduleName: 'widgetManager',
            moduleType: 'core',
            widgetId: ctx.widgetId,
            widgetType: 'public',
            newCategory: shareURL
          });
        }
        } catch (err) {
          console.error('[imageWidget] openMediaExplorer error', err);
        }
      });
    el.appendChild(btn);
  }

}

