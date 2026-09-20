// The query for GET /auth/audit-logs, in one place.
//
// Split out of auditActions.jsx — and kept free of any import that touches
// `import.meta` — so `npm test` can run it under plain Node. A wrong parameter
// here is either a 422 or, worse, a correct-looking page of the wrong rows, and
// on an audit tool a quietly wrong page is the one failure that matters most.
// auditActions.jsx re-exports both symbols, so callers import from there as
// they do for every other module.

// The ONLY two sort values the endpoint accepts. Anything else is a 422, so an
// out-of-vocabulary value is dropped rather than forwarded: `created_at` is the
// one indexed column on the one table in the system that grows without bound.
export const AUDIT_SORT_KEYS = Object.freeze(["created_at", "-created_at"]);

// event and event_group go over the wire as CSV. Accepts the array the
// multi-select holds and the plain string a URL seed produces.
const csvParam = (value) => {
  const list = Array.isArray(value) ? value : String(value ?? "").split(",");
  const cleaned = list.map((v) => String(v).trim()).filter((v) => v !== "");
  return cleaned.length ? cleaned.join(",") : "";
};

const textParam = (value) => String(value ?? "").trim();

/**
 * Builds the query for the list endpoint.
 *
 * Every empty value is OMITTED rather than sent blank: `?user_id=` is not
 * "any user" to a validator, and a filter that 422s on an empty box makes the
 * screen unusable the moment somebody clears a field.
 *
 * Only the parameters in the contract are ever sent. Anything not listed here
 * does not exist on this endpoint.
 */
export const buildListParams = (page, perPage, filters = {}) => {
  const params = { page, per_page: perPage };

  const {
    user_id,
    event,
    event_group,
    auditable_type,
    auditable_id,
    request_id,
    ip_address,
    date_from,
    date_to,
    search,
    sort,
  } = filters;

  if (textParam(user_id) !== "") params.user_id = textParam(user_id);

  const events = csvParam(event);
  if (events) params.event = events;

  const groups = csvParam(event_group);
  if (groups) params.event_group = groups;

  // auditable_id REQUIRES auditable_type. A bare id is meaningless to the
  // server (id 7 of what?) and is a 422, so it is dropped rather than sent —
  // the UI disables the id box until a type is chosen.
  const type = textParam(auditable_type);
  if (type !== "") {
    params.auditable_type = type;
    if (textParam(auditable_id) !== "")
      params.auditable_id = textParam(auditable_id);
  }

  if (textParam(request_id) !== "") params.request_id = textParam(request_id);
  if (textParam(ip_address) !== "") params.ip_address = textParam(ip_address);
  // YYYY-MM-DD, and date_to is inclusive of the whole end day (Asia/Damascus),
  // so date_from === date_to returns that day including its last hour. Both are
  // passed through verbatim — reformatting a date here is how a day gets lost
  // across a timezone boundary.
  if (textParam(date_from) !== "") params.date_from = textParam(date_from);
  if (textParam(date_to) !== "") params.date_to = textParam(date_to);
  if (textParam(search) !== "") params.search = textParam(search);

  // Default is -created_at server-side; an unknown key would be a 422, so it is
  // dropped and the server's own default applies.
  if (sort && AUDIT_SORT_KEYS.includes(sort)) params.sort = sort;

  return params;
};
