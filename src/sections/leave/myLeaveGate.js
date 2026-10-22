// Whether the signed-in account has a «طلباتي» to show.
//
// API doc §3.4: the /auth/me user's `name` is the LINKED EMPLOYEE's name, and
// "`name` is null when the account has no employee link". Such an account (a
// super_admin with no employee) has no balance and cannot file leave — both
// reads answer 403 — so the sidebar hides the link (spec §8 item 5) instead of
// leading to a dead screen. Kept pure so `npm test` runs it under plain Node.
export const showsMyLeave = (user) =>
  typeof user?.name === "string" && user.name.trim() !== "";
