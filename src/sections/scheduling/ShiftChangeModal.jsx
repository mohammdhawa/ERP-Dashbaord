import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Col, Form, Modal, Row, Spinner } from "react-bootstrap";
import api from "../../redux/api";
import { parseApiError } from "../../utils/apiHelpers";
import { confirmDestructive, confirmDiscardChanges, toastNotify } from "../../utils";
import { rangeBetween } from "./calendarCells";
import { isPastDate } from "./schedulingDates";
import { toShiftChangeBody } from "./schedulingPayload";
import { useSchedulingOptions } from "./useSchedulingOptions";

// «تعديل الوردية» - HR's one-off change of a person's shift on dates (API doc
// §19.6). It is all or nothing on the server: a refusal is a 422 whose
// message stays in the open modal and nothing is written.

const PAST_NOTE =
  "تعديل يوم مضى يعيد مطابقة تسجيلات الحضور في الأيام المعدّلة، ولا يُبلَّغ الموظف به.";

const ORIGIN_HR = 1;
const ORIGIN_SWAP = 2;

const ShiftChangeModal = ({
  show,
  employee,
  from: fromProp,
  to: toProp,
  editableRange = false,
  readOnly = false,
  onHide,
  onSaved,
}) => {
  const {
    shifts,
    loading: optionsLoading,
    error: optionsError,
    reload: reloadOptions,
  } = useSchedulingOptions(show && !readOnly);

  const [rangeFrom, setRangeFrom] = useState(fromProp);
  const [rangeTo, setRangeTo] = useState(toProp);

  const [changes, setChanges] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState(null);
  const [shiftId, setShiftId] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  const employeeId = employee?.id;

  // With `editableRange` the dates are the HR user's to pick (checked like the
  // calendar's click: one person, at most 31 days); otherwise the caller's.
  const range = editableRange
    ? rangeFrom && rangeTo
      ? rangeBetween(
          { employeeId, date: rangeFrom },
          { employeeId, date: rangeTo }
        )
      : { error: "اختر تاريخ البداية والنهاية." }
    : { from: fromProp, to: toProp };
  const rangeError = range.error || null;
  const from = range.from ?? fromProp;
  const to = range.to ?? toProp;

  const loadChanges = useCallback(async () => {
    if (!employeeId || !from || !to) return;
    setLoadingList(true);
    setListError(null);
    try {
      const response = await api.get(`/hr/employees/${employeeId}/shift-changes`, {
        params: { from, to },
      });
      const data = response.data?.data;
      setChanges(Array.isArray(data) ? data : data?.shift_changes || []);
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.status === 0) toastNotify(parsed.message, "error");
      else setListError(parsed.message);
    } finally {
      setLoadingList(false);
    }
  }, [employeeId, from, to]);

  useEffect(() => {
    if (show) {
      setErrors({});
      setMessage(null);
      loadChanges();
    }
  }, [show, loadChanges]);

  // Reset the form only when the modal opens, not when the range moves.
  useEffect(() => {
    if (show) {
      setShiftId("");
      setReason("");
      setRangeFrom(fromProp);
      setRangeTo(toProp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const isDirty = shiftId !== "" || reason !== "";

  const handleCancel = async () => {
    if (saving) return;
    if (!isDirty) {
      onHide();
      return;
    }
    if (await confirmDiscardChanges()) onHide();
  };

  const handleRemove = async (change) => {
    const confirmed = await confirmDestructive({
      action: "إزالة التعديل",
      subject: change.date,
      text: "يعود الموظف إلى جدوله في هذا اليوم.",
      confirmButtonText: "إزالة",
    });
    if (!confirmed) return;
    setMessage(null);
    try {
      const response = await api.delete(
        `/hr/employees/${employeeId}/shift-changes/${change.id}`
      );
      toastNotify(response.data.message, "success");
      await loadChanges();
      onSaved?.();
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.status === 0 || parsed.status === 403 || parsed.status === 404) {
        toastNotify(parsed.message, "error");
      } else {
        setMessage(parsed.message);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || shiftId === "" || rangeError) return;

    setSaving(true);
    setErrors({});
    setMessage(null);
    try {
      const body = toShiftChangeBody({ from, to, shiftId, reason });
      const response = await api.post(`/hr/employees/${employeeId}/shift-changes`, body);
      toastNotify(response.data.message, "success");
      setShiftId("");
      setReason("");
      await loadChanges();
      onSaved?.();
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.status === 0) {
        toastNotify(parsed.message, "error");
      } else {
        setMessage(parsed.message);
        setErrors(parsed.errors || {});
      }
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (field) => errors?.[field]?.[0];
  const errorLine = (field) =>
    fieldError(field) && <div className="text-danger small mt-1">{fieldError(field)}</div>;

  const rangeLabel = from === to ? from : `${from} – ${to}`;

  return (
    <Modal
      show={show}
      onHide={handleCancel}
      keyboard={false}
      centered
      backdrop="static"
      scrollable
    >
      <Modal.Header closeButton>
        <Modal.Title as="h6">
          تعديل الوردية: {employee?.full_name}
          {!editableRange && ` (${rangeLabel})`}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex flex-column gap-3">
          {message && (
            <Alert variant="danger" className="mb-0 py-2 px-3">
              {message}
            </Alert>
          )}

          {listError ? (
            <Alert variant="danger" className="mb-0 py-2 px-3">
              {listError}
            </Alert>
          ) : loadingList && changes.length === 0 ? (
            <div className="text-center py-2">
              <Spinner animation="border" size="sm" />
            </div>
          ) : (
            changes.length > 0 && (
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>التاريخ</th>
                      <th>الوردية</th>
                      <th>المصدر</th>
                      <th>السبب</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {changes.map((change) => (
                      <tr key={change.id}>
                        <td dir="ltr">{change.date}</td>
                        <td>{change.shift?.name || "راحة"}</td>
                        <td>{change.origin_label}</td>
                        <td>{change.reason}</td>
                        <td className="text-nowrap">
                          {change.origin === ORIGIN_SWAP && change.shift_swap_id ? (
                            <Link to={`/scheduling/swaps?swap=${change.shift_swap_id}`}>
                              عرض التبديل
                            </Link>
                          ) : (
                            change.origin === ORIGIN_HR &&
                            !readOnly && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleRemove(change)}
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
            )
          )}

          {!readOnly && (
            <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
              {optionsError && (
                <Alert
                  variant="danger"
                  className="mb-0 py-2 px-3 d-flex align-items-center justify-content-between"
                >
                  <span>{typeof optionsError === "string" ? optionsError : "تعذّر تحميل الورديات."}</span>
                  <button type="button" className="btn btn-sm btn-light" onClick={reloadOptions}>
                    إعادة المحاولة
                  </button>
                </Alert>
              )}
              {editableRange && (
                <Row className="g-3">
                  <Col sm={12} md={6}>
                    <Form.Label htmlFor="sc-from">من</Form.Label>
                    <Form.Control
                      id="sc-from"
                      type="date"
                      dir="ltr"
                      value={rangeFrom}
                      onChange={(e) => setRangeFrom(e.target.value)}
                    />
                  </Col>
                  <Col sm={12} md={6}>
                    <Form.Label htmlFor="sc-to">إلى</Form.Label>
                    <Form.Control
                      id="sc-to"
                      type="date"
                      dir="ltr"
                      value={rangeTo}
                      onChange={(e) => setRangeTo(e.target.value)}
                    />
                  </Col>
                  {rangeError && (
                    <Col xs={12}>
                      <div className="text-danger small">{rangeError}</div>
                    </Col>
                  )}
                </Row>
              )}
              {from && isPastDate(from) && (
                <Alert variant="warning" className="mb-0 py-2 px-3">
                  {PAST_NOTE}
                </Alert>
              )}
              <Row className="g-3">
                <Col xs={12}>
                  <Form.Label htmlFor="sc-shift">الوردية</Form.Label>
                  <Form.Select
                    id="sc-shift"
                    value={shiftId}
                    onChange={(e) => {
                      setShiftId(e.target.value);
                      setErrors((prev) => ({ ...prev, shift_id: null }));
                    }}
                    isInvalid={!!fieldError("shift_id")}
                    disabled={optionsLoading}
                  >
                    <option value="">اختر الوردية…</option>
                    <option value="off">يوم راحة</option>
                    {shifts.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                  {errorLine("shift_id")}
                </Col>
                <Col xs={12}>
                  <Form.Label htmlFor="sc-reason">السبب *</Form.Label>
                  <Form.Control
                    id="sc-reason"
                    as="textarea"
                    rows={2}
                    maxLength={500}
                    value={reason}
                    onChange={(e) => {
                      setReason(e.target.value);
                      setErrors((prev) => ({ ...prev, reason: null }));
                    }}
                    isInvalid={!!fieldError("reason")}
                    required
                  />
                  {errorLine("reason")}
                </Col>
              </Row>
              <Row className="g-2">
                <Col sm={12} md={6}>
                  <button
                    className="btn btn-secondary fw-md w-100"
                    type="submit"
                    disabled={
                      saving ||
                      shiftId === "" ||
                      !reason.trim() ||
                      !!rangeError ||
                      !!optionsError
                    }
                  >
                    {saving ? <Spinner animation="border" size="sm" /> : "حفظ التعديل"}
                  </button>
                </Col>
                <Col sm={12} md={6}>
                  <button
                    type="button"
                    className="btn btn-light fw-md w-100"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    إلغاء
                  </button>
                </Col>
              </Row>
            </form>
          )}

          {readOnly && (
            <button type="button" className="btn btn-light fw-md" onClick={onHide}>
              إغلاق
            </button>
          )}
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default ShiftChangeModal;
