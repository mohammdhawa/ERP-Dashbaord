import test from "node:test";
import assert from "node:assert/strict";
import {
  RECORDS_SORT_KEYS,
  DAILY_SORT_KEYS,
  MONTHLY_SORT_KEYS,
  GRID_SORT_KEYS,
  ABSENT_SORT_KEYS,
  buildRecordsParams,
  buildDailyParams,
  buildMonthlyParams,
  buildEmployeeGridParams,
  buildAbsentParams,
  rangeTooLong,
  validateReject,
  buildCheckoutCorrection,
  gridDayActions,
} from "./attendanceParams.js";
import {
  RECORD_TYPE_OPTIONS,
  REJECTION_REASON_OPTIONS,
  DAY_STATE_OPTIONS,
} from "../../data/attendanceEnums.js";

const NOW = new Date("2026-10-19T12:00:00Z");

test("option lists carry the server's wording and values", () => {
  assert.deepEqual(
    RECORD_TYPE_OPTIONS.map((o) => [o.value, o.label]),
    [
      [1, "حضور"],
      [2, "انصراف"],
    ],
  );
  assert.deepEqual(
    REJECTION_REASON_OPTIONS.map((o) => [o.value, o.label]),
    [
      [1, "الموقع المسجَّل لا يطابق موقع العمل"],
      [2, "الصورة الشخصية غير صحيحة أو غير واضحة"],
      [3, "مخالفة تعليمات تسجيل الحضور"],
    ],
  );
  assert.deepEqual(
    DAY_STATE_OPTIONS.map((o) => o.value),
    [1, 2, 3, 4, 5, 6, 7, 8],
  );
  assert.equal(DAY_STATE_OPTIONS[0].label, "حاضر (لم ينصرف بعد)");
  assert.equal(DAY_STATE_OPTIONS[7].label, "تسجيل مرفوض");
});

test("sort key lists are the server's", () => {
  assert.deepEqual(
    [...RECORDS_SORT_KEYS],
    [
      "recorded_at", "date", "type", "status", "work_hours", "created_at",
      "rejected_at", "id", "employee_name", "employee_number",
    ],
  );
  assert.deepEqual(
    [...DAILY_SORT_KEYS],
    ["employee_name", "department", "status", "check_in_time", "check_out_time", "work_hours"],
  );
  assert.equal(MONTHLY_SORT_KEYS.length, 13);
  assert.deepEqual([...GRID_SORT_KEYS], ["date", "status", "work_hours"]);
  assert.deepEqual([...ABSENT_SORT_KEYS], ["employee_name", "employee_number"]);
});

test("records: untouched filters send only the page", () => {
  assert.deepEqual(buildRecordsParams(1, 15, {}, NOW), { page: 1, per_page: 15 });
  assert.deepEqual(buildRecordsParams(2, 15, undefined, NOW), { page: 2, per_page: 15 });
});

test("records: date beats from/to, which beat month, which beats year", () => {
  const all = {
    date: "2026-06-21", from: "2026-06-01", to: "2026-06-30", month: "6", year: "2025",
  };
  assert.deepEqual(buildRecordsParams(1, 15, all, NOW), {
    page: 1, per_page: 15, date: "2026-06-21",
  });
  assert.deepEqual(
    buildRecordsParams(1, 15, { ...all, date: "" }, NOW),
    { page: 1, per_page: 15, from: "2026-06-01", to: "2026-06-30" },
  );
  assert.deepEqual(
    buildRecordsParams(1, 15, { ...all, date: "", from: "2026-06-01", to: "" }, NOW),
    { page: 1, per_page: 15, month: 6, year: 2025 },
  );
  assert.deepEqual(buildRecordsParams(1, 15, { month: "6" }, NOW), {
    page: 1, per_page: 15, month: 6, year: 2026,
  });
  assert.deepEqual(buildRecordsParams(1, 15, { year: "2025" }, NOW), {
    page: 1, per_page: 15, year: 2025,
  });
});

test("records: type, tri-state flags, reason, people and sort", () => {
  const p = buildRecordsParams(
    1, 15,
    {
      type: 2,
      missing_checkout: true,
      is_corrected: "0",
      rejected: "",
      rejection_reason: 3,
      employee_id: "7",
      department_id: " 3 ",
      search: "  نور ",
      sort: "-employee_name",
    },
    NOW,
  );
  assert.deepEqual(p, {
    page: 1, per_page: 15,
    type: 2,
    missing_checkout: "1",
    is_corrected: "0",
    rejection_reason: 3,
    employee_id: "7",
    department_id: "3",
    search: "نور",
    sort: "-employee_name",
  });
  assert.equal("rejected" in p, false);
});

