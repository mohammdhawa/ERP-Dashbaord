import React from "react";
import { Card } from "react-bootstrap";
import { formatAbsolute } from "../system/auditFormat";

// One bucket of the daily board (API doc §14.1) as a table. The board is not
// paged and every bucket is sorted by the server, so this only draws rows and
// hands the actions up.
//
// A board row is keyed on the day's check-in (`record_id`) and the check-out
// has its own id, while the record modals take {id, employee, recorded_at,
// type_label}; the mapping lives here so the screen only forwards what it is
// given.

const dash = <span className="text-muted">—</span>;

const time = (value) =>
  value ? <span dir="ltr">{formatAbsolute(value)}</span> : dash;

const checkInRecord = (row) => ({
  id: row.record_id,
  employee: row.employee,
  recorded_at: row.check_in_time,
  type_label: "حضور",
});

// A refused day's record is the one the server names in `rejection`, which is
// not necessarily the row's own check-in.
const refusedRecord = (row) => ({
  id: row.rejection.record_id,
  employee: row.employee,
  recorded_at: row.rejection.recorded_at,
});

const leaveOf = (row) => ({
  id: row.leave_request_id,
  employee: row.employee,
  leave_type_name: row.leave_type_name,
  start_date: row.start_date,
  end_date: row.end_date,
});

export const Employee = ({ employee }) =>
  employee ? (
    <>
      <div>{employee.full_name}</div>
      {employee.employee_number && (
        <div className="text-muted fs-12" dir="ltr">
          {employee.employee_number}
        </div>
      )}
    </>
  ) : (
    dash
  );

// What happened to the day's records: a corrected check-out, a refused check-in.
const Details = ({ row }) => {
  const { correction, rejection } = row;
  if (!correction && !rejection) return dash;
  return (
    <div className="d-flex flex-column gap-1 fs-12">
      {correction && (
        <div>
          <span className="badge bg-info-transparent me-1">مصحَّح</span>
          {correction.by?.name && <span>صحّحه: {correction.by.name}</span>}
          {correction.at && (
            <span className="text-muted ms-1" dir="ltr">
              {formatAbsolute(correction.at)}
            </span>
          )}
          {correction.note && <div className="text-muted">{correction.note}</div>}
        </div>
      )}
      {rejection && (
        <div>
          <span className="badge bg-danger-transparent me-1">مرفوض</span>
          {rejection.reason_label && <span>{rejection.reason_label}</span>}
          {rejection.rejected_by?.name && (
            <span className="ms-1">— رفضه: {rejection.rejected_by.name}</span>
          )}
          {rejection.rejected_at && (
            <span className="text-muted ms-1" dir="ltr">
              {formatAbsolute(rejection.rejected_at)}
            </span>
          )}
          {rejection.note && <div className="text-muted">{rejection.note}</div>}
        </div>
      )}
    </div>
  );
};

const SelfieButton = ({ label, onClick }) => (
  <button
    type="button"
    className="btn btn-sm btn-info-light btn-wave"
    onClick={onClick}
  >
    <i className="ri-camera-line align-middle me-1" aria-hidden="true"></i>
    {label}
  </button>
);

