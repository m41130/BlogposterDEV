module.exports = {
  initialize({ motherEmitter, fontsModuleSecret, jwt }) {
    motherEmitter.emit('registerFontProvider', {
      jwt,
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
