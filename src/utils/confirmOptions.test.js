import test from "node:test";
import assert from "node:assert/strict";
import { confirmOptions } from "./confirmOptions.js";

test("the title is plain text, never HTML", () => {
  // sweetalert2 parses `title` as HTML; the subject is often a name the user
  // chose — a file name on the import screen (final review, Part 1).
  const options = confirmOptions({
    action: "استيراد الموظفين من الملف",
    subject: "<img src=x onerror=alert(1)>.xlsx",
  });

  assert.equal(options.titleText, "استيراد الموظفين من الملف: <img src=x onerror=alert(1)>.xlsx؟");
  assert.equal("title" in options, false);
});

test("a missing subject gives the bare question", () => {
  assert.equal(confirmOptions({ action: "حذف الموظف" }).titleText, "حذف الموظف؟");
  assert.equal(confirmOptions({ action: "حذف الموظف", subject: "  " }).titleText, "حذف الموظف؟");
});

test("the text and the confirm label pass through", () => {
  const options = confirmOptions({ action: "سحب الإنذار", text: "يُسحب ولا يُحذف.", confirmButtonText: "سحب" });
  assert.equal(options.text, "يُسحب ولا يُحذف.");
  assert.equal(options.confirmButtonText, "سحب");
  assert.equal(confirmOptions({ action: "حذف" }).confirmButtonText, "حذف");
});
