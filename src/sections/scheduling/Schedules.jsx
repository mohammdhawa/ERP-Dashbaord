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
import { daysText } from "./shiftDisplay";

const ScheduleFormModal = lazy(() => import("./ScheduleFormModal"));

// الجداول — the schedule catalogue (API doc §19.2). Unpaged, local state.

const Schedules = () => {
  const { permissions } = useSelector((state) => state.auth);
  const canManage = hasPermission(permissions, "scheduling.manage");

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/scheduling/schedules");
      setSchedules(response.data.data);
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
  const openEdit = (schedule) => {
    setEditing(schedule);
    setModalOpen(true);
  };
  const handleSaved = () => {
    setModalOpen(false);
    load();
  };

  const handleDelete = async (schedule) => {
    const confirmed = await confirmDestructive({
      action: "حذف الجدول",
      subject: schedule.name,
      text: "يُحذف الجدول ولا يمكن إسناده بعد ذلك.",
    });
    if (!confirmed) return;

    try {
      const response = await api.delete(`/scheduling/schedules/${schedule.id}`);
      toastNotify(response.data.message, "success");
    } catch (err) {
      toastNotify(parseApiError(err).message, "error");
    }
    load();
  };

  return (
    <Fragment>
      <Helmet>
        <title>الراقي ERP | الجداول</title>
      </Helmet>
      <PageHeader
        homepage="الجداول"
        activepage="الورديات والجداول"
        page="الجداول"
      >
        {canManage && (
          <button onClick={openCreate} className="btn btn-secondary btn-wave">
            <i className="ri-add-line align-middle me-1"></i> إضافة جدول
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
                        <th>النوع</th>
                        <th>المدة</th>
                        <th>الحالة</th>
                        {canManage && <th></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {schedules.length === 0 ? (
                        <tr>
                          <td
                            colSpan={canManage ? 6 : 5}
                            className="text-center text-muted"
                          >
                            لا توجد جداول
                          </td>
                        </tr>
                      ) : (
                        schedules.map((schedule) => (
                          <tr key={schedule.id}>
                            <td dir="ltr" className="text-end">
                              {schedule.code}
                            </td>
                            <td>{schedule.name}</td>
                            <td>{schedule.kind_label}</td>
                            <td>{daysText(schedule.cycle_days)}</td>
                            <td>
                              {schedule.is_active ? (
                                <span className="badge bg-success-transparent">
                                  مفعّل
                                </span>
                              ) : (
                                <span className="badge bg-danger-transparent">
                                  موقوف
                                </span>
                              )}
                            </td>
                            {canManage && (
                              <td className="text-end">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-primary-light me-1"
                                  onClick={() => openEdit(schedule)}
                                >
                                  تعديل
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger-light"
                                  onClick={() => handleDelete(schedule)}
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
        <ScheduleFormModal
          show={modalOpen}
          schedule={editing}
          onHide={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      </Suspense>
    </Fragment>
  );
};

export default Schedules;
