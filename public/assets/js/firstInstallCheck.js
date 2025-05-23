;(async () => {
  if (typeof window.meltdownEmit !== 'function') {
    console.error('[firstInstallCheck] meltdownEmit not available');
    return;
  }
  try {
    const pubJwt = await window.meltdownEmit('issuePublicToken', {
      purpose: 'firstInstallCheck',
      moduleName: 'auth'
    });
    const val = await window.meltdownEmit('getSetting', {
      jwt: pubJwt,
      moduleName: 'settingsManager',
      moduleType: 'core',
      key: 'FIRST_INSTALL_DONE'
    });
    if (val !== 'true') {
      window.location.href = '/register';
    }
  } catch (err) {
    console.error('[firstInstallCheck] Error checking setting', err);
    window.location.href = '/register';
  }
})();
