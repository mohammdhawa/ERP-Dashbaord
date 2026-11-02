// What HR's file must hold for the import: every header the server requires,
// spelled exactly as it matches them (backend EmployeeRowMapper::WORKBOOK_COLUMNS
// — keep the two in step). A file missing any one is refused before a row is
// read; blank cells are fine, and other columns are ignored. Grouped only to be
// readable on the page.
export const IMPORT_COLUMN_GROUPS = [
  {
    title: "الهوية",
    columns: [
      "ID_Sarah",
      "الإسم الثلاثي",
      "الاسم الأول",
      "اسم الاب",
      "الكنية",
      "اسم الام",
      "اللقب",
      "الجنس",
      "المواليد",
      "مواليد_دقيقة",
      "الرقم الوطني في الهوية",
    ],
  },
  {
    title: "العائلة والتواصل",
    columns: [
      "الحالة الاجتماعية",
      "عدد الزوجات",
      "عدد الأبناء الذكور",
      "عدد الأبناء الاناث",
      "معرف / رقم  التواصل",
      "المحافظة",
    ],
  },
  {
    title: "التعليم",
    columns: [
      "المرحلة الدراسية",
      "المؤهل العلمي",
      "الاختصاص الدقيق",
      "تاريخ التخرج الدقيق",
    ],
  },
  {
    title: "التصنيف والراتب",
    columns: [
      "نوع النشاط",
      "السوية التنظيمية",
      "الخبرة",
      "الرتبة الهندسية",
      "سنوات الخبرة الصناعية",
      "الخطورة",
      "الندرة",
      "إزدواجية العمل",
      "حالة الراتب ( نظام / إتفاق )",
      "الراتب المتفق عليه",
      "رقم الشام كاش",
      "مكان الراتب",
    ],
  },
  {
    title: "العمل الحالي",
    columns: [
      "الحالة",
      "تاريخ التعيين",
      "مكان العمل",
      "مكان الدوام",
      "أسماء الإدارات",
      "القسم",
      "المكتب",
      "المسمى الوظيفي",
    ],
  },
  {
    title: "بداية التعيين",
    columns: [
      "المسمى الوظيفي بداية التعيين",
      "مكان العمل بداية التعيين",
      "المدير المباشر بداية التعيين",
    ],
  },
];

export const IMPORT_COLUMNS = IMPORT_COLUMN_GROUPS.flatMap((group) => group.columns);
