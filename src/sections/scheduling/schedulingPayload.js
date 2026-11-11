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
