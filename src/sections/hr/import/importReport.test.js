import test from "node:test";
import assert from "node:assert/strict";
import {
  OUTCOME_LABELS,
  base64ToBlob,
  canExclude,
  exclusionPayload,
  executePayload,
  expiryLabel,
  employeesPhrase,
  filterRows,
  loadFailure,
  minutesPhrase,
  reloadAfterFailure,
  rowCheckbox,
  sameRows,
  urlAction,
  withDeadline,
} from "./importReport.js";
import {
  companyOnlyPermissions,
  permissionLabel,
} from "../../../data/permissionsCatalog.js";
import {
  EVENT_FALLBACK_LABELS,
  EVENT_GROUPS,
  eventGroup,
} from "../../../data/auditEvents.js";

const rows = [
  { row: 4, outcome: "created", issues: [] },
  { row: 5, outcome: "skipped", issues: [{ severity: "error", message: "x" }] },
  { row: 6, outcome: "updated", issues: [{ severity: "warning", message: "y" }] },
];

test("filterRows keeps everything with no filter", () => {
  assert.deepEqual(filterRows(rows, {}), rows);
  assert.deepEqual(filterRows(rows, { outcome: "", severity: "" }), rows);
});

test("filterRows keeps the rows of one outcome", () => {
  assert.deepEqual(filterRows(rows, { outcome: "skipped" }).map((r) => r.row), [5]);
});

test("filterRows keeps the rows with at least one issue of a severity", () => {
  assert.deepEqual(filterRows(rows, { severity: "warning" }).map((r) => r.row), [6]);
  assert.deepEqual(filterRows(rows, { outcome: "updated", severity: "error" }), []);
});

test("expiryLabel counts the minutes left, rounded up", () => {
  const now = Date.parse("2026-10-22T16:00:00+03:00");
  assert.equal(
    expiryLabel("2026-10-22T16:41:30+03:00", now),
    "تنتهي صلاحية هذا الفحص بعد 42 دقيقة"
  );
  assert.equal(
    expiryLabel("2026-10-22T16:00:20+03:00", now),
    "تنتهي صلاحية هذا الفحص بعد دقيقة واحدة"
  );
});

test("expiryLabel is null once the hour has passed", () => {
  const now = Date.parse("2026-10-22T16:00:00+03:00");
  assert.equal(expiryLabel("2026-10-22T16:00:00+03:00", now), null);
  assert.equal(expiryLabel("2026-10-22T15:00:00+03:00", now), null);
  assert.equal(expiryLabel(null, now), null);
});

test("base64ToBlob round-trips the bytes as an xlsx", async () => {
  const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0xff, 0x00]);
  const base64 = btoa(String.fromCharCode(...bytes));

  const blob = base64ToBlob(base64);

  assert.equal(
    blob.type,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), bytes);
});

test("the outcome labels are the report's words", () => {
  assert.deepEqual(OUTCOME_LABELS, {
    created: "جديد",
    updated: "تحديث",
    restored: "استعادة",
    excluded: "مستبعد",
    skipped: "لم يُستورد",
    failed: "مرفوض",
  });
});

test("the import permission is catalogued and company-only", () => {
  assert.equal(permissionLabel("hr.employees.import"), "استيراد الموظفين من ملف");
  assert.deepEqual(companyOnlyPermissions(["hr.employees.import"]), ["hr.employees.import"]);
});

test("the import's audit events sit in the hr group", () => {
  assert.ok(EVENT_GROUPS.includes("hr"));
  assert.equal(eventGroup("employees_import_checked"), "hr");
  assert.equal(eventGroup("employees_import_executed"), "hr");
  assert.equal(EVENT_FALLBACK_LABELS.employees_import_executed, "استيراد الموظفين من ملف");
});

// --- Excluding rows (backend design §12) ---

const NOW = Date.parse("2026-10-23T16:00:00+03:00");
const liveRun = {
  status: 1,
  expires_at: "2026-10-23T16:40:00+03:00",
  importable_rows: [4, 9],
};

test("canExclude allows an importable row of a live checked run", () => {
  assert.equal(canExclude(liveRun, { row: 9 }, NOW), true);
});

test("canExclude refuses a row the first dry run would not import", () => {
  assert.equal(canExclude(liveRun, { row: 5 }, NOW), false);
});

test("canExclude refuses an executed run and a run past its hour", () => {
  assert.equal(canExclude({ ...liveRun, status: 2 }, { row: 9 }, NOW), false);
  assert.equal(
    canExclude({ ...liveRun, expires_at: "2026-10-23T15:59:00+03:00" }, { row: 9 }, NOW),
    false
  );
});

test("sameRows ignores order and repeats", () => {
  assert.equal(sameRows([9, 4], [4, 9]), true);
  assert.equal(sameRows(new Set([4, 9]), [9, 4, 4]), true);
  assert.equal(sameRows([4], [4, 9]), false);
  assert.equal(sameRows([], []), true);
  assert.equal(sameRows([], undefined), true);
});

