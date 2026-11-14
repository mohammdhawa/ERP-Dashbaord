// Request bodies for the scheduling screens (API doc §19). Pure: no imports
// that touch `import.meta`, so `node --test` loads it.

export const toShiftBody = (form, { editing }) => {
  const body = {
    name: String(form.name ?? "").trim(),
    starts_at: String(form.starts_at ?? "").trim(),
    duration_minutes: Number(form.duration_minutes),
    is_active: Boolean(form.is_active),
  };
  // A shift keeps its code for life; PATCH refuses it.
  if (!editing) body.code = String(form.code ?? "").trim();
  return body;
};

const dayShift = (days, position) => {
  const chosen = days?.[position];
  return chosen === "" || chosen === null || chosen === undefined
    ? null
    : Number(chosen);
};

// `days` is keyed by position (Sunday 0 ... Saturday 6 for a weekly schedule),
// so the order the editor shows them in never reaches the wire. Every position
// is sent, ascending; a day off is `null` - the server reads anything else as a
// shift id.
//
// On edit, `days` goes only when it differs from `initialDays` (the schedule as
// opened): the server re-writes the days whenever the key is present, and
// refuses that for the default schedule and any assigned one - even when
// nothing changed - so a rename or a deactivation must not carry them.
export const toScheduleBody = (form, { editing, initialDays }) => {
  const cycleDays = Number(form.cycle_days);
  const days = Array.from({ length: cycleDays }, (_, position) => ({
    position,
    shift_id: dayShift(form.days, position),
  }));
  const body = {
    name: String(form.name ?? "").trim(),
    is_active: Boolean(form.is_active),
  };
  const changed =
    !editing ||
    !initialDays ||
    days.some(({ position, shift_id }) => shift_id !== dayShift(initialDays, position));
  if (changed) body.days = days;
  // Code, kind and cycle length are fixed once the schedule exists.
  if (!editing) {
    body.code = String(form.code ?? "").trim();
    body.kind = Number(form.kind);
    body.cycle_days = cycleDays;
  }
  return body;
};

// One-off change (API doc §19.6). The form's «يوم راحة» is the explicit value
// "off" and goes as `shift_id: null` - the server reads anything else as a
// shift id. "" is the unchosen placeholder; the form never submits it.
export const toShiftChangeBody = ({ from, to, shiftId, reason }) => ({
  from,
  to,
  shift_id:
    shiftId === "off" || shiftId === "" || shiftId === null || shiftId === undefined
      ? null
      : Number(shiftId),
  reason: String(reason ?? "").trim(),
});

// Assigning a schedule (§19.3). `cycle_start_date` goes only with a cycle
// schedule (`kind` 2); a weekly one refuses it.
export const toAssignmentBody = ({ scheduleId, fromDate, cycleStartDate, kind }) => {
  const body = { work_schedule_id: Number(scheduleId), from_date: fromDate };
  if (Number(kind) === 2) body.cycle_start_date = cycleStartDate;
  return body;
};

// Bulk assignment (§19.4): the ticked people, or a unit and everything under
// it. `null` when there is nobody to name.
export const toBulkBody = ({
  scheduleId,
  fromDate,
  cycleStartDate,
  kind,
  who,
  employeeIds,
  departmentId,
}) => {
  const body = toAssignmentBody({ scheduleId, fromDate, cycleStartDate, kind });
  if (who === "unit") {
    if (departmentId === "" || departmentId === null || departmentId === undefined) return null;
    return { ...body, department_id: Number(departmentId), include_subtree: true };
  }
  if (!employeeIds || employeeIds.length === 0) return null;
  return { ...body, employee_ids: employeeIds };
};

// A shift's rules (per-shift rules spec §2.1, §5.1). The form holds strings;
// required hours are entered as hours and minutes.
export const RULE_DEFAULTS = Object.freeze({
  late_grace_minutes: 15,
  early_leave_grace_minutes: 15,
  check_in_opens_minutes: 60,
  check_out_closes_minutes: 240,
  overtime_enabled: false,
  overtime_min_minutes: 0,
});

// The rules form from a rules object (the one in force), or the defaults with
// required hours blank (= the whole shift).
export const rulesFormFrom = (rules) => {
  const source = rules ?? RULE_DEFAULTS;
  const required = rules?.required_minutes;
  return {
    late_grace_minutes: String(source.late_grace_minutes),
    early_leave_grace_minutes: String(source.early_leave_grace_minutes),
    check_in_opens_minutes: String(source.check_in_opens_minutes),
    check_out_closes_minutes: String(source.check_out_closes_minutes),
    overtime_enabled: Boolean(source.overtime_enabled),
    overtime_min_minutes: String(source.overtime_min_minutes),
    required_hours: required == null ? "" : String(Math.floor(required / 60)),
    required_mins: required == null ? "" : String(required % 60),
  };
};

// The seven rule fields for the API. Blank required hours mean the whole
// shift (`lengthMinutes`), the server's own default for a first version.
export const toRulesBody = (form, lengthMinutes) => {
  const blank = String(form.required_hours ?? "").trim() === "" && String(form.required_mins ?? "").trim() === "";
  return {
    late_grace_minutes: Number(form.late_grace_minutes),
    early_leave_grace_minutes: Number(form.early_leave_grace_minutes),
    check_in_opens_minutes: Number(form.check_in_opens_minutes),
    check_out_closes_minutes: Number(form.check_out_closes_minutes),
    overtime_enabled: Boolean(form.overtime_enabled),
    overtime_min_minutes: Number(form.overtime_min_minutes),
    required_minutes: blank
      ? Number(lengthMinutes)
      : Number(form.required_hours || 0) * 60 + Number(form.required_mins || 0),
  };
};

const RULE_NUMBER_FIELDS = [
  "late_grace_minutes",
  "early_leave_grace_minutes",
  "check_in_opens_minutes",
  "check_out_closes_minutes",
];

// A cleared rule field must not reach the API as 0 (final review): every
// window and grace needs a value — 0 typed on purpose is a value — and the
// overtime minimum does while overtime is on. Blank required hours are fine:
// they mean the whole shift.
export const rulesProblem = (form) => {
  const blank = (key) => String(form[key] ?? "").trim() === "";
  if (RULE_NUMBER_FIELDS.some(blank) || (form.overtime_enabled && blank("overtime_min_minutes"))) {
    return "أكمل قواعد الوردية.";
  }
  return null;
};
