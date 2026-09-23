import React from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { auditableRoute, valuesPermissionsFor } from "../../data/auditEvents";
import { hasPermission, permissionLabel } from "../../data/permissionsCatalog";
import {
  diffKeys,
  enumLabelFor,
  foreignKeyType,
  hasKey,
  valueKind,
} from "./auditFormat";

// The before/after of one audited row, as a THREE-COLUMN TABLE:
//   الحقل · القيمة السابقة · القيمة الجديدة
//
// Deliberately not a text diff, and deliberately no diffing library. These are
// structured field values, not prose: a character-level diff of "3" against "7"
// tells the reader nothing that the two numbers side by side do not, and a
// word-diff of an Arabic name renders as noise.
//
// Unchanged keys never appear. The backend writes only the keys that changed,
// so this is mostly free — and nothing here re-adds the rest, because a table
// of forty unchanged fields hides the one that moved.

const KIND_CLASSES = {
  null: "text-muted fst-italic",
  empty: "text-muted fst-italic",
  boolean: "fw-medium",
  scalar: "",
  json: "",
  redacted: "",
};

/**
 * ONE audited value.
 *
 * Four things that are NOT the same and must not look the same:
 *   null          → «فارغ» in muted italic — the field holds nothing
 *   ""            → «نص فارغ» — the field holds an empty string, which is a
 *                    value somebody wrote, not an absence
 *   true / false  → «نعم» / «لا»
 *   object/array  → a formatted JSON block
 * Rendering all four as "—" is a lie about the record, on the screen whose
 * whole purpose is being able to trust what it says.
 */
