// What the employee form shows once after a create: the account the server made
// with the employee and its temporary password, which no endpoint returns again
// (backend EMPLOYEE_ACCOUNT_ON_CREATE_DESIGN.md). A terminated employee's
// account is created disabled, with no password to hand out.
export const newAccountNotice = (account) => {
  if (!account) return null;

  const disabled = !account.temporary_password;
  return {
    login: String(account.login ?? ""),
    password: account.temporary_password || "",
    disabled,
    message: disabled
      ? "الحساب معطّل لأن الموظف منتهي الخدمة."
      : "انسخ كلمة المرور الآن — لن تظهر مرة أخرى. يُطلب من الموظف تغييرها عند أول دخول.",
  };
};