test("records: junk is dropped rather than sent", () => {
  const p = buildRecordsParams(
    1, 15, { type: "9", rejection_reason: "x", sort: "bogus", month: "13" }, NOW,
  );
  assert.deepEqual(p, { page: 1, per_page: 15 });
  // sort keys of the daily board are not the records' keys
  assert.equal(buildRecordsParams(1, 15, { sort: "check_in_time" }, NOW).sort, undefined);
});

test("records: search is capped at the server's 100 characters", () => {
  const p = buildRecordsParams(1, 15, { search: "ا".repeat(150) }, NOW);
  assert.equal(p.search.length, 100);
});

test("daily: date, people and sort", () => {
  assert.deepEqual(buildDailyParams({}), {});
  assert.deepEqual(
    buildDailyParams({ date: "2026-06-21", employee_id: 7, search: "x", sort: "-status" }),
    { date: "2026-06-21", employee_id: "7", search: "x", sort: "-status" },
  );
  assert.deepEqual(buildDailyParams({ sort: "employee_number" }), {});
});

test("monthly: from+to, or month+year, never half a range", () => {
  assert.deepEqual(buildMonthlyParams({ from: "2026-06-01", to: "2026-06-30" }, NOW), {
    from: "2026-06-01", to: "2026-06-30",
  });
  assert.deepEqual(buildMonthlyParams({ month: "6" }, NOW), { month: 6, year: 2026 });
  assert.deepEqual(buildMonthlyParams({ month: 6, year: 2025 }, NOW), {
    month: 6, year: 2025,
  });
  // a lone `from` falls through to month, and to nothing without one
  assert.deepEqual(buildMonthlyParams({ from: "2026-06-01" }, NOW), {});
  assert.deepEqual(buildMonthlyParams({ from: "2026-06-01", month: 5 }, NOW), {
    month: 5, year: 2026,
  });
  // from/to wins over month
  assert.deepEqual(
    buildMonthlyParams({ from: "2026-06-01", to: "2026-06-30", month: 5 }, NOW),
    { from: "2026-06-01", to: "2026-06-30" },
  );
});

test("monthly: row filters go as 1 only when true; people; sort", () => {
  assert.deepEqual(
    buildMonthlyParams(
      {
        month: 6, has_absences: true, has_missing_checkouts: false,
        department_id: 3, sort: "-absent_days",
      },
      NOW,
    ),
    { month: 6, year: 2026, has_absences: "1", department_id: "3", sort: "-absent_days" },
  );
  assert.deepEqual(
    buildMonthlyParams({ month: 6, has_missing_checkouts: "1" }, NOW).has_missing_checkouts,
    "1",
  );
});

test("employee grid: employee_id always, window, status, working days, sort", () => {
  assert.deepEqual(buildEmployeeGridParams(7, {}, NOW), { employee_id: 7 });
  assert.deepEqual(
    buildEmployeeGridParams(
      7,
      {
        from: "2026-06-01", to: "2026-06-30", status: "3",
        working_days_only: true, sort: "-work_hours",
      },
      NOW,
    ),
    {
      employee_id: 7, from: "2026-06-01", to: "2026-06-30", status: 3,
      working_days_only: "1", sort: "-work_hours",
    },
  );
  assert.deepEqual(buildEmployeeGridParams("7", { month: 6 }, NOW), {
    employee_id: "7", month: 6, year: 2026,
  });
  assert.equal(
    "working_days_only" in buildEmployeeGridParams(7, { working_days_only: false }, NOW),
    false,
  );
});

test("absent: date, people, sort and the page", () => {
  assert.deepEqual(buildAbsentParams(1, 15, {}), { page: 1, per_page: 15 });
  assert.deepEqual(
    buildAbsentParams(2, 15, {
      date: "2026-06-21", employee_id: 7, department_id: 2, search: "ن", sort: "-employee_number",
    }),
    {
      page: 2, per_page: 15, date: "2026-06-21", employee_id: "7",
      department_id: "2", search: "ن", sort: "-employee_number",
    },
  );
});

