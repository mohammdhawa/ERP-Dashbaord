import test from "node:test";
import assert from "node:assert/strict";
import {
  SALARY_GATED_FIELDS,
  buildEmployeePayload,
  emptyEmployeeForm,
  getEmployeeFormValues,
  recordFieldAccess,
  untouchedSuggestionRejections,
} from "./employeePayload.js";

// A server record as a caller with BOTH field grants sees it.
const fullRecord = () => ({
  id: 9,
  employee_number: "EMP-00009",
  first_name: "سامر",
  middle_name: "خالد",
  last_name: "الحلبي",
  gender: 1,
  department_id: 4,
  job_title_id: 2,
  manager: { id: 3, full_name: "رئيس القسم", employee_number: "EMP-00003" },
  national_id: "01234567890",
  activity_type: 1,
  organizational_grade: 3,
  experience_level: 2,
  engineering_rank: 2,
  industrial_experience_years: null,
  has_hazard_pay: false,
  has_scarcity_pay: false,
  has_dual_role_pay: false,
  distinction_grade: null,
  salary_mode: 2,
  agreed_salary: "500000.00",
  sham_cash_account: null,
});

// The same record for a caller whose grants do not reach it: the gated keys
// are ABSENT, not null.
const gatedRecord = () => {
  const record = fullRecord();
  SALARY_GATED_FIELDS.forEach((key) => delete record[key]);
  delete record.national_id;
  return record;
};

// The caller HOLDS both permissions throughout — the interesting case since
// GAP-3 is exactly that, with a grant that may or may not reach the record.
const HOLDS_BOTH = Object.freeze({ salary: true, identity: true });

const editPayload = (record, change = {}, { withOriginal = true } = {}) => {
  const access = recordFieldAccess(record, HOLDS_BOTH);
  const original = getEmployeeFormValues(record);
  return buildEmployeePayload(
    { ...original, ...change },
    { isEdit: true, ...access, original: withOriginal ? original : null }
  );
};

// ── Per-record access (GAP-3) ───────────────────────────────────────────────

test("editing, the record decides: present keys are readable, absent are not", () => {
  // Even for a caller who HOLDS both permissions — the grant may not reach
  // this row, and the row is what says so.
  assert.deepEqual(recordFieldAccess(fullRecord(), { salary: true, identity: true }), {
    canViewSalary: true,
    canViewIdentity: true,
  });
  assert.deepEqual(recordFieldAccess(gatedRecord(), { salary: true, identity: true }), {
    canViewSalary: false,
    canViewIdentity: false,
  });
});

test("a present-but-null key is readable-and-empty, not gated", () => {
  const record = gatedRecord();
  record.national_id = null;
  assert.equal(recordFieldAccess(record).canViewIdentity, true);
});

test("creating, there is no record, so holding the permission decides", () => {
  assert.deepEqual(recordFieldAccess(null, { salary: true, identity: false }), {
    canViewSalary: true,
    canViewIdentity: false,
  });
});

test("an edit of an out-of-reach record never sends a gated key", () => {
  const payload = editPayload(gatedRecord(), { phone: "0999" });
  SALARY_GATED_FIELDS.forEach((key) => assert.equal(Object.hasOwn(payload, key), false, key));
  assert.equal(Object.hasOwn(payload, "national_id"), false);
});

// ── Only CHANGED gated keys on edit ─────────────────────────────────────────

test("a transfer that leaves pay untouched sends no pay key", () => {
  // The server checks the pay grant against the unit before AND after; resent
  // untouched pay would be refused when the move crosses the grant's edge.
  const payload = editPayload(fullRecord(), { department_id: 7 });

  assert.equal(payload.department_id, 7);
  SALARY_GATED_FIELDS.forEach((key) => assert.equal(Object.hasOwn(payload, key), false, key));
  assert.equal(Object.hasOwn(payload, "national_id"), false);
});

test("changing the salary sends the salary, not the whole block", () => {
  const payload = editPayload(fullRecord(), { agreed_salary: "600000.00" });

  assert.equal(payload.agreed_salary, "600000.00");
  assert.equal(Object.hasOwn(payload, "salary_mode"), false);
  assert.equal(Object.hasOwn(payload, "activity_type"), false);
});

test("a cross-field clear counts as a change and is sent", () => {
  // هندسي → صناعي: the rank must be cleared explicitly, or the server's guard
  // sees a rank on a non-engineering row.
  const payload = editPayload(fullRecord(), {
    activity_type: 2,
    industrial_experience_years: 4,
  });

  assert.equal(payload.activity_type, 2);
  assert.equal(payload.engineering_rank, null);
  assert.equal(payload.industrial_experience_years, 4);
  assert.equal(Object.hasOwn(payload, "agreed_salary"), false);
});

