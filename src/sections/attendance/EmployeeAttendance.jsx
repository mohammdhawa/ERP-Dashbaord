import React, { useCallback, useEffect, useRef, useState } from "react";
import { Col, Form, Row } from "react-bootstrap";
import { useSelector } from "react-redux";
import SortableTh from "../../components/SortableTh";
import StatePanel from "../../components/StatePanel";
import api from "../../redux/api";
import {
  buildEmployeeGridParams,
  gridDayActions,
} from "../../redux/actions/attendanceParams";
import { DAY_STATE_OPTIONS } from "../../data/attendanceEnums";
import { parseApiError } from "../../utils/apiHelpers";
import { toastNotify } from "../../utils";
import { formatAbsolute } from "../system/auditFormat";
import CorrectCheckoutModal from "./actions/CorrectCheckoutModal";
import CountedNote from "./CountedNote";
import { todayInDamascus } from "./recordFilters";
import ExcuseFormModal from "../leave/actions/ExcuseFormModal";
import UndoExcuseModal from "../leave/actions/UndoExcuseModal";
import {
  WEEKDAY_NAMES,
  defaultGridFilters,
  gridProblem,
  windowFromQuery,
} from "./employeeGridFilters";

// «الحضور» on the employee profile — one employee's days over a range (API doc
// §14.3), with the range's summary and the day actions.
//
// A computed object, not a paged list, kept in local state; only the latest
// response may write it. `summary` ALWAYS covers the whole range up to
// `counted_to` (today at the latest, 2026-10-20): `status` and «أيام العمل
// فقط» narrow `days` only. A day after today, or today before anything is
// recorded, is state 9 «لم يُسجَّل بعد» and counts for nothing.
//
// After an action the grid is re-read WITHOUT blanking it; if that read fails
// the days stay and the message is a toast. A 403 (out_of_scope) is final and
// is shown without a retry button.

const dash = <span className="text-muted">—</span>;

// Colour keyed on the status INT; the text is always the server's label.
const STATUS_VARIANTS = {
  1: "bg-info-transparent",
  2: "bg-success-transparent",
  3: "bg-warning-transparent",
  4: "bg-primary-transparent",
  5: "bg-secondary-transparent",
  6: "bg-danger-transparent",
  7: "bg-light text-default",
  8: "bg-danger-transparent",
  9: "bg-light text-muted",
};

// The tiles' titles are column names; the numbers are the server's own counts.
const SUMMARY_TILES = [
  { key: "expected_days", label: "الأيام المحسوبة" },
  { key: "present_days", label: "الحضور" },
  { key: "on_leave_days", label: "إجازة" },
  { key: "excused_days", label: "غياب بعذر" },
  { key: "absent_days", label: "غياب" },
  { key: "rejected_days", label: "مرفوض (ضمن الغياب)" },
  { key: "missing_checkouts", label: "انصراف مفقود" },
  { key: "off_days", label: "عطل" },
];

const time = (value) =>
  value ? <span dir="ltr">{formatAbsolute(value)}</span> : dash;

// What happened to the day: a refused check-in, a corrected check-out, an excuse.
const Details = ({ day }) => {
  const { rejection, correction, excuse } = day;
  if (!rejection && !correction && !excuse) return dash;
  return (
    <div className="d-flex flex-column gap-1 fs-12 text-wrap">
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
      {excuse && (
        <div>
          <span className="badge bg-secondary-transparent me-1">عذر</span>
          {excuse.leave_type_name && <span>{excuse.leave_type_name}</span>}
          {excuse.recorded_by && (
            <span className="ms-1">— سجّله: {excuse.recorded_by}</span>
          )}
          {excuse.reason && <div className="text-muted">{excuse.reason}</div>}
        </div>
      )}
    </div>
  );
};

