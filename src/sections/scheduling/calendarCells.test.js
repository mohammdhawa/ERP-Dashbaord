import test from "node:test";
import assert from "node:assert/strict";
import { rangeBetween, sourceClass } from "./calendarCells.js";

test("sourceClass maps each source", () => {
  assert.equal(sourceClass("default"), "sched-default");
  assert.equal(sourceClass("assignment"), "");
  assert.equal(sourceClass("change"), "sched-change");
  assert.equal(sourceClass("swap"), "sched-swap");
  assert.equal(sourceClass("x"), "");
});

test("rangeBetween orders the two days", () => {
  assert.deepEqual(
    rangeBetween({ employeeId: 1, date: "2026-11-20" }, { employeeId: 1, date: "2026-11-14" }),
    { from: "2026-11-14", to: "2026-11-20" }
  );
});

test("rangeBetween refuses another employee", () => {
  assert.deepEqual(
    rangeBetween({ employeeId: 1, date: "2026-11-20" }, { employeeId: 2, date: "2026-11-21" }),
    { error: "اختر الأيام من صف الموظف نفسه." }
  );
});

test("rangeBetween allows 31 days and refuses 32", () => {
  const a = { employeeId: 1, date: "2026-11-01" };
  assert.deepEqual(rangeBetween(a, { employeeId: 1, date: "2026-12-01" }), {
    from: "2026-11-01",
    to: "2026-12-01",
  });
  assert.deepEqual(rangeBetween(a, { employeeId: 1, date: "2026-12-02" }), {
    error: "لا يتجاوز تعديل الوردية 31 يوماً.",
  });
});
