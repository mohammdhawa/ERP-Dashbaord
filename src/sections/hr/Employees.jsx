import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  Suspense,
  lazy,
} from "react";
import { Helmet } from "react-helmet";
import { Card, Col, Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components";
import DataTableServer from "../../components/DataTableServer";
import ProtectedElement from "../../pages/layout/ProtectedElement";
import EmployeeFilters from "./EmployeeFilters";
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

// Columns are built per-render because one is FIELD-GATED: `national_id` is
// absent from the payload unless the caller holds hr.employees.viewIdentity.
// Rendering it unconditionally would show a column of "—" to everyone else,
// which reads as "this company records no ID numbers" rather than "you may not
// see them".
const buildColumns = ({ canViewIdentity }) =>
  [
    {
      key: "employee_number",
      label: "الرقم الوظيفي",
      render: (value) => ltr(value),
    },
    {
      // The imported paper number. HR will be holding documents that carry
      // M024333 for years after the import, so it stays visible and searchable.
      key: "legacy_number",
      label: "الرقم القديم",
      render: (value) => ltr(value),
    },
    // Read-only accessor joining the three name parts. NOT sortable.
    { key: "full_name", label: "الاسم الكامل" },
    canViewIdentity && {
      key: "national_id",
      label: "رقم الهوية",
      render: (value) => ltr(value),
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
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filters, setFilters] = useState(() => {
    const seeded = { ...EMPTY_FILTERS };
    Object.keys(EMPTY_FILTERS).forEach((key) => {
      const value = searchParams.get(key);
      if (value != null && value !== "") seeded[key] = value;
    });
    return seeded;
  });
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
  const handleDelete = (id) => {
    dispatch(deleteEmployee(id, page, items.length, itemsPerPage, filters));
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
                  handleUpdate: openEdit,
                  handleDelete: handleDelete,
                }}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Suspense fallback={null}>
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
