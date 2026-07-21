// Phase-1 permission catalogue (API doc §2), grouped for the role-form matrix.
// Format: {module}.{resource}.{action}
export const PERMISSIONS_CATALOG = [
  {
    module: "الأقسام",
    key: "departments",
    permissions: [
      { name: "departments.view", label: "عرض الأقسام" },
      { name: "departments.create", label: "إنشاء قسم" },
      { name: "departments.update", label: "تعديل قسم" },
      { name: "departments.delete", label: "حذف قسم" },
    ],
  },
  {
    module: "الموارد البشرية",
    key: "hr",
    permissions: [
      { name: "hr.employees.view", label: "عرض الموظفين" },
      { name: "hr.employees.create", label: "إضافة موظف" },
      { name: "hr.employees.update", label: "تعديل موظف" },
      { name: "hr.employees.delete", label: "حذف موظف" },
    ],
  },
  {
    module: "المستخدمين",
    key: "auth.users",
    permissions: [
      { name: "auth.users.view", label: "عرض المستخدمين" },
      { name: "auth.users.create", label: "إنشاء مستخدم" },
      { name: "auth.users.update", label: "تعديل مستخدم" },
      { name: "auth.users.delete", label: "حذف مستخدم" },
    ],
  },
  {
    module: "الأدوار والصلاحيات",
    key: "auth.roles",
    permissions: [
      { name: "auth.roles.view", label: "عرض الأدوار" },
      { name: "auth.roles.create", label: "إنشاء دور" },
      { name: "auth.roles.update", label: "تعديل دور" },
      { name: "auth.roles.delete", label: "حذف دور" },
    ],
  },
];

export const ALL_PERMISSION_NAMES = PERMISSIONS_CATALOG.flatMap((group) =>
  group.permissions.map((p) => p.name)
);

export const permissionLabel = (name) => {
  for (const group of PERMISSIONS_CATALOG) {
    const found = group.permissions.find((p) => p.name === name);
    if (found) return found.label;
  }
  return name;
};
