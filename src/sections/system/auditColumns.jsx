import React from "react";
import { Link } from "react-router-dom";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import {
  auditableRoute,
  auditableTypeLabel,
  eventBadgeClass,
  eventLabel,
  isKnownEvent,
  securityNote,
} from "../../data/auditEvents";
import { formatAbsolute, formatRelativeAr, hasKey } from "./auditFormat";

// The column set shared by the full سجل التدقيق screen and by the per-record
// AuditTrail inside an employee profile. One definition, two mounts: the trail
// drops the target column (it is constant there and the same value repeated
// fifteen times is noise, not information).
//
// ⚠️ EVERY VALUE BELOW IS UNTRUSTED TEXT. An audit row is verbatim user input
// replayed later — a description, a record label, a user agent, a field name
// somebody's payload carried. All of it is rendered as React children, which
// escapes it. There is no dangerouslySetInnerHTML anywhere in this feature and
// no JSON string is ever evaluated into markup.

const dash = <span className="text-muted">—</span>;

const ltr = (value) =>
  value == null || value === "" ? (
    dash
  ) : (
    <bdi dir="ltr">{String(value)}</bdi>
  );

/**
 * التوقيت — the absolute Damascus time the server sent, with the relative
 * reading quieter beneath it.
 *
 * It is also THE KEYBOARD PATH INTO THE ROW. This table passes
 * showActions={false}, so there is no actions column and no eye button;
 * DataTableServer's row click is documented as a mouse-only shortcut that
 * cannot be reached by keyboard. A real <button> in the first cell gives the
 * row one focusable, correctly-named control. DataTableServer skips its own row
 * handler when the click lands on a button, so the two never both fire.
 *
 * IT IS NOT STYLED AS A LINK. `btn-link` painted every timestamp primary-blue
 * and bold, which made the one column that is identical in shape on every row —
 * and the least informative — the loudest thing on the screen, competing with
 * the event badges that carry the actual signal. It keeps the body colour and
 * earns emphasis on hover and focus instead, where it means something. The
 * affordance is not lost: `btn` still gives it a focus ring, and the whole row
 * is clickable anyway.
 */
const TimeCell = ({ row, onOpen }) => {
  const absolute = formatAbsolute(row.created_at);
  const relative = formatRelativeAr(row.created_at);
  return (
    <div>
      <button
        type="button"
        className="audit-time-btn"
        onClick={() => onOpen(row)}
        aria-label={`عرض تفاصيل الحدث بتاريخ ${absolute}`}
      >
        <bdi dir="ltr">{absolute}</bdi>
      </button>
      {relative && (
        <span className="d-block text-muted fs-11">{relative}</span>
      )}
    </div>
  );
};

/**
 * المستخدم — three genuinely different facts, three genuinely different
 * strings. Collapsing them loses the answer to the question an audit log is
 * most often opened with.
 */
export const ActorCell = ({ row }) => {
  // An ABSENT `user` key is not a null one: per the API's embedded-object rule
  // a missing key means "you may not read this", while null means "there is
  // nobody to name". Claiming "مستخدم محذوف" for an absent key would invent a
  // deletion that never happened.
  if (!hasKey(row, "user")) {
    return (
      <span className="text-muted" title="هوية المنفّذ غير مضمّنة في هذا السجل">
        غير متاح
      </span>
    );
  }

  if (row.user) {
    return (
      <div>
        <span className="fw-medium">{row.user.name || `#${row.user.id}`}</span>
        {row.user.email && (
          <span className="d-block text-muted fs-11">
            <bdi dir="ltr">{row.user.email}</bdi>
          </span>
        )}
      </div>
    );
  }

  if (row.actor_type === "system") {
    return (
      <OverlayTrigger
        placement="top"
        overlay={
          <Tooltip>
            إجراء غير صادر عن مستخدم: مهمة مجدولة أو أمر على الطرفية أو تعبئة
            أولية للبيانات.
          </Tooltip>
        }
      >
        <span className="badge bg-secondary-transparent">النظام</span>
      </OverlayTrigger>
    );
  }

  // actor_type "user" with a null user: the account that did this has since
  // been deleted. This is the truth, and it is very often exactly the row the
  // log was opened to find.
  if (row.user_id != null) {
    return (
      <span className="text-warning-emphasis">
        مستخدم محذوف <bdi dir="ltr">#{row.user_id}</bdi>
      </span>
    );
  }

  // Neither a user, nor the system, nor a deleted account — an actor_type this
  // UI has not been taught. Rendered raw rather than guessed at.
  return row.actor_type ? (
    <bdi className="text-muted">{row.actor_type}</bdi>
  ) : (
    dash
  );
};

