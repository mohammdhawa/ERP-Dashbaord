import test from "node:test";
import assert from "node:assert/strict";
import { filenameFromDisposition } from "./fileDownload.js";

test("reads a quoted filename", () => {
  assert.equal(
    filenameFromDisposition('attachment; filename="a.pdf"', "x"),
    "a.pdf"
  );
});

test("prefers the decoded filename* (UTF-8) over filename", () => {
  assert.equal(
    filenameFromDisposition(
      "attachment; filename=\"fallback.pdf\"; filename*=UTF-8''%D8%AA%D9%82%D8%B1%D9%8A%D8%B1.pdf",
      "x"
    ),
    "تقرير.pdf"
  );
  assert.equal(
    filenameFromDisposition(
      "attachment; filename*=UTF-8''%D8%AA%D9%82%D8%B1%D9%8A%D8%B1.pdf",
      "x"
    ),
    "تقرير.pdf"
  );
});

test("returns the fallback when there is no header", () => {
  assert.equal(filenameFromDisposition(undefined, "fallback.pdf"), "fallback.pdf");
});

test("returns the fallback when the header names no file or is malformed", () => {
  assert.equal(filenameFromDisposition("attachment", "x"), "x");
  assert.equal(filenameFromDisposition("attachment; filename*=UTF-8''%E0%A4%A", "x"), "x");
});
