import test from "node:test";
import assert from "node:assert/strict";
import {
  REGISTER_SORT_KEYS,
  MY_LEAVE_SORT_KEYS,
  BALANCE_SORT_KEYS,
  ON_LEAVE_SORT_KEYS,
  MAX_ATTACHMENTS,
  buildRegisterParams,
  buildMyLeaveParams,
  buildBalancesParams,
  buildOnLeaveParams,
  buildLeaveRequestForm,
  validateAttachments,
  buildExcuseForm,
  isForceableExcuseRefusal,
} from "./leaveParams.js";
import {
  LEAVE_STATUS_OPTIONS,
  EXCUSE_FILTER_OPTIONS,
} from "../../data/leaveEnums.js";

const NOW = new Date("2026-10-19T12:00:00Z");
const file = (name, type, size = 1000) => ({ name, type, size });

test("option lists carry the server's wording and values", () => {
  assert.deepEqual(
    LEAVE_STATUS_OPTIONS.map((o) => [o.value, o.label]),
    [
      [1, "قيد الاعتماد"],
      [2, "معتمدة"],
      [3, "مرفوضة"],
      [4, "ملغاة"],
    ]
  );
  assert.deepEqual(
    EXCUSE_FILTER_OPTIONS.map((o) => [o.value, o.label]),
    [
      ["", "الكل"],
      ["0", "طلبات الموظفين"],
      ["1", "أعذار إدارية"],
    ]
  );
});

test("sort key lists are the contract's", () => {
  assert.deepEqual(REGISTER_SORT_KEYS, [
    "start_date",
    "end_date",
    "requested_days",
    "created_at",
    "employee_name",
    "id",
  ]);
  assert.deepEqual(MY_LEAVE_SORT_KEYS, [
    "created_at",
    "start_date",
    "end_date",
    "requested_days",
    "status",
    "decided_at",
    "id",
  ]);
  assert.deepEqual(BALANCE_SORT_KEYS, ["employee_name", "employee_number"]);
});

// --- register ---------------------------------------------------------------

test("untouched register filters send only the page", () => {
  assert.deepEqual(buildRegisterParams(1, 15, {}), { page: 1, per_page: 15 });
  assert.deepEqual(buildRegisterParams(1, 15), { page: 1, per_page: 15 });
  assert.deepEqual(
    buildRegisterParams(
      1,
      15,
      { statuses: [], leave_type_ids: "", is_excuse: "", search: "  ", sort: "" },
      NOW
    ),
    { page: 1, per_page: 15 }
  );
});

test("from + to win over month and year", () => {
  assert.deepEqual(
    buildRegisterParams(
      1,
      15,
      { from: "2026-06-01", to: "2026-06-30", month: 3, year: 2025 },
      NOW
    ),
    { page: 1, per_page: 15, from: "2026-06-01", to: "2026-06-30" }
  );
});

test("month with year sends both", () => {
  assert.deepEqual(
    buildRegisterParams(1, 15, { month: 6, year: 2025 }, NOW),
    { page: 1, per_page: 15, month: 6, year: 2025 }
  );
});

test("month without year means this year", () => {
  assert.deepEqual(buildRegisterParams(1, 15, { month: "6" }, NOW), {
    page: 1,
    per_page: 15,
    month: 6,
    year: 2026,
  });
});

test("year alone sends only the year", () => {
  assert.deepEqual(buildRegisterParams(1, 15, { year: 2025 }, NOW), {
    page: 1,
    per_page: 15,
    year: 2025,
  });
});

test("half a range sends no from and no to", () => {
  // from without to (or the reverse) is a 422 on the server.
  assert.deepEqual(buildRegisterParams(1, 15, { from: "2026-06-01" }, NOW), {
    page: 1,
    per_page: 15,
  });
  assert.deepEqual(buildRegisterParams(1, 15, { to: "2026-06-30" }, NOW), {
    page: 1,
    per_page: 15,
  });
  // ...and falls through to the next rule rather than to nothing.
  assert.deepEqual(
    buildRegisterParams(1, 15, { from: "2026-06-01", year: 2025 }, NOW),
    { page: 1, per_page: 15, year: 2025 }
  );
});

test("an out-of-range month is dropped", () => {
  assert.deepEqual(buildRegisterParams(1, 15, { month: 13, year: 2025 }, NOW), {
    page: 1,
    per_page: 15,
    year: 2025,
  });
});

test("statuses and leave types go over the wire as CSV", () => {
  const p = buildRegisterParams(
    1,
    15,
    { statuses: [1, 2], leave_type_ids: [3, "4"] },
    NOW
  );
  assert.equal(p.statuses, "1,2");
  assert.equal(p.leave_type_ids, "3,4");
  assert.equal(
    buildRegisterParams(1, 15, { statuses: "2,3" }, NOW).statuses,
    "2,3"
  );
});

