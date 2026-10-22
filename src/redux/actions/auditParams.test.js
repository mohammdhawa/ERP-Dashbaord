import test from "node:test";
import assert from "node:assert/strict";
import { ACTOR_TYPES, AUDIT_SORT_KEYS, buildListParams } from "./auditParams.js";

const base = { page: 1, per_page: 15 };

test("an untouched filter set sends nothing but the page", () => {
  // Not `?user_id=&event=&search=` — an empty string is not "any" to a
  // validator, and a screen that 422s the moment a box is cleared is unusable.
  assert.deepEqual(
    buildListParams(1, 15, {
      user_id: "",
      event: [],
      event_group: [],
      auditable_type: "",
      auditable_id: "",
      request_id: "",
      ip_address: "",
      date_from: "",
      date_to: "",
      search: "",
      sort: "",
    }),
    base
  );
});

test("an empty event / event_group list is OMITTED, never sent blank", () => {
  // THE 1.5 REGRESSION CHECK. As of 2026-09-20 `?event=` and `?event=,,,` are
  // a 422 rather than silently ignored — and on event_group, the parameter
  // that hides the api_request firehose, being ignored used to mean the page
  // came back as the firehose. Every request on the screen goes through this
  // one builder, AuditTrail included, so this is the whole guarantee.
  assert.deepEqual(buildListParams(1, 15, { event: [], event_group: [] }), base);
  assert.deepEqual(buildListParams(1, 15, { event: "", event_group: "" }), base);
  assert.deepEqual(buildListParams(1, 15, { event: ",,,", event_group: " , " }), base);
});

test("event and event_group are CSV-joined", () => {
  assert.deepEqual(
    buildListParams(1, 15, {
      event: ["created", "updated"],
      event_group: ["model", "auth"],
    }),
    { ...base, event: "created,updated", event_group: "model,auth" }
  );
});

test("a CSV string from a URL seed is accepted as-is", () => {
  assert.deepEqual(
    buildListParams(1, 15, { event_group: "model,auth,request" }),
    { ...base, event_group: "model,auth,request" }
  );
});

test("the default hides api_request and the switch includes it", () => {
  assert.equal(
    buildListParams(1, 15, { event_group: ["model", "auth"] }).event_group,
    "model,auth"
  );
  assert.equal(
    buildListParams(1, 15, { event_group: ["model", "auth", "request"] })
      .event_group,
    "model,auth,request"
  );
});

test("only the two legal actor_type values reach the wire", () => {
  assert.deepEqual(ACTOR_TYPES, ["user", "system"]);
  assert.equal(buildListParams(1, 15, { actor_type: "system" }).actor_type, "system");
  assert.equal(buildListParams(1, 15, { actor_type: "user" }).actor_type, "user");
  // Cleared, and anything out of vocabulary, is dropped rather than forwarded:
  // an unknown value is a 422 with errors.actor_type, and a screen that 422s
  // on a value it produced itself is broken rather than merely rejected.
  assert.equal("actor_type" in buildListParams(1, 15, { actor_type: "" }), false);
  assert.equal("actor_type" in buildListParams(1, 15, {}), false);
  assert.equal("actor_type" in buildListParams(1, 15, { actor_type: "robot" }), false);
  assert.equal("actor_type" in buildListParams(1, 15, { actor_type: "System" }), false);
});

test("actor_type composes with user_id rather than replacing it", () => {
  // The server ANDs them, which is why the UI clears the user when النظام is
  // picked — a system row has user_id null, so the pair is an empty page. The
  // builder forwards whatever it is given; refusing the combination is the
  // filter component's job, and this pins that the wire stays faithful.
  assert.deepEqual(buildListParams(1, 15, { actor_type: "user", user_id: 7 }), {
    ...base,
    user_id: "7",
    actor_type: "user",
  });
});

test("only the two legal sort keys reach the wire", () => {
  assert.deepEqual(AUDIT_SORT_KEYS, ["created_at", "-created_at"]);
  assert.equal(buildListParams(1, 15, { sort: "-created_at" }).sort, "-created_at");
  assert.equal(buildListParams(1, 15, { sort: "created_at" }).sort, "created_at");
});

test("any other sort is DROPPED, never forwarded", () => {
  // Sending one is a 422, and only created_at is indexed on a table that grows
  // without bound. Dropping it falls back to the server's own default.
  ["event", "-event", "user_id", "ip_address", "id", "-id", "created"].forEach(
    (sort) => {
      assert.equal(
        Object.prototype.hasOwnProperty.call(
          buildListParams(1, 15, { sort }),
          "sort"
        ),
        false,
        sort
      );
    }
  );
});

test("auditable_id is dropped unless a type accompanies it", () => {
  // "id 7" of what? The server cannot answer that and returns a 422.
  const bare = buildListParams(1, 15, { auditable_id: "7" });
  assert.equal(Object.prototype.hasOwnProperty.call(bare, "auditable_id"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(bare, "auditable_type"), false);

  assert.deepEqual(
    buildListParams(1, 15, { auditable_type: "employee", auditable_id: 7 }),
    { ...base, auditable_type: "employee", auditable_id: "7" }
  );
});

test("a type on its own is a legitimate filter", () => {
  assert.deepEqual(buildListParams(1, 15, { auditable_type: "department" }), {
    ...base,
    auditable_type: "department",
  });
});

test("a single day is passed through verbatim on both bounds", () => {
  // date_to is inclusive of the whole end day (Asia/Damascus), so from == to is
  // that day including its last hour. Reformatting either here is how a day
  // gets lost across a timezone boundary.
  assert.deepEqual(
    buildListParams(1, 15, { date_from: "2026-09-16", date_to: "2026-09-16" }),
    { ...base, date_from: "2026-09-16", date_to: "2026-09-16" }
  );
});

test("free-text filters are trimmed, and whitespace alone is not a filter", () => {
  assert.deepEqual(
    buildListParams(1, 15, { search: "  راتب  ", ip_address: " 10.0.0.4 " }),
    { ...base, search: "راتب", ip_address: "10.0.0.4" }
  );
  assert.deepEqual(buildListParams(1, 15, { search: "   " }), base);
});

test("the requested page and size are always sent, out-of-range included", () => {
  // page=99 past the end is a 200 with an empty data array and correct meta,
  // never an error — so it is forwarded rather than clamped in the browser.
  assert.deepEqual(buildListParams(99, 50, {}), { page: 99, per_page: 50 });
});

test("the drill-down sends the request id alone", () => {
  assert.deepEqual(
    buildListParams(1, 15, {
      request_id: "0f9c1e2a-77aa-4b1c-9f60-2b4f0f7a1234",
      event_group: ["model", "auth", "request"],
    }),
    {
      ...base,
      request_id: "0f9c1e2a-77aa-4b1c-9f60-2b4f0f7a1234",
      event_group: "model,auth,request",
    }
  );
});

test("no parameter outside the contract is ever sent", () => {
  const params = buildListParams(1, 15, {
    search: "x",
    // Not in the contract — must not appear on the wire.
    per_page_override: 500,
    include: "user",
    with_trashed: true,
    order_by: "id",
  });
  assert.deepEqual(Object.keys(params).sort(), ["page", "per_page", "search"]);
});
