import { test } from "node:test";
import assert from "node:assert/strict";

import { newAccountNotice } from "./newAccount.js";

// POST /api/hr/employees returns the new account beside `data` — its
// temporary password exactly once (backend EMPLOYEE_ACCOUNT_ON_CREATE_DESIGN.md).

test("an account with a password: login, password, and the copy-it-now warning", () => {
  assert.deepEqual(
    newAccountNotice({ user_id: 98, login: "582974643", temporary_password: "k7mq2xbr9t" }),
    {
      login: "582974643",
      password: "k7mq2xbr9t",
      disabled: false,
      message: "انسخ كلمة المرور الآن — لن تظهر مرة أخرى. يُطلب من الموظف تغييرها عند أول دخول.",
    }
  );
});

test("a terminated employee's disabled account: no password, and why", () => {
  assert.deepEqual(
    newAccountNotice({ user_id: 99, login: "582974644", temporary_password: null }),
    {
      login: "582974644",
      password: "",
      disabled: true,
      message: "الحساب معطّل لأن الموظف منتهي الخدمة.",
    }
  );
});

test("no account in the response: nothing to show", () => {
  assert.equal(newAccountNotice(undefined), null);
  assert.equal(newAccountNotice(null), null);
});
