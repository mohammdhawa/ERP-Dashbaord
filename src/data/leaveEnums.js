// Leave option lists — FOR FORM INPUTS AND FILTER CONTROLS ONLY.
//
// ⚠️ DISPLAY ALWAYS USES THE SERVER'S `{field}_label` (`status_label`,
// `origin_label`), exactly as src/data/hrEnums.js explains. These lists only
// populate a <select> before the server has a label to give.
//
// Values are from API doc §16.3. Filter on the int, never on the label.

export const LEAVE_STATUS_OPTIONS = [
  { value: 1, label: "قيد الاعتماد" },
  { value: 2, label: "معتمدة" },
  { value: 3, label: "مرفوضة" },
  { value: 4, label: "ملغاة" },
];

// `is_excuse` as the register's filter sends it: "" is "no filter" (the
// param is omitted), "0" the employees' own requests, "1" HR's excuses.
export const EXCUSE_FILTER_OPTIONS = [
  { value: "", label: "الكل" },
  { value: "0", label: "طلبات الموظفين" },
  { value: "1", label: "أعذار إدارية" },
];
