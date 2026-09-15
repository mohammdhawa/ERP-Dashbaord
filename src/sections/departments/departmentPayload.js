export const DEPARTMENT_LEVELS = Object.freeze([1, 2, 3, 4]);
export const DEPARTMENT_SECTORS = Object.freeze([1, 2]);

const nullableString = (value) => {
  const trimmed = String(value ?? "").trim();
  return trimmed === "" ? null : trimmed;
};

const nullableId = (value) =>
  value === "" || value == null ? null : Number(value);

const serializeFormValues = (values) => ({
  name: String(values.name ?? "").trim(),
  code: nullableString(values.code),
  description: nullableString(values.description),
  is_active: Boolean(values.isActive),
  parent_id: nullableId(values.parentId),
  level: nullableId(values.level),
  manager_id: nullableId(values.managerId),
});

export const getDepartmentFormValues = (department) => ({
  name: department?.name || "",
  code: department?.code || "",
  description: department?.description || "",
  isActive: department?.is_active ?? true,
  level: department?.level ?? "",
  parentId: department?.parent_id ?? "",
  managerId: department?.manager_id ?? "",
  // A non-division's response contains an inherited value. Never put that
  // resolved value into editable form state, or it can leak into a write.
  sector: Number(department?.level) === 2 ? department?.sector ?? "" : "",
});

export const buildDepartmentCreatePayload = (values) => {
  const payload = serializeFormValues(values);

  if (payload.level === 2) {
    payload.sector = nullableId(values.sector);
  }

  return payload;
};

export const buildDepartmentPatch = (department, values) => {
  const next = serializeFormValues(values);
  const original = serializeFormValues(getDepartmentFormValues(department));
  const patch = {};

  Object.keys(next).forEach((field) => {
    if (next[field] !== original[field]) patch[field] = next[field];
  });

  // Reads resolve inherited sectors, but writes accept sector only for a
  // division. Compare it separately so a section/office can never echo the
  // server-provided inherited value back in a PATCH.
  //
  // A sector is only STORED on this row when it is a division; on anything else
  // the value the API returned was inherited from an ancestor.
  const storedSector =
    Number(department?.level) === 2 ? nullableId(department?.sector) : null;

  if (next.level === 2) {
    const nextSector = nullableId(values.sector);
    if (nextSector !== storedSector) patch.sector = nextSector;
  } else if (storedSector !== null) {
    // ⚠️ DEMOTING A DIVISION must clear the sector EXPLICITLY.
    //
    // The server validates the row it will end up storing: when `sector` is
    // absent from the payload it falls back to the stored raw value. So a
    // division moved to level 3/4 while omitting `sector` is judged as a
    // level-3 row that still declares a sector, and the hierarchy guard refuses
    // it ("الجهة تُحدَّد على مستوى الإدارة (المستوى 2) فقط"). Sending null is
    // what actually performs the demotion.
    patch.sector = null;
  }

  return patch;
};
