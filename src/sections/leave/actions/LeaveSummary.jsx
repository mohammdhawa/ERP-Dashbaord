import React from "react";

// The leave a modal is about, as far as the caller knows it. Report rows on the
// attendance screens pass PARTIAL leaves ({ id, employee, leave_type_name,
// start_date, end_date }), the leave screen passes the whole resource
// (leave_type: { name_ar }) — so every part is optional and drawn only when
// present; nothing here may assume a field.
const LeaveSummary = ({ leave }) => {
  const employee = leave?.employee?.full_name;
  const type = leave?.leave_type_name || leave?.leave_type?.name_ar;
  const start = leave?.start_date;
  const end = leave?.end_date;

  if (!employee && !type && !start && !end) return null;

  return (
    <div className="border rounded p-2 bg-light">
      {employee && <div className="fw-semibold">{employee}</div>}
      {type && <div className="text-muted">{type}</div>}
      {(start || end) && (
        <div className="text-muted small">
          {start && <span dir="ltr">{start}</span>}
          {start && end && " ← "}
          {end && <span dir="ltr">{end}</span>}
        </div>
      )}
    </div>
  );
};

export default LeaveSummary;
