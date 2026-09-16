import Swal from "sweetalert2";

// Asked before a form modal throws away unsaved edits.
//
// Every form in this app already refuses Escape and backdrop clicks
// (backdrop="static", keyboard={false}) precisely so a stray click cannot
// destroy a half-filled form — but "إلغاء" and the header's × did exactly that,
// with no warning. Same loss, different button. This closes that gap uniformly.
//
// It is only ever reached when the form is genuinely DIRTY. An untouched form
// closes instantly: prompting someone who opened a modal by mistake and pressed
// cancel teaches them to dismiss the dialog without reading it, which is how a
// guard stops protecting anything.
const confirmDiscardChanges = async () => {
  const result = await Swal.fire({
    title: "تجاهل التعديلات؟",
    text: "لم يتم حفظ التغييرات التي أجريتها على هذا النموذج.",
    icon: "warning",
    showCancelButton: true,
    // The DESTRUCTIVE option is the confirm here, so the wording has to carry
    // the weight the button colour usually would: "تجاهل" against "متابعة
    // التحرير", not a bare "نعم/لا".
    confirmButtonText: "تجاهل",
    cancelButtonText: "متابعة التحرير",
    reverseButtons: true,
    customClass: {
      confirmButton: "btn btn-danger me-2",
      cancelButton: "btn btn-light me-2",
    },
    buttonsStyling: false,
  });
  return result.isConfirmed;
};

export default confirmDiscardChanges;
