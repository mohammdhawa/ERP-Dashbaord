import { test } from "node:test";
import assert from "node:assert/strict";

import { IMPORT_COLUMN_GROUPS, IMPORT_COLUMNS } from "./importColumns.js";

// The columns the import page asks HR's file to hold — the backend's
// EmployeeRowMapper::WORKBOOK_COLUMNS, which the server requires every one of.

test("all 44 required columns are listed, each once", () => {
  assert.equal(IMPORT_COLUMNS.length, 44);
  assert.equal(new Set(IMPORT_COLUMNS).size, 44);
});

test("the flat list is the groups in order", () => {
  assert.deepEqual(
    IMPORT_COLUMNS,
    IMPORT_COLUMN_GROUPS.flatMap((group) => group.columns)
  );
  IMPORT_COLUMN_GROUPS.forEach((group) => assert.ok(group.title));
});

test("headers are spelled exactly as the server matches them", () => {
  // Two spaces before التواصل, as in HR's workbook; the server compares exactly.
  assert.ok(IMPORT_COLUMNS.includes("معرف / رقم  التواصل"));
  assert.ok(IMPORT_COLUMNS.includes("ID_Sarah"));
  assert.ok(IMPORT_COLUMNS.includes("حالة الراتب ( نظام / إتفاق )"));
  assert.ok(IMPORT_COLUMNS.includes("الاسم الأول"));
  assert.ok(IMPORT_COLUMNS.includes("عدد الأبناء الاناث"));
});
