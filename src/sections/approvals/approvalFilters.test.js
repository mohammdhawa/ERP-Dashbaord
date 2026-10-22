import test from "node:test";
import assert from "node:assert/strict";
import {
  approvalFiltersFromSearch,
  approvalFiltersProblem,
  defaultApprovalFilters,
  defaultListFilters,
  hasAnyApprovalFilter,
} from "./approvalFilters.js";
import { LIST_SORT_KEYS } from "../../redux/actions/approvalsParams.js";

const from = (query) => (key) => new URLSearchParams(query).get(key);

test("the HR list starts on every status, the inbox has no status at all", () => {
  assert.equal(defaultListFilters().statuses, "");
  assert.equal("statuses" in defaultApprovalFilters(), false);
});

test("a good link is read back whole", () => {
  const f = approvalFiltersFromSearch(
    from(
      "search=EMP-7&department_id=3&leave_type_ids=2,5&date_from=2026-06-01&date_to=2026-06-30&submitted_from=2026-05-01&submitted_to=2026-05-31&sort=-employee_name"
    ),
    defaultApprovalFilters()
  );
  assert.deepEqual(f, {
    search: "EMP-7",
    department_id: "3",
    leave_type_ids: "2,5",
    date_from: "2026-06-01",
    date_to: "2026-06-30",
    submitted_from: "2026-05-01",
    submitted_to: "2026-05-31",
    sort: "-employee_name",
  });
});

test("a hand-edited link falls back field by field", () => {
  const f = approvalFiltersFromSearch(
    from(
      "department_id=0&leave_type_ids=x,4&date_from=2026-02-31&sort=decided_at&statuses=1"
    ),
    defaultApprovalFilters()
  );
  // decided_at is not the inbox's sort; statuses is not the inbox's filter.
  assert.deepEqual(f, { ...defaultApprovalFilters(), leave_type_ids: "4" });
});

test("the HR list reads its statuses and its own sort", () => {
  const f = approvalFiltersFromSearch(
    from("statuses=1,4,7&sort=-decided_at"),
    defaultListFilters(),
    LIST_SORT_KEYS
  );
  assert.equal(f.statuses, "1,4");
  assert.equal(f.sort, "-decided_at");
});

test("an inverted range is a problem; one end alone is not", () => {
  const base = defaultApprovalFilters();
  assert.equal(approvalFiltersProblem(base), null);
  assert.equal(
    approvalFiltersProblem({ ...base, date_to: "2026-06-01" }),
    null
  );
  assert.match(
    approvalFiltersProblem({
      ...base,
      date_from: "2026-06-02",
      date_to: "2026-06-01",
    }),
    /نهاية الإجازة/
  );
  assert.match(
    approvalFiltersProblem({
      ...base,
      submitted_from: "2026-06-02",
      submitted_to: "2026-06-01",
    }),
    /تاريخ التقديم/
  );
});

test("any changed field counts as a filter", () => {
  const d = defaultListFilters();
  assert.equal(hasAnyApprovalFilter(d, d), false);
  assert.equal(hasAnyApprovalFilter({ ...d, statuses: "1" }, d), true);
});
