import { useEffect, useState } from "react";
import { Alert, Form, Modal } from "react-bootstrap";
import { useSelector } from "react-redux";
import { hasPermission } from "../../data/permissionsCatalog";
import api from "../../redux/api";
import { parseApiError } from "../../utils/apiHelpers";
import { confirmDestructive, toastNotify } from "../../utils";
import { formatAbsolute } from "../system/auditFormat";
import { STATUS_CANCELLED_BY_HR, canCancelSwap } from "./swapView";

// تفاصيل التبديل — one exchange with both duties, and HR's cancel of an
// approved one (API doc §19.8). A refusal (422) stays in the open modal; a
// success reloads the list through onCancelled.

const dash = <span className="text-muted">—</span>;
const ltr = (value) => (value ? <span dir="ltr">{formatAbsolute(value)}</span> : dash);

const DutyCard = ({ title, name, duty }) => (
  <div className="border rounded p-3 h-100">
    <div className="fw-semibold">{title}</div>
    <div className="mb-2">{name || dash}</div>
    <div dir="ltr" className="text-end">
      {duty?.date || "—"}
    </div>
    {duty?.starts_at && (
      <div className="text-muted fs-12">
        <span dir="ltr">
          {formatAbsolute(duty.starts_at)} – {formatAbsolute(duty.ends_at)}
        </span>
      </div>
    )}
    {Array.isArray(duty?.shifts) && duty.shifts.length > 0 && (
      <ul className="list-unstyled mb-0 mt-2">
        {duty.shifts.map((shift, i) => (
          <li key={`${shift.code}-${i}`} className="fs-13">
            {shift.name}
            <span className="text-muted ms-1" dir="ltr">
              ({formatAbsolute(shift.starts_at)} – {formatAbsolute(shift.ends_at)})
            </span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const SwapDetailModal = ({ swap, show, onHide, onCancelled }) => {
  const { permissions } = useSelector((state) => state.auth);
  const canManage = hasPermission(permissions, "scheduling.manage");

  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState(null);
  const [fieldError, setFieldError] = useState(null);
  const [saving, setSaving] = useState(false);

  const swapId = swap?.id;
  useEffect(() => {
    setCancelling(false);
    setReason("");
    setMessage(null);
    setFieldError(null);
    setSaving(false);
  }, [swapId, show]);

  const handleHide = () => {
    if (!saving) onHide();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      setFieldError("سبب الإلغاء مطلوب.");
      return;
    }
    const confirmed = await confirmDestructive({
      action: "إلغاء التبديل",
      subject: `${swap.requester?.name} ↔ ${swap.partner?.name}`,
      text: "يعود الموظفان إلى جدوليهما ويُبلَّغان بالإلغاء.",
      confirmButtonText: "إلغاء التبديل",
    });
    if (!confirmed) return;

    setSaving(true);
    setMessage(null);
    setFieldError(null);
    try {
      const response = await api.post(`/scheduling/swaps/${swap.id}/cancel`, {
        reason: trimmed,
      });
      toastNotify(response.data.message, "success");
      onCancelled?.();
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.status === 0) {
        toastNotify(parsed.message, "error");
      } else {
        setMessage(parsed.message);
        setFieldError(parsed.errors?.reason?.[0] || null);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!swap) return null;
  const cancellable = canManage && canCancelSwap(swap);

  return (
    <Modal show={show} onHide={handleHide} centered scrollable size="lg">
      <Modal.Header closeButton>
        <Modal.Title as="h6">
          تبديل المناوبة #{swap.id}
          <span className="badge bg-light text-default ms-2">{swap.status_label}</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex flex-column gap-3">
          <div className="row g-3">
            <div className="col-md-6">
              <DutyCard
                title="مناوبة مقدّم الطلب"
                name={swap.requester?.name}
                duty={swap.requester_duty}
              />
            </div>
            <div className="col-md-6">
              <DutyCard
                title="مناوبة الزميل"
                name={swap.partner?.name}
                duty={swap.partner_duty}
              />
            </div>
          </div>

          <dl className="row mb-0">
            <dt className="col-sm-4">السبب</dt>
            <dd className="col-sm-8">{swap.reason || dash}</dd>
            <dt className="col-sm-4">تاريخ التقديم</dt>
            <dd className="col-sm-8">{ltr(swap.created_at)}</dd>
            <dt className="col-sm-4">تاريخ القرار</dt>
            <dd className="col-sm-8">{ltr(swap.decided_at)}</dd>
            {swap.status === STATUS_CANCELLED_BY_HR && (
              <>
                <dt className="col-sm-4">سبب الإلغاء</dt>
                <dd className="col-sm-8">{swap.cancel_reason || dash}</dd>
                <dt className="col-sm-4">تاريخ الإلغاء</dt>
                <dd className="col-sm-8">{ltr(swap.cancelled_at)}</dd>
              </>
            )}
          </dl>

          {cancelling && (
            <form
              onSubmit={handleSubmit}
              id="swap-cancel-form"
              className="d-flex flex-column gap-2"
            >
              {message && (
                <Alert variant="danger" className="mb-0 py-2 px-3">
                  {message}
                </Alert>
              )}
              <Form.Label htmlFor="swap-cancel-reason" className="mb-0">
                سبب الإلغاء *
              </Form.Label>
              <Form.Control
                id="swap-cancel-reason"
                as="textarea"
                rows={2}
                maxLength={500}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setFieldError(null);
                }}
                isInvalid={!!fieldError}
                disabled={saving}
              />
              {fieldError && <div className="text-danger small">{fieldError}</div>}
            </form>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        {cancellable && !cancelling && (
          <button
            type="button"
            className="btn btn-danger-light btn-wave me-auto"
            onClick={() => setCancelling(true)}
          >
            إلغاء التبديل
          </button>
        )}
        {cancelling && (
          <button
            type="submit"
            form="swap-cancel-form"
            className="btn btn-danger btn-wave me-auto"
            disabled={saving}
          >
            {saving ? "جارٍ الإلغاء..." : "تأكيد الإلغاء"}
          </button>
        )}
        <button type="button" className="btn btn-light" onClick={handleHide} disabled={saving}>
          إغلاق
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default SwapDetailModal;
