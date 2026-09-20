import React from "react";
import { Link } from "react-router-dom";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { auditableRoute } from "../../data/auditEvents";
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

const AuditDiff = ({ detail }) => {
  // ABSENT ≠ NULL, and here the difference is a permission.
  //
  // `old_values` / `new_values` are omitted entirely for a caller without
  // auth.audit.viewValues, while `created` legitimately sends old_values: null.
  // Checking truthiness would conflate the two and show a reader with no
  // permission an empty table that reads as "nothing changed".
  const canSeeValues =
    hasKey(detail, "old_values") || hasKey(detail, "new_values");

  if (!canSeeValues) {
    return (
      <div className="border rounded p-3 text-center">
        <i className="ri-lock-line fs-4 text-muted" aria-hidden="true"></i>
        <p className="mb-0 mt-2">
          تفاصيل القيم غير متاحة بصلاحياتك الحالية.
        </p>
        <span className="text-muted fs-12">
          يتطلب عرض القيم السابقة والجديدة صلاحية «عرض تفاصيل التغييرات»
          (auth.audit.viewValues).
        </span>
      </div>
    );
  }

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
