import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Card, Form, Modal, Spinner } from "react-bootstrap";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import StatePanel from "../../components/StatePanel";
import api from "../../redux/api";
import { hasPermission } from "../../data/permissionsCatalog";
import { parseApiError } from "../../utils/apiHelpers";
import { confirmDestructive, toastNotify } from "../../utils";
import { todayInDamascus } from "../attendance/recordFilters";
import AssignScheduleModal from "./AssignScheduleModal";
import ShiftChangeModal from "./ShiftChangeModal";
import {
  boundsOfMonth,
  canDeleteSpan,
  canEndSpan,
  monthOf,
  shiftMonth,
} from "./scheduleSpans";

// «الجدول» on the employee profile: the person's schedule spans (API doc
// §19.3) and their one-off shift changes of a month (§19.6).

const ORIGIN_HR = 1;
const ORIGIN_SWAP = 2;

const dash = <span className="text-muted">—</span>;

const asList = (data, key) => (Array.isArray(data) ? data : data?.[key] || []);

const EmployeeSchedule = ({ employee }) => {
  const { permissions } = useSelector((state) => state.auth);
  const canManage = hasPermission(permissions, "scheduling.manage");
  const employeeId = employee?.id;

  const today = todayInDamascus();
  const [month, setMonth] = useState(monthOf(today));

  const [spans, setSpans] = useState([]);
  const [spansLoading, setSpansLoading] = useState(true);
  const [spansError, setSpansError] = useState(null);
  const [spansFinal, setSpansFinal] = useState(false);

  const [changes, setChanges] = useState([]);
  const [changesLoading, setChangesLoading] = useState(true);
  const [changesError, setChangesError] = useState(null);
  const [changesFinal, setChangesFinal] = useState(false);

  const [assignOpen, setAssignOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [ending, setEnding] = useState(null);
  const [endDate, setEndDate] = useState("");
  const [endMessage, setEndMessage] = useState(null);
  const [endSaving, setEndSaving] = useState(false);

  // Only the latest response of each list may write it.
  const spansSeq = useRef(0);
  const changesSeq = useRef(0);

  const loadSpans = useCallback(async () => {
    if (!employeeId) return;
    const seq = ++spansSeq.current;
    setSpansLoading(true);
    setSpansError(null);
    try {
      const response = await api.get(`/hr/employees/${employeeId}/work-schedules`);
      if (seq !== spansSeq.current) return;
      setSpans(asList(response.data?.data, "work_schedules"));
      setSpansFinal(false);
    } catch (err) {
      if (seq !== spansSeq.current) return;
      const parsed = parseApiError(err);
      if (parsed.status === 0) toastNotify(parsed.message, "error");
      else {
        setSpansError(parsed.message);
        setSpansFinal(parsed.status === 403 || parsed.status === 404);
      }
    } finally {
      if (seq === spansSeq.current) setSpansLoading(false);
    }
  }, [employeeId]);

  const bounds = boundsOfMonth(month);

  const loadChanges = useCallback(async () => {
    if (!employeeId || !bounds) return;
    const seq = ++changesSeq.current;
    setChangesLoading(true);
    setChangesError(null);
    try {
      const response = await api.get(`/hr/employees/${employeeId}/shift-changes`, {
        params: { from: bounds.from, to: bounds.to },
      });
      if (seq !== changesSeq.current) return;
      setChanges(asList(response.data?.data, "shift_changes"));
      setChangesFinal(false);
    } catch (err) {
      if (seq !== changesSeq.current) return;
      const parsed = parseApiError(err);
      if (parsed.status === 0) toastNotify(parsed.message, "error");
      else {
        setChangesError(parsed.message);
        setChangesFinal(parsed.status === 403 || parsed.status === 404);
      }
    } finally {
      if (seq === changesSeq.current) setChangesLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, bounds?.from, bounds?.to]);

  useEffect(() => {
    loadSpans();
  }, [loadSpans]);

  useEffect(() => {
    loadChanges();
  }, [loadChanges]);

  const reportFailure = (err) => {
    const parsed = parseApiError(err);
    toastNotify(parsed.message, "error");
  };

  const openEnd = (span) => {
    setEnding(span);
    setEndDate("");
    setEndMessage(null);
  };

  const submitEnd = async (e) => {
    e.preventDefault();
    if (endSaving || !ending) return;
    setEndSaving(true);
    setEndMessage(null);
    try {
      const response = await api.patch(
        `/hr/employees/${employeeId}/work-schedules/${ending.id}`,
        { to_date: endDate }
      );
      toastNotify(response.data.message, "success");
      setEnding(null);
      await Promise.all([loadSpans(), loadChanges()]);
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.status === 0) toastNotify(parsed.message, "error");
      else setEndMessage(parsed.errors?.to_date?.[0] || parsed.message);
    } finally {
      setEndSaving(false);
    }
  };

  const deleteSpan = async (span) => {
    const confirmed = await confirmDestructive({
      action: "حذف فترة الجدول",
      subject: span.work_schedule?.name,
      text: "تُحذف الفترة التي لم تبدأ، وتعود الفترة السابقة مفتوحة.",
      confirmButtonText: "حذف",
    });
    if (!confirmed) return;
    try {
      const response = await api.delete(
        `/hr/employees/${employeeId}/work-schedules/${span.id}`
      );
      toastNotify(response.data.message, "success");
      await loadSpans();
    } catch (err) {
      reportFailure(err);
    }
  };

  const removeChange = async (change) => {
    const confirmed = await confirmDestructive({
      action: "إزالة التعديل",
      subject: change.date,
      text: "يعود الموظف إلى جدوله في هذا اليوم.",
      confirmButtonText: "إزالة",
    });
    if (!confirmed) return;
    try {
      const response = await api.delete(
        `/hr/employees/${employeeId}/shift-changes/${change.id}`
      );
      toastNotify(response.data.message, "success");
      await loadChanges();
    } catch (err) {
      reportFailure(err);
    }
  };

  const calendarLink = `/scheduling/calendar?employee_id=${employeeId}`;

  return (
    <div className="d-flex flex-column gap-3">
      <Card className="custom-card">
        <Card.Header className="justify-content-between">
          <Card.Title>فترات الجدول</Card.Title>
          <div className="d-flex gap-2">
            <Link to={calendarLink} className="btn btn-sm btn-light">
              عرض في التقويم
            </Link>
            {canManage && (
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setAssignOpen(true)}
              >
                إسناد جدول
              </button>
            )}
          </div>
        </Card.Header>
        <Card.Body>
          <StatePanel
            loading={spansLoading && spans.length === 0}
            error={spansError}
            onRetry={spansFinal ? undefined : loadSpans}
          >
            {spans.length === 0 ? (
              <div className="text-center text-muted py-3">يتبع الجدول الافتراضي</div>
            ) : (
              <div className="table-responsive">
                <table className="table text-nowrap align-middle mb-0">
                  <thead>
                    <tr>
                      <th>الجدول</th>
                      <th>من</th>
                      <th>إلى</th>
                      <th>بداية الدورة</th>
                      <th>بواسطة</th>
                      {canManage && <th />}
                    </tr>
                  </thead>
                  <tbody>
                    {spans.map((span) => (
                      <tr key={span.id}>
                        <td>{span.work_schedule?.name}</td>
                        <td dir="ltr">{span.from_date}</td>
                        <td dir="ltr">{span.to_date || "مستمر"}</td>
                        <td dir="ltr">{span.cycle_start_date || dash}</td>
                        <td>{span.created_by?.name || dash}</td>
                        {canManage && (
                          <td className="text-nowrap">
                            {canEndSpan(span) && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary me-1"
                                onClick={() => openEnd(span)}
                              >
                                إنهاء
                              </button>
                            )}
                            {canDeleteSpan(span) && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => deleteSpan(span)}
                              >
                                حذف
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </StatePanel>
        </Card.Body>
      </Card>

      <Card className="custom-card">
        <Card.Header className="justify-content-between flex-wrap gap-2">
          <Card.Title>تعديلات الوردية</Card.Title>
          <div className="d-flex gap-2 align-items-center">
            <button
              type="button"
              className="btn btn-sm btn-light"
              aria-label="الشهر السابق"
              onClick={() => setMonth(shiftMonth(month, -1))}
            >
              <i className="ri-arrow-right-s-line" />
            </button>
            <Form.Control
              type="month"
              size="sm"
              dir="ltr"
              aria-label="الشهر"
              value={month}
              onChange={(e) => boundsOfMonth(e.target.value) && setMonth(e.target.value)}
              style={{ width: "10rem" }}
            />
            <button
              type="button"
              className="btn btn-sm btn-light"
              aria-label="الشهر التالي"
              onClick={() => setMonth(shiftMonth(month, 1))}
            >
              <i className="ri-arrow-left-s-line" />
            </button>
            {canManage && (
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setChangeOpen(true)}
              >
                تعديل الوردية
              </button>
            )}
          </div>
        </Card.Header>
        <Card.Body>
          <StatePanel
            loading={changesLoading && changes.length === 0}
            error={changesError}
            onRetry={changesFinal ? undefined : loadChanges}
          >
            {changes.length === 0 ? (
              <div className="text-center text-muted py-3">لا توجد تعديلات في هذا الشهر</div>
            ) : (
              <div className="table-responsive">
                <table className="table text-nowrap align-middle mb-0">
                  <thead>
                    <tr>
                      <th>التاريخ</th>
                      <th>الوردية</th>
                      <th>المصدر</th>
                      <th>السبب</th>
                      <th>بواسطة</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {changes.map((change) => (
                      <tr key={change.id}>
                        <td dir="ltr">{change.date}</td>
                        <td>{change.shift?.name || "راحة"}</td>
                        <td>{change.origin_label}</td>
                        <td className="text-wrap">{change.reason || dash}</td>
                        <td>{change.created_by?.name || dash}</td>
                        <td className="text-nowrap">
                          {change.origin === ORIGIN_SWAP && change.shift_swap_id ? (
                            <Link to={`/scheduling/swaps?swap=${change.shift_swap_id}`}>
                              عرض التبديل
                            </Link>
                          ) : (
                            change.origin === ORIGIN_HR &&
                            canManage && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => removeChange(change)}
                              >
                                إزالة
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </StatePanel>
        </Card.Body>
      </Card>

      {assignOpen && (
        <AssignScheduleModal
          show
          mode="one"
          employee={employee}
          onHide={() => setAssignOpen(false)}
          onSaved={() => {
            setAssignOpen(false);
            loadSpans();
          }}
        />
      )}

      {changeOpen && (
        <ShiftChangeModal
          show
          employee={employee}
          from={today}
          to={today}
          editableRange
          onHide={() => setChangeOpen(false)}
          onSaved={loadChanges}
        />
      )}

      <Modal show={!!ending} onHide={() => !endSaving && setEnding(null)} centered backdrop="static">
        <Form onSubmit={submitEnd}>
          <Modal.Header closeButton>
            <Modal.Title as="h6">إنهاء: {ending?.work_schedule?.name}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="d-flex flex-column gap-3">
            {endMessage && (
              <Alert variant="danger" className="mb-0 py-2 px-3">
                {endMessage}
              </Alert>
            )}
            <div>
              <Form.Label htmlFor="span-to-date">إلى</Form.Label>
              <Form.Control
                id="span-to-date"
                type="date"
                dir="ltr"
                min={today}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button type="submit" className="btn btn-secondary" disabled={endSaving || !endDate}>
              {endSaving ? <Spinner animation="border" size="sm" /> : "إنهاء"}
            </button>
            <button
              type="button"
              className="btn btn-light"
              onClick={() => setEnding(null)}
              disabled={endSaving}
            >
              إلغاء
            </button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default EmployeeSchedule;
