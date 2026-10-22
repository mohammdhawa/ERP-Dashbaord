// The one way an employee is labelled in a picker: «الاسم — EMP-…», or
// «الاسم (#id)» when there is no staff number. Two people genuinely share a name,
// and the staff number is what tells them apart on paper. Same rule as the user
// form's employee picker (UserFormModal), which keeps its own copy.
export const employeeToOption = (e) => {
  const name = e.full_name || `موظف #${e.id}`;
  return {
    value: e.id,
    label: e.employee_number ? `${name} — ${e.employee_number}` : `${name} (#${e.id})`,
  };
};
