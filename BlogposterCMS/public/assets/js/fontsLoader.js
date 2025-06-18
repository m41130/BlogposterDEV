(async () => {
  if (typeof window.meltdownEmit !== 'function') return;
  let fonts = [];
  try {
    const jwt = await window.meltdownEmit('issuePublicToken', {
      purpose: 'fonts',
      moduleName: 'auth'
    });
    let list = await window.meltdownEmit('listFonts', {
      jwt,
      moduleName: 'fontsManager',
      moduleType: 'core'
    });
    list = Array.isArray(list) ? list : (list?.data ?? []);
    fonts = list.map(f => f.name);
    window.AVAILABLE_FONTS = fonts;

    let providers = await window.meltdownEmit('listFontProviders', {
      jwt,
      moduleName: 'fontsManager',
      moduleType: 'core'
    });
    providers = Array.isArray(providers) ? providers : (providers?.data ?? []);
    const google = providers.find(p => p.name === 'googleFonts');
    if (google && google.isEnabled) {
      list.filter(f => f.provider === 'googleFonts' && f.url).forEach(f => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = f.url;
        document.head.appendChild(link);
      });
    }
    document.dispatchEvent(new CustomEvent('fontsUpdated', { detail: { fonts } }));
  } catch (err) {
    console.error('[fontsLoader] Failed to load fonts', err);
  }
})();
