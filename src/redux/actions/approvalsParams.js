// Pure query-string builder for the approver's inbox (API doc §15.2).
// Kept free of imports (the api module touches import.meta) so node --test can
// load it; approvalsActions.jsx is the only consumer.

export const INBOX_TABS = ["pending", "decided"];

export const buildInboxParams = (tab, page, perPage) => {
  const params = { page, per_page: perPage };
  // `?status=decided` lists what the caller already decided. Pending is the
  // DEFAULT and has no status value — any other value is a 422 — so an
  // unknown tab also falls back to the plain page instead of being forwarded.
  if (tab === "decided") params.status = "decided";
  return params;
};
