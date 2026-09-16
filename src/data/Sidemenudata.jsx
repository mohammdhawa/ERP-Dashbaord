// A GROUP EARNS ITS NESTING BY HAVING SOMETHING TO GROUP.
//
// "المؤسسة" and "الحساب" were `sub` entries wrapping exactly one child each, so
// reaching الوحدات التنظيمية or الإشعارات cost an expand plus a click for a
// submenu that could never contain a choice. They are flat `link` rows now,
// carrying the permission their single child used to carry — Sidebar.jsx
// filters top-level links on `requiredPermissions`, so the gating is unchanged.
//
// الموارد البشرية and إدارة النظام keep their nesting: each holds two real
// siblings. When a section here grows a second item, promote it back to `sub`.
export const MENUITEMS = [
  {
    title: "لوحة التحكم",
    icon: "ri-home-line",
    menusub: false,
    active: false,
    selected: false,
    dirchange: false,
    path: ``,
    type: "link",
    requiredPermissions: [],
  },
  {
    title: "الوحدات التنظيمية",
    icon: "ri-community-line",
    menusub: false,
    type: "link",
    active: false,
    selected: false,
    dirchange: false,
    path: `${import.meta.env.BASE_URL}departments`,
    requiredPermissions: ["departments.view"],
  },
  {
    title: "الموارد البشرية",
    icon: "ri-team-line",
    menusub: true,
    type: "sub",
    active: false,
    selected: false,
    dirchange: false,
    requiredPermissions: [],
    children: [
      {
        path: `${import.meta.env.BASE_URL}hr/employees`,
        type: "link",
        active: false,
        selected: false,
        dirchange: false,
        title: "الموظفين",
        requiredPermissions: ["hr.employees.view"],
      },
      {
        path: `${import.meta.env.BASE_URL}hr/job-titles`,
        type: "link",
        active: false,
        selected: false,
        dirchange: false,
        title: "المسميات الوظيفية",
        requiredPermissions: ["hr.job_titles.view"],
      },
    ],
  },
  {
    title: "إدارة النظام",
    icon: "ri-settings-3-line",
    menusub: true,
    type: "sub",
    active: false,
    selected: false,
    dirchange: false,
    requiredPermissions: [],
    children: [
      {
        path: `${import.meta.env.BASE_URL}users`,
        type: "link",
        active: false,
        selected: false,
        dirchange: false,
        title: "المستخدمين",
        requiredPermissions: ["auth.users.view"],
      },
      {
        path: `${import.meta.env.BASE_URL}roles`,
        type: "link",
        active: false,
        selected: false,
        dirchange: false,
        title: "الأدوار والصلاحيات",
        requiredPermissions: ["auth.roles.view"],
      },
    ],
  },
  {
    title: "الإشعارات",
    icon: "ri-notification-3-line",
    menusub: false,
    type: "link",
    active: false,
    selected: false,
    dirchange: false,
    path: `${import.meta.env.BASE_URL}notifications`,
    // Owner-scoped: every signed-in account has its own notifications.
    requiredPermissions: [],
  },
];
