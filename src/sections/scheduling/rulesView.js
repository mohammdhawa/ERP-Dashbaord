// What the shift screens show of a shift's rules (per-shift rules spec §5.2).
// Pure: node --test loads it.
import { formatMinutes } from "../attendance/minutesText.js";

// Only a version that has not started yet (after today, Damascus) can go; the
// first one (2000-01-01) never can.
export const canDeleteRuleVersion = (version, today) => String(version?.effective_from ?? "") > today;

const mins = (n) => formatMinutes(n) || "0 د";

// One line for a rules object.
export const ruleSummary = (rules) =>
  [
    `تأخر ${mins(rules.late_grace_minutes)}`,
    `انصراف مبكر ${mins(rules.early_leave_grace_minutes)}`,
    `فتح ${mins(rules.check_in_opens_minutes)}`,
    `قبول ${mins(rules.check_out_closes_minutes)}`,
    rules.overtime_enabled ? `عمل إضافي من ${mins(rules.overtime_min_minutes)}` : "بلا عمل إضافي",
    `مطلوب ${mins(rules.required_minutes)}`,
  ].join(" · ");
