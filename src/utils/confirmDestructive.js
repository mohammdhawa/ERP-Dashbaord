import Swal from "sweetalert2";

// Shared confirmation for destructive actions.
//
// WHY THIS EXISTS AT ALL — it is not deduplication for its own sake. Every
// delete in this app inlined the same eight Swal options AND the same
// subject-less question: "هل أنت متأكد من حذف هذا الموظف؟". That sentence
// cannot be checked against anything. The delete control is a 24px icon button
// in a dense striped table of near-identical rows, and this dialog is the only
// thing between a mis-aimed click and a destroyed record — so it has to say
// WHICH record. "حذف الموظف: أحمد محمد العلي؟" can be read and refused; the old
// wording could only be confirmed on faith.
//
// `subject` is the record's own human-readable name. Callers that genuinely
// cannot resolve one (an unlinked account, a row still loading) pass nothing
// and get the bare question back rather than a dangling colon or a raw id —
// showing "حذف المستخدم: 47؟" would be worse than saying nothing, because an id
// is not something the user can recognise the row by.
//
// Returns a plain boolean: every caller only ever asked `.isConfirmed`.
const confirmDestructive = async ({
  // The action and its object, e.g. "حذف الموظف". Not a full sentence — the
  // subject and the question mark are appended here so the phrasing stays
  // identical across all six call sites.
  action,
  subject,
  // What actually happens. Worth being specific: a soft withdraw and a hard
  // delete are different promises and must not share one line of copy.
  text,
  // Overridden where "حذف" misdescribes the outcome (سحب الإنذار).
  confirmButtonText = "حذف",
}) => {
  const trimmedSubject = typeof subject === "string" ? subject.trim() : "";

  const result = await Swal.fire({
    title: trimmedSubject ? `${action}: ${trimmedSubject}؟` : `${action}؟`,
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
  });

  return result.isConfirmed;
};

export default confirmDestructive;
