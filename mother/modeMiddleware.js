// mother/modeMiddleware.js
module.exports = function (motherEmitter) {
  return (req, res, next) => {
    // 1) Retrieve the raw token from the admin cookie
    const userToken = req.cookies?.admin_jwt;

    // meltdown-style => we do "getCmsMode" with { jwt, moduleName:'settingsManager', moduleType:'core' }
    motherEmitter.emit(
      'getCmsMode',
      {
        jwt: userToken,
        moduleName: 'settingsManager',
        moduleType: 'core'
      },
      (err, mode) => {
        if (err) {
          console.error('[MODE MIDDLEWARE] Error fetching mode:', err.message);
          mode = 'cms'; // fallback
        }
        req.cmsMode = mode || 'cms'; // e.g. 'cms' | 'shop' | 'headless'
        next();
      }
    );
  };
};
