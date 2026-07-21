import Swal from "sweetalert2";

export const AlertWithSwal = (icon, title, text, buttonColor) => {
  Swal.fire({
    icon: icon,
    title: title,
    text: text,
    confirmButtonText: "تم",
    customClass: {
      confirmButton: `btn btn-${buttonColor} me-2`,
    },
    buttonsStyling: false,
  });
};
