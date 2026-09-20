import test from "node:test";
import assert from "node:assert/strict";
import {
  REDACTED,
  diffKeys,
  enumLabelFor,
  foreignKeyType,
  formatAbsolute,
  formatRelativeAr,
  hasKey,
  parseServerTimestamp,
  toEpochMs,
  valueKind,
} from "./auditFormat.js";
import {
  auditableRoute,
  eventGroup,
  eventLabel,
  eventVariant,
  isKnownAuditableType,
  isKnownEvent,
  securityNote,
} from "../../data/auditEvents.js";

// ── Timestamps ──────────────────────────────────────────────────────────────

test("the server's own offset is rendered, never re-zoned into the reader's", () => {
  // Same instant, three offsets. If any of these were normalised through a
  // local Date the rendered clock would move with the machine running the test.
  assert.equal(formatAbsolute("2026-09-16T14:03:12+03:00"), "2026-09-16 14:03:12");
  assert.equal(formatAbsolute("2026-09-16T11:03:12Z"), "2026-09-16 11:03:12");
  assert.equal(formatAbsolute("2026-09-16T14:03:12"), "2026-09-16 14:03:12");
});

test("a timestamp with no offset is read as Damascus, not as the browser's zone", () => {
  assert.equal(
    toEpochMs("2026-09-16T14:03:12"),
    toEpochMs("2026-09-16T14:03:12+03:00")
  );
});

test("offsets are honoured when computing the instant", () => {
  assert.equal(
    toEpochMs("2026-09-16T14:03:12+03:00"),
    toEpochMs("2026-09-16T11:03:12Z")
  );
});

test("an unparseable timestamp degrades to the raw string, never to a crash", () => {
  assert.equal(parseServerTimestamp("not a date"), null);
  assert.equal(formatAbsolute("not a date"), "not a date");
  assert.equal(formatRelativeAr("not a date"), "");
});

test("Arabic relative time uses the dual and the 3–10 plural", () => {
  const at = "2026-09-16T12:00:00+03:00";
  const now = toEpochMs(at);
  assert.equal(formatRelativeAr(at, now), "الآن");
  assert.equal(formatRelativeAr(at, now + 60_000), "منذ دقيقة");
  assert.equal(formatRelativeAr(at, now + 120_000), "منذ دقيقتين");
  assert.equal(formatRelativeAr(at, now + 180_000), "منذ 3 دقائق");
  assert.equal(formatRelativeAr(at, now + 3600_000), "منذ ساعة");
  assert.equal(formatRelativeAr(at, now + 2 * 3600_000), "منذ ساعتين");
  assert.equal(formatRelativeAr(at, now + 26 * 3600_000), "منذ يوم");
});

test("a clock skew into the future reads as الآن, not as a negative duration", () => {
  const at = "2026-09-16T12:00:00+03:00";
  assert.equal(formatRelativeAr(at, toEpochMs(at) - 600_000), "الآن");
});

// ── Values ──────────────────────────────────────────────────────────────────

test("null, false, empty string and an object are four different kinds", () => {
  assert.equal(valueKind(null), "null");
  assert.equal(valueKind(undefined), "null");
  assert.equal(valueKind(false), "boolean");
  assert.equal(valueKind(true), "boolean");
  assert.equal(valueKind(""), "empty");
  assert.equal(valueKind("   "), "empty");
  assert.equal(valueKind({ a: 1 }), "json");
  assert.equal(valueKind([1, 2]), "json");
  assert.equal(valueKind(0), "scalar");
  assert.equal(valueKind("نشط"), "scalar");
});

test("***REDACTED*** is classified apart from an ordinary string", () => {
  assert.equal(valueKind(REDACTED), "redacted");
  assert.notEqual(valueKind("REDACTED"), "redacted");
});

test("an absent key is distinguishable from a null one", () => {
  const values = { a: null };
  assert.equal(hasKey(values, "a"), true);
  assert.equal(hasKey(values, "b"), false);
  // The viewValues gate: both keys missing entirely, which is NOT old_values: null.
  assert.equal(hasKey({ id: 4 }, "old_values"), false);
  assert.equal(hasKey({ id: 4, old_values: null }, "old_values"), true);
});

// ── Diff key union ──────────────────────────────────────────────────────────

test("the diff spans the union of both sides, old side first", () => {
  assert.deepEqual(
    diffKeys({ name: "a", status: 1 }, { status: 2, phone: "09" }),
    ["name", "status", "phone"]
  );
});

