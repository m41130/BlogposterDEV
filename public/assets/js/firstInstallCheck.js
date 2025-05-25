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
    const val = await window.meltdownEmit('getPublicSetting', {
      jwt: pubJwt,
      moduleName: 'settingsManager',
      moduleType: 'core',
      key: 'FIRST_INSTALL_DONE'
    });

    if (val !== 'true') {
      let userCount = 0;
      try {
        userCount = await window.meltdownEmit('getUserCount', {
          jwt: pubJwt,
          moduleName: 'userManagement',
          moduleType: 'core'
        });
      } catch (err) {
        console.warn('[firstInstallCheck] Failed to fetch user count', err);
      }

      if (userCount === 0) {
        window.location.href = '/register';
      }
    }
  } catch (err) {
    console.error('[firstInstallCheck] Error checking setting', err);
    window.location.href = '/register';
  }
})();