const AttendanceTable = ({ bucket, rows, can, undoingId, on }) => (
  <table className="table table-hover text-nowrap mb-0 align-middle">
    <thead>
      <tr>
        <th>الموظف</th>
        <th>القسم</th>
        <th>الحضور</th>
        <th>الانصراف</th>
        <th>ساعات العمل</th>
        <th>تفاصيل</th>
        <th>إجراءات</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((row) => {
        const refusal = row.rejection;
        return (
          <tr key={row.record_id}>
            <td>
              <Employee employee={row.employee} />
            </td>
            <td>{row.department?.name || dash}</td>
            <td>{time(row.check_in_time)}</td>
            <td>{time(row.check_out_time)}</td>
            <td>
              {row.work_hours_formatted ? (
                <span dir="ltr">{row.work_hours_formatted}</span>
              ) : (
                dash
              )}
            </td>
            <td>
              <Details row={row} />
            </td>
            <td>
              <div className="d-flex flex-wrap gap-1">
                {row.check_in_has_selfie && (
                  <SelfieButton
                    label="صورة الحضور"
                    onClick={() => on.selfie(row.record_id)}
                  />
                )}
                {row.check_out_has_selfie && row.check_out_record_id && (
                  <SelfieButton
                    label="صورة الانصراف"
                    onClick={() => on.selfie(row.check_out_record_id)}
                  />
                )}
                {bucket === "missing_checkout" && can.correct && (
                  <button
                    type="button"
                    className="btn btn-sm btn-warning-light btn-wave"
                    onClick={() => on.correct(checkInRecord(row))}
                  >
                    تصحيح الانصراف
                  </button>
                )}
                {bucket !== "rejected" && can.reject && (
                  <button
                    type="button"
                    className="btn btn-sm btn-danger-light btn-wave"
                    onClick={() => on.reject(checkInRecord(row))}
                  >
                    رفض
                  </button>
                )}
                {bucket === "rejected" && can.reject && refusal && (
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary-light btn-wave"
                    disabled={undoingId === refusal.record_id}
                    onClick={() => on.undoRefusal(refusedRecord(row))}
                  >
                    التراجع عن الرفض
                  </button>
                )}
              </div>
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

const LeaveTable = ({ bucket, rows, can, on }) => (
  <table className="table table-hover text-nowrap mb-0 align-middle">
    <thead>
      <tr>
        <th>الموظف</th>
        <th>القسم</th>
        <th>النوع</th>
        <th>من</th>
        <th>إلى</th>
        <th>{bucket === "excused" ? "سجّله" : "اعتمده"}</th>
        <th>إجراءات</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((row) => {
        const by = row.is_excuse ? row.excuse?.recorded_by : row.approved_by;
        return (
          <tr key={`${row.leave_request_id}-${row.employee?.id}`}>
            <td>
              <Employee employee={row.employee} />
            </td>
            <td>{row.department?.name || dash}</td>
            <td>
              {row.leave_type_name || dash}
              {row.excuse?.reason && (
                <div className="text-muted fs-12 text-wrap">{row.excuse.reason}</div>
              )}
            </td>
            <td>
              {row.start_date ? <span dir="ltr">{row.start_date}</span> : dash}
            </td>
            <td>{row.end_date ? <span dir="ltr">{row.end_date}</span> : dash}</td>
            <td>{by || dash}</td>
            <td>
              <div className="d-flex flex-wrap gap-1">
                {bucket === "on_leave" && !row.is_excuse && can.returnToWork && (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary-light btn-wave"
                    onClick={() => on.returnToWork(leaveOf(row))}
                  >
                    العودة إلى العمل
                  </button>
                )}
                {bucket === "excused" && can.undoExcuse && (
                  <button
                    type="button"
                    className="btn btn-sm btn-danger-light btn-wave"
                    onClick={() => on.undoExcuse(leaveOf(row))}
                  >
                    التراجع عن العذر
                  </button>
                )}
              </div>
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

const DailySection = ({ bucket, title, kind, rows, can, undoingId, on }) => (
  <Card className="custom-card" data-bucket={bucket}>
    <Card.Header>
      <div className="card-title">
        {title}{" "}
        <span className="badge bg-light text-default ms-1">{rows.length}</span>
      </div>
    </Card.Header>
    <Card.Body className="p-0">
      <div className="table-responsive">
        {kind === "leave" ? (
          <LeaveTable bucket={bucket} rows={rows} can={can} on={on} />
        ) : (
          <AttendanceTable
            bucket={bucket}
            rows={rows}
            can={can}
            undoingId={undoingId}
            on={on}
          />
        )}
      </div>
    </Card.Body>
  </Card>
);

export default DailySection;
