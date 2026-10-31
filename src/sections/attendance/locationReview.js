export const REVIEW_STATUSES = Object.freeze([
  { value: "for_review", label: "للمراجعة", className: "bg-warning-transparent" },
  { value: "in_process", label: "قيد المعالجة", className: "bg-info-transparent" },
  { value: "approved", label: "معتمد", className: "bg-success-transparent" },
]);

const REASONS = Object.freeze({
  no_site: "لا يوجد موقع عمل معيّن",
  inactive_site: "موقع العمل غير فعّال",
  mock_location: "الموقع محاكى",
  fix_time_invalid: "وقت تحديد الموقع غير صالح",
  boundary_changed: "تغيّرت حدود الموقع وقت التسجيل",
  low_accuracy: "دقة الموقع غير كافية",
  boundary_uncertain: "القياس قريب من حدود الموقع",
  outside: "خارج نطاق موقع العمل",
  inside: "داخل نطاق موقع العمل",
});

export const reviewBadge = (review) =>
  REVIEW_STATUSES.find((item) => item.value === review?.status) ||
  { value: null, label: "لم يُقيّم", className: "bg-secondary-transparent" };

export const reviewReasonLabel = (reason) => REASONS[reason] || reason || "—";

export const canApproveLocation = (row, permissions = []) =>
  permissions.includes("attendance.records.approveLocation") &&
  !row?.is_rejected &&
  ["for_review", "in_process"].includes(row?.location_review?.status);

const withNote = (body, note) => {
  const trimmed = String(note ?? "").trim();
  return trimmed ? { ...body, note: trimmed } : body;
};

export const selectedApprovalPayload = (ids, note = "") =>
  withNote({ record_ids: [...new Set(ids.map(Number))].filter((id) => Number.isSafeInteger(id) && id > 0).slice(0, 100) }, note);

const MATCHING_KEYS = ["date", "from", "to", "month", "year", "type", "employee_id", "department_id", "search", "missing_checkout", "is_corrected"];

export const matchingApprovalPayload = (filters, note = "") => {
  const matching = Object.fromEntries(MATCHING_KEYS.filter((key) => filters[key] !== undefined && filters[key] !== "").map((key) => [key, filters[key]]));
  matching.location_review_status = "in_process";
  return withNote({ matching }, note);
};

export const bulkApprovalSummary = (data = {}) => ({
  approved: data.approved?.length || 0,
  skipped: data.skipped?.length || 0,
  remaining: data.remaining ?? null,
  skippedRows: data.skipped || [],
});