const EmployeeAttendance = ({ employee, initialFrom, initialTo }) => {
  const { permissions } = useSelector((state) => state.auth);

  // The profile validates the link's window, but a bad one must never reach the
  // controls from any other caller either.
  const [defaults] = useState(() =>
    defaultGridFilters(new Date(), windowFromQuery(initialFrom, initialTo))
  );
  const [filters, setFilters] = useState(defaults);
  const handleFilterChange = (patch) => setFilters((prev) => ({ ...prev, ...patch }));

  // An incomplete, inverted or over-long window is never requested.
  const problem = gridProblem(filters);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null); // { message, status }
  const seq = useRef(0);
  // What the shown report was asked for, minus the sort.
  const shownFor = useRef(null);

  // `silent` re-reads without blanking the days (after an action); a change of
  // sort alone is read the same way so the pressed header keeps keyboard focus.
  // Any other change is a different report and starts from the loader.
  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (problem) return;
      const mine = ++seq.current;
      const windowKey = JSON.stringify({ ...filters, sort: "" });
      const keep = silent || shownFor.current === windowKey;
      if (keep) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setReport(null);
        setError(null);
        shownFor.current = null;
      }
      try {
        const response = await api.get("/attendance/report/employee", {
          params: buildEmployeeGridParams(employee.id, filters),
        });
        if (mine !== seq.current) return;
        setReport(response.data.data);
        shownFor.current = windowKey;
        setError(null);
      } catch (err) {
        if (mine !== seq.current) return;
        const parsed = parseApiError(err);
        if (keep) toastNotify(parsed.message, "error");
        else setError({ message: parsed.message, status: parsed.status });
      } finally {
        if (mine === seq.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [filters, problem, employee.id]
  );
  useEffect(() => {
    load();
    return () => {
      // A read still in flight must not land after the view changed or left.
      seq.current += 1;
    };
  }, [load]);

  // The modal being worked in. `action` is kept after closing so the modal's
  // content does not blank during its fade-out; `open` is what shows it.
  const [action, setAction] = useState(null); // { kind, day }
  const [open, setOpen] = useState(false);
  const start = (kind, day) => {
    setAction({ kind, day });
    setOpen(true);
  };
  const close = () => setOpen(false);
  const reread = () => load({ silent: true });

  const day = action?.day;
  const checkIn = day && {
    id: day.check_in_id,
    employee: { full_name: employee.full_name },
    recorded_at: day.check_in_time,
  };
  const excuseInitial = day && {
    employee_id: employee.id,
    start_date: day.date,
    end_date: day.date,
  };
  const undoLeave = day?.excuse && {
    id: day.excuse.leave_request_id,
    employee: { full_name: employee.full_name },
    leave_type_name: day.excuse.leave_type_name,
  };

  const setSort = (sort) => handleFilterChange({ sort });
  const headerProps = { sort: filters.sort, onSortChange: setSort };
  const hasAnyFilter = Object.keys(defaults).some((key) => filters[key] !== defaults[key]);

  const days = report?.days || [];
  const summary = report?.summary || {};
  // A 403 (out of reach) or 404 (a departed employee, 2026-10-20) is final:
  // retrying produces the same answer.
  const denied = error?.status === 403 || error?.status === 404;
  // The server's today: a not-yet day is excusable only when it is today.
  const today = todayInDamascus();

  return (
    <div>
      <Row className="g-2 mb-2 align-items-end">
        <Col sm={6} md={3} lg={2}>
          <Form.Label htmlFor="emp-att-from" className="fs-12 mb-1">
            من تاريخ
          </Form.Label>
          <Form.Control
            id="emp-att-from"
            type="date"
            value={filters.from}
            onChange={(e) => handleFilterChange({ from: e.target.value })}
            isInvalid={Boolean(problem)}
          />
        </Col>
        <Col sm={6} md={3} lg={2}>
          <Form.Label htmlFor="emp-att-to" className="fs-12 mb-1">
            إلى تاريخ
          </Form.Label>
          <Form.Control
            id="emp-att-to"
            type="date"
            value={filters.to}
            onChange={(e) => handleFilterChange({ to: e.target.value })}
            isInvalid={Boolean(problem)}
          />
        </Col>
        <Col sm={6} md={3} lg={3}>
          <Form.Label htmlFor="emp-att-status" className="fs-12 mb-1">
            حالة اليوم
          </Form.Label>
          <Form.Select
            id="emp-att-status"
            value={filters.status}
            onChange={(e) => handleFilterChange({ status: e.target.value })}
          >
            <option value="">الكل</option>
            {DAY_STATE_OPTIONS.map((o) => (
              <option key={o.value} value={String(o.value)}>
                {o.label}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col xs="auto">
          <Form.Check
            type="switch"
            id="emp-att-working"
            label="أيام العمل فقط"
            checked={filters.working_days_only === "1"}
            onChange={(e) =>
              handleFilterChange({ working_days_only: e.target.checked ? "1" : "" })
            }
          />
        </Col>
        <Col xs="auto" className="ms-auto d-flex gap-2">
          {hasAnyFilter && (
            <button
              type="button"
              className="btn btn-light btn-wave"
              onClick={() => setFilters({ ...defaults })}
            >
              <i className="ri-filter-off-line align-middle me-1"></i>
              مسح الفلاتر
            </button>
          )}
          <button
            type="button"
            className="btn btn-light btn-wave"
            disabled={loading || refreshing || Boolean(problem)}
            onClick={reread}
          >
            <i className="ri-refresh-line align-middle me-1"></i>
            تحديث
          </button>
        </Col>
      </Row>

      {problem && (
        <div className="text-danger fs-13 mb-2" role="alert">
          {problem}
        </div>
      )}

      {!problem && (
        <StatePanel
          loading={loading}
          error={error?.message}
          onRetry={denied ? undefined : () => load()}
        >
          {report && (
            <>
              <div className="mb-3">
                <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                  <h6 className="mb-0">ملخص الفترة</h6>
                  <span className="text-muted fs-13">
                    من <span dir="ltr">{report.from}</span> إلى{" "}
                    <span dir="ltr">{report.to}</span>
                  </span>
                  <span className="text-muted fs-12">
                    (لا يتأثر بفلاتر الأيام أدناه)
                  </span>
                  {report.working_days != null && (
                    <span className="text-muted fs-13">
                      أيام العمل في الفترة: {report.working_days}
                    </span>
                  )}
                  <CountedNote report={report} />
                </div>
                <Row className="g-2">
                  {SUMMARY_TILES.map((t) => (
                    <Col key={t.key} xs={6} md={3} xl>
                      <div className="border rounded p-2 text-center h-100">
                        <div className="text-muted fs-12">{t.label}</div>
                        <div className="fw-semibold fs-5">{summary[t.key] ?? 0}</div>
                      </div>
                    </Col>
                  ))}
                  <Col xs={6} md={3} xl>
                    <div className="border rounded p-2 text-center h-100">
                      <div className="text-muted fs-12">ساعات العمل</div>
                      <div className="fw-semibold fs-5" dir="ltr">
                        {summary.total_work_hours_formatted || "0h 0m"}
                      </div>
                    </div>
                  </Col>
                  <Col xs={6} md={3} xl>
                    <div className="border rounded p-2 text-center h-100">
                      <div className="text-muted fs-12">نسبة الحضور</div>
                      <div className="fw-semibold fs-5">
                        {summary.attendance_rate == null
                          ? "—"
                          : `${summary.attendance_rate}%`}
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>

              {days.length === 0 ? (
                <div className="text-center text-muted py-5">
                  لا توجد أيام ضمن الفلاتر المحددة
                </div>
              ) : (
                <div
                  className={`table-responsive${refreshing ? " opacity-50" : ""}`}
                  aria-busy={refreshing}
                >
                  <table className="table text-nowrap table-wrap-sm table-striped align-middle mb-0">
                    <thead>
                      <tr>
                        <SortableTh sortKey="date" label="اليوم" {...headerProps} />
                        <SortableTh sortKey="status" label="الحالة" {...headerProps} />
                        <th scope="col">الحضور</th>
                        <th scope="col">الانصراف</th>
                        <SortableTh
                          sortKey="work_hours"
                          label="ساعات العمل"
                          {...headerProps}
                        />
                        <th scope="col">تفاصيل</th>
                        <th scope="col">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((d) => {
                        const can = gridDayActions(d, permissions, today);
                        return (
                          <tr key={d.date}>
                            <td>
                              <div dir="ltr" className="text-end">
                                {d.date}
                              </div>
                              <div className="text-muted fs-12">
                                {WEEKDAY_NAMES[d.weekday] ?? ""}
                              </div>
                            </td>
                            <td>
                              <span
                                className={`badge ${
                                  STATUS_VARIANTS[d.status] || "bg-light text-default"
                                }`}
                              >
                                {d.status_label}
                              </span>
                              {d.leave_type && (
                                <div className="text-muted fs-12">{d.leave_type}</div>
                              )}
                            </td>
                            <td>{time(d.check_in_time)}</td>
                            <td>{time(d.check_out_time)}</td>
                            <td>
                              {d.work_hours_formatted ? (
                                <span dir="ltr">{d.work_hours_formatted}</span>
                              ) : (
                                dash
                              )}
                            </td>
                            <td>
                              <Details day={d} />
                            </td>
                            <td>
                              <div className="d-flex flex-wrap gap-1">
                                {can.correct && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-primary-light btn-wave"
                                    onClick={() => start("correct", d)}
                                  >
                                    تصحيح الانصراف
                                  </button>
                                )}
                                {can.excuse && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-secondary-light btn-wave"
                                    onClick={() => start("excuse", d)}
                                  >
                                    تسجيل عذر
                                  </button>
                                )}
                                {can.undoExcuse && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-danger-light btn-wave"
                                    onClick={() => start("undo", d)}
                                  >
                                    التراجع عن العذر
                                  </button>
                                )}
                                {!can.correct && !can.excuse && !can.undoExcuse && dash}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </StatePanel>
      )}

      {/* Always mounted; `show` opens them. A corrected check-out and a filed
          excuse close themselves; the undo modal stays on its result view until
          the user closes it (UndoExcuseModal), the grid is re-read behind it. */}
      <CorrectCheckoutModal
        show={open && action?.kind === "correct"}
        checkIn={checkIn}
        onHide={close}
        onDone={() => {
          close();
          reread();
        }}
      />
      <ExcuseFormModal
        show={open && action?.kind === "excuse"}
        initial={excuseInitial}
        onHide={close}
        onSaved={() => {
          close();
          reread();
        }}
      />
      <UndoExcuseModal
        show={open && action?.kind === "undo"}
        leave={undoLeave}
        onHide={close}
        onDone={reread}
      />
    </div>
  );
};

export default EmployeeAttendance;
