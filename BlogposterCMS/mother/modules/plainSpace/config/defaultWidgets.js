// mother/modules/plainSpace/config/defaultWidgets.js
// Our must-have "default" widgets for demonstration purposes.

const { PUBLIC_LANE, ADMIN_LANE } = require('../plainSpaceService');

module.exports.DEFAULT_WIDGETS = [
  {
    widgetId: 'counter',
    widgetType: PUBLIC_LANE,
    label: 'Counter',
    content: '/assets/plainspace/public/counterWidget.js',
    category: 'demo'
  },
  {
    widgetId: 'heroBanner',
    widgetType: PUBLIC_LANE,
    label: 'Hero Banner',
    content: '/assets/plainspace/public/heroBannerWidget.js',
    category: 'marketing'
  },
  {
    widgetId: 'textBlock',
    widgetType: PUBLIC_LANE,
    label: 'Text Block',
    content: '/assets/plainspace/public/textBlockWidget.js',
    category: 'basic'
  },
  {
    widgetId: 'imageWidget',
    widgetType: PUBLIC_LANE,
    label: 'Image',
    content: '/assets/plainspace/public/imageWidget.js',
    category: 'basic'
  },
  {
    widgetId: 'headingWidget',
    widgetType: PUBLIC_LANE,
    label: 'Heading',
    content: '/assets/plainspace/public/headingWidget.js',
    category: 'basic'
  },
  {
    widgetId: 'buttonWidget',
    widgetType: PUBLIC_LANE,
    label: 'Button',
    content: '/assets/plainspace/public/buttonWidget.js',
    category: 'interactive'
  },
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
  }
];
