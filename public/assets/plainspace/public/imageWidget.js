export function render(el, ctx = {}) {
  const img = document.createElement('img');
  img.src = ctx?.metadata?.category || '/assets/images/abstract-gradient-bg.png';
  img.alt = 'Sample image';
  img.style.width = '100%';
  el.innerHTML = '';
  el.appendChild(img);

  if (ctx.jwt) {
    const btn = document.createElement('button');
    btn.textContent = 'Choose Image';
    btn.onclick = async () => {
      try {
        const list = await window.meltdownEmit('listLocalFolder', {
          jwt: ctx.jwt,
          moduleName: 'mediaManager',
          moduleType: 'core',
          subPath: 'public'
        });
        const files = list?.files || [];
        if (!files.length) return alert('No images found');
        const choice = prompt('Image file name:', files[0]);
        if (!choice) return;
        const { shareURL } = await window.meltdownEmit('createShareLink', {
          jwt: ctx.jwt,
          moduleName: 'shareManager',
          moduleType: 'core',
          filePath: 'public/' + choice
        });
        img.src = shareURL;
        await window.meltdownEmit('updateWidget', {
          jwt: ctx.jwt,
          moduleName: 'widgetManager',
          moduleType: 'core',
          widgetId: ctx.id,
          widgetType: 'public',
          newCategory: shareURL
        });
      } catch (err) {
        console.error('[imageWidget] select error', err);
      }
    };
    el.appendChild(btn);
  }
}
