import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAssignmentPayload,
  buildSitePayload,
  canManageSites,
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
    effective_from: "2026-10-31T06:30:00.000Z",
  });
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
