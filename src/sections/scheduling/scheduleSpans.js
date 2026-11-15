import { todayInDamascus } from "../attendance/recordFilters.js";

// Which actions a schedule span offers on the employee profile (API doc §19.3).
// "Not started" means from_date is after today on the Damascus calendar.

// A span can be ended (or shortened) once it has started and has not ended:
// from_date <= today and (open or to_date >= today), Damascus dates. One that
// has not started offers only deletion.
export const canEndSpan = (span, now = new Date()) => {
  if (!span?.from_date) return false;
  const today = todayInDamascus(now);
  if (span.from_date > today) return false;
  return span.to_date === null || span.to_date === undefined || span.to_date >= today;
};

// Only a span that has not started can be deleted.
export const canDeleteSpan = (span, now = new Date()) =>
  !!span?.from_date && span.from_date > todayInDamascus(now);

// "YYYY-MM" of a Damascus date.
export const monthOf = (date) => date.slice(0, 7);

// First and last day of a "YYYY-MM" month, or null when it is not one.
export const boundsOfMonth = (ym) => {
  const match = /^(\d{4})-(\d{2})$/.exec(ym ?? "");
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${ym}-01`, to: `${ym}-${String(last).padStart(2, "0")}` };
};

// The "YYYY-MM" month `delta` months away.
export const shiftMonth = (ym, delta) => {
  const [year, month] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
