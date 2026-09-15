import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDepartmentCreatePayload,
  buildDepartmentPatch,
  DEPARTMENT_LEVELS,
} from "./departmentPayload.js";

const section = {
  id: 21,
  name: "قسم النقدية",
  code: "FIN-CASH",
  description: null,
  is_active: true,
  parent_id: 4,
  level: 3,
  level_label: "قسم",
  sector: 1,
  sector_label: "المكاتب الإدارية",
  manager_id: null,
};

const sectionValues = {
  name: section.name,
  code: section.code,
  description: "",
  isActive: true,
  parentId: section.parent_id,
  level: section.level,
  sector: "",
  managerId: "",
};

test("the frontend exposes all four documented department levels", () => {
  assert.deepEqual(DEPARTMENT_LEVELS, [1, 2, 3, 4]);
});

test("a non-division PATCH never echoes its resolved sector", () => {
  assert.deepEqual(
    buildDepartmentPatch(section, {
      ...sectionValues,
      name: "قسم النقدية والصندوق",
    }),
    { name: "قسم النقدية والصندوق" }
  );
});

test("moving a section sends only the changed parent and no sector", () => {
  assert.deepEqual(
    buildDepartmentPatch(section, { ...sectionValues, parentId: 9 }),
    { parent_id: 9 }
  );
});

test("editing a division may send its changed sector", () => {
  const division = { ...section, level: 2, sector: 1, parent_id: 1 };
  assert.deepEqual(
    buildDepartmentPatch(division, {
      ...sectionValues,
      level: 2,
      parentId: 1,
      sector: 2,
    }),
    { sector: 2 }
  );
});

test("creating an office omits sector while creating a division includes it", () => {
  const officePayload = buildDepartmentCreatePayload({
    ...sectionValues,
    name: "أمانة الصندوق",
    code: "FIN-CASH-VAULT",
    level: 4,
    parentId: 21,
    sector: 1,
  });
  const divisionPayload = buildDepartmentCreatePayload({
    ...sectionValues,
    name: "الإدارة المالية",
    code: "FIN",
    level: 2,
    parentId: 1,
    sector: 1,
  });

  assert.equal(Object.hasOwn(officePayload, "sector"), false);
  assert.equal(divisionPayload.sector, 1);
});

test("demoting a division to a lower level clears its stored sector", () => {
  const division = { ...section, level: 2, sector: 1, parent_id: 1 };

  // Omitting `sector` here would leave the stored 1 in place server-side, and
  // the hierarchy guard refuses a sector on any level but 2.
  assert.deepEqual(
    buildDepartmentPatch(division, {
      ...sectionValues,
      level: 3,
      parentId: 4,
      sector: "",
    }),
    { level: 3, parent_id: 4, sector: null }
  );
});

test("a section that never stored a sector is not sent a redundant null", () => {
  assert.deepEqual(
    buildDepartmentPatch(section, { ...sectionValues, level: 4 }),
    { level: 4 }
  );
});

test("promoting a section to a division sends the chosen sector", () => {
  assert.deepEqual(
    buildDepartmentPatch(section, {
      ...sectionValues,
      level: 2,
      parentId: 1,
      sector: 2,
    }),
    { level: 2, parent_id: 1, sector: 2 }
  );
});
