import { toast } from "react-toastify";

const toastNotify = (message, type) =>
  toast(message, {
    type,
    className: "rounded-2",
  });

export default toastNotify;
