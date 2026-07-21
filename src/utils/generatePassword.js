const generatePassword = () => {
  const upperCase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowerCase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+[]{}|;:,.<>?";
  const allChars = upperCase + lowerCase + numbers;
  const passwordLength = Math.floor(Math.random() * (16 - 8 + 1)) + 8;
  let generatedPassword = "";
  generatedPassword += upperCase[Math.floor(Math.random() * upperCase.length)];
  generatedPassword += lowerCase[Math.floor(Math.random() * lowerCase.length)];
  generatedPassword += numbers[Math.floor(Math.random() * numbers.length)];
  generatedPassword += symbols[Math.floor(Math.random() * symbols.length)];
  for (let i = 4; i < passwordLength; i++) {
    generatedPassword += allChars[Math.floor(Math.random() * allChars.length)];
  }
  generatedPassword = generatedPassword
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");

  return generatedPassword;
};

export default generatePassword;
