import test from "node:test";
import assert from "node:assert/strict";
import {
  ACTOR_ANY_USER,
  ACTOR_SYSTEM,
  actorPatch,
  actorSelection,
  resolveActorOption,
} from "./auditActor.js";

const EMPTY = { actor_type: "", user_id: "" };

// ── Filters → the one المنفّذ selection ──────────────────────────────────────

test("no actor filter selects nothing, so the placeholder reads الكل", () => {
  assert.equal(actorSelection(EMPTY), null);
});

test("actor_type=system selects النظام", () => {
  assert.equal(actorSelection({ actor_type: "system", user_id: "" }), ACTOR_SYSTEM);
});

test("system wins over a stray user_id, matching what goes on the wire", () => {
  assert.equal(actorSelection({ actor_type: "system", user_id: "7" }), ACTOR_SYSTEM);
});

test("actor_type=user alone selects أي مستخدم", () => {
  assert.equal(actorSelection({ actor_type: "user", user_id: "" }), ACTOR_ANY_USER);
});

test("a user_id selects that user, with or without actor_type=user", () => {
  assert.equal(actorSelection({ actor_type: "", user_id: "7" }), "7");
  assert.equal(actorSelection({ actor_type: "user", user_id: 7 }), "7");
});

// ── The selection → a filter patch ──────────────────────────────────────────

test("clearing clears both keys", () => {
  assert.deepEqual(actorPatch(null), EMPTY);
  assert.deepEqual(actorPatch(""), EMPTY);
});

test("النظام sets the type and clears the user", () => {
  assert.deepEqual(actorPatch(ACTOR_SYSTEM), { actor_type: "system", user_id: "" });
});

test("أي مستخدم sets the type and clears the user", () => {
  assert.deepEqual(actorPatch(ACTOR_ANY_USER), { actor_type: "user", user_id: "" });
});

test("a specific user sets the id and drops the redundant type", () => {
  assert.deepEqual(actorPatch(7), { actor_type: "", user_id: 7 });
});

test("patch and selection round-trip for every kind of choice", () => {
  [ACTOR_SYSTEM, ACTOR_ANY_USER, "7"].forEach((value) => {
    assert.equal(actorSelection(actorPatch(value)), value);
  });
  assert.equal(actorSelection(actorPatch(null)), null);
});

// ── The selection → the option the select renders ──────────────────────────

const OPTIONS = [
  { value: ACTOR_ANY_USER, label: "أي مستخدم" },
  { value: ACTOR_SYSTEM, label: "النظام" },
];
const USERS = [
  { value: 7, label: "Sara — sara@example.com" },
  { value: 9, label: "Omar — omar@example.com" },
];

test("resolves fixed choices and listed users, numeric or string ids", () => {
  assert.equal(resolveActorOption(ACTOR_SYSTEM, OPTIONS, USERS), OPTIONS[1]);
  assert.equal(resolveActorOption("9", OPTIONS, USERS), USERS[1]);
  assert.equal(resolveActorOption(null, OPTIONS, USERS), null);
});

test("an applied user missing from the list still shows, never as الكل", () => {
  // Directory still loading, incomplete, or the id arrived by shared link:
  // a narrowed table must not look unnarrowed.
  assert.deepEqual(resolveActorOption("42", OPTIONS, []), {
    value: "42",
    label: "مستخدم #42",
  });
});
