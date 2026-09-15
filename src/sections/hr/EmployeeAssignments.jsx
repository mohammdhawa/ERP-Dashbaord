import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import DataTableServer from "../../components/DataTableServer";
import ProtectedElement from "../../pages/layout/ProtectedElement";
import { hasPermission } from "../../data/permissionsCatalog";
import { fetchAssignments } from "../../redux/actions/assignmentsActions";
import AssignmentFormModal from "./AssignmentFormModal";

// سجل التعيين — one employee's placements over time, newest first.
//
// ⚠️ APPEND-ONLY. There is no update endpoint, no delete endpoint and no
// permission that could authorise either, so this tab renders NO edit and NO
// delete affordance — including the actions column DataTableServer would
// otherwise add by default (showActions={false}). An empty actions column is
// not neutral: it advertises an action that does not exist.

const dash = <span className="text-muted">—</span>;

const EmployeeAssignments = ({ employee, onEmployeeChanged }) => {
  const dispatch = useDispatch();
  const { items, meta, fetchLoading, error } = useSelector(
    (state) => state.assignments
  );
  const { permissions } = useSelector((state) => state.auth);

  const canCreate = hasPermission(permissions, "hr.assignments.create");

  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);

  const employeeId = employee?.id;

  const load = useCallback(() => {
    if (employeeId) dispatch(fetchAssignments(employeeId, page, itemsPerPage));
  }, [dispatch, employeeId, page, itemsPerPage]);

  useEffect(() => {
    load();
  }, [load]);

  const appliedPerPage = meta?.per_page ?? itemsPerPage;

  // The current posting is the one the employee is in now; it is marked rather
  // than merely sorted first, because a back-dated amendment can leave it in a
  // position the eye does not expect.
  //
  // RETAINED once seen. The list is newest-first so the current row is on page
  // 1, and deriving it from `items` alone meant that browsing to page 2 lost it
  // — the record form then showed "الحالي: بدون" for a department the employee
  // is very much in. Reset when the employee changes, never when the page does.
  const [currentAssignment, setCurrentAssignment] = useState(null);

  useEffect(() => {
    setCurrentAssignment(null);
  }, [employeeId]);

  useEffect(() => {
    const found = (items || []).find((a) => a.is_current);
    if (found) setCurrentAssignment(found);
  }, [items]);

  const columns = useMemo(
    () =>
      [
        {
          key: "from_date",
          label: "من تاريخ",
          render: (value, item) => (
            <span className="d-inline-flex align-items-center gap-2">
              <span dir="ltr">{value || "—"}</span>
              {item.is_current && (
                <span className="badge bg-success-transparent">حالي</span>
              )}
            </span>
          ),
        },
        {
          key: "to_date",
          label: "إلى تاريخ",
          // null to_date is the open, current row — not missing data.
          render: (value) =>
            value ? (
              <span dir="ltr">{value}</span>
            ) : (
              <span className="text-muted">مستمر</span>
            ),
        },
        {
          key: "department",
          label: "الوحدة التنظيمية",
          render: (value, item) =>
            value?.name ? (
              <span>{value.name}</span>
            ) : item.legacy_workplace ? (
              // An imported value that could not be resolved to a unit. It is
              // shown rather than dropped so a human can still read what the
              // paper record said.
              <span className="text-warning-emphasis">
                {item.legacy_workplace}{" "}
                <span className="badge bg-warning-transparent fs-11">
                  مستورد
                </span>
              </span>
            ) : (
              dash
            ),
        },
        {
          key: "job_title",
          label: "المسمى الوظيفي",
          render: (value) => value?.name || dash,
        },
        {
          // NOT gated on hr.employees.viewSalary. The backend exposes the grade
          // ungated on this resource because hr.assignments.view is itself the
          // control; hiding it here made promotion history unreadable to the
          // administrators that permission is granted to.
          key: "organizational_grade",
          label: "الدرجة",
          render: (value) => (value == null ? dash : value),
        },
        {
          key: "reason_label",
          label: "السبب",
          render: (value) =>
            value ? (
              <span className="badge bg-primary-transparent">{value}</span>
            ) : (
              dash
            ),
        },
        {
          key: "notes",
          label: "ملاحظات",
          render: (value, item) => (
            <span>
              {value || (item.legacy_manager_name ? "" : dash)}
              {item.legacy_manager_name && (
                <span className="text-muted d-block fs-11">
                  المدير (مستورد): {item.legacy_manager_name}
                </span>
              )}
            </span>
          ),
        },
      ],
    []
  );

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <Alert variant="light" className="mb-0 py-2 px-3 fs-12 flex-grow-1">
          السجل تراكمي ولا يُعدَّل ولا يُحذف: التصحيح يتم بتسجيل حركة جديدة.
          تسجيل حركة بتاريخ يسبق أو يساوي بداية التعيين الحالي يُعدِّل التعيين
          الحالي في مكانه بدلاً من إضافة سجل جديد. تغيير القسم أو المسمى من
          نموذج بيانات الموظف يُسجِّل نقلاً تلقائياً بسبب «نقل داخلي» بتاريخ
          اليوم — سجِّل من هنا لتحديد السبب الحقيقي أو تاريخ بأثر رجعي.
        </Alert>
        <ProtectedElement
          element={
            <button
              type="button"
              className="btn btn-secondary btn-wave text-nowrap"
              onClick={() => setModalOpen(true)}
            >
              <i className="ri-add-line align-middle me-1"></i> تسجيل تعيين
            </button>
          }
          requiredPermissions={["hr.assignments.create"]}
        />
      </div>

      <DataTableServer
        columns={columns}
        data={items}
        loading={fetchLoading}
        error={error}
        onRetry={load}
        emptyMessage="لا توجد سجلات تعيين لهذا الموظف"
        currentPage={meta?.current_page || page}
        totalPages={meta?.last_page || 1}
        dataCount={meta?.total || 0}
        onPageChange={setPage}
        itemsPerPage={appliedPerPage}
        onItemsPerPageChange={setItemsPerPage}
        // No update, no delete, no actions column.
        showActions={false}
      />

      {canCreate && (
        <AssignmentFormModal
          open={modalOpen}
          close={(saved) => {
            setModalOpen(false);
            // A posting also rewrites the employee's own department / job
            // title / grade, so the header above must be refetched.
            if (saved) onEmployeeChanged?.();
          }}
          employee={employee}
          currentAssignment={currentAssignment}
          page={page}
          itemsPerPage={itemsPerPage}
        />
      )}
    </div>
  );
};

export default EmployeeAssignments;
