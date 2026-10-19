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
import { Card, Col, Form, Row } from "react-bootstrap";
import { useSelector } from "react-redux";
import { PageHeader, ModalFallback } from "../../components";
import DataTableServer from "../../components/DataTableServer";
import StatePanel from "../../components/StatePanel";
import ProtectedElement from "../../pages/layout/ProtectedElement";
import { hasPermission } from "../../data/permissionsCatalog";
import api from "../../redux/api";
import { parseApiError } from "../../utils/apiHelpers";
import { confirmDestructive, toastNotify } from "../../utils";

const LeaveTypeFormModal = lazy(() => import("./LeaveTypeFormModal"));

// أنواع الإجازات — the leave type catalogue (API doc §16.1).
//
// Company-wide and small (nine ship with the system), so the list is not
// paged and lives in local state: nothing else reads it. The «عرض الأنواع
// الموقوفة» switch asks the server for the retired ones (`?active=0`), which it
// only answers for leave.types.update — hence the switch is hidden without it.

const check = <span className="text-success">✓</span>;
const dash = <span className="text-muted">—</span>;
const flag = (value) => (value ? check : dash);

const LeaveTypes = () => {
  const { permissions } = useSelector((state) => state.auth);
  const canUpdate = hasPermission(permissions, "leave.types.update");

  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // Toggling the switch mid-flight must not let the older response land last.
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const mine = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/leave/types", {
        params: showInactive ? { active: 0 } : undefined,
      });
      if (mine !== requestId.current) return;
      setTypes(response.data.data);
    } catch (err) {
      if (mine !== requestId.current) return;
      const parsed = parseApiError(err);
      setError({ message: parsed.message, status: parsed.status });
    } finally {
      if (mine === requestId.current) setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = useMemo(
    () => [
      {
        key: "code",
        label: "الرمز",
        nowrap: true,
        render: (value) => <span dir="ltr">{value}</span>,
      },
      { key: "name_ar", label: "الاسم بالعربية" },
      {
        key: "name_en",
        label: "الاسم بالإنجليزية",
        render: (value) => (value ? <span dir="ltr">{value}</span> : dash),
      },
      { key: "deducts_balance", label: "يخصم من الرصيد", render: flag },
      { key: "for_requests", label: "للطلبات", render: flag },
      { key: "for_excuses", label: "للأعذار", render: flag },
      { key: "requires_reason", label: "يتطلب سبباً", render: flag },
      { key: "requires_attachment", label: "يتطلب مرفقاً", render: flag },
      {
        key: "is_active",
        label: "الحالة",
        render: (value) =>
          value ? (
            <span className="badge bg-success-transparent">فعّال</span>
          ) : (
            <span className="badge bg-danger-transparent">موقوف</span>
          ),
      },
    ],
    []
  );

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (type) => {
    setEditing(type);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setModalOpen(false);
    load();
  };

  const handleDelete = async (id, type) => {
    const confirmed = await confirmDestructive({
      action: "حذف نوع الإجازة",
      subject: type?.name_ar,
      text: "إن كانت إجازات قد قُدِّمت بهذا النوع فسيُوقَف بدلاً من حذفه.",
    });
    if (!confirmed) return;

    try {
      const response = await api.delete(`/leave/types/${id}`);
      // Verbatim: it says whether the type was deleted or deactivated instead.
      toastNotify(response.data.message, "success");
    } catch (err) {
      toastNotify(parseApiError(err).message, "error");
    }
    // Re-read either way: a deactivated type changes row state (or leaves the
    // list), and a failed delete may mean the list was already stale.
    load();
  };

  return (
    <Fragment>
      <Helmet>
        <title>الراقي ERP | أنواع الإجازات</title>
      </Helmet>
      <PageHeader
        homepage="أنواع الإجازات"
        activepage="الإجازات"
        page="أنواع الإجازات"
      >
        <ProtectedElement
          element={
            <button onClick={openCreate} className="btn btn-secondary btn-wave">
              <i className="ri-add-line align-middle me-1"></i> إضافة نوع إجازة
            </button>
          }
          requiredPermissions={["leave.types.create"]}
        />
      </PageHeader>

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Body>
              {canUpdate && (
                <Form.Check
                  type="switch"
                  id="lt-show-inactive"
                  className="mb-3"
                  label="عرض الأنواع الموقوفة"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                />
              )}

              <StatePanel
                loading={loading}
                error={error?.message}
                // A 403 is final; retrying it only repeats the refusal.
                onRetry={error?.status === 403 ? undefined : load}
              >
                <DataTableServer
                  columns={columns}
                  data={types}
                  // No pagination: dataCount 0 hides the pager (the list is
                  // small and unpaged).
                  dataCount={0}
                  emptyMessage={
                    showInactive
                      ? "لا توجد أنواع إجازات موقوفة"
                      : "لا توجد أنواع إجازات"
                  }
                  updatePermission="leave.types.update"
                  deletePermission="leave.types.delete"
                  functions={{
                    rowLabel: (item) => item.name_ar,
                    handleUpdate: openEdit,
                    handleDelete,
                  }}
                />
              </StatePanel>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Fallback only while open: the lazy modal is always mounted so its
          chunk prefetches, and an unconditional fallback would flash a modal
          shell on every visit. See ModalFallback. */}
      <Suspense fallback={modalOpen ? <ModalFallback /> : null}>
        <LeaveTypeFormModal
          show={modalOpen}
          type={editing}
          onHide={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      </Suspense>
    </Fragment>
  );
};

export default LeaveTypes;
