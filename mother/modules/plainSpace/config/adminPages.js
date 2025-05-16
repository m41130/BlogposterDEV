// mother/modules/plainSpace/config/adminPages.js
// Only admin pages, no default widgets or anything else. Because minimalism is so 2020.
export const ADMIN_PAGES = [
  {
    title: 'home',
    slug: 'home',
    lane: 'admin',
    config: {
      layout: {
        header: 'default-header',
        sidebar: 'default-sidebar',
        inheritsLayout: true
      },
      widgets: ['systemInfo', 'activityLog']
    }
  },
  {
    title: 'Page Management',
    slug: 'pages',
    lane: 'admin',
    config: {
      layout: {
        header: 'default-header',
        sidebar: 'default-sidebar',
        inheritsLayout: true
      },
      widgets: ['pageList', 'pageStats']
    }
  },
  {
    title: 'Page Builder',
    slug: 'builder',
    lane: 'admin',
    config: {
      layout: {
        header: 'builder-header',
        sidebar: 'empty-sidebar',
        inheritsLayout: false
      },
      widgets: ['builderWidget']
    }
  }
];
