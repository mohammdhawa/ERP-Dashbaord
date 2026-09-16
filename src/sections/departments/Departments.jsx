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
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import { PageHeader, ModalFallback } from "../../components";
import DataTableServer from "../../components/DataTableServer";
import ProtectedElement from "../../pages/layout/ProtectedElement";
import { hasPermission } from "../../data/permissionsCatalog";
import {
  fetchDepartments,
  deleteDepartment,
} from "../../redux/actions/departmentsActions";

const DepartmentFormModal = lazy(() => import("./DepartmentFormModal"));

const dash = <span className="text-muted">—</span>;

// The manager comes EMBEDDED on the resource now — `manager: { id, full_name,
// employee_number }` beside the untouched `manager_id`. This page used to walk
// every employee page to resolve that name itself; that interim lookup is gone.
//
// THE THREE STATES ARE NOT TWO. `manager_id` and `manager` disagree in one real
// case, and it is the case worth getting right:
//
//   manager_id null            → no manager assigned. A dash.
//   manager_id + manager       → the person. Named, and linked when the reader
//                                may open employee profiles at all.
//   manager_id + manager null  → a manager IS recorded, but that employee has
//                                been soft-deleted. Collapsing this into a dash
//                                would state the unit has no manager, which is
//                                false; printing the bare id would imply the
//                                name merely failed to load. So it says both:
//                                the id that is still on the record, and that
//                                the person behind it is gone.
const buildColumns = ({ canOpenEmployee }) => [
  {
    key: "code",
    label: "الرمز",
    render: (value) =>
      value ? (
        <span className="fw-semibold" dir="ltr">
          {value}
        </span>
      ) : (
        <span className="text-muted">—</span>
      ),
  },
  { key: "name", label: "اسم الوحدة" },
  {
    key: "level_label",
    label: "المستوى",
    // Server-resolved Arabic tier label — never mapped from `level` locally.
    render: (value) =>
      value ? (
        <span className="badge bg-primary-transparent">{value}</span>
      ) : (
        <span className="text-muted">—</span>
      ),
  },
  {
    key: "sector_label",
    label: "الجهة",
    render: (value) =>
      value ? (
        <span className="badge bg-secondary-transparent">{value}</span>
      ) : (
        <span className="text-muted">—</span>
      ),
  },
  {
    key: "is_active",
    label: "الحالة",
    render: (value) =>
      value ? (
        <span className="badge bg-success-transparent">مُفعّلة</span>
      ) : (
        <span className="badge bg-danger-transparent">معطّلة</span>
      ),
  },
  {
    key: "manager",
    label: "المدير",
    render: (manager, item) => {
      if (!item.manager_id) return dash;

      // Soft-deleted employee: the foreign key survives, the person does not.
      if (!manager) {
        return (
          <span
            className="badge bg-secondary-transparent"
            title="الموظف المسجَّل كمدير لم يعد متاحاً (سجل محذوف)"
          >
            موظف #{item.manager_id} — سجل غير متاح
          </span>
        );
      }

      // The staff number lives in the tooltip rather than the cell: two people
      // can share الاسم الثلاثي, but a table column is the wrong place to spend
      // that width on every row.
      const badge = (
        <span title={manager.employee_number || undefined}>
          {manager.full_name}
        </span>
      );

      // Linked only when the reader can actually open a profile — otherwise the
      // link is a trip to /no_access. stopPropagation so following the manager
      // does not also fire the row's own click.
      return canOpenEmployee ? (
        <Link
          to={`${import.meta.env.BASE_URL}hr/employees/${manager.id}`}
          className="badge bg-info-transparent text-decoration-none"
          onClick={(e) => e.stopPropagation()}
        >
          {badge}
        </Link>
      ) : (
        <span className="badge bg-info-transparent">{badge}</span>
      );
    },
  },
  {
    key: "created_at",
    label: "تاريخ الإنشاء",
    render: (value) => (value ? moment(value).format("YYYY-MM-DD") : "—"),
  },
];

const Departments = () => {
  const dispatch = useDispatch();
  const { items, meta, fetchLoading, error } = useSelector(
    (state) => state.departments
  );
  const { permissions } = useSelector((state) => state.auth);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);

  // Server-side pagination: every page change is a fresh `?page=N` request.
  const load = useCallback(() => {
    dispatch(fetchDepartments(page));
  }, [dispatch, page]);

  useEffect(() => {
    load();
  }, [load]);

  // If a deletion (here or elsewhere) shrinks the tree so the current page no
  // longer exists, snap back to the nearest valid page from server metadata.
  useEffect(() => {
    if (meta && meta.last_page >= 1 && page > meta.last_page) {
      setPage(meta.last_page);
    }
  }, [meta, page]);

  // Gates the manager LINK only, not the name: the name ships with the
  // department resource, but the profile route behind the link needs its own
  // permission.
  const canOpenEmployee = hasPermission(permissions, "hr.employees.view");

  const columns = useMemo(
    () => buildColumns({ canOpenEmployee }),
    [canOpenEmployee]
  );

  const openCreate = () => {
    setEditingDepartment(null);
    setModalOpen(true);
  };
  const openEdit = (department) => {
    setEditingDepartment(department);
    setModalOpen(true);
  };
  const handleDelete = (id, department) => {
    dispatch(deleteDepartment(id, page, items.length, department?.name));
  };

  return (
    <Fragment>
      <Helmet>
        <title>الراقي ERP | الوحدات التنظيمية</title>
      </Helmet>
      <PageHeader
        homepage="الوحدات التنظيمية"
        activepage="المؤسسة"
        page="الوحدات التنظيمية"
      >
        <ProtectedElement
          element={
            <button onClick={openCreate} className="btn btn-secondary btn-wave">
              <i className="ri-add-line align-middle me-1"></i> إضافة وحدة تنظيمية
            </button>
          }
          requiredPermissions={["departments.create"]}
        />
      </PageHeader>

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Body>
              <DataTableServer
                columns={columns}
                data={items}
                loading={fetchLoading}
                // Without these a failed fetch rendered the generic empty
                // message, so a network error read as "this company has no
                // organisational units".
                error={error}
                onRetry={load}
                currentPage={meta?.current_page || page}
                totalPages={meta?.last_page || 1}
                dataCount={meta?.total || 0}
                onPageChange={setPage}
                itemsPerPage={meta?.per_page || 15}
                showPageSizeSelector={false}
                updatePermission="departments.update"
                deletePermission="departments.delete"
                functions={{
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
        <DepartmentFormModal
          open={modalOpen}
          close={() => setModalOpen(false)}
          department={editingDepartment}
          currentPage={page}
        />
      </Suspense>
    </Fragment>
  );
};

export default Departments;
