import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAssignmentPayload,
  buildAssignmentEndPayload,
  buildSitePayload,
  canManageSites,
  damascusInstant,
  siteToOption,
  validateAssignmentEnd,
  formatEffectiveTime,
  siteErrorMessage,
  validateAssignmentForm,
  validateSiteForm,
} from "./workSiteForm.js";

const now = new Date("2026-10-31T09:00:00+03:00");

test("site form validates coordinates, radius, name and effective time", () => {
  const errors = validateSiteForm(
    { name: "", latitude: "91", longitude: "-181", radius_m: "0" },
    { now }
  );
  assert.deepEqual(Object.keys(errors).sort(), [
    "latitude",
    "longitude",
    "name",
    "radius_m",
  ]);

  assert.ok(
    validateSiteForm(
      {
        name: "Plant",
        latitude: "33.5",
        longitude: "36.3",
        radius_m: "100",
        effective_from: "2026-10-31T08:00:00+03:00",
      },
      { editing: true, now }
    ).effective_from
  );
  assert.ok(
    validateSiteForm(
      { name: "Plant", latitude: "33.5", longitude: "36.3", radius_m: "100" },
      { editing: true, now }
    ).effective_from
  );
});

test("site payload uses numbers and dates only for edits", () => {
  const fields = {
    name: "  Plant  ",
    latitude: "33.500001",
    longitude: "36.3",
    radius_m: "125",
    effective_from: "2026-10-31T09:30:00+03:00",
  };
  assert.deepEqual(buildSitePayload(fields), {
    name: "Plant",
    latitude: 33.500001,
    longitude: 36.3,
    radius_m: 125,
  });
  assert.deepEqual(buildSitePayload(fields, { editing: true }), {
    name: "Plant",
    latitude: 33.500001,
    longitude: 36.3,
    radius_m: 125,
    effective_from: "2026-10-31T09:30:00+03:00",
  });
});

test("datetime-local values are Damascus wall clock, whatever the browser's zone", () => {
  assert.equal(damascusInstant("2026-10-31T09:30"), "2026-10-31T09:30:00+03:00");
  assert.equal(damascusInstant("2026-10-31T09:30:15"), "2026-10-31T09:30:15+03:00");
  assert.equal(damascusInstant("2026-10-31T06:30:00Z"), "2026-10-31T06:30:00Z");
  // 08:59 Damascus is a minute before `now` (09:00 Damascus): refused as past.
  assert.ok(
    validateSiteForm(
      { name: "Plant", latitude: "33.5", longitude: "36.3", radius_m: "100", effective_from: "2026-10-31T08:59" },
      { editing: true, now }
    ).effective_from
  );
  assert.equal(
    validateSiteForm(
      { name: "Plant", latitude: "33.5", longitude: "36.3", radius_m: "100", effective_from: "2026-10-31T09:01" },
      { editing: true, now }
    ).effective_from,
    undefined
  );
  assert.deepEqual(
    buildAssignmentPayload({ employee_id: "7", work_site_id: "3", effective_from: "2026-11-01T08:00" }),
    { employee_id: 7, work_site_id: 3, effective_from: "2026-11-01T08:00:00+03:00" }
  );
});

test("ending an assignment is now or later, after its start, in Damascus time", () => {
  const from = "2026-10-31T10:00:00+03:00";
  assert.ok(validateAssignmentEnd("2026-10-31T08:00", from, { now }));
  assert.ok(validateAssignmentEnd("2026-10-31T09:30", from, { now }));
  assert.ok(validateAssignmentEnd("", from, { now }));
  assert.equal(validateAssignmentEnd("2026-10-31T10:30", from, { now }), null);
  assert.deepEqual(buildAssignmentEndPayload("2026-10-31T10:30"), {
    effective_to: "2026-10-31T10:30:00+03:00",
  });
});

test("site options name the site and mark an archived one", () => {
  assert.deepEqual(siteToOption({ id: 3, name: "المعمل", is_active: true }), {
    value: 3, label: "المعمل (#3)", isActive: true,
  });
  assert.equal(siteToOption({ id: 4, name: "قديم", is_active: false }).isActive, false);
});

test("one-employee assignment validates IDs and no backdating", () => {
  assert.deepEqual(
    Object.keys(
      validateAssignmentForm(
        { employee_id: "0", work_site_id: "x", effective_from: "2026-10-30T12:00:00+03:00" },
        { now }
      )
    ).sort(),
    ["effective_from", "employee_id", "work_site_id"]
  );
  assert.deepEqual(buildAssignmentPayload({ employee_id: "7", work_site_id: "3" }), {
    employee_id: 7,
    work_site_id: 3,
  });
});

test("server overlap and archive details are shown", () => {
  const error = (field, message) => ({ response: { data: { errors: { [field]: [message] } } } });
  assert.equal(siteErrorMessage(error("effective_from", "Overlaps an assignment")), "Overlaps an assignment");
  assert.equal(siteErrorMessage(error("assignments", "Ali, Sara")), "Ali, Sara");
});

test("effective time uses attendance timezone and controls require management permission", () => {
  assert.equal(formatEffectiveTime("2026-10-31T06:30:00Z"), "2026-10-31 09:30");
  assert.equal(canManageSites(["attendance.work_sites.view"]), false);
  assert.equal(canManageSites(["attendance.work_sites.manage"]), true);
});
