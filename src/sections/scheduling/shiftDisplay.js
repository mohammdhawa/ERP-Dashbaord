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

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// A shift's length from its start and end (per-shift rules spec §5.2): an end
// at or before the start is the next day; equal start and end is 24 hours.
// null until both are "HH:MM".
export const durationFromTimes = (start, end) => {
  if (!TIME.test(start ?? "") || !TIME.test(end ?? "")) return null;
  const diff = toMinutes(end) - toMinutes(start);
  return diff > 0 ? diff : diff + 1440;
};

// The end clock time of a shift of `minutes` from `start`; "" without a start.
export const endFromDuration = (start, minutes) => {
  if (!TIME.test(start ?? "")) return "";
  const end = (toMinutes(start) + Number(minutes)) % 1440;
  return `${pad(Math.floor(end / 60))}:${pad(end % 60)}`;
};

export const endsNextDay = (start, end) =>
  TIME.test(start ?? "") && TIME.test(end ?? "") && toMinutes(end) <= toMinutes(start);

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
