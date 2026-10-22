// What the sign-in page's refusal view says for a 403 (API doc §3.1). Two
// refusals share the status: a disabled account, and — 2026-10-20, parity
// audit C-3 — an enabled account whose employee is suspended, which signs in
// again once the employee is back on duty. The server gives no code, so the
// suspended one is told apart by its message; the server's text is always
// shown as the body either way.
export const SUSPENDED_MESSAGE = "لا يمكن تسجيل الدخول: الموظف موقوف عن العمل.";

export const loginRefusalView = (message) =>
  typeof message === "string" && message.includes("موقوف عن العمل")
    ? {
        suspended: true,
        title: "الموظف موقوف عن العمل",
        hint: "يعود الدخول متاحاً تلقائياً عند عودة الموظف إلى العمل.",
      }
    : { suspended: false, title: "تم تعطيل هذا الحساب", hint: null };
