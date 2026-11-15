// Pure rules of the calendar's cells.
const CLASSES = { default: "sched-default", change: "sched-change", swap: "sched-swap" };

export const sourceClass = (source) => CLASSES[source] ?? "";

export const MAX_CHANGE_DAYS = 31;

const DAY_MS = 86400000;
const dayNumber = (date) => {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
};

export const rangeBetween = (anchor, target) => {
  if (anchor.employeeId !== target.employeeId) {
    return { error: "اختر الأيام من صف الموظف نفسه." };
  }
  const [from, to] =
    anchor.date <= target.date ? [anchor.date, target.date] : [target.date, anchor.date];
  if (dayNumber(to) - dayNumber(from) + 1 > MAX_CHANGE_DAYS) {
    return { error: "لا يتجاوز تعديل الوردية 31 يوماً." };
  }
  return { from, to };
};
