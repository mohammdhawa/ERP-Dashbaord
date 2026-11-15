import test from "node:test";
import assert from "node:assert/strict";
import { canDeleteRuleVersion, ruleSummary } from "./rulesView.js";

test("only a version that has not started can be deleted", () => {
  assert.equal(canDeleteRuleVersion({ effective_from: "2026-11-12" }, "2026-11-11"), true);
  assert.equal(canDeleteRuleVersion({ effective_from: "2026-11-11" }, "2026-11-11"), false);
  assert.equal(canDeleteRuleVersion({ effective_from: "2000-01-01" }, "2026-11-11"), false);
});

test("a rules summary reads the graces, windows, overtime and required hours", () => {
  const rules = {
    late_grace_minutes: 5,
    early_leave_grace_minutes: 20,
    check_in_opens_minutes: 30,
    check_out_closes_minutes: 120,
    overtime_enabled: true,
    overtime_min_minutes: 30,
    required_minutes: 390,
  };
  assert.equal(
    ruleSummary(rules),
    "تأخر 5 د · انصراف مبكر 20 د · فتح 30 د · قبول 2 س · عمل إضافي من 30 د · مطلوب 6 س 30 د"
  );
  assert.equal(
    ruleSummary({ ...rules, overtime_enabled: false }),
    "تأخر 5 د · انصراف مبكر 20 د · فتح 30 د · قبول 2 س · بلا عمل إضافي · مطلوب 6 س 30 د"
  );
});