test("is_excuse goes as the strings 0 and 1", () => {
  assert.equal(buildRegisterParams(1, 15, { is_excuse: "0" }, NOW).is_excuse, "0");
  assert.equal(buildRegisterParams(1, 15, { is_excuse: "1" }, NOW).is_excuse, "1");
  assert.equal(buildRegisterParams(1, 15, { is_excuse: true }, NOW).is_excuse, "1");
  assert.equal(buildRegisterParams(1, 15, { is_excuse: false }, NOW).is_excuse, "0");
  assert.equal("is_excuse" in buildRegisterParams(1, 15, { is_excuse: "" }, NOW), false);
});

test("register sends employee, department and a trimmed search", () => {
  assert.deepEqual(
    buildRegisterParams(
      2,
      30,
      { employee_id: 5, department_id: "7", search: "  أحمد " },
      NOW
    ),
    {
      page: 2,
      per_page: 30,
      employee_id: "5",
      department_id: "7",
      search: "أحمد",
    }
  );
});

test("an unknown sort is dropped; a known one passes, with or without -", () => {
  assert.equal("sort" in buildRegisterParams(1, 15, { sort: "salary" }, NOW), false);
  assert.equal("sort" in buildRegisterParams(1, 15, { sort: "-salary" }, NOW), false);
  assert.equal(buildRegisterParams(1, 15, { sort: "start_date" }, NOW).sort, "start_date");
  assert.equal(
    buildRegisterParams(1, 15, { sort: "-employee_name" }, NOW).sort,
    "-employee_name"
  );
});

test("register and balances drop ids the server would refuse and cap the search", () => {
  const bad = { employee_id: "0", department_id: "1.5", search: "x".repeat(150) };
  for (const p of [buildRegisterParams(1, 15, bad, NOW), buildBalancesParams(1, 15, bad)]) {
    assert.equal("employee_id" in p, false);
    assert.equal("department_id" in p, false);
    assert.equal(p.search.length, 100);
  }
  for (const id of ["-3", "007", "1e2", "123456789012", "abc"]) {
    assert.equal("employee_id" in buildBalancesParams(1, 15, { employee_id: id }), false, id);
    assert.equal("department_id" in buildRegisterParams(1, 15, { department_id: id }, NOW), false, id);
  }
  assert.equal(buildBalancesParams(1, 15, { employee_id: 5 }).employee_id, "5");
});

// --- my list ----------------------------------------------------------------

test("untouched my-leave filters send only the page", () => {
  assert.deepEqual(buildMyLeaveParams(1, 15, {}), { page: 1, per_page: 15 });
});

test("my list sends status, type, year and is_excuse — no window", () => {
  assert.deepEqual(
    buildMyLeaveParams(1, 15, {
      statuses: [1, 4],
      leave_type_ids: [2],
      year: 2026,
      is_excuse: "1",
      from: "2026-01-01",
      to: "2026-01-31",
      month: 3,
      sort: "-created_at",
    }),
    {
      page: 1,
      per_page: 15,
      statuses: "1,4",
      leave_type_ids: "2",
      year: 2026,
      is_excuse: "1",
      sort: "-created_at",
    }
  );
});

test("my list drops a sort only the register knows", () => {
  assert.equal("sort" in buildMyLeaveParams(1, 15, { sort: "employee_name" }), false);
  assert.equal(buildMyLeaveParams(1, 15, { sort: "decided_at" }).sort, "decided_at");
});

// --- balances ---------------------------------------------------------------

test("untouched balance filters send only the page", () => {
  assert.deepEqual(buildBalancesParams(1, 15, {}), { page: 1, per_page: 15 });
});

test("balances send year, employee, department, search and sort", () => {
  assert.deepEqual(
    buildBalancesParams(1, 15, {
      year: 2026,
      employee_id: 5,
      department_id: 7,
      search: " 0042 ",
      sort: "-employee_number",
      statuses: [1],
    }),
    {
      page: 1,
      per_page: 15,
      year: 2026,
      employee_id: "5",
      department_id: "7",
      search: "0042",
      sort: "-employee_number",
    }
  );
  assert.equal("sort" in buildBalancesParams(1, 15, { sort: "start_date" }), false);
});

// --- forms ------------------------------------------------------------------

test("the request form carries the fields and every attachment", () => {
  const a = file("a.pdf", "application/pdf");
  const b = file("b.png", "image/png");
  const form = buildLeaveRequestForm({
    leave_type_id: 3,
    start_date: "2026-06-21",
    end_date: "2026-06-22",
    reason: "  زكام ",
    attachments: [a, b],
  });
  assert.ok(form instanceof FormData);
  assert.equal(form.get("leave_type_id"), "3");
  assert.equal(form.get("start_date"), "2026-06-21");
  assert.equal(form.get("end_date"), "2026-06-22");
  assert.equal(form.get("reason"), "زكام");
  assert.equal(form.getAll("attachments[]").length, 2);
  assert.equal("employee_id" in Object.fromEntries(form), false);
  assert.equal(form.has("force"), false);
});

