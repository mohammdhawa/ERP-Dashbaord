import { todayInDamascus } from "../attendance/recordFilters.js";

// "Past" is a Damascus date: a browser at UTC late in the evening is already
// tomorrow in Damascus.
export const isPastDate = (date, now = new Date()) => date < todayInDamascus(now);
