import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  Suspense,
  lazy,
} from "react";
import { Helmet } from "react-helmet-async";
import { Card, Col, Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader, ModalFallback } from "../../components";
import DataTableServer from "../../components/DataTableServer";
import ProtectedElement from "../../pages/layout/ProtectedElement";
import EmployeeFilters from "./EmployeeFilters";
import { hasKey } from "../../utils/hasKey";
import {
  fetchEmployees,
  deleteEmployee,
} from "../../redux/actions/employeesActions";

const EmployeeFormModal = lazy(() => import("./EmployeeFormModal"));

// `status` is an INT with a server-rendered Arabic label. The COLOUR is keyed
// on the int; the TEXT is always `status_label` from the server — never a local
// mapping, which goes stale the moment the backend adds or rewords a value.
//   1 نشط · 2 موقوف (suspended — NOT the old "inactive") · 3 منتهي الخدمة
const STATUS_VARIANTS = {
  1: "bg-success-transparent",
  2: "bg-warning-transparent",
  3: "bg-danger-transparent",
};

const dash = <span className="text-muted">—</span>;
const ltr = (value) => (value ? <span dir="ltr">{value}</span> : dash);

// A gated key ABSENT from one row while the column is shown: since GAP-3
// (2026-09-24) viewIdentity can be granted over some units only, so the key is
// present on the rows it reaches and missing on the rest. A dash there would
// say "no ID on file" — a claim about the data — when the truth is "not yours
// to see".
const outOfReach = (
  <span className="text-muted" title="خارج نطاق صلاحياتك">
    <i className="ri-lock-line" aria-label="خارج نطاق صلاحياتك"></i>
  </span>
);

// Columns are built per-render because one is FIELD-GATED: `national_id` is
// absent from the payload unless the caller holds hr.employees.viewIdentity.
// Rendering it unconditionally would show a column of "—" to everyone else,
// which reads as "this company records no ID numbers" rather than "you may not
// see them".
// SORTABLE COLUMNS carry `sortKey` — the exact key the SERVER accepts
// (EMPLOYEE_SORT_KEYS). Only three of these eight columns can have one:
//
//   employee_number, hire_date  — direct column sorts.
//   full_name → `first_name`    — see below.
//
// The rest are deliberately NOT sortable and must stay that way:
//   national_id, phone, status_label  — no server sort key.
//   job_title, department  — embedded objects; the server orders by the
//     foreign key, which sorts by id and looks like no order at all.
// Giving any of them a header button would advertise a sort that 422s.
//
// `first_name` on the الاسم الكامل column is a MAPPING, not a mislabel. The
// server cannot order by `full_name` (a computed accessor with no column), but
// full_name is rendered "first middle last", so ordering by first_name is
// exactly the alphabetical order of the strings on screen. The filter dropdown
// still exposes first_name and last_name separately for anyone who wants the
// distinction; this is the "sort this column alphabetically" shortcut.
const buildColumns = ({ canViewIdentity }) =>
  [
    {
      key: "employee_number",
      label: "الرقم الوظيفي",
      sortKey: "employee_number",
      render: (value) => ltr(value),
    },
    // Read-only accessor joining the three name parts; ordered by first_name,
    // which is the same order as the rendered string. See the note above.
    { key: "full_name", label: "الاسم الكامل", sortKey: "first_name" },
    canViewIdentity && {
      key: "national_id",
      label: "رقم الهوية",
      render: (value, row) =>
        hasKey(row, "national_id")
          ? ltr(value)
          : outOfReach,
    },
    {
      // An embedded object since Batch 2. Falls back to a dash, never to the
      // id: "مهندس مدني" and "7" are not interchangeable to a human reader.
      key: "job_title",
      label: "المسمى الوظيفي",
      render: (value) => value?.name || dash,
    },
    {
      key: "department",
      label: "القسم",
      render: (value) =>
        value?.name ? (
          <span className="badge bg-info-transparent">{value.name}</span>
        ) : (
          dash
        ),
    },
    { key: "phone", label: "الهاتف", render: (value) => ltr(value) },
    {
      // Plain YYYY-MM-DD — rendered verbatim. Parsing it through Date or moment
      // can shift it a day across a timezone boundary.
      key: "hire_date",
      label: "تاريخ التعيين",
      sortKey: "hire_date",
      render: (value) => ltr(value),
    },
    {
      key: "status_label",
      label: "الحالة",
      render: (value, item) =>
        value ? (
          <span
            className={`badge ${STATUS_VARIANTS[item.status] || "bg-light"}`}
          >
            {value}
          </span>
        ) : (
          dash
        ),
    },
  ].filter(Boolean);

const EMPTY_FILTERS = {
  status: "",
  department_id: "",
  job_title_id: "",
  activity_type: "",
  search: "",
  sort: "",
};

