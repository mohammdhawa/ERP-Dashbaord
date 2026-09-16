import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import DataTableServer from "../../components/DataTableServer";
import ProtectedElement from "../../pages/layout/ProtectedElement";
import { hasPermission } from "../../data/permissionsCatalog";
import {
  fetchWarnings,
  deleteWarning,
} from "../../redux/actions/warningsActions";
import WarningFormModal from "./WarningFormModal";

// الإنذارات — newest first.
//
// Unlike سجل التعيين this resource DOES have update and delete, so the actions
// column stays. Delete is soft: a withdrawn warning is not a warning that never
// happened, and the confirmation says so.

const dash = <span className="text-muted">—</span>;

const EmployeeWarnings = ({ employee }) => {
  const dispatch = useDispatch();
  const { items, meta, fetchLoading, error } = useSelector(
    (state) => state.warnings
  );
  const { permissions } = useSelector((state) => state.auth);

  const canCreate = hasPermission(permissions, "hr.warnings.create");
  const canUpdate = hasPermission(permissions, "hr.warnings.update");

  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const employeeId = employee?.id;

  const load = useCallback(() => {
    if (employeeId) dispatch(fetchWarnings(employeeId, page, itemsPerPage));
  }, [dispatch, employeeId, page, itemsPerPage]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (meta && meta.last_page >= 1 && page > meta.last_page) {
      setPage(meta.last_page);
    }
  }, [meta, page]);

  const appliedPerPage = meta?.per_page ?? itemsPerPage;

  const columns = useMemo(
    () => [
      {
        key: "sequence",
        label: "التسلسل",
        // Computed server-side from the live rows: withdrawing #2 of 3
        // renumbers the third to #2. Displayed, never submitted.
        render: (value) =>
          value == null ? (
            dash
          ) : (
            <span className="badge bg-secondary-transparent">{value}</span>
          ),
      },
      { key: "type", label: "نوع الإنذار" },
      {
        key: "number",
        label: "رقم كتاب الإنذار",
        render: (value) => (value ? <span dir="ltr">{value}</span> : dash),
      },
      {
        key: "issued_on",
        label: "تاريخ الإصدار",
        render: (value) => (value ? <span dir="ltr">{value}</span> : dash),
      },
      {
        key: "issuer",
        label: "جهة الإصدار",
        // An employee, not a user account. Same three states as every other
        // embedded relation in the app: unset, present, or set-but-soft-deleted
        // — the last worded the way the departments and users lists word it,
        // rather than as a bare id that reads like a failed lookup.
        render: (issuer, item) => {
          if (!item.issued_by) return dash;
          if (!issuer) {
            return (
              <span
                className="text-muted"
                title="الموظف المُصدِر لم يعد متاحاً (سجل محذوف)"
              >
                موظف #{item.issued_by} — سجل غير متاح
              </span>
            );
          }
          return (
            <span title={issuer.employee_number || undefined}>
              {issuer.full_name}
            </span>
          );
        },
      },
      {
        key: "notes",
        label: "ملاحظات",
        render: (value) =>
          value ? (
            <span className="text-wrap d-inline-block" style={{ maxWidth: 320 }}>
              {value}
            </span>
          ) : (
            dash
          ),
      },
    ],
    []
  );

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (warning) => {
    setEditing(warning);
    setModalOpen(true);
  };
  const handleDelete = (id, warning) => {
    // Rows here differ mainly by date, so the type plus the letter number is
    // what lets someone recognise the one they meant to withdraw.
    const label = [warning?.type, warning?.number].filter(Boolean).join(" — ");
    dispatch(
      deleteWarning(id, employeeId, page, items.length, itemsPerPage, label)
    );
  };

  return (
    <div>
      <div className="d-flex justify-content-end mb-3">
        <ProtectedElement
          element={
            <button
              type="button"
              className="btn btn-secondary btn-wave"
              onClick={openCreate}
            >
              <i className="ri-alarm-warning-line align-middle me-1"></i> إصدار
              إنذار
            </button>
          }
          requiredPermissions={["hr.warnings.create"]}
        />
      </div>

      <DataTableServer
        columns={columns}
        data={items}
        loading={fetchLoading}
        error={error}
        onRetry={load}
        emptyMessage="لا توجد إنذارات لهذا الموظف"
        currentPage={meta?.current_page || page}
        totalPages={meta?.last_page || 1}
        dataCount={meta?.total || 0}
        onPageChange={setPage}
        itemsPerPage={appliedPerPage}
        onItemsPerPageChange={setItemsPerPage}
        updatePermission="hr.warnings.update"
        deletePermission="hr.warnings.delete"
        functions={{
          // Names the row on the action buttons. Warnings have no title, so the
          // type and the issue date are what distinguish one from the next.
          rowLabel: (item) =>
            [item.type, item.number, item.issued_on].filter(Boolean).join(" "),
          handleUpdate: canUpdate ? openEdit : undefined,
          handleDelete: handleDelete,
          // `disabledDeleteReason` only renders on a DISABLED button, and there
          // is no disableDelete here, so it never showed — every row still read
          // "حذف" for what is a withdrawal that keeps the record.
          deleteLabel: "سحب الإنذار",
        }}
      />

      {(canCreate || canUpdate) && (
        <WarningFormModal
          open={modalOpen}
          close={() => setModalOpen(false)}
          employee={employee}
          warning={editing}
          page={page}
          itemsPerPage={itemsPerPage}
        />
      )}
    </div>
  );
};

export default EmployeeWarnings;
