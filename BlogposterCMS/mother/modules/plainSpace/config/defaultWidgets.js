// mother/modules/plainSpace/config/defaultWidgets.js
// Our must-have "default" widgets for demonstration purposes.

const { PUBLIC_LANE, ADMIN_LANE } = require('../plainSpaceService');

module.exports.DEFAULT_WIDGETS = [
  {
    widgetId: 'systemInfo',
    widgetType: ADMIN_LANE,
    label: 'System Info',
    content: '/assets/plainspace/admin/systemInfoWidget.js',
    category: 'core'
  },
  {
    widgetId: 'activityLog',
    widgetType: ADMIN_LANE,
    label: 'Activity Log',
    content: '/assets/plainspace/admin/activityLogWidget.js',
    category: 'core'
  },
  {
    widgetId: 'contentSummary',
    widgetType: ADMIN_LANE,
    label: 'Content Summary',
    content: '/assets/plainspace/admin/defaultwidgets/contentSummaryWidget.js',
    category: 'core'
  },
  {
    widgetId: 'pageInfoEditor',
    widgetType: ADMIN_LANE,
    label: 'Page Info Editor',
    content: '/assets/plainspace/admin/pageEditorWidgets/pageInfoWidget.js',
    category: 'core'
  },
  {
    widgetId: 'pageSettingsEditor',
    widgetType: ADMIN_LANE,
    label: 'Page Settings Editor',
    content: '/assets/plainspace/admin/pageEditorWidgets/pageSettingsWidget.js',
    category: 'core'
  },
  {
    widgetId: 'seoImageEditor',
    widgetType: ADMIN_LANE,
    label: 'SEO Image Editor',
    content: '/assets/plainspace/admin/pageEditorWidgets/seoImageWidget.js',
    category: 'core'
  },
  {
    widgetId: 'mediaExplorer',
    widgetType: ADMIN_LANE,
    label: 'Media Explorer',
    content: '/assets/plainspace/admin/mediaExplorerWidget.js',
    category: 'core'
  },
  {
    widgetId: 'modulesList',
    widgetType: ADMIN_LANE,
    label: 'Modules List',
    content: '/assets/plainspace/admin/modulesListWidget.js',
    category: 'core'
  },
  {
    widgetId: 'usersList',
    widgetType: ADMIN_LANE,
    label: 'Users List',
    content: '/assets/plainspace/admin/usersListWidget.js',
    category: 'core'
  },
  {
    widgetId: 'userEdit',
    widgetType: ADMIN_LANE,
    label: 'User Editor',
    content: '/assets/plainspace/admin/userEditWidget.js',
    category: 'core'
  },
  {
    widgetId: 'permissionsList',
    widgetType: ADMIN_LANE,
    label: 'Permissions List',
    content: '/assets/plainspace/admin/permissionsWidget.js',
    category: 'core'
  },
  {
    widgetId: 'layoutTemplates',
    widgetType: ADMIN_LANE,
    label: 'Layouts',
    content: '/assets/plainspace/admin/layoutTemplatesWidget.js',
    category: 'core'
  },
  {
    widgetId: 'themesList',
    widgetType: ADMIN_LANE,
    label: 'Themes List',
    content: '/assets/plainspace/admin/themesListWidget.js',
    category: 'core'
  },
  {
    widgetId: 'loginStrategies',
    widgetType: ADMIN_LANE,
    label: 'Login Strategies',
    content: '/assets/plainspace/admin/loginStrategiesWidget.js',
    category: 'core'
  },
  {
    widgetId: 'fontsList',
    widgetType: ADMIN_LANE,
    label: 'Font Providers',
    content: '/assets/plainspace/admin/fontsListWidget.js',
    category: 'core'
  },
  {
    widgetId: 'loginStrategyEdit',
    widgetType: ADMIN_LANE,
    label: 'Login Strategy Edit',
    content: '/assets/plainspace/admin/loginStrategyEditWidget.js',
    category: 'core'
  },
  {
    widgetId: 'widgetList',
    widgetType: ADMIN_LANE,
    label: 'Widget List',
    content: '/assets/plainspace/admin/widgetListWidget.js',
    category: 'core'
  },
  {
    widgetId: 'textBlock',
    widgetType: PUBLIC_LANE,
    label: 'Text Block',
    content: '/assets/plainspace/public/basicwidgets/textWidget.js',
    category: 'basic'
  },
  {
    widgetId: 'imageBlock',
    widgetType: PUBLIC_LANE,
    label: 'Image Block',
    content: '/assets/plainspace/public/basicwidgets/imageWidget.js',
    category: 'basic'
  },
  {
    widgetId: 'buttonBlock',
    widgetType: PUBLIC_LANE,
    label: 'Button Block',
    content: '/assets/plainspace/public/basicwidgets/buttonWidget.js',
    category: 'basic'
  },
  {
    widgetId: 'containerBlock',
    widgetType: PUBLIC_LANE,
    label: 'Container Block',
    content: '/assets/plainspace/public/basicwidgets/containerWidget.js',
    category: 'basic'
  },
  {
    widgetId: 'shapeBlock',
    widgetType: PUBLIC_LANE,
    label: 'Shape Block',
    content: '/assets/plainspace/public/basicwidgets/shapeWidget.js',
    category: 'basic'
  }
];
