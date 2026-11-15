import { Form } from "react-bootstrap";
import { WEEKDAY_NAMES } from "../attendance/employeeGridFilters";
import { calendarCellTitle } from "./shiftDisplay";
import { sourceClass } from "./calendarCells";

// The calendar's table (API doc §19.5): one row per person, one column per
// date. Presentational - the screen owns the data, the selection and the modals.

const weekdayOf = (date) => WEEKDAY_NAMES[new Date(`${date}T00:00:00Z`).getUTCDay()];

const endsNextDay = (day) => Boolean(day.shift) && day.shift.ends_at.slice(0, 10) > day.date;

const CalendarGrid = ({
  rows,
  dates,
  today,
  canManage,
  selectedIds,
  anchor,
  onToggleRow,
  onTogglePage,
  onCellClick,
}) => {
  const allTicked = rows.length > 0 && rows.every((row) => selectedIds.has(row.employee.id));

  return (
    <div className="sched-calendar-scroll">
      <table className="table text-nowrap align-middle mb-0 sched-calendar-table">
        <thead>
          <tr>
            <th className="sched-person">
              {canManage && (
                <Form.Check
                  className="d-inline-block me-2 align-middle"
                  aria-label="تحديد كل الصفحة"
                  checked={allTicked}
                  onChange={onTogglePage}
                />
              )}
              الموظف
            </th>
            {dates.map((date) => (
              <th
                key={date}
                className={`sched-date text-center${date === today ? " sched-today" : ""}`}
              >
                <div className="fs-11 fw-normal">{weekdayOf(date)}</div>
                <div>{Number(date.slice(8, 10))}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.employee.id}>
              <td className="sched-person">
                {canManage && (
                  <Form.Check
                    className="d-inline-block me-2 align-middle"
                    aria-label={`تحديد ${row.employee.full_name}`}
                    checked={selectedIds.has(row.employee.id)}
                    onChange={() => onToggleRow(row.employee.id)}
                  />
                )}
                <div className="d-inline-block align-middle sched-person-name">
                  <div className="fw-medium" title={row.employee.full_name}>
                    {row.employee.full_name}
                  </div>
                  {row.employee.employee_number && (
                    <div className="text-muted fs-12">
                      <span dir="ltr">{row.employee.employee_number}</span>
                    </div>
                  )}
                </div>
              </td>
              {row.days.map((day) => {
                const isAnchor =
                  anchor && anchor.employeeId === row.employee.id && anchor.date === day.date;
                const className = [
                  "sched-cell",
                  sourceClass(day.source),
                  day.date === today ? "sched-today" : "",
                  isAnchor ? "sched-anchor" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                const content = (
                  <>
                    {day.shift?.code ?? "راحة"}
                    {endsNextDay(day) && <sup title="تنتهي في اليوم التالي">⁺¹</sup>}
                  </>
                );
                return (
                  <td key={day.date} className="p-0 text-center">
                    {canManage ? (
                      <button
                        type="button"
                        className={className}
                        title={calendarCellTitle(day.shift)}
                        onClick={(event) =>
                          onCellClick(row.employee, day, event.shiftKey)
                        }
                      >
                        {content}
                      </button>
                    ) : (
                      <span className={className} title={calendarCellTitle(day.shift)}>
                        {content}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CalendarGrid;
