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
  }
];
