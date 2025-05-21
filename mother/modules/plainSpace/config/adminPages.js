// mother/modules/plainSpace/config/adminPages.js
// All admin pages: Home, Page Management, Page Builder. Minimalism is dead, flexibility wins.

module.exports.ADMIN_PAGES = [
  {
    title: 'Home',
    slug: 'home',
    lane: 'admin',
    config: {
      layout: {
        header: 'top-header',
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
        header: 'top-header',
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
        header: 'top-header',
        sidebar: 'sidebar-builder', // Special sidebar with draggable widget icons
        inheritsLayout: false
      },
      widgetLane: 'public',  // <-- Show ALL public widgets in the builder, not preselected
      widgets: []            // <-- No preselection, empty array: builder picks dynamically
    }
  },
  {
    title: 'Page Editor',
    // Slug sanitized by pagesManager => slashes become hyphens
    slug: 'edit',
    parentSlug: 'pages',
    lane: 'admin',
    config: {
      layout: {
        header: 'top-header',
        sidebar: 'default-sidebar',
        inheritsLayout: true
      },
      widgets: [
        'pageInfoEditor',
        'pageSettingsEditor',
        'seoImageEditor'
      ]
    }
  }
];
