import React, { useState } from "react";
import { Modal, OverlayTrigger, Tooltip } from "react-bootstrap";
import { useSelector } from "react-redux";
import { MutatingDots } from "react-loader-spinner";
import AuditDiff from "./AuditDiff";
import { ActorCell, EventBadge, TargetCell } from "./auditColumns";
import { formatAbsolute, formatRelativeAr } from "./auditFormat";
import { securityNote } from "../../data/auditEvents";

// One audit row in full — GET /auth/audit-logs/{id}, which adds old_values,
// new_values and user_agent to what the list already carried.
//
// A MODAL, NOT AN OFFCANVAS, and the reason is direction. Bootstrap's offcanvas
// places itself with `start`/`end`, which are resolved against the document's
// writing direction by the stylesheet — and this app compiles its own theme,
// where that mapping would have to be verified and, where it is wrong, patched
// with RTL-specific CSS for a single panel. A centred modal has no directional
// edge to get wrong: it is the same panel in either direction, it is the
// dialog pattern every other detail surface in this dashboard already uses
// (there is no Offcanvas anywhere in the codebase), and `scrollable` keeps a
// long diff inside the dialog body instead of growing the page behind it.

const CopyButton = ({ value, label }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // A blocked clipboard (an insecure origin, a denied permission) is not
      // worth a toast: the value is on screen and selectable either way.
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      className="btn btn-sm btn-light btn-wave"
      onClick={copy}
      aria-label={`نسخ ${label}`}
    >
      <i
        className={`align-middle ${copied ? "ri-check-line" : "ri-file-copy-line"}`}
        aria-hidden="true"
      ></i>
    </button>
  );
};

const MetaRow = ({ label, children }) => (
  <div className="col-12 col-md-6">
    <div className="text-muted fs-11">{label}</div>
    <div className="d-flex align-items-center gap-2">{children}</div>
  </div>
);

const dash = <span className="text-muted">—</span>;

const AuditLogDetail = ({ open, close, onDrilldown }) => {
  const { detail, detailLoading, detailError, detailErrorStatus } = useSelector(
    (state) => state.audit
  );

  const note = detail ? securityNote(detail.event) : null;

  return (
    <Modal show={open} onHide={close} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title as="h6">تفاصيل حدث التدقيق</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {detailLoading ? (
          <div className="d-flex justify-content-center py-5">
            <MutatingDots
              visible
              height="100"
              width="100"
              color="var(--primary-color)"
              secondaryColor="var(--secondary-color)"
              radius="12.5"
              ariaLabel="mutating-dots-loading"
            />
          </div>
        ) : detailError ? (
          <div className="text-center py-4">
            {/* The list behind this panel is untouched: a failed detail fetch
                writes only to detailError. The rows the user was reading are
                still there when they close this. */}
            <p className="text-danger mb-1">{detailError}</p>
            {detailErrorStatus === 403 && (
              <span className="text-muted fs-12">
                عرض هذا السجل يتطلب صلاحية «عرض سجل التدقيق».
              </span>
            )}
          </div>
        ) : !detail ? null : (
          <div className="d-flex flex-column gap-3">
            {/* ── Header: event, when, who, what ─────────────────────────── */}
            <div className="d-flex flex-wrap align-items-start gap-3">
              <EventBadge row={detail} />
              <div>
                <div className="fw-medium">
                  <bdi dir="ltr">{formatAbsolute(detail.created_at)}</bdi>
                </div>
                <span className="text-muted fs-11">
                  {formatRelativeAr(detail.created_at)} · بتوقيت دمشق
                </span>
              </div>
            </div>

            {note && (
              // Louder than a red badge on purpose. A replayed refresh token is
              // either a bug in a client or a stolen credential being used; it
              // is not a row to skim past.
              <div className="alert alert-danger py-2 px-3 mb-0" role="alert">
                <i
                  className="ri-alarm-warning-line align-middle me-1"
                  aria-hidden="true"
                ></i>
                <strong>إشارة أمنية:</strong> {note}
              </div>
            )}

            <div className="row g-3">
              <MetaRow label="المستخدم">
                <ActorCell row={detail} />
              </MetaRow>
              <MetaRow label="السجل المتأثر">
                <TargetCell row={detail} />
              </MetaRow>
            </div>

            {/* ── Metadata ──────────────────────────────────────────────── */}
            <div className="border rounded p-3">
              <div className="row g-3">
                <MetaRow label="عنوان IP">
                  {detail.ip_address ? (
                    <bdi dir="ltr">{detail.ip_address}</bdi>
                  ) : (
                    dash
                  )}
                </MetaRow>

                <MetaRow label="معرّف الطلب">
                  {detail.request_id ? (
                    <>
                      {/* One line, truncated. A request id is a UUID and the
                          panel is narrow; it is here to be COPIED, not read. */}
                      <code
                        className="fs-11 text-truncate"
                        style={{ maxWidth: "12rem" }}
                        title={detail.request_id}
                      >
                        <bdi dir="ltr">{detail.request_id}</bdi>
                      </code>
                      <CopyButton value={detail.request_id} label="معرّف الطلب" />
                    </>
                  ) : (
                    dash
                  )}
                </MetaRow>

                <div className="col-12">
                  <div className="text-muted fs-11">متصفح المستخدم</div>
                  <div className="d-flex align-items-center gap-2">
                    {detail.user_agent ? (
                      <>
                        {/* TRUNCATED TO ONE LINE. A raw user-agent string is
                            120+ characters of unbroken text and will destroy
                            this layout if it is allowed to wrap. Full value in
                            the tooltip, and on the clipboard. */}
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip>
                              <bdi dir="ltr">{detail.user_agent}</bdi>
                            </Tooltip>
                          }
                        >
                          <span
                            className="text-truncate fs-12 d-inline-block"
                            style={{ maxWidth: "min(28rem, 70%)" }}
                          >
                            <bdi dir="ltr">{detail.user_agent}</bdi>
                          </span>
                        </OverlayTrigger>
                        <CopyButton
                          value={detail.user_agent}
                          label="متصفح المستخدم"
                        />
                      </>
                    ) : (
                      dash
                    )}
                  </div>
                </div>

                {detail.description && (
                  <div className="col-12">
                    <div className="text-muted fs-11">الوصف</div>
                    {/* Verbatim, and as plain text. This string is written by
                        the server from user-supplied content; it is never
                        rendered as markup. */}
                    <div className="text-break">{detail.description}</div>
                  </div>
                )}
              </div>
            </div>

            {/* ── The diff ──────────────────────────────────────────────── */}
            <div>
              <h6 className="mb-2">التغييرات</h6>
              <AuditDiff detail={detail} />
            </div>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="justify-content-between flex-wrap gap-2">
        {/* THE CORRELATION DRILL-DOWN. One user action writes the api_request
            row plus one model row per model it touched, and request_id is the
            only thing joining them — this button is why the column is on the
            row at all. Offered only when there is an id to follow. */}
        {/* `onDrilldown` is omitted by the per-record AuditTrail, where
            refiltering by request id would silently swap a record-scoped list
            for a request-scoped one. No handler, no button — never a button
            that does nothing. */}
        {detail?.request_id && onDrilldown ? (
          <button
            type="button"
            className="btn btn-primary-light btn-wave"
            onClick={() => onDrilldown(detail.request_id)}
          >
            <i className="ri-links-line align-middle me-1"></i>
            عرض كل ما جرى في هذه العملية
          </button>
        ) : (
          <span />
        )}
        <button type="button" className="btn btn-light btn-wave" onClick={close}>
          إغلاق
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default AuditLogDetail;
