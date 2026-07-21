const validatePassword = (password) => ({
  isMinLength: password?.length >= 8,
  isMaxLength: password?.length <= 16,
  hasUpperCase: /[A-Z]/.test(password),
  hasLowerCase: /[a-z]/.test(password),
  hasNumber: /\d/.test(password),
  hasSymbol: /[^A-Za-z0-9]/.test(password),
});

export default validatePassword;