import { toast } from "react-toastify";

// An error is the one message the user MUST be able to read — it names what
// failed and often what to do about it. Successes can time out; errors wait to
// be dismissed. (The container's own autoClose applies to everything else.)
//
// A falsy message is dropped rather than rendered as an empty toast: several
// callers pass `response.data.message` straight through, and not every endpoint
// supplies one.
const toastNotify = (message, type) => {
  if (!message) return undefined;

  return toast(message, {
    type,
    className: "rounded-2",
    autoClose: type === "error" ? false : undefined,
    closeOnClick: true,
  });
};

export default toastNotify;