// ── اللقب and مكان الراتب (backend 2026-10-14) ───────────────────────────────

test("the nickname round-trips and a blank one clears it", () => {
  const record = { ...fullRecord(), nickname: "أبو عبد الرحمن" };
  assert.equal(getEmployeeFormValues(record).nickname, "أبو عبد الرحمن");
  assert.equal(editPayload(record, { nickname: "أبو صهيب" }).nickname, "أبو صهيب");
  assert.equal(editPayload(record, { nickname: "" }).nickname, null);
});

test("the payroll location is pay-gated, like the server's list", () => {
  assert.ok(SALARY_GATED_FIELDS.includes("payroll_location"));

  const record = { ...fullRecord(), payroll_location: "الآليات الثقيلة" };
  assert.equal(getEmployeeFormValues(record).payroll_location, "الآليات الثقيلة");
  assert.equal(
    editPayload(record, { payroll_location: "مكتب رئيسي - هندسي" }).payroll_location,
    "مكتب رئيسي - هندسي"
  );
  // Untouched, it is not resent — like every other pay key.
  assert.equal(Object.hasOwn(editPayload(record, { phone: "0999" }), "payroll_location"), false);
});

test("the national id is sent only when changed", () => {
  assert.equal(Object.hasOwn(editPayload(fullRecord(), {}), "national_id"), false);
  assert.equal(editPayload(fullRecord(), { national_id: "999" }).national_id, "999");
  assert.equal(editPayload(fullRecord(), { national_id: "" }).national_id, null);
});

test("without `original`, an edit still sends the whole readable block", () => {
  // The pre-GAP-3 behaviour, kept for any caller that does not pass one.
  const payload = editPayload(fullRecord(), {}, { withOriginal: false });
  assert.equal(payload.salary_mode, 2);
  assert.equal(payload.agreed_salary, "500000.00");
  assert.equal(payload.national_id, "01234567890");
});

test("a create sends the pay block it can see, minus the clearing nulls", () => {
  const payload = buildEmployeePayload(
    {
      ...emptyEmployeeForm,
      first_name: "جديد",
      middle_name: "أحمد",
      last_name: "موظف",
      gender: 1,
      department_id: 4,
      salary_mode: 2,
      agreed_salary: "600000.00",
    },
    { isEdit: false, canViewSalary: true, canViewIdentity: false }
  );

  assert.equal(payload.salary_mode, 2);
  assert.equal(payload.agreed_salary, "600000.00");
  assert.equal(Object.hasOwn(payload, "engineering_rank"), false);
  assert.equal(Object.hasOwn(payload, "national_id"), false);
});

// ── The manager is not ours to write (2026-09-24) ───────────────────────────

test("no manager key is ever sent — it is resolved by the server", () => {
  const record = fullRecord();
  const values = getEmployeeFormValues(record);

  assert.equal(Object.hasOwn(values, "direct_manager_id"), false);
  assert.equal(Object.hasOwn(emptyEmployeeForm, "direct_manager_id"), false);

  const payload = buildEmployeePayload(
    { ...values, direct_manager_id: 3 },
    { isEdit: true, ...recordFieldAccess(record), original: values }
  );
  assert.equal(Object.hasOwn(payload, "direct_manager_id"), false);
  assert.equal(Object.hasOwn(payload, "manager"), false);
});

// ── Create: pay values only a job title suggested ───────────────────────────

test("a 422 on untouched job-title suggestions names them for a retry", () => {
  const errors = {
    activity_type: ["غير مسموح"],
    organizational_grade: ["غير مسموح"],
  };
  const suggested = { activity_type: true, organizational_grade: true };
  assert.deepEqual(untouchedSuggestionRejections(errors, suggested), [
    "activity_type",
    "organizational_grade",
  ]);
});

test("a rejected field the user edited is not dropped", () => {
  // setField flips the flag to false once the user touches the value.
  assert.equal(
    untouchedSuggestionRejections(
      { activity_type: ["غير مسموح"] },
      { activity_type: false }
    ),
    null
  );
});

test("any other rejected field sends the whole bag down the normal path", () => {
  assert.equal(
    untouchedSuggestionRejections(
      { activity_type: ["غير مسموح"], first_name: ["مطلوب"] },
      { activity_type: true }
    ),
    null
  );
});

test("no field errors means nothing to retry", () => {
  assert.equal(untouchedSuggestionRejections(undefined, {}), null);
  assert.equal(untouchedSuggestionRejections({}, {}), null);
});
