// Late / early-departure minutes as the attendance screens show them: nothing
// for none, «16 د», «1 س», «1 س 5 د».
export const formatMinutes = (n) => {
  if (!n) return "";
  const hours = Math.floor(n / 60);
  const minutes = n % 60;
  const parts = [];
  if (hours) parts.push(`${hours} س`);
  if (minutes) parts.push(`${minutes} د`);
  return parts.join(" ");
};
