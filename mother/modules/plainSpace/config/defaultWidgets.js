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
  }
];
