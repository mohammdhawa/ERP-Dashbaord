import {
  Fragment,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useState,
} from "react";
import { Helmet } from "react-helmet-async";
import { Card, Col, Row, Table } from "react-bootstrap";
import { useSelector } from "react-redux";
import { PageHeader, ModalFallback } from "../../components";
import StatePanel from "../../components/StatePanel";
import { hasPermission } from "../../data/permissionsCatalog";
import api from "../../redux/api";
import { parseApiError } from "../../utils/apiHelpers";
import { confirmDestructive, toastNotify } from "../../utils";
import { shiftSpan } from "./shiftDisplay";

const ShiftFormModal = lazy(() => import("./ShiftFormModal"));

// الورديات — the shift catalogue (API doc §19.1). The list is every shift in
// one answer (no paging), so it lives in local state.

// The end column is the right half of shiftSpan's "start – end".
const shiftEnd = (shift) => shiftSpan(shift).split(" – ")[1];

const Shifts = () => {
  const { permissions } = useSelector((state) => state.auth);
  const canManage = hasPermission(permissions, "scheduling.manage");

  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/scheduling/shifts");
      setShifts(response.data.data);
    } catch (err) {
      const parsed = parseApiError(err);
      setError({ message: parsed.message, status: parsed.status });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (shift) => {
    setEditing(shift);
    setModalOpen(true);
  };
  const handleSaved = () => {
    setModalOpen(false);
    load();
  };

  const handleDelete = async (shift) => {
    const confirmed = await confirmDestructive({
      action: "حذف الوردية",
      subject: shift.name,
      text: "تُحذف الوردية ولا يمكن استخدامها في جدول جديد.",
    });
    if (!confirmed) return;

    try {
      const response = await api.delete(`/scheduling/shifts/${shift.id}`);
      toastNotify(response.data.message, "success");
    } catch (err) {
      toastNotify(parseApiError(err).message, "error");
    }
    load();
  };

  return (
    <Fragment>
      <Helmet>
        <title>الراقي ERP | الورديات</title>
      </Helmet>
      <PageHeader
        homepage="الورديات"
        activepage="الورديات والجداول"
        page="الورديات"
      >
        {canManage && (
          <button onClick={openCreate} className="btn btn-secondary btn-wave">
            <i className="ri-add-line align-middle me-1"></i> إضافة وردية
          </button>
        )}
      </PageHeader>

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Body>
              <StatePanel
                loading={loading}
                error={error?.message}
                onRetry={error?.status === 403 ? undefined : load}
              >
                <div className="table-responsive">
                  <Table className="text-nowrap align-middle mb-0">
                    <thead>
                      <tr>
                        <th>الرمز</th>
                        <th>الاسم</th>
                        <th>البداية</th>
                        <th>المدة</th>
                        <th>النهاية</th>
                        <th>الحالة</th>
                        {canManage && <th></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {shifts.length === 0 ? (
                        <tr>
                          <td
                            colSpan={canManage ? 7 : 6}
                            className="text-center text-muted"
                          >
                            لا توجد ورديات
                          </td>
                        </tr>
                      ) : (
                        shifts.map((shift) => (
                          <tr key={shift.id}>
                            <td dir="ltr" className="text-end">
                              {shift.code}
                            </td>
                            <td>{shift.name}</td>
                            <td dir="ltr" className="text-end">
                              {shift.starts_at}
                            </td>
                            <td>{shift.duration_minutes} دقيقة</td>
                            <td>{shiftEnd(shift)}</td>
                            <td>
                              {shift.is_active ? (
                                <span className="badge bg-success-transparent">
                                  مفعّلة
                                </span>
                              ) : (
                                <span className="badge bg-danger-transparent">
                                  موقوفة
                                </span>
                              )}
                            </td>
                            {canManage && (
                              <td className="text-end">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-primary-light me-1"
                                  onClick={() => openEdit(shift)}
                                >
                                  تعديل
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger-light"
                                  onClick={() => handleDelete(shift)}
                                >
                                  حذف
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>
              </StatePanel>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Suspense fallback={modalOpen ? <ModalFallback /> : null}>
        <ShiftFormModal
          show={modalOpen}
          shift={editing}
          onHide={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      </Suspense>
    </Fragment>
  );
};

export default Shifts;
