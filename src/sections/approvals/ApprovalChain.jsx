import React from "react";
import { skipNote, stagesOf } from "./approvalView";
import { formatAbsolute } from "../system/auditFormat";

// The approval chain of one request (API doc §15.1), drawn from the approval
// object the server just returned — never from a cached copy. Steps are grouped
// into stages; steps sharing a step_order run in parallel, so they sit side by
// side under one stage heading. Every word on a step is the server's own label.

// step.status: 1 pending · 2 approved · 3 rejected · 4 not requested.
const STEP_BADGE = {
  1: "bg-warning-transparent",
  2: "bg-success-transparent",
  3: "bg-danger-transparent",
  4: "bg-light text-muted",
};

const dash = <span className="text-muted">—</span>;

const Step = ({ step }) => (
  <div
    className={`border rounded-2 p-3 h-100 ${
      step.is_current ? "border-warning bg-warning-transparent" : ""
    }`}
    // The highlight is colour; this carries it for screen readers.
    aria-current={step.is_current ? "step" : undefined}
  >
    <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
      <span className="fw-semibold">{step.resolver_label || dash}</span>
      <span className={`badge ${STEP_BADGE[step.status] || "bg-light text-muted"}`}>
        {step.status_label}
      </span>
    </div>
    <div className="fs-13">
      <span className="text-muted">المعتمِد: </span>
      {step.approver?.full_name || dash}
      {step.approver?.employee_number && (
        <small className="text-muted ms-2" dir="ltr">
          {step.approver.employee_number}
        </small>
      )}
    </div>
    {step.skip_reason_label && (
      <div className="fs-13 text-muted mt-1">{step.skip_reason_label}</div>
    )}
    {skipNote(step) && (
      <div className="fs-12 text-muted mt-1">{skipNote(step)}</div>
    )}
    {step.acted_by && (
      <div className="fs-13 mt-1">
        <span className="text-muted">بقرار من: </span>
        {step.acted_by.name}
        {step.acted_at && (
          <span className="text-muted ms-2" dir="ltr">
            {formatAbsolute(step.acted_at)}
          </span>
        )}
      </div>
    )}
    {step.note && (
      <div className="fs-13 mt-2 p-2 bg-light rounded-2" style={{ whiteSpace: "pre-wrap" }}>
        {step.note}
      </div>
    )}
  </div>
);

const Reassignments = ({ reassignments }) => (
  <div className="mt-4">
    <h6 className="fw-semibold fs-14 mb-2">سجلّ إعادة الإسناد</h6>
    <ul className="list-unstyled mb-0">
      {reassignments.map((r) => (
        <li key={r.id} className="border-bottom py-2 fs-13">
          <div>
            المرحلة {r.step_order}: من{" "}
            <strong>{r.from?.full_name || dash}</strong> إلى{" "}
            <strong>{r.to?.full_name || dash}</strong>
          </div>
          <div className="text-muted">
            {r.performed_by?.name}
            {r.created_at && (
              <span className="ms-2" dir="ltr">
                {formatAbsolute(r.created_at)}
              </span>
            )}
          </div>
          {r.reason && <div>{r.reason}</div>}
        </li>
      ))}
    </ul>
  </div>
);

// `approval` is null for an HR excuse: it never went through a chain, and
// `createdBy` (the account that recorded it) is the only trail it has.
const ApprovalChain = ({ approval, createdBy }) => {
  if (!approval) {
    return (
      <div className="text-muted">
        عذر سجّلته الموارد البشرية — بلا مسار اعتماد
        {createdBy?.name && <span> ({createdBy.name})</span>}
      </div>
    );
  }

  const stages = stagesOf(approval.steps);

  return (
    <div>
      <div className="mb-3">
        <span className="text-muted">حالة الاعتماد: </span>
        <span className="fw-semibold">{approval.status_label}</span>
      </div>

      {stages.length === 0 ? (
        <div className="text-muted">لا توجد خطوات اعتماد.</div>
      ) : (
        <ol className="list-unstyled mb-0 d-flex flex-column gap-3">
          {stages.map((stage) => (
            <li key={stage.order}>
              <div className="fs-12 text-muted mb-1">المرحلة {stage.order}</div>
              <div className="row g-2">
                {stage.steps.map((step) => (
                  <div
                    key={step.id}
                    className={stage.steps.length > 1 ? "col-md-6" : "col-12"}
                  >
                    <Step step={step} />
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}

      {approval.reassignments?.length > 0 && (
        <Reassignments reassignments={approval.reassignments} />
      )}
    </div>
  );
};

export default ApprovalChain;
