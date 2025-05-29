// mother/modules/pagesManager/config/defaultWidgets.js
// Default widgets seeded by pagesManager.

const ADMIN_LANE = 'admin';

module.exports.DEFAULT_WIDGETS = [
  {
    widgetId: 'pageList',
    widgetType: ADMIN_LANE,
    label: 'Page List',
    content: '/assets/plainspace/admin/defaultwidgets/pageList.js',
    category: 'core'
  },
  {
    widgetId: 'pageStats',
    widgetType: ADMIN_LANE,
    label: 'Page Stats',
    content: '/assets/plainspace/admin/defaultwidgets/pageStats.js',
    category: 'core'
  },
  {
    widgetId: 'pageInfoWidget',
    widgetType: ADMIN_LANE,
    label: 'Page Info',
    content: '/assets/plainspace/admin/pageEditorWidgets/pageInfoWidget.js',
    category: 'core'
  },
  {
    widgetId: 'pageSettingsWidget',
    widgetType: ADMIN_LANE,
    label: 'Page Settings',
    content: '/assets/plainspace/admin/pageEditorWidgets/pageSettingsWidget.js',
    category: 'core'
  },
  {
    widgetId: 'seoImageWidget',
    widgetType: ADMIN_LANE,
    label: 'SEO Image',
    content: '/assets/plainspace/admin/pageEditorWidgets/seoImageWidget.js',
    category: 'core'
  },
  {
    widgetId: 'savePageWidget',
    widgetType: ADMIN_LANE,
    label: 'Save Page',
    content: '/assets/plainspace/admin/pageEditorWidgets/savePageWidget.js',
    category: 'core'
  },
];