const Value = ({ field, value }) => {
  const kind = valueKind(value);

  if (kind === "redacted") {
    // "***REDACTED***" IS NOT A VALUE. The backend substitutes it before the
    // row is written, so the real value was never in this table at all.
    // Rendering the literal string as text makes it look like somebody typed
    // it into the field.
    return (
      <OverlayTrigger
        placement="top"
        overlay={
          <Tooltip>
            حُجب هذا الحقل قبل التخزين — القيمة الحقيقية لم تُكتب في سجل
            التدقيق إطلاقاً، ولا يمكن استرجاعها منه.
          </Tooltip>
        }
      >
        <span className="badge bg-dark-transparent">
          <i className="ri-eye-off-line align-middle me-1" aria-hidden="true"></i>
          محجوب
        </span>
      </OverlayTrigger>
    );
  }

  if (kind === "null") return <span className={KIND_CLASSES.null}>فارغ</span>;
  if (kind === "empty")
    return <span className={KIND_CLASSES.empty}>نص فارغ</span>;
  if (kind === "boolean")
    return (
      <span className={KIND_CLASSES.boolean}>{value ? "نعم" : "لا"}</span>
    );

  if (kind === "json") {
    // Rendered as TEXT inside a <pre>, never parsed into markup and never
    // evaluated. An audit value is verbatim user input replayed later.
    return (
      <pre
        className="mb-0 p-2 bg-light rounded fs-11 text-break"
        dir="ltr"
        style={{ maxHeight: "12rem", overflow: "auto", whiteSpace: "pre-wrap" }}
      >
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  // A RAW FK ID stays the id the row actually holds — resolving it would mean
  // a request per value for decoration, and the audit row is a record of what
  // was written, not of what it currently points at. It is not left dangling
  // either: where the column names a type with a screen, the id links to it.
  const fkType = foreignKeyType(field);
  const route = fkType ? auditableRoute(fkType, value) : null;
  if (route) {
    return (
      <Link to={`${import.meta.env.BASE_URL}${route}`}>
        <bdi dir="ltr">{String(value)}</bdi>
      </Link>
    );
  }

  // A RAW ENUM INT. See enumLabelFor: this is the one sanctioned local-label
  // lookup in the app, and its condition is that the raw value stays visible —
  // `نشط (1)`, never `نشط`. A stale map then degrades into a redundant label
  // instead of into a confident wrong answer.
  const enumLabel = enumLabelFor(field, value);
  if (enumLabel) {
    return (
      <span>
        {enumLabel} <span className="text-muted">({String(value)})</span>
      </span>
    );
  }

  return <bdi>{String(value)}</bdi>;
};

// A key present on one side only. It is NOT the same as a null on that side:
// null says "the field was empty", absence says "this side of the record does
// not carry the field at all".
const Absent = () => (
  <span className="text-muted fs-12">
    <i className="ri-subtract-line align-middle me-1" aria-hidden="true"></i>
    غير وارد
  </span>
);

/**
 * WHY the values are locked, in the reader's own terms.
 *
 * Since 2026-09-20 the blobs need more than one grant (API doc §9.2):
 * `auth.audit.viewValues` on every row, AND the view permission of the module
 * the row is about — an audit row is a copy of someone else's record. A row
 * with NO target needs only the first. Since 2026-09-23 an `employee` row also
 * needs `hr.employees.viewSalary`, so the module side is a LIST, all required.
 *
 * ⚠️ THE ANSWER IS PER ROW, NOT PER SESSION. The same signed-in user gets the
 * values on a login row and not on the employee row beneath it, so this is
 * computed from the row in hand every time and nothing is remembered.
 *
 * The server has already decided — its answer is the absent keys. This only
 * works out WHICH of the two to name, and it says nothing it cannot support:
 * where the permission list and the payload disagree, or the target type is
 * one this build has not been taught, it states both requirements rather than
 * accusing the reader of lacking a particular one.
 */
const LockedValues = ({ detail }) => {
  const { permissions } = useSelector((state) => state.auth);

  // §9.4: a NULL type with an id is an unresolvable target, not "no target" —
  // the id is what says a target exists, so that is what is tested.
  const hasTarget = detail?.auditable_id != null;
  const modulePermissions = hasTarget
    ? valuesPermissionsFor(detail?.auditable_type)
    : null;

  const holdsViewValues = hasPermission(permissions, "auth.audit.viewValues");
  // Only the ones actually missing: an HR editor with hr.employees.view but no
  // viewSalary must be told about viewSalary, not about both.
  const missingModule = (modulePermissions || []).filter(
    (name) => !hasPermission(permissions, name)
  );
  const lacksModule = missingModule.length > 0;
  const named = (list) =>
    list.map((name) => `«${permissionLabel(name)}» (${name})`).join(" و");

  return (
    <div className="border rounded p-3 text-center">
      <i className="ri-lock-line fs-4 text-muted" aria-hidden="true"></i>
      <p className="mb-0 mt-2">تفاصيل القيم غير متاحة بصلاحياتك الحالية.</p>

      {!hasTarget ? (
        // No target, so there is no second permission and the original wording
        // is still exactly right.
        <span className="text-muted fs-12">
          يتطلب عرض القيم السابقة والجديدة صلاحية «عرض تفاصيل التغييرات»
          (auth.audit.viewValues).
        </span>
      ) : holdsViewValues && lacksModule ? (
        // THE CASE THIS BRANCH WAS REWRITTEN FOR. Telling someone who already
        // holds viewValues to go and obtain viewValues is the worst possible
        // copy on the one screen whose job is saying truthfully who can see
        // what. Name the grant they are actually missing.
        <span className="text-muted fs-12">
          لديك «عرض تفاصيل التغييرات»، لكن قيم هذا السجل تتطلب أيضاً{" "}
          {missingModule.length > 1 ? "صلاحيتي" : "صلاحية"}{" "}
          {named(missingModule)} — سجل التدقيق يحتفظ بنسخة من السجل نفسه،
          والاطّلاع عليه اطّلاع على بياناته.
        </span>
      ) : (
        // Either viewValues is missing too, or we cannot tell which one is:
        // an unrecognised target type has no permission to name, and a stale
        // permission list must not turn into a confident accusation. State
        // both requirements instead.
        <span className="text-muted fs-12">
          تتطلب قيم سجل يخص سجلاً آخر: «عرض تفاصيل التغييرات»
          (auth.audit.viewValues)، وصلاحية عرض الوحدة التي يخصها السجل
          {modulePermissions ? ` ${named(modulePermissions)}` : ""}
          .
        </span>
      )}
    </div>
  );
};

const AuditDiff = ({ detail }) => {
  // ABSENT ≠ NULL, and here the difference is a permission.
  //
  // `old_values` / `new_values` are omitted entirely for a caller who may not
  // read them, while `created` legitimately sends old_values: null. Checking
  // truthiness would conflate the two and show a reader with no permission an
  // empty table that reads as "nothing changed".
  //
  // This stays the ONLY test of whether the values are readable: it asks the
  // payload, per row, which is the server's own answer. The permission
  // catalogue is consulted afterwards for wording alone — never to decide.
  const canSeeValues =
    hasKey(detail, "old_values") || hasKey(detail, "new_values");

  if (!canSeeValues) return <LockedValues detail={detail} />;

  const oldValues = detail.old_values;
  const newValues = detail.new_values;
  const keys = diffKeys(oldValues, newValues);

  // `created` carries old_values: null — there IS no previous state, so the
  // panel says so and shows the new values alone rather than a column of
  // "فارغ" implying every field was emptied into existence.
  const isCreation = oldValues == null && newValues != null;
  // `deleted` carries new_values: null — what is shown is the last known state
  // of the record before it went.
  const isDeletion = newValues == null && oldValues != null;
  // Which single side to render, or null for a normal before/after diff.
  const singleSide = isCreation ? "new" : isDeletion ? "old" : null;

  if (keys.length === 0) {
    return (
      <div className="border rounded p-3 text-center text-muted">
        لا توجد قيم مسجّلة لهذا الحدث.
      </div>
    );
  }

  return (
    <div>
      {isCreation && (
        <p className="mb-2">
          <span className="badge bg-success-transparent">سجل جديد</span>{" "}
          <span className="text-muted fs-12">
            لا توجد حالة سابقة — هذه هي القيم التي أُنشئ بها السجل.
          </span>
        </p>
      )}
      {isDeletion && (
        <p className="mb-2">
          <span className="badge bg-danger-transparent">سجل محذوف</span>{" "}
          <span className="text-muted fs-12">
            آخر حالة معروفة للسجل قبل الحذف.
          </span>
        </p>
      )}

      <div className="table-responsive">
        <table className="table table-sm table-bordered align-middle mb-0">
          <thead>
            <tr>
              <th scope="col" style={{ width: "28%" }}>
                الحقل
              </th>
              {/* ONE side only when there is only one side. A creation has no
                  previous state and a deletion has no next one, so the missing
                  column is dropped rather than filled with a stripe of "غير
                  وارد" that reads as data. */}
              {singleSide ? (
                <th scope="col">
                  {isCreation ? "القيمة" : "آخر قيمة معروفة"}
                </th>
              ) : (
                <>
                  <th scope="col">القيمة السابقة</th>
                  <th scope="col">القيمة الجديدة</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {keys.map((field) => {
              const inOld = hasKey(oldValues, field);
              const inNew = hasKey(newValues, field);
              return (
                <tr key={field}>
                  <th scope="row" className="fw-medium">
                    {/* The server's own column name, shown as it is. There is
                        no Arabic label for a payload key and inventing one
                        would misdescribe the field. */}
                    <bdi dir="ltr">{field}</bdi>
                  </th>
                  {singleSide ? (
                    <td>
                      <Value
                        field={field}
                        value={
                          singleSide === "new"
                            ? newValues[field]
                            : oldValues[field]
                        }
                      />
                    </td>
                  ) : (
                    <>
                      <td>
                        {inOld ? (
                          <Value field={field} value={oldValues[field]} />
                        ) : (
                          <Absent />
                        )}
                      </td>
                      <td>
                        {inNew ? (
                          <Value field={field} value={newValues[field]} />
                        ) : (
                          <Absent />
                        )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditDiff;
