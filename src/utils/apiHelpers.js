// Helpers for the standard response envelope:
//   { success: boolean, message: string (Arabic), data?: any, errors?: {field: string[]} }
// Two responses do NOT carry `success`: the raw 401 `{ "message": "Unauthenticated." }`
// and the 429 `{ "message": "Too Many Requests" }` — both are handled by status code
// in the interceptor, never by `success === false`.

export const FALLBACK_ERROR = "حدث خطأ غير متوقع، يرجى المحاولة مجدداً.";
export const NETWORK_ERROR = "تعذر الاتصال بالخادم، تحقق من اتصالك بالإنترنت.";

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
