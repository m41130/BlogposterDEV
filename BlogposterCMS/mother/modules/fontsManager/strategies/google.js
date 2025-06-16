module.exports = {
  initialize({ motherEmitter, fontsModuleSecret }) {
    motherEmitter.emit('registerFontProvider', {
      skipJWT: true,
      moduleType: 'core',
      moduleName: 'fontsManager',
      fontsModuleSecret,
      providerName: 'googleFonts',
      description: 'Google Fonts provider',
      isEnabled: false,
      initFunction: () => {}
    });
  }
};