const Employees = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, meta, fetchLoading, error } = useSelector(
    (state) => state.employees
  );
  const { permissions } = useSelector((state) => state.auth);

  const columns = useMemo(
    () =>
      buildColumns({
        canViewIdentity: permissions.includes("hr.employees.viewIdentity"),
      }),
    [permissions]
  );

  // The job-titles catalogue links here with ?job_title_id=N to answer "which
  // units use this title?", since that catalogue holds no unit of its own.
  // Seeding from the query string is what makes that link actually filter.
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(() => Number(searchParams.get("page")) || 1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filters, setFilters] = useState(() => {
    const seeded = { ...EMPTY_FILTERS };
    Object.keys(EMPTY_FILTERS).forEach((key) => {
      const value = searchParams.get(key);
      if (value != null && value !== "") seeded[key] = value;
    });
    return seeded;
  });

  // The URL is written back as well as read. Seeding on mount alone meant a
  // filtered view could be arrived at but never returned to: refreshing, using
  // the back button, or sharing the link all dropped every filter and showed
  // the unfiltered first page instead. `replace` keeps typing in the search box
  // from stacking a history entry per keystroke.
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  const load = useCallback(() => {
    dispatch(fetchEmployees(page, itemsPerPage, filters));
  }, [dispatch, page, itemsPerPage, filters]);

  useEffect(() => {
    load();
  }, [load]);

  // Changing any filter resets to page 1: staying on page 4 of a result set
  // that now has two pages shows an empty table and reads as "no matches".
  const handleFilterChange = (patch) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, ...patch }));
  };
  const handleFilterReset = () => {
    setPage(1);
    setFilters(EMPTY_FILTERS);
  };

  // If a soft delete shrinks the list so the current page no longer exists,
  // snap back to the last valid page reported by the server.
  useEffect(() => {
    if (meta && meta.last_page >= 1 && page > meta.last_page) {
      setPage(meta.last_page);
    }
  }, [meta, page]);

  // per_page is clamped server-side (1–100) and `meta.per_page` reports what
  // was actually applied — follow that rather than trusting our own request.
  const appliedPerPage = meta?.per_page ?? itemsPerPage;

  const openProfile = (employee) =>
    navigate(`${import.meta.env.BASE_URL}hr/employees/${employee.id}`);

  const openCreate = () => {
    setEditingEmployee(null);
    setModalOpen(true);
  };
  const openEdit = (employee) => {
    setEditingEmployee(employee);
    setModalOpen(true);
  };
  // The row follows the id so the confirmation can name the person being
  // deleted rather than asking about "هذا الموظف".
  const handleDelete = (id, employee) => {
    dispatch(
      deleteEmployee(
        id,
        page,
        items.length,
        itemsPerPage,
        filters,
        employee?.full_name
      )
    );
  };

  return (
    <Fragment>
      <Helmet>
        <title>الراقي ERP | الموظفين</title>
      </Helmet>
      <PageHeader
        homepage="الموظفين"
        activepage="الموارد البشرية"
        page="الموظفين"
      >
        <ProtectedElement
          element={
            <button onClick={openCreate} className="btn btn-secondary btn-wave">
              <i className="ri-user-add-line align-middle me-1"></i> إضافة موظف
            </button>
          }
          requiredPermissions={["hr.employees.create"]}
        />
      </PageHeader>

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Body>
              <EmployeeFilters
                filters={filters}
                onChange={handleFilterChange}
                onReset={handleFilterReset}
              />
              <DataTableServer
                columns={columns}
                data={items}
                loading={fetchLoading}
                error={error}
                onRetry={load}
                emptyMessage="لا يوجد موظفون مطابقون لهذا البحث"
                currentPage={meta?.current_page || page}
                totalPages={meta?.last_page || 1}
                dataCount={meta?.total || 0}
                onPageChange={setPage}
                itemsPerPage={appliedPerPage}
                onItemsPerPageChange={setItemsPerPage}
                onRowClick={openProfile}
                // Headers and the "الترتيب" dropdown write the SAME filter
                // field, so the two controls can never disagree and the chosen
                // sort lands in the URL with everything else. Sorting resets to
                // page 1: keeping the offset while reordering shows an
                // arbitrary slice of a list the user has just re-ranked.
                sort={filters.sort}
                onSortChange={(next) => handleFilterChange({ sort: next })}
                updatePermission="hr.employees.update"
                deletePermission="hr.employees.delete"
                functions={{
                  // A real <button>, not just the row click: a click handler on
                  // a <tr> is unreachable by keyboard and is not announced as
                  // actionable. This is the accessible path to the profile, so
                  // it carries a name that says whose profile it opens.
                  handleDetail: openProfile,
                  detailLabel: (employee) =>
                    `عرض ملف ${employee.full_name || "الموظف"}`,
                  // Names the edit/delete buttons too, which otherwise announce
                  // as a page of identical "تعديل"/"حذف".
                  rowLabel: (employee) =>
                    employee.full_name || `موظف #${employee.id}`,
                  handleUpdate: openEdit,
                  handleDelete: handleDelete,
                }}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Fallback gated on the open flag, NOT unconditional: the lazy
          element below is always mounted so its chunk prefetches with the
          page, which means this boundary is suspended during ordinary page
          load too — an unconditional fallback would flash a modal shell on
          every visit. See ModalFallback. */}
      <Suspense fallback={modalOpen ? <ModalFallback /> : null}>
        <EmployeeFormModal
          open={modalOpen}
          close={() => setModalOpen(false)}
          employee={editingEmployee}
          currentPage={page}
          itemsPerPage={itemsPerPage}
          filters={filters}
        />
      </Suspense>
    </Fragment>
  );
};

export default Employees;
