import React, { useMemo } from "react";
import Select from "react-select";
import { useSelector } from "react-redux";
import { hasPermission } from "../data/permissionsCatalog";
import { employeeToOption } from "../data/employeeOption";
import { useResourceOptions } from "../sections/departments/useResourceOptions";

// Employee filter/field for the approvals, leave and attendance screens. Walks
// the documented /hr/employees pages, so it needs hr.employees.view; without it
// it renders NOTHING and the caller picks its own fallback (a `search` text box)
// with hasPermission. A failed load is shown here, with retry, rather than
// hiding the field: a required-employee form must not lose its input silently.
// `value` is an employee id or "" and `onChange` hands back the same shape.
// Callers pair `inputId` with a <label htmlFor>.
const EmployeePicker = ({
  value,
  onChange,
  inputId,
  placeholder = "اختر الموظف",
  isDisabled = false,
}) => {
  const { permissions } = useSelector((state) => state.auth);
  const canView = hasPermission(permissions, "hr.employees.view");
  const { options, loading, loaded, error, incomplete, reload } =
    useResourceOptions("/hr/employees", employeeToOption, canView);

  const selected = useMemo(() => {
    if (value === "" || value === null || value === undefined) return null;
    const id = Number(value);
    const found = options.find((o) => o.value === id);
    if (found) return found;
    // The form holds an id the list did not return (a partial walk, or a
    // since-hidden employee): show it as such, not as an empty field that
    // looks unset while the id is still submitted.
    return loaded ? { value: id, label: `موظف #${id}` } : null;
  }, [options, value, loaded]);

  if (!canView) return null;

  if (error) {
    return (
      <div role="alert">
        <div className="text-danger small">{error}</div>
        <button type="button" className="btn btn-link btn-sm p-0" onClick={reload}>
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <>
      <Select
        inputId={inputId}
        classNamePrefix="Select2"
        options={options}
        value={selected}
        onChange={(opt) => onChange(opt ? opt.value : "")}
        isClearable
        isSearchable
        isRtl
        isLoading={loading}
        isDisabled={isDisabled}
        placeholder={placeholder}
        noOptionsMessage={() => "لا يوجد موظفون"}
        loadingMessage={() => "جارٍ التحميل..."}
        menuPosition="fixed"
      />
      {incomplete && (
        <div className="text-warning small mt-1">
          تعذّر تحميل قائمة الموظفين كاملة؛ قد لا يظهر بعضهم.
        </div>
      )}
    </>
  );
};

export default EmployeePicker;
