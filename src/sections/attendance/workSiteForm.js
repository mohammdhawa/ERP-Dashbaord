// A <input type="datetime-local"> value («2026-10-31T09:30») carries no zone,
// and `new Date()` would read it in the browser's own. Effective times are
// Damascus wall clock, as the server and formatEffectiveTime read them, so the
// offset is written on explicitly — the same rule as the checkout correction
// (attendanceParams: `…:00+03:00`). A value that already has a zone is kept.
export const damascusInstant = (value) => {
  const text = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) return `${text}:00+03:00`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(text)) return `${text}+03:00`;
  return text;
};

const validDate = (value, now) => {
  const parsed = new Date(damascusInstant(value));
  return Number.isFinite(parsed.getTime()) && parsed.getTime() >= now.getTime();
};

const validId = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

export const validateSiteForm = (fields, { editing = false, now = new Date() } = {}) => {
  const errors = {};
  const name = String(fields.name ?? "").trim();
  const latitude = Number(fields.latitude);
  const longitude = Number(fields.longitude);
  const radius = Number(fields.radius_m);

  if (!name || name.length > 150) errors.name = "أدخل اسم موقع العمل (حتى 150 حرفاً).";
  if (fields.latitude === "" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    errors.latitude = "خط العرض يجب أن يكون بين -90 و 90.";
  }
  if (fields.longitude === "" || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    errors.longitude = "خط الطول يجب أن يكون بين -180 و 180.";
  }
  if (fields.radius_m === "" || !Number.isFinite(radius) || radius <= 0 || radius > 100000) {
    errors.radius_m = "نصف القطر يجب أن يكون أكبر من صفر وحتى 100000 متر.";
  }
  if (editing && !validDate(fields.effective_from, now)) {
    errors.effective_from = "حدد وقت سريان التعديل الآن أو في المستقبل.";
  }
  return errors;
};

export const buildSitePayload = (fields, { editing = false } = {}) => ({
  name: String(fields.name).trim(),
  latitude: Number(fields.latitude),
  longitude: Number(fields.longitude),
  radius_m: Number(fields.radius_m),
  ...(editing ? { effective_from: damascusInstant(fields.effective_from) } : {}),
});

export const validateAssignmentForm = (fields, { now = new Date() } = {}) => {
  const errors = {};
  if (!validId(fields.employee_id)) errors.employee_id = "حدد موظفاً صالحاً.";
  if (!validId(fields.work_site_id)) errors.work_site_id = "حدد موقع عمل صالحاً.";
  if (fields.effective_from && !validDate(fields.effective_from, now)) {
    errors.effective_from = "حدد وقت سريان التعيين الآن أو في المستقبل.";
  }
  return errors;
};

export const buildAssignmentPayload = (fields) => ({
  employee_id: Number(fields.employee_id),
  work_site_id: Number(fields.work_site_id),
  ...(fields.effective_from
    ? { effective_from: damascusInstant(fields.effective_from) }
    : {}),
});

/** Ending an assignment: now or later, and after it started. */
export const validateAssignmentEnd = (value, effectiveFrom, { now = new Date() } = {}) => {
  const at = new Date(damascusInstant(value));
  if (!Number.isFinite(at.getTime()) || at < now || at <= new Date(effectiveFrom)) {
    return "حدد وقت انتهاء بعد بداية التعيين، الآن أو في المستقبل.";
  }
  return null;
};

export const buildAssignmentEndPayload = (value) => ({
  effective_to: damascusInstant(value),
});

/** A site in the assignment pickers: «الاسم (#3)», archived ones marked. */
export const siteToOption = (site) => ({
  value: site.id,
  label: `${site.name || "موقع"} (#${site.id})${site.is_active === false ? " — مؤرشف" : ""}`,
  isActive: site.is_active !== false,
});

export const formatEffectiveTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Damascus",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (name) => parts.find((entry) => entry.type === name)?.value;
  return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}`;
};

export const siteErrorMessage = (error) => {
  const data = error?.response?.data;
  for (const field of ["assignments", "effective_from", "effective_to", "work_site_id", "work_site"]) {
    const message = data?.errors?.[field]?.[0];
    if (message) return message;
  }
  return data?.message || "تعذر حفظ موقع العمل. حاول مرة أخرى.";
};

export const canManageSites = (permissions = []) =>
  permissions.includes("attendance.work_sites.manage");
