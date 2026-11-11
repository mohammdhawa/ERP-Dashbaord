import { WEEKDAY_NAMES } from "../attendance/employeeGridFilters.js";

// Weekly schedules are shown Saturday first; each row still carries its own
// position (Sunday 0 … Saturday 6).
export const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5];

const pad = (n) => String(n).padStart(2, "0");

export const shiftSpan = ({ starts_at, duration_minutes, ends_next_day }) => {
  const [h, m] = starts_at.split(":").map(Number);
  const end = (h * 60 + m + duration_minutes) % 1440;
  const span = `${starts_at} – ${pad(Math.floor(end / 60))}:${pad(end % 60)}`;
  return ends_next_day ? `${span} (اليوم التالي)` : span;
};

export const displayPositions = (kind, cycleDays) =>
  kind === 1 ? [...WEEK_ORDER] : Array.from({ length: cycleDays }, (_, i) => i);

export const scheduleDayLabel = (kind, position) =>
  kind === 1 ? WEEKDAY_NAMES[position] : `اليوم ${position + 1}`;

// The ISO strings already carry the +03:00 offset, so the clock time is read
// straight from the text.
const clock = (iso) => iso.slice(11, 16);

export const calendarCellTitle = (shift) =>
  shift ? `${shift.name} · ${clock(shift.starts_at)} – ${clock(shift.ends_at)}` : "راحة";

// Arabic number agreement for a day count: 1 «يوم واحد», 2 «يومان»,
// 3–10 «N أيام», 11 and up «N يوماً».
export const daysText = (n) => {
  if (n === 1) return "يوم واحد";
  if (n === 2) return "يومان";
  if (n >= 3 && n <= 10) return `${n} أيام`;
  return `${n} يوماً`;
};
