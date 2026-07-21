import React, { Fragment, useEffect, useState, Suspense, lazy } from "react";
import { Helmet } from "react-helmet";
import { Card, Col, Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import { PageHeader } from "../../components";
import DataTableServer from "../../components/DataTableServer";
import ProtectedElement from "../../pages/layout/ProtectedElement";
import {
  fetchDepartments,
  deleteDepartment,
} from "../../redux/actions/departmentsActions";

const DepartmentFormModal = lazy(() => import("./DepartmentFormModal"));

const columns = [
  { key: "id", label: "#" },
  { key: "name", label: "اسم القسم" },
  {
    key: "manager_id",
    label: "المدير",
    render: (value) =>
      value ? (
        <span className="badge bg-info-transparent">موظف #{value}</span>
      ) : (
        <span className="text-muted">—</span>
      ),
  },
  {
    key: "created_at",
    label: "تاريخ الإنشاء",
    render: (value) => (value ? moment(value).format("YYYY-MM-DD") : "—"),
  },
];

const Departments = () => {
  const dispatch = useDispatch();
  const { items, meta, fetchLoading } = useSelector(
    (state) => state.departments
  );
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);

  // Server-side pagination: every page change is a fresh `?page=N` request.
  useEffect(() => {
    dispatch(fetchDepartments(page));
  }, [dispatch, page]);

  const openCreate = () => {
    setEditingDepartment(null);
    setModalOpen(true);
  };
  const openEdit = (department) => {
    setEditingDepartment(department);
    setModalOpen(true);
  };
  const handleDelete = (id) => {
    dispatch(deleteDepartment(id, page, items.length));
  };

  return (
    <Fragment>
      <Helmet>
        <title>الراقي ERP | الأقسام</title>
      </Helmet>
      <PageHeader homepage="الأقسام" activepage="المؤسسة" page="الأقسام">
        <ProtectedElement
          element={
            <button onClick={openCreate} className="btn btn-secondary btn-wave">
              <i className="ri-add-line align-middle me-1"></i> إضافة قسم
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
                currentPage={meta?.current_page || page}
                totalPages={meta?.last_page || 1}
                dataCount={meta?.total || 0}
                onPageChange={setPage}
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

      <Suspense fallback={null}>
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
