// Attendance option lists — FOR FORM INPUTS AND FILTER CONTROLS ONLY.
//
// ⚠️ DISPLAY ALWAYS USES THE SERVER'S `{field}_label` (`status_label`,
// `reason_label`), exactly as src/data/hrEnums.js explains. These lists only
// populate a <select> before the server has a label to give.
//
// Values are from API doc §13.1 (type, rejection reason) and §14 (day states).
// Filter on the int, never on the label.

export const RECORD_TYPE_OPTIONS = [
  { value: 1, label: "حضور" },
  { value: 2, label: "انصراف" },
];

export const REJECTION_REASON_OPTIONS = [
  { value: 1, label: "الموقع المسجَّل لا يطابق موقع العمل" },
  { value: 2, label: "الصورة الشخصية غير صحيحة أو غير واضحة" },
  { value: 3, label: "مخالفة تعليمات تسجيل الحضور" },
];

// The day states of the reports (§14). 7 («عطلة») does not occur while every
// day is a working day, but the server may send it, so the filter offers it.
export const DAY_STATE_OPTIONS = [
  { value: 1, label: "حاضر (لم ينصرف بعد)" },
  { value: 2, label: "حاضر" },
  { value: 3, label: "انصراف مفقود" },
  { value: 4, label: "في إجازة" },
  { value: 5, label: "غياب بعذر" },
  { value: 6, label: "غائب" },
  { value: 7, label: "عطلة" },
  { value: 8, label: "تسجيل مرفوض" },
  // 2026-10-20: a day after today, or today before anything is recorded —
  // not absent (parity audit S-1).
  { value: 9, label: "لم يُسجَّل بعد" },
];
