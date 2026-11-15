import test from "node:test";
import assert from "node:assert/strict";
import {
  SWAP_STATUSES,
  canCancelSwap,
  defaultSwapFilters,
  dutySpanText,
  swapFiltersFromSearch,
  toSwapParams,
} from "./swapView.js";

const swap = (over = {}) => ({
  status: 2,
  requester_duty: { date: "2026-11-20", starts_at: "2026-11-20T08:00:00+03:00" },
  partner_duty: { date: "2026-11-17", starts_at: "2026-11-17T08:00:00+03:00" },
  ...over,
});
const at = (iso) => new Date(iso);

test("SWAP_STATUSES are the five states", () => {
  assert.deepEqual(SWAP_STATUSES, ["1", "2", "3", "4", "5"]);
});

test("canCancelSwap judges the EARLIER duty, here the partner's", () => {
  assert.equal(canCancelSwap(swap(), at("2026-11-18T00:00:00+03:00")), false);
  assert.equal(canCancelSwap(swap(), at("2026-11-16T00:00:00+03:00")), true);
});

test("canCancelSwap compares instants, not strings (offset-aware)", () => {
  // 2026-11-17T05:30Z is 08:30 in Damascus: the 08:00+03:00 duty has started.
  assert.equal(canCancelSwap(swap(), at("2026-11-17T05:30:00Z")), false);
  // 04:30Z is 07:30 in Damascus: not yet.
  assert.equal(canCancelSwap(swap(), at("2026-11-17T04:30:00Z")), true);
});

test("canCancelSwap needs an approved exchange", () => {
  assert.equal(canCancelSwap(swap({ status: 1 }), at("2026-11-16T00:00:00+03:00")), false);
  assert.equal(canCancelSwap(swap({ status: 5 }), at("2026-11-16T00:00:00+03:00")), false);
  assert.equal(canCancelSwap(null), false);
});

test("canCancelSwap is false when a duty has no start", () => {
  assert.equal(
    canCancelSwap(swap({ partner_duty: { date: "2026-11-17" } }), at("2026-11-16T00:00:00+03:00")),
    false
  );
});

const from = (qs) => {
  const p = new URLSearchParams(qs);
  return swapFiltersFromSearch((k) => p.get(k), defaultSwapFilters());
};

test("defaults are empty", () => {
  assert.deepEqual(defaultSwapFilters(), { status: "", employee_id: "", from: "", to: "" });
});

test("a valid URL round-trips", () => {
  assert.deepEqual(from("status=2&employee_id=32&from=2026-11-01&to=2026-11-30"), {
    status: "2",
    employee_id: "32",
    from: "2026-11-01",
    to: "2026-11-30",
  });
});

test("status=9 is dropped", () => {
  assert.equal(from("status=9").status, "");
});

test("employee_id must be a positive id", () => {
  assert.equal(from("employee_id=0").employee_id, "");
  assert.equal(from("employee_id=abc").employee_id, "");
});

test("an inverted window drops both ends", () => {
  const f = from("from=2026-11-30&to=2026-11-01");
  assert.equal(f.from, "");
  assert.equal(f.to, "");
});

test("a window over 92 days drops both ends; exactly 92 is kept", () => {
  assert.equal(from("from=2026-01-01&to=2026-06-01").from, "");
  const ok = from("from=2026-01-01&to=2026-04-02"); // 92 days inclusive
  assert.equal(ok.from, "2026-01-01");
  assert.equal(from("from=2026-01-01&to=2026-04-03").to, "");
});

test("a half window or an unreal date is dropped", () => {
  assert.equal(from("from=2026-11-01").from, "");
  assert.equal(from("from=2026-02-31&to=2026-03-02").from, "");
});

test("toSwapParams omits empty values", () => {
  assert.deepEqual(toSwapParams(defaultSwapFilters(), 1, 15), { page: 1, per_page: 15 });
  assert.deepEqual(
    toSwapParams({ status: "2", employee_id: "32", from: "2026-11-01", to: "2026-11-30" }, 3, 15),
    { page: 3, per_page: 15, status: "2", employee_id: "32", from: "2026-11-01", to: "2026-11-30" }
  );
});

test("toSwapParams never sends half a window", () => {
  assert.deepEqual(
    toSwapParams({ status: "", employee_id: "", from: "2026-11-01", to: "" }, 1, 15),
    { page: 1, per_page: 15 }
  );
});

test("dutySpanText shows the dates of a 72-hour duty, read from the text", () => {
  assert.equal(
    dutySpanText("2026-11-17T08:00:00+03:00", "2026-11-20T08:00:00+03:00"),
    "11-17 08:00 → 11-20 08:00"
  );
});

test("dutySpanText shows the date once for a same-day duty", () => {
  assert.equal(
    dutySpanText("2026-11-17T08:00:00+03:00", "2026-11-17T18:00:00+03:00"),
    "11-17 08:00 → 18:00"
  );
  assert.equal(dutySpanText(null, null), "");
});