test("a created row has no old side and a deleted row has no new side", () => {
  assert.deepEqual(diffKeys(null, { name: "a" }), ["name"]);
  assert.deepEqual(diffKeys({ name: "a" }, null), ["name"]);
  assert.deepEqual(diffKeys(null, null), []);
});

// ── Enum labels: the one sanctioned local-label exception ───────────────────

test("a known enum int gets a label; the caller still shows the raw value", () => {
  assert.equal(enumLabelFor("status", 1), "نشط");
  assert.equal(enumLabelFor("status", "2"), "موقوف");
});

test("an unmapped int and an unmapped field get NO invented label", () => {
  assert.equal(enumLabelFor("status", 99), null);
  assert.equal(enumLabelFor("first_name", 1), null);
  // `reason` is an int on a posting and free text elsewhere: text gets nothing.
  assert.equal(enumLabelFor("reason", "تأخر متكرر"), null);
  assert.equal(enumLabelFor("reason", 2), "نقل داخلي");
});

test("department level and sector are deliberately unmapped", () => {
  // The app reads `level_label` from the server and holds no local map; adding
  // one here is exactly the staleness the standing rule guards against.
  assert.equal(enumLabelFor("level", 2), null);
  assert.equal(enumLabelFor("sector", 1), null);
});

// ── Foreign keys and routes ─────────────────────────────────────────────────

test("an FK column names the type it points at, and only for known columns", () => {
  assert.equal(foreignKeyType("department_id"), "department");
  assert.equal(foreignKeyType("direct_manager_id"), "employee");
  assert.equal(foreignKeyType("job_title_id"), "job_title");
  assert.equal(foreignKeyType("legacy_id"), null);
  assert.equal(foreignKeyType("name"), null);
});

test("only employee has a detail route; the rest land on their list", () => {
  assert.equal(auditableRoute("employee", 12), "hr/employees/12");
  assert.equal(auditableRoute("department", 3), "departments");
  assert.equal(auditableRoute("permission", 9), "roles");
});

test("a target with nowhere truthful to go gets no link at all", () => {
  // employee_assignment/employee_warning live in a profile tab and the audit
  // row carries no employee id, so there is no URL that opens them.
  assert.equal(auditableRoute("employee_assignment", 5), null);
  assert.equal(auditableRoute("employee_warning", 5), null);
  // An unknown type is never guessed at.
  assert.equal(auditableRoute("payslip", 5), null);
  assert.equal(auditableRoute("employee", null), null);
});

test("auditable keys are the server's morph aliases, not shorter synonyms", () => {
  // THIS TEST EXISTS BECAUSE THE FAILURE IT CATCHES IS SILENT. A key spelled
  // `assignment` still returns null from auditableRoute — exactly like the
  // correct key does — so the route assertions above pass either way. What
  // actually breaks is the LABEL: the row misses AUDITABLE_META entirely and
  // renders as a raw unlinked `employee_assignment`. Pin the spelling here.
  assert.ok(isKnownAuditableType("employee_assignment"));
  assert.ok(isKnownAuditableType("employee_warning"));
  assert.ok(!isKnownAuditableType("assignment"));
  assert.ok(!isKnownAuditableType("warning"));
});

// ── Event vocabulary ────────────────────────────────────────────────────────

test("the server's event_label wins over the local fallback", () => {
  assert.equal(
    eventLabel({ event: "created", event_label: "إنشاء سجل موظف" }),
    "إنشاء سجل موظف"
  );
  assert.equal(eventLabel({ event: "created" }), "إنشاء");
});

test("an unknown event renders its raw key rather than a neighbour's label", () => {
  assert.equal(eventLabel({ event: "employee_terminated" }), "employee_terminated");
  assert.equal(isKnownEvent("employee_terminated"), false);
  assert.equal(eventVariant("employee_terminated"), "unknown");
  assert.equal(eventGroup("employee_terminated"), null);
});

test("every destructive event is danger and api_request is muted", () => {
  ["deleted", "user_deleted", "role_deleted", "role_unassigned", "all_tokens_revoked"].forEach(
    (event) => assert.equal(eventVariant(event), "danger", event)
  );
  assert.equal(eventVariant("api_request"), "muted");
  assert.equal(eventGroup("api_request"), "request");
});

test("a replayed refresh token is louder than danger and carries an explanation", () => {
  assert.equal(eventVariant("refresh_token_replay_detected"), "alert");
  assert.notEqual(securityNote("refresh_token_replay_detected"), null);
  // Nothing routine gets the security treatment.
  assert.equal(securityNote("deleted"), null);
  assert.equal(securityNote("api_request"), null);
});
