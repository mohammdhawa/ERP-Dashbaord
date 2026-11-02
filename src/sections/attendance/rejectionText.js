// A refused day is one row, keyed on its first refused check-in (API doc
// §14.1). When the employee tried again and was refused again, the row says
// how many refusals the day had: the others are only in «السجلات».
export const refusedCheckInsLine = (rejection) => {
  const count = rejection?.refused_check_ins;
  return Number.isInteger(count) && count > 1
    ? `عدد التسجيلات المرفوضة في هذا اليوم: ${count}`
    : null;
};
