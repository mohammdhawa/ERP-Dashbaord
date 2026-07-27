import React, { Fragment, useEffect, useState, Suspense, lazy } from "react";
import { Helmet } from "react-helmet";
import { Card, Col, Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
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

// salary arrives as a decimal STRING ("85000.00"). Group thousands with pure
// string ops — never Number()/toLocaleString, which would round-trip the value
// through a binary float and can lose decimal precision.
const formatSalary = (salary) => {
  if (salary === null || salary === undefined || salary === "") return "—";
  const str = String(salary);
  if (!/^-?\d+(\.\d+)?$/.test(str)) return str;
  const [intPart, decPart] = str.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart != null ? `${grouped}.${decPart}` : grouped;
};

const columns = [
  { key: "id", label: "#" },
  {
    key: "employee_number",
    label: "الرقم الوظيفي",
    render: (value) =>
      value ? <span dir="ltr">{value}</span> : <span className="text-muted">—</span>,
  },
  { key: "name", label: "الاسم" },
  {
    key: "national_id",
    label: "رقم الهوية",
    render: (value) =>
      value ? <span dir="ltr">{value}</span> : <span className="text-muted">—</span>,
  },
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
    // Plain YYYY-MM-DD date — render verbatim, no Date/moment parsing that
    // would shift it across a timezone boundary.
    label: "تاريخ التعيين",
    render: (value) =>
      value ? <span dir="ltr">{value}</span> : <span className="text-muted">—</span>,
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
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  useEffect(() => {
    dispatch(fetchEmployees(page, itemsPerPage));
  }, [dispatch, page, itemsPerPage]);

  // If a soft delete shrinks the list so the current page no longer exists,
  // snap back to the last valid page reported by the server.
  useEffect(() => {
    if (meta && meta.last_page >= 1 && page > meta.last_page) {
      setPage(meta.last_page);
    }
  }, [meta, page]);

  const openCreate = () => {
    setEditingEmployee(null);
    setModalOpen(true);
  };
  const openEdit = (employee) => {
    setEditingEmployee(employee);
    setModalOpen(true);
  };
  const handleDelete = (id) => {
    dispatch(deleteEmployee(id, page, items.length, itemsPerPage));
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
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
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
          itemsPerPage={itemsPerPage}
        />
      </Suspense>
    </Fragment>
  );
};

export default Employees;
