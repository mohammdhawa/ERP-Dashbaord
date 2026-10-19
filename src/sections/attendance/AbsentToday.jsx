import React, {
  Fragment,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Helmet } from "react-helmet-async";
import { Card, Col, Row } from "react-bootstrap";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { PageHeader, ModalFallback } from "../../components";
import DataTableServer from "../../components/DataTableServer";
import api from "../../redux/api";
import {
  ABSENT_SORT_KEYS,
  buildAbsentParams,
} from "../../redux/actions/attendanceParams";
import { hasPermission } from "../../data/permissionsCatalog";
import { parseApiError } from "../../utils/apiHelpers";
import { toastNotify } from "../../utils";
import DailyFilterBar from "./DailyFilterBar";
import { Employee } from "./DailySection";
import {
  dailyFiltersFromSearch,
  dateIsValid,
  defaultDailyFilters,
  toDailyQuery,
} from "./dailyFilters";
import { pageFromSearch } from "./recordFilters";

const ExcuseFormModal = lazy(() => import("../leave/actions/ExcuseFormModal"));

// الغائبون اليوم — who was expected on a day and did not check in (API doc
// §14.4): active employees with an active account, no accepted check-in and no
// approved leave. A paged list, so it lives in local state; only the latest
// response may write it (a date or page changed while a read is in flight must
// not be overwritten by the older answer).
//
// «تسجيل عذر» excuses the person for that day, which takes them off the list:
// the current page is re-read after a save rather than patched, and a page
// that emptied behind it steps back.

const PER_PAGE = 15;

const columns = [
  {
    key: "employee",
    label: "الموظف",
    sortKey: "employee_name",
    render: (employee) => <Employee employee={employee} />,
  },
  {
    key: "department",
    label: "القسم",
    render: (department) =>
      department?.name || <span className="text-muted">—</span>,
  },
];

const AbsentToday = () => {
  const { permissions } = useSelector((state) => state.auth);
  const canExcuse = hasPermission(permissions, "leave.excuses.create");

  const [defaults] = useState(() => defaultDailyFilters());
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(() => pageFromSearch(searchParams.get("page")));
  const [itemsPerPage, setItemsPerPage] = useState(PER_PAGE);
  // Read through dailyFiltersFromSearch: a hand-edited link may carry any
  // value, and none of it may reach a control or the server unchecked.
  const [filters, setFilters] = useState(() =>
    dailyFiltersFromSearch(
      (key) => searchParams.get(key),
      defaults,
      ABSENT_SORT_KEYS
    )
  );

  // The URL is written back as well as read, so the view survives a refresh
  // and the back button; `replace` stops typing from stacking history.
  useEffect(() => {
    const next = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value != null) next.set(key, value);
    });
    if (page > 1) next.set("page", String(page));
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  const handleFilterChange = (patch) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, ...patch }));
  };
  const handleFilterReset = () => {
    setPage(1);
    setFilters({ ...defaults });
  };

  // An empty or impossible date is never requested: the server would answer
  // with TODAY's list under a date field that says otherwise.
  const problem = dateIsValid(filters) ? null : "حدّد اليوم.";
  const query = useMemo(() => toDailyQuery(filters), [filters]);

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const seq = useRef(0);

  // `silent` re-reads after an excuse without blanking the rows; if that read
  // fails the rows stay (they were true a moment ago) and the failure is
  // toasted instead of replacing the list with an error.
  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (problem) return;
      const mine = ++seq.current;
      if (!silent) {
        setLoading(true);
        setRows([]);
        setMeta(null);
      }
      setError(null);
      try {
        const response = await api.get("/attendance/absent-today", {
          params: buildAbsentParams(page, itemsPerPage, query),
        });
        if (mine !== seq.current) return;
        const data = response.data.data || [];
        const nextMeta = response.data.meta || null;
        // The page emptied (the last person on it was excused, or the link
        // named a page past the end): step back, which re-reads.
        if (data.length === 0 && page > 1) {
          setPage(Math.min(page - 1, Math.max(nextMeta?.last_page || 1, 1)));
          return;
        }
        // The rows carry no id of their own; the employee is unique within a
        // day's list, so it is the table's row key.
        setRows(data.map((row) => ({ ...row, id: row.employee?.id })));
        setMeta(nextMeta);
      } catch (err) {
        if (mine !== seq.current) return;
        const message = parseApiError(err).message;
        if (silent) toastNotify(message, "error");
        else setError(message);
      } finally {
        if (mine === seq.current) setLoading(false);
      }
    },
    [page, itemsPerPage, query, problem]
  );
  useEffect(() => {
    load();
    return () => {
      // A read still in flight must not land after the view changed or left.
      seq.current += 1;
    };
  }, [load]);

  // What the modal opens with: fixed when the button is pressed, so a filter
  // edited behind the open modal cannot move the day it excuses.
  const [excusing, setExcusing] = useState(null);

  return (
    <Fragment>
      <Helmet>
        <title>الراقي ERP | الغائبون اليوم</title>
      </Helmet>
      <PageHeader
        homepage="الغائبون اليوم"
        activepage="الحضور والانصراف"
        page="الغائبون اليوم"
      />

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Body>
              <DailyFilterBar
                filters={filters}
                defaults={defaults}
                problem={problem}
                sortKeys={ABSENT_SORT_KEYS}
                onChange={handleFilterChange}
                onReset={handleFilterReset}
              />

              {!problem && (
                <DataTableServer
                  columns={columns}
                  data={rows}
                  loading={loading}
                  error={error}
                  onRetry={() => load()}
                  emptyMessage="لا يوجد غائبون في هذا اليوم ضمن الفلاتر المحددة"
                  currentPage={meta?.current_page || page}
                  totalPages={meta?.last_page || 1}
                  dataCount={meta?.total || 0}
                  onPageChange={setPage}
                  // per_page is clamped server-side; follow what it applied.
                  itemsPerPage={meta?.per_page ?? itemsPerPage}
                  onItemsPerPageChange={setItemsPerPage}
                  sort={filters.sort}
                  onSortChange={(next) => handleFilterChange({ sort: next })}
                  // Without the permission there is nothing to offer: no
                  // actions column rather than an empty one.
                  showActions={canExcuse}
                  renderActions={(row) => (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary-light btn-wave"
                      aria-label={`تسجيل عذر ${row.employee?.full_name || ""}`.trim()}
                      onClick={() =>
                        setExcusing({
                          employee_id: row.employee.id,
                          start_date: filters.date,
                          end_date: filters.date,
                        })
                      }
                    >
                      تسجيل عذر
                    </button>
                  )}
                />
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Fallback only while open: the lazy modal is always mounted so its
          chunk prefetches, and an unconditional fallback would flash a modal
          shell on every visit. See ModalFallback. */}
      <Suspense fallback={excusing ? <ModalFallback /> : null}>
        <ExcuseFormModal
          show={Boolean(excusing)}
          initial={excusing || undefined}
          onHide={() => setExcusing(null)}
          onSaved={() => {
            setExcusing(null);
            load({ silent: true });
          }}
        />
      </Suspense>
    </Fragment>
  );
};

export default AbsentToday;
