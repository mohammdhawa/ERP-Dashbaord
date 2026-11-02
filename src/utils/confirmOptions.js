// The options confirmDestructive hands sweetalert2 — pure, so `node --test`
// runs it.
//
// `titleText`, never `title`: sweetalert2 renders `title` as HTML, and the
// subject is often a name someone typed — a file name on the import screen.
// Plain text cannot inject markup into the dialog (final review of the
// employee import, Part 1).
export const confirmOptions = ({ action, subject, text, confirmButtonText = "حذف" }) => {
  const trimmedSubject = typeof subject === "string" ? subject.trim() : "";

  return {
    titleText: trimmedSubject ? `${action}: ${trimmedSubject}؟` : `${action}؟`,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: "إلغاء",
    // Confirm on the trailing side, cancel under the reading hand: the same
    // order every other dialog in the app uses.
    reverseButtons: true,
    customClass: {
      confirmButton: "btn btn-danger me-2",
      cancelButton: "btn btn-light me-2",
    },
    buttonsStyling: false,
  };
};
