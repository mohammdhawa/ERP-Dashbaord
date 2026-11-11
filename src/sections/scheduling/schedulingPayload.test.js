import test from "node:test";
import assert from "node:assert/strict";
import {
  toShiftBody,
  toScheduleBody,
  toShiftChangeBody,
  toAssignmentBody,
  toBulkBody,
} from "./schedulingPayload.js";

const shiftForm = {
  code: " NIGHT ",
  name: "  ليلي ",
  starts_at: "22:00",
  duration_minutes: "480",
  is_active: true,
};

test("toShiftBody on create carries all five keys with a numeric duration", () => {
  assert.deepEqual(toShiftBody(shiftForm, { editing: false }), {
    code: "NIGHT",
    name: "ليلي",
    starts_at: "22:00",
    duration_minutes: 480,
    is_active: true,
  });
});

test("toShiftBody on edit omits code", () => {
  const body = toShiftBody(shiftForm, { editing: true });
  assert.equal("code" in body, false);
  assert.equal(body.name, "ليلي");
  assert.equal(body.duration_minutes, 480);
});

test("toShiftBody coerces is_active to a boolean", () => {
  assert.equal(toShiftBody({ ...shiftForm, is_active: 0 }, { editing: false }).is_active, false);
});

const base = { code: "NIGHTS", name: " ليلي ", kind: "1", cycle_days: "7", is_active: true };

test("a weekly schedule sends every position ascending, a day off as null", () => {
  const body = toScheduleBody(
    { ...base, days: { 0: "1", 1: "1", 2: "1", 3: "1", 4: "1", 5: "", 6: "1" } },
    { editing: false }
  );
  assert.equal(body.days.length, 7);
  assert.deepEqual(body.days[5], { position: 5, shift_id: null });
  assert.deepEqual(body.days[6], { position: 6, shift_id: 1 });
  assert.deepEqual(body.days.map((d) => d.position), [0, 1, 2, 3, 4, 5, 6]);
  assert.equal(body.kind, 1);
  assert.equal(body.cycle_days, 7);
  assert.equal(body.name, "ليلي");
});

test("days filled in Saturday-first order keep each shift on its own position", () => {
  // Insertion order Saturday (6) first, as the editor fills it.
  const days = {};
  [6, 0, 1, 2, 3, 4, 5].forEach((p, i) => {
    days[p] = String(10 + i);
  });
  const body = toScheduleBody({ ...base, days }, { editing: false });
  assert.deepEqual(body.days.map((d) => d.position), [0, 1, 2, 3, 4, 5, 6]);
  assert.equal(body.days[6].shift_id, 10);
  assert.equal(body.days[0].shift_id, 11);
  assert.equal(body.days[5].shift_id, 16);
});

test("a cycle of 6 with positions 3-5 empty yields three nulls", () => {
  const body = toScheduleBody(
    { ...base, kind: "2", cycle_days: "6", days: { 0: "2", 1: "2", 2: "2", 3: "", 4: "", 5: "" } },
    { editing: false }
  );
  assert.equal(body.days.length, 6);
  assert.equal(body.days.filter((d) => d.shift_id === null).length, 3);
  assert.equal(body.kind, 2);
  assert.equal(body.cycle_days, 6);
});

test("a missing day is a day off, never undefined", () => {
  const body = toScheduleBody({ ...base, kind: "2", cycle_days: "2", days: { 0: 4 } }, { editing: false });
  assert.deepEqual(body.days[1], { position: 1, shift_id: null });
});

test("editing omits code, kind and cycle_days but keeps the days", () => {
  const body = toScheduleBody(
    { ...base, kind: 2, cycle_days: 3, days: { 0: "2", 1: "", 2: "2" } },
    { editing: true }
  );
  for (const key of ["code", "kind", "cycle_days"]) assert.equal(key in body, false);
  assert.equal(body.days.length, 3);
  assert.equal(body.is_active, true);
});

