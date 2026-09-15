// HR enum option lists — FOR FORM INPUTS AND FILTER CONTROLS ONLY.
//
// ⚠️ DISPLAY ALWAYS USES THE SERVER'S `{field}_label`.
// Every enum ships from the API as an int plus an Arabic `{field}_label`
// (`status: 1` + `status_label: "نشط"`). Render that label. These lists exist
// only to populate a <select> — a value the user has not yet submitted has no
// server label yet, so the form needs its own copy of the wording.
//
// Never use them as a display mapping: the day the backend adds a value or
// rewords one, a local mapping renders a stale label or a blank cell, while
// `{field}_label` is right by construction.
//
// Values are from API doc §8.5. Filter on the int, never on the label.

export const GENDER_OPTIONS = [
  { value: 1, label: "ذكر" },
  { value: 2, label: "أنثى" },
];

export const MARITAL_STATUS_OPTIONS = [
  { value: 1, label: "عازب" },
  { value: 2, label: "متزوج" },
  { value: 3, label: "مطلق" },
  { value: 4, label: "أرمل" },
];

// 2 موقوف is SUSPENDED — it is not the old "inactive". 3 ends the service.
export const STATUS_OPTIONS = [
  { value: 1, label: "نشط" },
  { value: 2, label: "موقوف" },
  { value: 3, label: "منتهي الخدمة" },
];

export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 1, label: "متعاقد" },
  { value: 2, label: "يحتاج تثبيت" },
  { value: 3, label: "جماعة" },
  { value: 4, label: "مثبت" },
];

export const SALARY_MODE_OPTIONS = [
  { value: 1, label: "نظام رواتب" },
  { value: 2, label: "إتفاق" },
];

export const ACTIVITY_TYPE_OPTIONS = [
  { value: 1, label: "هندسي" },
  { value: 2, label: "صناعي" },
  { value: 3, label: "إداري" },
  { value: 4, label: "مالي" },
  { value: 5, label: "أمني" },
];

// An ORDERED scale: the int ascends with attainment. It is an order, not an
// amount — سنة 4، سنة 5 and كلية are distinct rungs that can carry one identical
// pay value. Never compute anything from the case number.
export const EDUCATION_LEVEL_OPTIONS = [
  { value: 1, label: "لا يوجد" },
  { value: 2, label: "ابتدائي" },
  { value: 3, label: "تاسع" },
  { value: 4, label: "بكالوريا" },
  { value: 5, label: "سنة 1" },
  { value: 6, label: "سنة 2" },
  { value: 7, label: "معهد" },
  { value: 8, label: "سنة 3" },
  { value: 9, label: "سنة 4" },
  { value: 10, label: "سنة 5" },
  { value: 11, label: "كلية" },
  { value: 12, label: "ماجستير" },
  { value: 13, label: "دكتوراه" },
];

// Also an ordered scale. Only valid when activity_type = 1 (هندسي).
export const ENGINEERING_RANK_OPTIONS = [
  { value: 1, label: "لا يوجد" },
  { value: 2, label: "متدرب" },
  { value: 3, label: "مراقب فني" },
  { value: 4, label: "مساعد مهندس" },
  { value: 5, label: "مشارك" },
  { value: 6, label: "ممارس" },
  { value: 7, label: "رأي" },
  { value: 8, label: "استشاري" },
  { value: 9, label: "ركن" },
];

export const GOVERNORATE_OPTIONS = [
  { value: 1, label: "دمشق" },
  { value: 2, label: "ريف دمشق" },
  { value: 3, label: "حلب" },
  { value: 4, label: "حمص" },
  { value: 5, label: "حماة" },
  { value: 6, label: "اللاذقية" },
  { value: 7, label: "طرطوس" },
  { value: 8, label: "إدلب" },
  { value: 9, label: "درعا" },
  { value: 10, label: "السويداء" },
  { value: 11, label: "القنيطرة" },
  { value: 12, label: "دير الزور" },
  { value: 13, label: "الرقة" },
  { value: 14, label: "الحسكة" },
];

// Posting-history reason. Required on create with NO default — the user must
// choose, because the reason is the only thing distinguishing a promotion from
// a restructure once the row is written.
export const ASSIGNMENT_REASON_OPTIONS = [
  { value: 1, label: "تعيين" },
  { value: 2, label: "نقل داخلي" },
  { value: 3, label: "ترقية" },
  { value: 4, label: "تعديل مسمى وظيفي" },
  { value: 5, label: "إعادة هيكلة" },
  { value: 6, label: "إنهاء عمل" },
];

// organizational_grade and experience_level are plain 1–5 integer scales with
// no server-side label; the number itself is the value HR uses.
export const GRADE_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({
  value: n,
  label: String(n),
}));
