import React, { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, Col, Row, Spinner } from "react-bootstrap";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { PageHeader } from "../../components";
import StatePanel from "../../components/StatePanel";
import api from "../../redux/api";
import { parseApiError } from "../../utils/apiHelpers";
import { downloadFile } from "../../utils/fileDownload";
import { confirmDestructive, toastNotify } from "../../utils";
import { formatAbsolute } from "../system/auditFormat";
import ApprovalChain from "../approvals/ApprovalChain";
import DecisionModal from "../approvals/DecisionModal";
import ReassignModal from "../approvals/ReassignModal";
import ReturnToWorkModal from "./actions/ReturnToWorkModal";
import UndoExcuseModal from "./actions/UndoExcuseModal";
import {
  cancellationView,
  leaveActions,
  reassignableSteps,
  refreshAfterRefusal,
} from "../approvals/approvalView";

// طلب الإجازة — one screen for the approver, the requester and HR (API doc
// §16.3–16.4): the leave, its files, its approval chain and the actions on it.
//
// LIVE STATE. The approval's can_* flags are the server's answer for THIS
// viewer at THIS moment; a decision can be taken in another tab or by someone
// else. So every action ends by redrawing from the server (the approval in the
// response, then a re-read of the leave), and any refusal re-reads too, so a
// button that no longer works disappears rather than lingering.
//
// State is local, not in Redux: nothing else reads one leave, and it is
// re-read on every visit.

// leave.status: 1 pending · 2 approved · 3 rejected · 4 cancelled.
const STATUS_BADGE = {
  1: "bg-warning-transparent",
  2: "bg-success-transparent",
  3: "bg-danger-transparent",
  4: "bg-secondary-transparent",
};

const dash = <span className="text-muted">—</span>;

const ltrDate = (value) => (value ? <span dir="ltr">{value}</span> : dash);

const ltrTime = (value) =>
  value ? <span dir="ltr">{formatAbsolute(value)}</span> : dash;

const Field = ({ label, children }) => (
  <Col sm={12} md={6} lg={4}>
    <div className="text-muted fs-12 mb-1">{label}</div>
    <div>{children}</div>
  </Col>
);

const LongField = ({ label, children }) => (
  <Col xs={12}>
    <div className="text-muted fs-12 mb-1">{label}</div>
    <div style={{ whiteSpace: "pre-wrap" }}>{children}</div>
  </Col>
);

