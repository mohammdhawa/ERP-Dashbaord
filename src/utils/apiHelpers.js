// Helpers for the standard response envelope:
//   { success: boolean, message: string (Arabic), data?: any, errors?: {field: string[]} }
//
// EVERY response now carries `success` — including 401, 404, 405, 429 and 5xx,
// which previously came back as bare `{ "message": ... }` from Laravel's own
// handlers. All of it goes through one server-side mapper, and every message is
// Arabic and display-ready.
//
// That does NOT change how 401 and 429 are routed: the interceptor still keys on
// the STATUS CODE, because what to do about them (refresh / back off) depends on
// the status, not on `success`. A 403 is also `success: false` and must never
// trigger a refresh.
//
// Do not parse a 404 `message`: a missing row and an unknown route deliberately
// return identical text so a 404 cannot confirm which records exist.

export const FALLBACK_ERROR = "حدث خطأ غير متوقع، يرجى المحاولة مجدداً.";
export const NETWORK_ERROR = "تعذر الاتصال بالخادم، تحقق من اتصالك بالإنترنت.";

/**
 * Walks every page of a paginated list endpoint and returns one flat array.
 *
 * WHY THIS EXISTS: some UI genuinely needs the WHOLE set, not a page — a
 * <select> of roles to grant, or of users to grant them to. Every list endpoint
 * is paginated now, so a plain GET returns 15 rows and a dropdown would just
 * stop listing people past the first page, with nothing on screen saying so.
 * An admin unable to find user #200 in a picker is a silent failure.
 *
 * Use it ONLY for pickers over small, bounded sets. A table must page properly
 * (see any of the DataTableServer pages) — pulling 242 employees to filter them
 * in the browser is the thing pagination exists to prevent.
 *
 * `per_page` is requested at the API's maximum (100, clamped server-side), and
 * `maxPages` is a hard stop so a mis-set `last_page` cannot spin forever.
 */
export const fetchAllPages = async (
  api,
  url,
  { perPage = 100, maxPages = 20 } = {}
) => {
  const all = [];
  let page = 1;
  let lastPage = 1;

  do {
    const response = await api.get(url, {
      params: { page, per_page: perPage },
    });
    all.push(...(response.data?.data || []));
    lastPage = response.data?.meta?.last_page ?? 1;
    page += 1;
  } while (page <= lastPage && page <= maxPages);

  return all;
};

/**
 * Normalizes any axios error into { status, message, errors, retryAfter }.
 * - message: server Arabic message when available (display as-is in toasts).
 * - errors: Laravel field-keyed bag, present only on 422 validation failures.
 * - retryAfter: seconds from the Retry-After header, present only on 429.
 */
export const parseApiError = (error) => {
  if (!error?.response) {
    return { status: 0, message: NETWORK_ERROR, errors: null, retryAfter: null };
  }

  const { status, data, headers } = error.response;

  if (status === 429) {
    const retryAfter = parseInt(headers?.["retry-after"], 10) || 60;
    return {
      status,
      message: `محاولات كثيرة، يرجى الانتظار ${retryAfter} ثانية ثم المحاولة مجدداً.`,
      errors: null,
      retryAfter,
    };
  }

  return {
    status,
    message: data?.message || FALLBACK_ERROR,
    errors: data?.errors || null,
    retryAfter: null,
  };
};
