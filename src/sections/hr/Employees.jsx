import React, { Fragment, useEffect, useState, Suspense, lazy } from "react";
import { Helmet } from "react-helmet";
import { Card, Col, Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import { PageHeader } from "../../components";
import DataTableServer from "../../components/DataTableServer";
import ProtectedElement from "../../pages/layout/ProtectedElement";
import {
  fetchEmployees,
  deleteEmployee,
} from "../../redux/actions/employeesActions";

const EmployeeFormModal = lazy(() => import("./EmployeeFormModal"));

// status enum → contextual color (active=green, inactive=amber, terminated=red)
const STATUS_BADGES = {
  active: { className: "bg-success-transparent", label: "نشط" },
  inactive: { className: "bg-warning-transparent", label: "غير نشط" },
  terminated: { className: "bg-danger-transparent", label: "منتهي الخدمة" },
};

// salary arrives as a decimal STRING ("85000.00") — format defensively.
const formatSalary = (salary) => {
  if (salary === null || salary === undefined || salary === "") return "—";
  const numeric = Number(salary);
  return Number.isNaN(numeric)
    ? String(salary)
    : numeric.toLocaleString("en-US", { minimumFractionDigits: 2 });
};

const columns = [
  { key: "id", label: "#" },
  { key: "name", label: "الاسم" },
  {
    key: "job_title",
    label: "المسمى الوظيفي",
    render: (value) => value || <span className="text-muted">—</span>,
  },
  {
    key: "department_id",
    label: "القسم",
    render: (value) =>
      value ? (
        <span className="badge bg-info-transparent">قسم #{value}</span>
      ) : (
        <span className="text-muted">—</span>
      ),
  },
  {
    key: "phone",
    label: "الهاتف",
    render: (value) =>
      value ? <span dir="ltr">{value}</span> : <span className="text-muted">—</span>,
  },
  {
    key: "salary",
    label: "الراتب",
    render: (value) => <span dir="ltr">{formatSalary(value)}</span>,
  },
  {
    key: "hire_date",
    label: "تاريخ التعيين",
    render: (value) => (value ? moment(value).format("YYYY-MM-DD") : "—"),
  },
  {
    key: "status",
    label: "الحالة",
    render: (value) => {
      const badge = STATUS_BADGES[value] || {
        className: "bg-light",
        label: value,
      };
      return <span className={`badge ${badge.className}`}>{badge.label}</span>;
    },
  },
];

const Employees = () => {
  const dispatch = useDispatch();
  const { items, meta, fetchLoading } = useSelector((state) => state.employees);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  useEffect(() => {
    dispatch(fetchEmployees(page));
  }, [dispatch, page]);

  const openCreate = () => {
    setEditingEmployee(null);
    setModalOpen(true);
  };
  const openEdit = (employee) => {
    setEditingEmployee(employee);
    setModalOpen(true);
  };
  const handleDelete = (id) => {
    dispatch(deleteEmployee(id, page, items.length));
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
              <DataTableServer
                columns={columns}
                data={items}
                loading={fetchLoading}
                currentPage={meta?.current_page || page}
                totalPages={meta?.last_page || 1}
                dataCount={meta?.total || 0}
                onPageChange={setPage}
                updatePermission="hr.employees.update"
                deletePermission="hr.employees.delete"
                functions={{
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
        />
      </Suspense>
    </Fragment>
  );
};

export default Employees;