const formatSize = (bytes) => {
  if (!Number.isFinite(bytes)) return null;
  return bytes >= 1048576
    ? `${(bytes / 1048576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const LeaveRequest = () => {
  const { id } = useParams();
  const { permissions } = useSelector((state) => state.auth);

  const [leave, setLeave] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // { message, status }
  const [busy, setBusy] = useState(false); // withdraw in flight
  const [downloadingId, setDownloadingId] = useState(null);
  const [decision, setDecision] = useState(null); // "approve" | "reject" | null
  const [reassigning, setReassigning] = useState(false);
  const [returning, setReturning] = useState(false); // return-to-work modal
  const [undoing, setUndoing] = useState(false); // undo-excuse modal

  // Only the latest read may write state: a slow read started before an action
  // would otherwise overwrite the fresher answer the action just applied.
  const requestSeq = useRef(0);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      const seq = ++requestSeq.current;
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const response = await api.get(`/leave/requests/${id}`);
        if (seq !== requestSeq.current) return;
        setLeave(response.data.data);
        setError(null);
      } catch (err) {
        if (seq !== requestSeq.current) return;
        const parsed = parseApiError(err);
        // A silent re-read that fails for a transient reason keeps what is on
        // screen; one that says the record is out of reach or gone must not.
        if (silent && !refreshAfterRefusal(parsed.status)) {
          toastNotify(parsed.message, "error");
        } else {
          setLeave(null);
          setError({ message: parsed.message, status: parsed.status });
        }
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    setLeave(null);
    setDecision(null);
    setReassigning(false);
    setReturning(false);
    setUndoing(false);
    load();
    // A pending read for the previous id must not land on the next one.
    return () => {
      requestSeq.current += 1;
    };
  }, [load]);

  const reload = useCallback(() => load({ silent: true }), [load]);

  // Replace the whole leave from an action response (withdraw returns it).
  const applyLeave = useCallback((next) => {
    requestSeq.current += 1;
    setLeave(next);
  }, []);

  // Fold the approval an action returned into the leave, so the buttons and the
  // chain are right before the re-read of the leave catches its status up.
  const mergeApproval = useCallback((approval) => {
    if (!approval) return;
    setLeave((prev) =>
      prev && prev.approval?.id === approval.id ? { ...prev, approval } : prev
    );
  }, []);

  const handleFailure = (err) => {
    const parsed = parseApiError(err);
    toastNotify(parsed.message, "error");
    if (refreshAfterRefusal(parsed.status)) reload();
    return parsed;
  };

  const actions = leaveActions(leave, permissions);
  // A withdrawal reads «مسحوب» with who withdrew it and when (§16.3, C-5).
  const cancellation = cancellationView(leave);
  const approval = leave?.approval ?? null;
  const reassignable = reassignableSteps(approval);

  const decide = async (mode, note) => {
    // Captured now: the step this click was made on, not whatever a reload
    // brings in later.
    const { id: approvalId, current_step_id: stepId } = approval;
    try {
      const response = await api.post(
        `/approvals/${approvalId}/steps/${stepId}/${mode}`,
        note ? { note } : {}
      );
      mergeApproval(response.data.data);
      toastNotify(response.data.message, "success");
      setDecision(null);
      reload();
    } catch (err) {
      // The modal stays open for the user to retry or cancel; if the decision
      // is no longer theirs, the re-read removes can_act and it closes itself.
      throw handleFailure(err);
    }
  };

  const reassign = async ({ stepId, employee_id, reason }) => {
    try {
      const response = await api.patch(
        `/approvals/${approval.id}/steps/${stepId}/assignee`,
        { employee_id, reason }
      );
      mergeApproval(response.data.data);
      toastNotify(response.data.message, "success");
      setReassigning(false);
      reload();
    } catch (err) {
      throw handleFailure(err);
    }
  };

  const withdraw = async () => {
    const confirmed = await confirmDestructive({
      action: "سحب طلب الإجازة",
      subject: leave.leave_type?.name_ar,
      text: "سيُسحب الطلب وتُغلق خطوات اعتماده، ويمكنك تقديم طلب جديد لاحقاً.",
      confirmButtonText: "سحب الطلب",
    });
    if (!confirmed) return;

    setBusy(true);
    try {
      const response = await api.post(`/me/leave-requests/${leave.id}/cancel`);
      applyLeave(response.data.data);
      toastNotify(response.data.message, "success");
    } catch (err) {
      handleFailure(err);
    } finally {
      setBusy(false);
    }
  };

  const download = async (attachment) => {
    setDownloadingId(attachment.id);
    try {
      // The JSON name is the fallback because the backend does not expose
      // Content-Disposition cross-origin.
      await downloadFile(
        `/leave/requests/${leave.id}/attachments/${attachment.id}`,
        attachment.name
      );
    } catch (err) {
      toastNotify(parseApiError(err).message, "error");
    } finally {
      setDownloadingId(null);
    }
  };

  // A 403 (including out_of_scope) and a 404 are final: retrying cannot change
  // the answer, so the panel shows the message alone.
  const canRetry = error && error.status !== 403 && error.status !== 404;

  const hasActions =
    actions.act ||
    actions.reassign ||
    actions.withdraw ||
    actions.returnToWork ||
    actions.undoExcuse;

  // HR's actions answer with the changed leave; take it as the screen's state
  // now, then re-read so the approval and flags are the server's own.
  const afterHrAction = (result) => {
    if (result?.leave_request) applyLeave(result.leave_request);
    reload();
  };

  return (
    <Fragment>
      <Helmet>
        <title>الراقي ERP | طلب إجازة</title>
      </Helmet>
      <PageHeader
        homepage="طلب إجازة"
        activepage="الاعتمادات"
        homepage_link={`${import.meta.env.BASE_URL}approvals`}
        page="طلب إجازة"
      />

      <StatePanel
        loading={loading}
        error={error?.message}
        onRetry={canRetry ? () => load() : undefined}
      >
        {leave && (
          <Fragment>
            <Row>
              <Col xl={12}>
                <Card className="custom-card">
                  <Card.Body className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <div>
                      <h5 className="fw-semibold mb-1">
                        {leave.employee?.full_name || dash}
                        {leave.employee?.employee_number && (
                          <small className="text-muted fs-12 ms-2" dir="ltr">
                            {leave.employee.employee_number}
                          </small>
                        )}
                      </h5>
                      <div className="text-muted">
                        {leave.leave_type?.name_ar || dash}
                      </div>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      <span
                        className={`badge ${
                          STATUS_BADGE[leave.status] || "bg-light text-muted"
                        }`}
                      >
                        {cancellation?.badge ?? leave.status_label}
                      </span>
                      <span className="badge bg-light text-default">
                        {leave.origin_label}
                      </span>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {hasActions && (
              <Row>
                <Col xl={12}>
                  <Card className="custom-card">
                    <Card.Body className="d-flex flex-wrap gap-2">
                      {actions.act && (
                        <>
                          <button
                            type="button"
                            className="btn btn-success"
                            onClick={() => setDecision("approve")}
                          >
                            <i
                              className="ri-check-line align-middle me-1"
                              aria-hidden="true"
                            ></i>
                            موافقة
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => setDecision("reject")}
                          >
                            <i
                              className="ri-close-line align-middle me-1"
                              aria-hidden="true"
                            ></i>
                            رفض
                          </button>
                        </>
                      )}
                      {actions.reassign && (
                        <button
                          type="button"
                          className="btn btn-secondary-light"
                          onClick={() => setReassigning(true)}
                        >
                          <i
                            className="ri-user-shared-line align-middle me-1"
                            aria-hidden="true"
                          ></i>
                          إعادة إسناد
                        </button>
                      )}
                      {actions.withdraw && (
                        <button
                          type="button"
                          className="btn btn-danger-light"
                          onClick={withdraw}
                          disabled={busy}
                        >
                          {busy && (
                            <Spinner
                              animation="border"
                              size="sm"
                              className="me-1"
                            />
                          )}
                          سحب الطلب
                        </button>
                      )}
                      {actions.returnToWork && (
                        <button
                          type="button"
                          className="btn btn-warning-light"
                          onClick={() => setReturning(true)}
                        >
                          <i
                            className="ri-user-follow-line align-middle me-1"
                            aria-hidden="true"
                          ></i>
                          العودة إلى العمل
                        </button>
                      )}
                      {actions.undoExcuse && (
                        <button
                          type="button"
                          className="btn btn-danger-light"
                          onClick={() => setUndoing(true)}
                        >
                          <i
                            className="ri-arrow-go-back-line align-middle me-1"
                            aria-hidden="true"
                          ></i>
                          التراجع عن العذر
                        </button>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}

            <Row>
              <Col xl={12}>
                <Card className="custom-card">
                  <Card.Header>
                    <div className="card-title">تفاصيل الإجازة</div>
                  </Card.Header>
                  <Card.Body>
                    <Row className="g-3">
                      <Field label="من">{ltrDate(leave.start_date)}</Field>
                      <Field label="إلى">{ltrDate(leave.end_date)}</Field>
                      <Field label="عدد الأيام">
                        {leave.requested_days ?? dash}
                      </Field>
                      <LongField label="السبب">{leave.reason || dash}</LongField>

                      {leave.decided_at && (
                        <Field label="تاريخ القرار">
                          {ltrTime(leave.decided_at)}
                        </Field>
                      )}
                      {leave.created_by && (
                        <Field label="سجّلها">{leave.created_by.name}</Field>
                      )}

                      {leave.cancelled_at && (
                        <Field label={cancellation?.atLabel ?? "أُلغيت في"}>
                          {ltrTime(leave.cancelled_at)}
                        </Field>
                      )}
                      {leave.cancelled_by && (
                        <Field label={cancellation?.byLabel ?? "أُلغيت بواسطة"}>
                          {leave.cancelled_by.name}
                        </Field>
                      )}
                      {leave.cancellation_reason && (
                        <LongField label="سبب الإلغاء">
                          {leave.cancellation_reason}
                        </LongField>
                      )}

                      {leave.returned_to_work_on && (
                        <Field label="تاريخ المباشرة">
                          {ltrDate(leave.returned_to_work_on)}
                        </Field>
                      )}
                      {leave.original_end_date && (
                        <Field label="تاريخ النهاية الأصلي">
                          {ltrDate(leave.original_end_date)}
                        </Field>
                      )}
                      {leave.shortened_at && (
                        <Field label="اختُصرت في">
                          {ltrTime(leave.shortened_at)}
                        </Field>
                      )}
                      {leave.shortened_by && (
                        <Field label="اختصرها">{leave.shortened_by.name}</Field>
                      )}
                      {leave.shortening_reason && (
                        <LongField label="سبب الاختصار">
                          {leave.shortening_reason}
                        </LongField>
                      )}

                      <Col xs={12}>
                        <div className="text-muted fs-12 mb-1">المرفقات</div>
                        {leave.attachments?.length > 0 ? (
                          <div className="d-flex flex-wrap gap-2">
                            {leave.attachments.map((attachment) => (
                              <button
                                key={attachment.id}
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                disabled={downloadingId === attachment.id}
                                onClick={() => download(attachment)}
                              >
                                {downloadingId === attachment.id ? (
                                  <Spinner
                                    animation="border"
                                    size="sm"
                                    className="me-1"
                                  />
                                ) : (
                                  <i
                                    className="ri-attachment-2 align-middle me-1"
                                    aria-hidden="true"
                                  ></i>
                                )}
                                {attachment.name}
                                {formatSize(attachment.size) && (
                                  <small className="ms-2 text-muted" dir="ltr">
                                    {formatSize(attachment.size)}
                                  </small>
                                )}
                              </button>
                            ))}
                          </div>
                        ) : (
                          dash
                        )}
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row>
              <Col xl={12}>
                <Card className="custom-card">
                  <Card.Header>
                    <div className="card-title">مسار الاعتماد</div>
                  </Card.Header>
                  <Card.Body>
                    <ApprovalChain
                      approval={approval}
                      createdBy={leave.created_by}
                    />
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Fragment>
        )}
      </StatePanel>

      {/* Shown only while the server still says the action is this viewer's:
          a refusal's re-read drops the flag and the modal goes with it. */}
      <DecisionModal
        show={Boolean(decision) && actions.act}
        mode={decision || "approve"}
        onHide={() => setDecision(null)}
        onSubmit={(note) => decide(decision, note)}
      />
      <ReassignModal
        show={reassigning && actions.reassign}
        steps={reassignable}
        onHide={() => setReassigning(false)}
        onSubmit={reassign}
      />
      {/* Not gated by the action flags: a successful action flips the leave's
          status and drops the flag, and the undo modal still has its result to
          show. Each closes itself through onHide. */}
      <ReturnToWorkModal
        show={returning}
        leave={leave}
        onHide={() => setReturning(false)}
        onDone={afterHrAction}
      />
      <UndoExcuseModal
        show={undoing}
        leave={leave}
        onHide={() => setUndoing(false)}
        onDone={afterHrAction}
      />
    </Fragment>
  );
};

export default LeaveRequest;
