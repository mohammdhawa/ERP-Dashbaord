import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Helmet } from "react-helmet-async";
import { Card, Col, Row } from "react-bootstrap";
import { useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components";
import SortableTh from "../../components/SortableTh";
import StatePanel from "../../components/StatePanel";
import api from "../../redux/api";
import { buildMonthlyParams } from "../../redux/actions/attendanceParams";
import { hasPermission } from "../../data/permissionsCatalog";
import { parseApiError } from "../../utils/apiHelpers";
import { toastNotify } from "../../utils";
import CountedNote from "./CountedNote";
import MonthlyFilterBar from "./MonthlyFilterBar";
import {
  defaultMonthlyFilters,
  employeeAttendanceLink,
  formatHours,
  monthlyFiltersFromSearch,
  monthlyProblem,
  toMonthlyQuery,
} from "./monthlyFilters";

// التقرير الشهري — one summary row per employee expected to attend, plus
// totals (API doc §14.2). A computed object, not a paged list: the totals must
// cover every row, so there is no pager. It lives in local state and only the
// latest response may write it. The server sorts (the headers drive `sort`) and
// recomputes the totals when a row filter narrows the rows.

// Titles are column names; the numbers are the server's own counts.
const COUNT_COLUMNS = [
  // Per row since 2026-10-20: the working days up to `counted_to`, less today
  // for someone with nothing recorded for it yet.
  { key: "expected_days", label: "الأيام المحسوبة" },
  { key: "present_days", label: "الحضور" },
  { key: "on_leave_days", label: "إجازة" },
  { key: "excused_days", label: "غياب بعذر" },
  { key: "excused_deducted_days", label: "عذر بخصم" },
  { key: "excused_not_deducted_days", label: "عذر بلا خصم" },
  { key: "absent_days", label: "غياب" },
  { key: "rejected_days", label: "مرفوض" },
  { key: "missing_checkouts", label: "انصراف مفقود" },
];

const AttendanceMonthly = () => {
  const { permissions } = useSelector((state) => state.auth);
  // The profile is another screen's data: without hr.employees.view the rows
  // would lead to a page that refuses, so they are not clickable at all.
  const canOpenProfile = hasPermission(permissions, "hr.employees.view");
  const navigate = useNavigate();

  const [defaults] = useState(() => defaultMonthlyFilters());
  const [searchParams, setSearchParams] = useSearchParams();
  // Read through monthlyFiltersFromSearch: a hand-edited link may carry any
  // value, and none of it may reach a control or the server unchecked.
  const [filters, setFilters] = useState(() =>
    monthlyFiltersFromSearch((key) => searchParams.get(key), defaults)
  );

  // The URL is written back as well as read, so the view survives a refresh
  // and the back button; `replace` stops typing from stacking history.
  useEffect(() => {
    const next = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value != null) next.set(key, value);
    });
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleFilterChange = (patch) => setFilters((prev) => ({ ...prev, ...patch }));
  const handleFilterReset = () => setFilters({ ...defaults });

  // An incomplete, inverted or over-long window is never requested: the server
  // would refuse it (or, for half a range, answer with this month instead).
  const problem = monthlyProblem(filters);
  const query = useMemo(() => toMonthlyQuery(filters), [filters]);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const seq = useRef(0);
  // What the shown report was asked for, minus the sort.
  const shownFor = useRef(null);

  // `silent` re-reads without blanking the report; if that read fails the
  // report stays and the message is a toast, not the error panel. A change of
  // sort alone is read the same way: the table must stay mounted, or the header
  // button that was just pressed would lose keyboard focus with it. Any other
  // change is a different report and starts from the loader.
  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (problem) return;
      const mine = ++seq.current;
      const windowKey = JSON.stringify({ ...query, sort: "" });
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
        const response = await api.get("/attendance/report/monthly", {
          params: buildMonthlyParams(query),
        });
        if (mine !== seq.current) return;
        setReport(response.data.data);
        shownFor.current = windowKey;
        setError(null);
      } catch (err) {
        if (mine !== seq.current) return;
        const message = parseApiError(err).message;
        if (keep) toastNotify(message, "error");
        else setError(message);
      } finally {
        if (mine === seq.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [query, problem]
  );
  useEffect(() => {
    load();
    return () => {
      // A read still in flight must not land after the view changed or left.
      seq.current += 1;
    };
  }, [load]);

  const openProfile = (employeeId) =>
    navigate(
      employeeAttendanceLink(
        import.meta.env.BASE_URL,
        employeeId,
        report.from,
        report.to
      )
    );

  // A row click must not hijack a text selection (copying a staff number is
  // routine), nor a click that landed on a control.
  const handleRowClick = (employeeId) => (event) => {
    const selection = window.getSelection?.();
    if (selection && !selection.isCollapsed && selection.toString().trim()) return;
    if (event.target.closest?.("a, button, input, select, textarea, label")) return;
    openProfile(employeeId);
  };

  const setSort = (sort) => handleFilterChange({ sort });

  const rows = report?.rows || [];
  const totals = report?.totals || {};
  const headerProps = { sort: filters.sort, onSortChange: setSort };

  return (
    <Fragment>
      <Helmet>
        <title>الراقي ERP | التقرير الشهري</title>
      </Helmet>
      <PageHeader
        homepage="التقرير الشهري"
        activepage="الحضور والانصراف"
        page="التقرير الشهري"
      >
        <button
          type="button"
          className="btn btn-light btn-wave"
          disabled={loading || refreshing || Boolean(problem)}
          onClick={() => load({ silent: true })}
        >
          <i className="ri-refresh-line align-middle me-1"></i>
          تحديث
        </button>
      </PageHeader>

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Body>
              <MonthlyFilterBar
                filters={filters}
                defaults={defaults}
                problem={problem}
                onChange={handleFilterChange}
                onReset={handleFilterReset}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {!problem && (
        <StatePanel loading={loading} error={error} onRetry={() => load()}>
          {report && (
            <Card className="custom-card">
              <Card.Body>
                <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                  <h6 className="mb-0">
                    من <span dir="ltr">{report.from}</span> إلى{" "}
                    <span dir="ltr">{report.to}</span>
                  </h6>
                  <span className="text-muted fs-13">
                    أيام العمل في الفترة: {report.working_days}
                  </span>
                  <CountedNote report={report} />
                </div>

                {rows.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    لا توجد بيانات لهذه الفترة ضمن الفلاتر المحددة
                  </div>
                ) : (
                  <div
                    className={`table-responsive${refreshing ? " opacity-50" : ""}`}
                    aria-busy={refreshing}
                  >
                    <table
                      className={`table text-nowrap table-wrap-sm table-striped${
                        canOpenProfile ? " table-hover" : ""
                      }`}
                    >
                      <thead>
                        <tr>
                          <SortableTh sortKey="employee_name" label="الموظف" {...headerProps} />
                          <SortableTh sortKey="department" label="القسم" {...headerProps} />
                          {COUNT_COLUMNS.map((c) => (
                            <SortableTh
                              key={c.key}
                              sortKey={c.key}
                              label={c.label}
                              className="text-center"
                              {...headerProps}
                            />
                          ))}
                          <SortableTh
                            sortKey="total_work_hours"
                            label="ساعات العمل"
                            className="text-center"
                            {...headerProps}
                          />
                          <SortableTh
                            sortKey="attendance_rate"
                            label="نسبة الحضور"
                            className="text-center"
                            {...headerProps}
                          />
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr
                            key={row.employee.id}
                            style={canOpenProfile ? { cursor: "pointer" } : undefined}
                            tabIndex={canOpenProfile ? 0 : undefined}
                            onClick={
                              canOpenProfile ? handleRowClick(row.employee.id) : undefined
                            }
                            onKeyDown={
                              canOpenProfile
                                ? (e) => {
                                    if (e.key === "Enter" && e.target === e.currentTarget) {
                                      openProfile(row.employee.id);
                                    }
                                  }
                                : undefined
                            }
                          >
                            <td>
                              <div>{row.employee.full_name}</div>
                              {row.employee.employee_number && (
                                <div className="text-muted fs-12">
                                  {row.employee.employee_number}
                                </div>
                              )}
                            </td>
                            <td>{row.department?.name || "—"}</td>
                            {COUNT_COLUMNS.map((c) => (
                              <td key={c.key} className="text-center">
                                {row[c.key]}
                              </td>
                            ))}
                            <td className="text-center">
                              <span dir="ltr">{row.total_work_hours_formatted}</span>
                            </td>
                            <td className="text-center">
                              {row.attendance_rate == null
                                ? "—"
                                : `${row.attendance_rate}%`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="fw-semibold">
                          <td colSpan={2}>الإجمالي ({totals.employees ?? rows.length} موظف)</td>
                          {COUNT_COLUMNS.map((c) => (
                            <td key={c.key} className="text-center">
                              {totals[c.key] ?? 0}
                            </td>
                          ))}
                          <td className="text-center">
                            <span dir="ltr">{formatHours(totals.total_work_hours)}</span>
                          </td>
                          {/* The server sends no rate for the totals. */}
                          <td className="text-center">—</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}
        </StatePanel>
      )}
    </Fragment>
  );
};

export default AttendanceMonthly;