test("editing with unchanged days omits days", () => {
  const initialDays = { 0: 2, 1: "", 2: 2 };
  const body = toScheduleBody(
    { ...base, kind: 2, cycle_days: 3, days: { 0: "2", 1: "", 2: "2" } },
    { editing: true, initialDays }
  );
  assert.equal("days" in body, false);
  assert.equal(body.name, "ليلي");
  assert.equal(body.is_active, true);
});

test("editing with one day changed sends the full ascending days", () => {
  const initialDays = { 0: 2, 1: "", 2: 2 };
  const body = toScheduleBody(
    { ...base, kind: 2, cycle_days: 3, days: { 0: "2", 1: "5", 2: "" } },
    { editing: true, initialDays }
  );
  assert.deepEqual(body.days, [
    { position: 0, shift_id: 2 },
    { position: 1, shift_id: 5 },
    { position: 2, shift_id: null },
  ]);
});

test("a day turned into a day off counts as changed", () => {
  const body = toScheduleBody(
    { ...base, kind: 2, cycle_days: 2, days: { 0: "", 1: "3" } },
    { editing: true, initialDays: { 0: 1, 1: 3 } }
  );
  assert.deepEqual(body.days[0], { position: 0, shift_id: null });
});

test("create always sends days, even with initialDays given", () => {
  const body = toScheduleBody(
    { ...base, kind: "2", cycle_days: "2", days: { 0: "", 1: "" } },
    { editing: false, initialDays: { 0: "", 1: "" } }
  );
  assert.equal(body.days.length, 2);
});

test("toShiftChangeBody sends a day off as null and trims the reason", () => {
  assert.deepEqual(
    toShiftChangeBody({ from: "2026-11-14", to: "2026-11-15", shiftId: "off", reason: " تكليف " }),
    { from: "2026-11-14", to: "2026-11-15", shift_id: null, reason: "تكليف" }
  );
  assert.equal(
    toShiftChangeBody({ from: "2026-11-14", to: "2026-11-15", shiftId: "3", reason: "x" }).shift_id,
    3
  );
  assert.equal(
    toShiftChangeBody({ from: "2026-11-14", to: "2026-11-15", shiftId: null, reason: "x" }).shift_id,
    null
  );
});

const assign = { scheduleId: "4", fromDate: "2026-11-20", cycleStartDate: "2026-11-14" };

test("toAssignmentBody sends cycle_start_date only for a cycle schedule", () => {
  const weekly = toAssignmentBody({ ...assign, kind: 1 });
  assert.equal("cycle_start_date" in weekly, false);
  assert.deepEqual(weekly, { work_schedule_id: 4, from_date: "2026-11-20" });
  assert.deepEqual(toAssignmentBody({ ...assign, kind: 2 }), {
    work_schedule_id: 4,
    from_date: "2026-11-20",
    cycle_start_date: "2026-11-14",
  });
});

test("toBulkBody is null without a target", () => {
  assert.equal(toBulkBody({ ...assign, kind: 1, who: "unit", departmentId: "" }), null);
  assert.equal(toBulkBody({ ...assign, kind: 1, who: "people", employeeIds: [] }), null);
});

test("toBulkBody names people or a unit with its sub-units, never both", () => {
  const unit = toBulkBody({ ...assign, kind: 1, who: "unit", departmentId: "9", employeeIds: [1] });
  assert.equal(unit.department_id, 9);
  assert.equal(unit.include_subtree, true);
  assert.equal("employee_ids" in unit, false);
  const people = toBulkBody({ ...assign, kind: 2, who: "people", employeeIds: [31, 32], departmentId: "9" });
  assert.deepEqual(people.employee_ids, [31, 32]);
  assert.equal("department_id" in people, false);
  assert.equal("include_subtree" in people, false);
  assert.equal(people.cycle_start_date, "2026-11-14");
});
