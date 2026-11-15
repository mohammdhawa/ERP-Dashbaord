import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, Col, Row } from "react-bootstrap";
import { useParams } from "react-router-dom";
import { PageHeader } from "../../components";
import StatePanel from "../../components/StatePanel";
import api from "../../redux/api";
import { parseApiError } from "../../utils/apiHelpers";
import { toastNotify } from "../../utils";
import { formatAbsolute } from "../system/auditFormat";
import ApprovalChain from "./ApprovalChain";
import DecisionModal from "./DecisionModal";
import ReassignModal from "./ReassignModal";
import { reassignableSteps, refreshAfterRefusal } from "./approvalView";

// طلب للاعتماد — the general approval screen (API doc §15.3–15.5): any
// approval by its own id, today a guard's duty exchange. The approver decides
// or reassigns here; the requester's withdrawal is NOT offered (spec §7.2: the
// guard withdraws an exchange in the app, /api/me/shift-swaps/{swap}/cancel).
//
// Same live-state rule as the leave screen: the approval's can_* flags are the
// server's answer for THIS viewer NOW, so every action redraws from the
// approval it returns and any refusal re-reads. State is local.

// approval.status: 1 pending · 2 approved · 3 rejected · 4 cancelled.
const STATUS_BADGE = {
  1: "bg-warning-transparent",
  2: "bg-success-transparent",
  3: "bg-danger-transparent",
  4: "bg-secondary-transparent",
};

const dash = <span className="text-muted">—</span>;

const Field = ({ label, children }) => (
  <Col sm={12} md={6} lg={4}>
    <div className="text-muted fs-12 mb-1">{label}</div>
    <div>{children}</div>
  </Col>
);

const ApprovalRequest = () => {
  const { id } = useParams();

  const [approval, setApproval] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // { message, status }
  const [decision, setDecision] = useState(null); // "approve" | "reject" | null
  const [reassigning, setReassigning] = useState(false);

  // Only the latest read may write state.
  const requestSeq = useRef(0);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      const seq = ++requestSeq.current;
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const response = await api.get(`/approvals/${id}`);
        if (seq !== requestSeq.current) return;
        setApproval(response.data.data);
        setError(null);
      } catch (err) {
        if (seq !== requestSeq.current) return;
        const parsed = parseApiError(err);
        if (silent && !refreshAfterRefusal(parsed.status)) {
          toastNotify(parsed.message, "error");
        } else {
          setApproval(null);
          setError({ message: parsed.message, status: parsed.status });
        }
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    setApproval(null);
    setDecision(null);
    setReassigning(false);
    load();
    return () => {
      requestSeq.current += 1;
    };
  }, [load]);

  const reload = useCallback(() => load({ silent: true }), [load]);

  // The action's response is the approval, fresh from the server.
  const applyApproval = useCallback((next) => {
    if (!next) return;
    requestSeq.current += 1;
    setApproval(next);
  }, []);

  const handleFailure = (err) => {
    const parsed = parseApiError(err);
    toastNotify(parsed.message, "error");
    if (refreshAfterRefusal(parsed.status)) reload();
    return parsed;
  };

  const reassignable = reassignableSteps(approval);
  const canAct = Boolean(approval?.can_act);
  const canReassign = reassignable.length > 0;

  const decide = async (mode, note) => {
    // The step this click was made on, not whatever a reload brings in later.
    const { id: approvalId, current_step_id: stepId } = approval;
    try {
      const response = await api.post(
        `/approvals/${approvalId}/steps/${stepId}/${mode}`,
        note ? { note } : {}
      );
      applyApproval(response.data.data);
      toastNotify(response.data.message, "success");
      setDecision(null);
    } catch (err) {
      // The modal stays open to retry or cancel; if the decision is no longer
      // theirs, the re-read removes can_act and it closes itself.
      throw handleFailure(err);
    }
  };

  const reassign = async ({ stepId, employee_id, reason }) => {
    try {
      const response = await api.patch(
        `/approvals/${approval.id}/steps/${stepId}/assignee`,
        { employee_id, reason }
      );
      applyApproval(response.data.data);
      toastNotify(response.data.message, "success");
      setReassigning(false);
    } catch (err) {
      throw handleFailure(err);
    }
  };

  // A 403 and a 404 are final: retrying cannot change the answer.
  const canRetry = error && error.status !== 403 && error.status !== 404;
  const requester = approval?.requester;

  return (
    <Fragment>
      <Helmet>
        <title>الراقي ERP | طلب للاعتماد</title>
      </Helmet>
      <PageHeader
        homepage="طلب للاعتماد"
        activepage="الاعتمادات"
        homepage_link={`${import.meta.env.BASE_URL}approvals`}
        page="طلب للاعتماد"
      />

      <StatePanel
        loading={loading}
        error={error?.message}
        onRetry={canRetry ? () => load() : undefined}
      >
        {approval && (
          <Fragment>
            <Row>
              <Col xl={12}>
                <Card className="custom-card">
                  <Card.Body className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <div>
                      <h5 className="fw-semibold mb-1">
                        {approval.subject?.title || dash}
                      </h5>
                      {approval.subject?.summary && (
                        <div className="text-muted">
                          {approval.subject.summary}
                        </div>
                      )}
                    </div>
                    <span
                      className={`badge ${
                        STATUS_BADGE[approval.status] || "bg-light text-muted"
                      }`}
                    >
                      {approval.status_label}
                    </span>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {(canAct || canReassign) && (
              <Row>
                <Col xl={12}>
                  <Card className="custom-card">
                    <Card.Body className="d-flex flex-wrap gap-2">
                      {canAct && (
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
                      {canReassign && (
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
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}

            <Row>
              <Col xl={12}>
                <Card className="custom-card">
                  <Card.Header>
                    <div className="card-title">تفاصيل الطلب</div>
                  </Card.Header>
                  <Card.Body>
                    <Row className="g-3">
                      <Field label="مقدّم الطلب">
                        <div>{requester?.full_name || dash}</div>
                        {requester?.employee_number && (
                          <div className="text-muted fs-12">
                            <span dir="ltr">{requester.employee_number}</span>
                          </div>
                        )}
                      </Field>
                      <Field label="تاريخ التقديم">
                        {approval.submitted_at ? (
                          <span dir="ltr">
                            {formatAbsolute(approval.submitted_at)}
                          </span>
                        ) : (
                          dash
                        )}
                      </Field>
                      <Field label="الحالة">{approval.status_label}</Field>
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
                    <ApprovalChain approval={approval} />
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
        show={Boolean(decision) && canAct}
        mode={decision || "approve"}
        onHide={() => setDecision(null)}
        onSubmit={(note) => decide(decision, note)}
      />
      <ReassignModal
        show={reassigning && canReassign}
        steps={reassignable}
        onHide={() => setReassigning(false)}
        onSubmit={reassign}
      />
    </Fragment>
  );
};

export default ApprovalRequest;