test("an empty reason and no files are omitted, not sent blank", () => {
  const form = buildLeaveRequestForm({
    leave_type_id: 3,
    start_date: "2026-06-21",
    end_date: "2026-06-22",
    reason: "   ",
    attachments: [],
  });
  assert.equal(form.has("reason"), false);
  assert.equal(form.has("attachments[]"), false);
});

test("the excuse form adds employee_id, and force only when asked", () => {
  const values = {
    employee_id: 5,
    leave_type_id: 3,
    start_date: "2026-06-21",
    end_date: "2026-06-22",
    reason: "",
    attachments: [],
  };
  const plain = buildExcuseForm(values, { force: false });
  assert.equal(plain.get("employee_id"), "5");
  assert.equal(plain.get("leave_type_id"), "3");
  assert.equal(plain.has("force"), false);
  assert.equal(buildExcuseForm(values).has("force"), false);
  const forced = buildExcuseForm(values, { force: true });
  assert.equal(forced.get("force"), "1");
  assert.equal(forced.get("employee_id"), "5");
});

// --- attachments ------------------------------------------------------------

test("validateAttachments: nothing wrong is null", () => {
  assert.equal(validateAttachments([], { required: false }), null);
  assert.equal(validateAttachments(undefined, { required: false }), null);
  assert.equal(
    validateAttachments(
      [
        file("a.pdf", "application/pdf"),
        file("b.jpg", "image/jpeg"),
        file("c.png", "image/png", 10 * 1024 * 1024),
      ],
      { required: true }
    ),
    null
  );
});

test("validateAttachments: more than five files", () => {
  const six = Array.from({ length: MAX_ATTACHMENTS + 1 }, (_, i) =>
    file(`f${i}.pdf`, "application/pdf")
  );
  assert.equal(
    validateAttachments(six, { required: false }),
    "يمكن إرفاق 5 ملفات كحد أقصى."
  );
});

test("validateAttachments: another type", () => {
  assert.equal(
    validateAttachments([file("a.docx", "application/msword")], { required: false }),
    "الملفات المسموحة: PDF أو JPG أو PNG."
  );
});

test("validateAttachments: over 10 MB", () => {
  assert.equal(
    validateAttachments(
      [file("a.pdf", "application/pdf", 10 * 1024 * 1024 + 1)],
      { required: false }
    ),
    "حجم الملف يجب ألا يتجاوز 10 ميغابايت."
  );
});

test("validateAttachments: required and empty", () => {
  assert.equal(
    validateAttachments([], { required: true }),
    "نوع الإجازة يتطلب إرفاق مستند."
  );
});

// --- the forceable refusal ---------------------------------------------------

test("only the over-balance refusal is forceable", () => {
  assert.equal(
    isForceableExcuseRefusal({
      status: 422,
      message:
        "العذر يتجاوز رصيد الإجازات المتبقي للموظف (المتبقي 2 يوم). أرسل force لتسجيله رغم ذلك.",
    }),
    true
  );
  assert.equal(
    isForceableExcuseRefusal({
      status: 422,
      message: "للموظف حضور مسجّل في بعض هذه الأيام، فلا يوجد غياب لتبريره: 2026-06-22.",
    }),
    false
  );
  assert.equal(
    isForceableExcuseRefusal({ status: 403, message: "أرسل force لتسجيله رغم ذلك." }),
    false
  );
  // Only the sentence's own «أرسل force» counts, not any word containing it.
  assert.equal(
    isForceableExcuseRefusal({ status: 422, message: "The rule is enforced elsewhere." }),
    false
  );
  assert.equal(isForceableExcuseRefusal(null), false);
  assert.equal(isForceableExcuseRefusal({ status: 422 }), false);
});

test("on leave: the day, the type, the source, the person and the sort", () => {
  assert.deepEqual([...ON_LEAVE_SORT_KEYS], ["start_date", "end_date", "employee_name"]);
  assert.deepEqual(
    buildOnLeaveParams(1, 15, {
      date: "2026-06-21",
      leave_type_ids: "2,5",
      is_excuse: "1",
      employee_id: "7",
      department_id: "3",
      search: " سامي ",
      sort: "-employee_name",
    }),
    {
      page: 1,
      per_page: 15,
      date: "2026-06-21",
      leave_type_ids: "2,5",
      is_excuse: "1",
      employee_id: "7",
      department_id: "3",
      search: "سامي",
      sort: "-employee_name",
    }
  );
});

test("on leave: nothing the server would refuse is sent", () => {
  // No date is the server's today; requests only is is_excuse=0, not nothing.
  assert.deepEqual(buildOnLeaveParams(2, 15, {}), { page: 2, per_page: 15 });
  assert.deepEqual(
    buildOnLeaveParams(1, 15, {
      date: "2026-02-31",
      is_excuse: "0",
      department_id: "0",
      sort: "requested_days",
    }),
    { page: 1, per_page: 15, is_excuse: "0" }
  );
});