test("rangeTooLong is inclusive, on UTC dates, capped at 92 days", () => {
  assert.equal(rangeTooLong("2026-06-01", "2026-08-31"), false); // exactly 92
  assert.equal(rangeTooLong("2026-06-01", "2026-09-01"), true); // 93
  assert.equal(rangeTooLong("2026-06-01", "2026-06-01"), false);
  assert.equal(rangeTooLong("2026-06-01", "2026-06-30", 10), true);
  assert.equal(rangeTooLong("", "2026-06-30"), false);
  assert.equal(rangeTooLong("2026-06-01", undefined), false);
});

test("validateReject: reason required; note required for 3; note <= 500", () => {
  assert.deepEqual(validateReject({}), { reason: "يجب اختيار سبب الرفض." });
  assert.deepEqual(validateReject({ reason: "", note: "x" }), {
    reason: "يجب اختيار سبب الرفض.",
  });
  assert.deepEqual(validateReject({ reason: 1 }), {});
  assert.deepEqual(validateReject({ reason: 3, note: "   " }), {
    note: "الملاحظة مطلوبة عند اختيار هذا السبب.",
  });
  assert.deepEqual(validateReject({ reason: "3", note: "ok" }), {});
  assert.deepEqual(validateReject({ reason: 2, note: "ا".repeat(501) }), {
    note: "الملاحظة يجب ألا تتجاوز 500 حرف.",
  });
  assert.deepEqual(validateReject({ reason: 2, note: "ا".repeat(500) }), {});
});

test("buildCheckoutCorrection writes Damascus time and omits an empty note", () => {
  assert.deepEqual(buildCheckoutCorrection({ date: "2026-06-21", time: "16:30" }), {
    checked_out_at: "2026-06-21T16:30:00+03:00",
  });
  assert.deepEqual(
    buildCheckoutCorrection({ date: "2026-06-21", time: "16:30", note: "   " }),
    { checked_out_at: "2026-06-21T16:30:00+03:00" },
  );
  assert.deepEqual(
    buildCheckoutCorrection({ date: "2026-06-21", time: "16:30", note: " نسي التسجيل " }),
    { checked_out_at: "2026-06-21T16:30:00+03:00", note: "نسي التسجيل" },
  );
});

test("gridDayActions: one action per day state, each behind its permission", () => {
  const all = [
    "attendance.records.correct", "leave.excuses.create", "leave.excuses.delete",
  ];
  const missing = { status: 3, check_in_id: 41 };
  const absent = { status: 6 };
  // A refused check-in is not attendance, so that day may be excused too.
  const refused = { status: 8 };
  const excused = {
    status: 5, excuse: { is_excuse: true, leave_request_id: 9 },
  };

  assert.deepEqual(gridDayActions(missing, all), {
    correct: true, excuse: false, undoExcuse: false,
  });
  assert.deepEqual(gridDayActions(absent, all), {
    correct: false, excuse: true, undoExcuse: false,
  });
  assert.deepEqual(gridDayActions(refused, all), {
    correct: false, excuse: true, undoExcuse: false,
  });
  assert.deepEqual(gridDayActions(excused, all), {
    correct: false, excuse: false, undoExcuse: true,
  });
});

test("gridDayActions: no permission, no action; incomplete days offer nothing", () => {
  const none = { correct: false, excuse: false, undoExcuse: false };
  assert.deepEqual(gridDayActions({ status: 3, check_in_id: 41 }, []), none);
  assert.deepEqual(gridDayActions({ status: 6 }, undefined), none);
  assert.deepEqual(
    gridDayActions(
      { status: 5, excuse: { is_excuse: true, leave_request_id: 9 } },
      ["attendance.records.correct"],
    ),
    none,
  );
  const all = ["attendance.records.correct", "leave.excuses.create", "leave.excuses.delete"];
  // missing check-out without a check-in id to correct
  assert.equal(gridDayActions({ status: 3 }, all).correct, false);
  // an approved-leave day (4) has an excuse-less shape; only is_excuse days undo
  assert.equal(gridDayActions({ status: 4 }, all).undoExcuse, false);
  assert.equal(
    gridDayActions({ status: 5, excuse: { is_excuse: false, leave_request_id: 9 } }, all)
      .undoExcuse,
    false,
  );
  assert.equal(
    gridDayActions({ status: 5, excuse: { is_excuse: true } }, all).undoExcuse,
    false,
  );
  assert.deepEqual(gridDayActions(null, all), none);
});
