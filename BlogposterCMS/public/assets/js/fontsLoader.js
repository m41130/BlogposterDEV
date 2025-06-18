(async () => {
  if (typeof window.meltdownEmit !== 'function') return;
  try {
    const jwt = await window.meltdownEmit('issuePublicToken', {
      purpose: 'fonts',
      moduleName: 'auth'
    });
    let providers = await window.meltdownEmit('listFontProviders', {
      jwt,
      moduleName: 'fontsManager',
      moduleType: 'core'
    });
    providers = Array.isArray(providers) ? providers : (providers?.data ?? []);
    const google = providers.find(p => p.name === 'googleFonts');
    if (google && google.isEnabled) {
      const urls = [
        'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600&display=swap',
        'https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600&display=swap',
        'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&display=swap',
        'https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600&display=swap',
        'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600&display=swap'
      ];
      urls.forEach(href => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
      });
    }
  } catch (err) {
    console.error('[fontsLoader] Failed to load fonts', err);
  }
})();