export const EventBadge = ({ row }) => {
  const note = securityNote(row.event);
  const badge = (
    <span className={`badge ${eventBadgeClass(row.event)}`}>
      {note && <i className="ri-alarm-warning-line me-1" aria-hidden="true"></i>}
      {eventLabel(row)}
    </span>
  );

  return (
    <div className="d-flex flex-column gap-1 align-items-start">
      {note ? (
        <OverlayTrigger placement="top" overlay={<Tooltip>{note}</Tooltip>}>
          {badge}
        </OverlayTrigger>
      ) : (
        badge
      )}
      {/* An event key this build has never heard of is marked as such. The
          label above is then the raw key, and this says why it looks odd
          instead of leaving the reader to assume a rendering bug. */}
      {!isKnownEvent(row.event) && (
        <span className="text-muted fs-11">حدث غير معروف لهذه الواجهة</span>
      )}
    </div>
  );
};

/**
 * السجل المتأثر — the record the event happened to.
 *
 * `auditable` null means the row is gone or unresolvable (soft-deleted, or a
 * model this API no longer exposes). That renders as "{auditable_label}
 * #{auditable_id}" WITHOUT a link: the type and id are still true, and a link
 * to a record that cannot be opened is a dead end dressed as a destination.
 */
export const TargetCell = ({ row }) => {
  const typeLabel = auditableTypeLabel(row);

  if (!row.auditable_type && row.auditable_id == null) return dash;

  if (row.auditable) {
    const route = auditableRoute(row.auditable_type, row.auditable.id);
    const label = row.auditable.label || `#${row.auditable.id}`;
    return (
      <div>
        {route ? (
          <Link
            to={`${import.meta.env.BASE_URL}${route}`}
            // The click must not also trigger the row's own open-detail
            // handler; DataTableServer already skips clicks landing on an <a>.
            className="fw-medium"
          >
            {label}
          </Link>
        ) : (
          <span className="fw-medium">{label}</span>
        )}
        <span className="d-block text-muted fs-11">{typeLabel}</span>
      </div>
    );
  }

  return (
    <div title="السجل غير متاح: محذوف أو غير قابل للعرض">
      <span>
        {typeLabel} <bdi dir="ltr">#{row.auditable_id}</bdi>
      </span>
      <span className="d-block text-muted fs-11">غير متاح</span>
    </div>
  );
};

// التغييرات — the first three changed field names, then a count. The names are
// the server's own column names and are shown as they are: there is no label
// map for them and inventing one would misdescribe a payload key.
const MAX_CHIPS = 3;

export const ChangedFieldsCell = ({ row }) => {
  const fields = Array.isArray(row.changed_fields) ? row.changed_fields : [];
  if (fields.length === 0) return dash;

  const shown = fields.slice(0, MAX_CHIPS);
  const rest = fields.length - shown.length;

  return (
    <span className="d-inline-flex flex-wrap gap-1">
      {shown.map((field) => (
        <span key={field} className="badge bg-light text-muted fs-11">
          <bdi dir="ltr">{String(field)}</bdi>
        </span>
      ))}
      {rest > 0 && (
        <span
          className="badge bg-primary-transparent fs-11"
          title={fields.join("، ")}
        >
          +{rest}
        </span>
      )}
    </span>
  );
};

/**
 * @param {object} options
 * @param {boolean} options.includeTarget  false inside a per-record trail,
 *   where the target is the record you are already looking at.
 * @param {(row: object) => void} options.onOpen  opens the detail panel.
 */
export const buildAuditColumns = ({ includeTarget = true, onOpen }) =>
  [
    {
      key: "created_at",
      // Named in the HEADER, once. A timestamp column with no zone on it is
      // read as local time by everyone who looks at it, and on this screen that
      // silently moves every event by the reader's offset.
      label: "التوقيت (بتوقيت دمشق)",
      nowrap: true,
      render: (_value, row) => <TimeCell row={row} onOpen={onOpen} />,
    },
    { key: "user", label: "المستخدم", render: (_v, row) => <ActorCell row={row} /> },
    { key: "event", label: "الحدث", render: (_v, row) => <EventBadge row={row} /> },
    includeTarget && {
      key: "auditable",
      label: "السجل المتأثر",
      render: (_v, row) => <TargetCell row={row} />,
    },
    {
      key: "changed_fields",
      label: "التغييرات",
      render: (_v, row) => <ChangedFieldsCell row={row} />,
    },
    {
      key: "ip_address",
      label: "عنوان IP",
      nowrap: true,
      render: (value) => ltr(value),
    },
  ].filter(Boolean);