test("exclusionPayload sends the rows sorted, once each", () => {
  assert.deepEqual(exclusionPayload(new Set([9, 4, 9])), { rows: [4, 9] });
  assert.deepEqual(exclusionPayload(new Set()), { rows: [] });
});

test("the exclusion audit event sits in the hr group", () => {
  assert.equal(eventGroup("employees_import_excluded"), "hr");
  assert.equal(
    EVENT_FALLBACK_LABELS.employees_import_excluded,
    "استبعاد سطور من استيراد الموظفين"
  );
});

test("rowCheckbox gives an excludable row an enabled box", () => {
  assert.deepEqual(rowCheckbox(liveRun, { row: 9 }, { now: NOW }), { disabled: false });
});

test("rowCheckbox disables the box while the re-check is in flight", () => {
  // A tick made then was dropped when the re-checked run arrived.
  assert.deepEqual(
    rowCheckbox(liveRun, { row: 9 }, { now: NOW, applying: true }),
    { disabled: true }
  );
});

test("rowCheckbox gives a row that cannot be excluded no box", () => {
  assert.equal(rowCheckbox(liveRun, { row: 5 }, { now: NOW }), null);
  assert.equal(rowCheckbox({ ...liveRun, status: 2 }, { row: 9 }, { now: NOW }), null);
});

test("executePayload sends the exclusion list the screen shows", () => {
  // The server refuses a list other than the one it saved: a stale screen
  // must not confirm counts for another list.
  assert.deepEqual(executePayload({ excluded_rows: [9, 4] }), { excluded_rows: [4, 9] });
  assert.deepEqual(executePayload({ excluded_rows: null }), { excluded_rows: [] });
});

test("reloadAfterFailure reloads after a refusal or a lost response", () => {
  assert.equal(reloadAfterFailure(422), true);
  assert.equal(reloadAfterFailure(0), true, "no response: the server may have acted");
  assert.equal(reloadAfterFailure(409), false, "busy: nothing changed, keep the ticks");
  assert.equal(reloadAfterFailure(403), false);
});

// --- Final review of Part 1, fixed 2026-10-24 ---

test("minutesPhrase agrees in number", () => {
  assert.equal(minutesPhrase(1), "دقيقة واحدة");
  assert.equal(minutesPhrase(2), "دقيقتين");
  assert.equal(minutesPhrase(3), "3 دقائق");
  assert.equal(minutesPhrase(10), "10 دقائق");
  assert.equal(minutesPhrase(11), "11 دقيقة");
  assert.equal(minutesPhrase(42), "42 دقيقة");
});

test("expiryLabel reads in good Arabic at every count", () => {
  const now = Date.parse("2026-10-24T16:00:00+03:00");
  assert.equal(expiryLabel(now + 2 * 60000, now), "تنتهي صلاحية هذا الفحص بعد دقيقتين");
  assert.equal(expiryLabel(now + 5 * 60000, now), "تنتهي صلاحية هذا الفحص بعد 5 دقائق");
});

test("employeesPhrase agrees in number after بيانات", () => {
  assert.equal(employeesPhrase(1), "موظف واحد");
  assert.equal(employeesPhrase(2), "موظفَين");
  assert.equal(employeesPhrase(3), "3 موظفين");
  assert.equal(employeesPhrase(11), "11 موظفاً");
});

test("withDeadline counts from the server's seconds_left, not the browser's clock", () => {
  // The browser's clock runs an hour behind: expires_at looks far off, yet
  // the server says 120 s remain.
  const receivedAt = Date.parse("2026-10-24T15:00:00+03:00");
  const run = withDeadline(
    { status: 1, expires_at: "2026-10-24T16:02:00+03:00", seconds_left: 120, importable_rows: [4] },
    receivedAt
  );

  assert.equal(run.deadline, receivedAt + 120000);
  assert.equal(expiryLabel(run.deadline, receivedAt + 60000), "تنتهي صلاحية هذا الفحص بعد دقيقة واحدة");
  assert.equal(canExclude(run, { row: 4 }, receivedAt + 121000), false, "past the server's hour");
});

test("urlAction keeps the screen and the address in step", () => {
  assert.equal(urlAction("7", null), "load");
  assert.equal(urlAction("7", { id: 6 }), "load");
  assert.equal(urlAction("7", { id: 7 }), "none");
  assert.equal(urlAction(null, { id: 7 }), "reset", "Back, or the menu link, to the bare page");
  assert.equal(urlAction(null, null), "none");
});

test("loadFailure says why a run in the address is gone", () => {
  assert.deepEqual(loadFailure(404), {
    startOver: true,
    message: "لم يُعثر على هذا الاستيراد؛ ابدأ برفع الملف.",
  });
  assert.deepEqual(loadFailure(500), { startOver: false, message: null });
});
