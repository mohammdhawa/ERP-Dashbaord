// Posting-history payload construction (API doc §8.3).
//
// THE RULE THAT MAKES THIS RESOURCE DIFFERENT:
//
//   OMIT a field   → the current value CARRIES FORWARD
//   send a value   → it REPLACES the current one
//   send null      → it CLEARS the value ("no unit")
//
// Those are three different instructions, and collapsing any two of them
// corrupts the history. A promotion states only the new grade and a تعديل مسمى
// only the new title — neither restates the department, and neither may
// un-assign the person from it. `null` is reserved for when the user has
// actually asked for "no unit".

export const MODE_KEEP = "keep";
export const MODE_SET = "set";
export const MODE_CLEAR = "clear";

/**
 * Applies one keep/set/clear decision to the payload.
 * MODE_KEEP deliberately does not touch `payload` at all.
 */
const applyMode = (payload, key, mode, value) => {
  if (mode === MODE_SET) payload[key] = Number(value);
  else if (mode === MODE_CLEAR) payload[key] = null;
};

/**
 * ⚠️ `organizational_grade` is NOT salary-gated on this resource, even though
 * the same column IS gated on the employee record. The assignments endpoints
 * are guarded by `hr.assignments.view` / `hr.assignments.create` — permissions
 * an HR administrator holds specifically to read and write posting history, and
 * which are not bundled with `hr.employees.view`. The backend states this
 * explicitly and exposes the grade ungated. Gating it here as well made a
 * promotion unrecordable by the very people the permission exists for, since a
 * promotion is usually nothing but a grade change.
 *
 * @param values  form state
 */
export const buildAssignmentPayload = (values) => {
  const payload = {
    from_date: values.from_date,
    reason: Number(values.reason),
  };

  const notes = String(values.notes ?? "").trim();
  if (notes !== "") payload.notes = notes;

  applyMode(
    payload,
    "department_id",
    values.departmentMode,
    values.department_id
  );
  applyMode(payload, "job_title_id", values.jobTitleMode, values.job_title_id);

  applyMode(
    payload,
    "organizational_grade",
    values.gradeMode,
    values.organizational_grade
  );

  return payload;
};

/**
 * Client-side mirror of the documented rules. Back-dating is allowed; the
 * future is not, and `reason` has no default because it is the only thing
 * distinguishing a promotion from a restructure once the row is written.
 */
export const validateAssignmentForm = (values, today) => {
  const errors = {};

  if (!values.from_date) errors.from_date = ["تاريخ بدء التعيين مطلوب."];
  // Date-only string comparison: YYYY-MM-DD sorts chronologically, so no Date
  // parsing and no timezone shift.
  else if (values.from_date > today)
    errors.from_date = ["لا يمكن أن يكون تاريخ التعيين في المستقبل."];

  if (values.reason === "" || values.reason == null)
    errors.reason = ["سبب التعيين مطلوب."];

  if (values.departmentMode === MODE_SET && values.department_id === "")
    errors.department_id = ["اختر الوحدة التنظيمية الجديدة."];
  if (values.jobTitleMode === MODE_SET && values.job_title_id === "")
    errors.job_title_id = ["اختر المسمى الوظيفي الجديد."];
  if (values.gradeMode === MODE_SET && values.organizational_grade === "")
    errors.organizational_grade = ["اختر الدرجة التنظيمية الجديدة."];

  return errors;
};
