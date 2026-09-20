// Pure display helpers for سجل التدقيق. No React, no `import.meta` — so
// `auditFormat.test.js` runs them under plain `node --test`.
import {
  STATUS_OPTIONS,
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  SALARY_MODE_OPTIONS,
  ACTIVITY_TYPE_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  ENGINEERING_RANK_OPTIONS,
  GOVERNORATE_OPTIONS,
  ASSIGNMENT_REASON_OPTIONS,
  // The extension is required: `npm test` runs this module under plain Node
  // ESM, which does not resolve extensionless specifiers the way Vite does.
} from "../../data/hrEnums.js";

/**
 * The absolute timestamp, RENDERED IN THE OFFSET THE SERVER SENT.
 *
 * `created_at` arrives as an ISO string carrying Asia/Damascus's offset
 * ("2026-09-16T14:03:12+03:00"). It is formatted from that offset and NOT
 * re-zoned into the reader's browser timezone: two people comparing an audit
 * row across a phone call must be reading the same clock, and the column header
 * says "بتوقيت دمشق" precisely because the value is not local time.
 *
 * Parsed by hand rather than through `new Date()` for the same reason — a Date
 * normalises to the machine's zone and the offset is lost on the way out.
 *
 * @returns {{date: string, time: string, offset: string}|null}
 */
export const parseServerTimestamp = (value) => {
  const match = String(value ?? "").match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/
  );
  if (!match) return null;
  const [, y, mo, d, h, mi, s, zone] = match;
  return {
    date: `${y}-${mo}-${d}`,
    time: `${h}:${mi}:${s || "00"}`,
    offset: zone === "Z" ? "+00:00" : zone || "",
  };
};

export const formatAbsolute = (value) => {
  const parts = parseServerTimestamp(value);
  if (!parts) return String(value ?? "");
  return `${parts.date} ${parts.time}`;
};

/**
 * The instant, as epoch milliseconds, honouring the offset that came with it.
 * A string with NO offset is read as Damascus local time (UTC+03:00) rather
 * than as the browser's zone, because that is what the server means by a bare
 * timestamp — guessing the reader's zone would make "منذ دقيقتين" wrong by
 * hours for anyone travelling.
 */
const DAMASCUS_OFFSET_MINUTES = 180;

export const toEpochMs = (value) => {
  const parts = parseServerTimestamp(value);
  if (!parts) return null;
  const base = Date.UTC(
    Number(parts.date.slice(0, 4)),
    Number(parts.date.slice(5, 7)) - 1,
    Number(parts.date.slice(8, 10)),
    Number(parts.time.slice(0, 2)),
    Number(parts.time.slice(3, 5)),
    Number(parts.time.slice(6, 8))
  );
  if (Number.isNaN(base)) return null;

  let offsetMinutes = DAMASCUS_OFFSET_MINUTES;
  if (parts.offset) {
    const sign = parts.offset[0] === "-" ? -1 : 1;
    const digits = parts.offset.slice(1).replace(":", "");
    offsetMinutes =
      sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2, 4)));
  }
  return base - offsetMinutes * 60 * 1000;
};

// Arabic relative time, written here rather than pulled from moment's `ar`
// locale on purpose: loading that locale sets a GLOBAL postformat that rewrites
// every digit moment renders anywhere in the app into Arabic-Indic numerals —
// including the YYYY-MM-DD dates on the departments and notifications screens,
// which are read as machine values. A local function changes nothing outside
// this screen.
const AR_PLURAL = (n, one, two, few, many) => {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
};

/**
 * "منذ ٣ دقائق" — the quieter line beneath the absolute timestamp.
 *
 * `now` is a parameter so this is deterministic and testable. A future
 * timestamp (a clock skew between the server and the reader's machine) reads as
 * "الآن" rather than as a negative duration.
 */
export const formatRelativeAr = (value, now = Date.now()) => {
  const ms = toEpochMs(value);
  if (ms == null) return "";

  const seconds = Math.round((now - ms) / 1000);
  if (seconds < 45) return "الآن";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60)
    return `منذ ${AR_PLURAL(minutes, "دقيقة", "دقيقتين", "دقائق", "دقيقة")}`;

  const hours = Math.round(minutes / 60);
  if (hours < 24)
    return `منذ ${AR_PLURAL(hours, "ساعة", "ساعتين", "ساعات", "ساعة")}`;

  const days = Math.round(hours / 24);
  if (days < 30)
    return `منذ ${AR_PLURAL(days, "يوم", "يومين", "أيام", "يوماً")}`;

  const months = Math.round(days / 30);
  if (months < 12)
    return `منذ ${AR_PLURAL(months, "شهر", "شهرين", "أشهر", "شهراً")}`;

  const years = Math.round(months / 12);
  return `منذ ${AR_PLURAL(years, "سنة", "سنتين", "سنوات", "سنة")}`;
};

/**
 * What KIND of thing an audited value is.
 *
 * null, false, "" and {} are four different facts and this screen has to keep
 * them apart: rendering all four as "—" would say "nothing was recorded" about
 * a field that was explicitly set to false, or emptied, or replaced with an
 * object. `missing` is the fifth: the key exists on one side of the diff only.
 *
 * "***REDACTED***" is NOT a value. The backend substitutes it before the row is
 * written — the real value was never stored — so it is classified apart and
 * rendered as a chip rather than as text somebody typed.
 */
export const REDACTED = "***REDACTED***";

export const valueKind = (value) => {
  if (value === REDACTED) return "redacted";
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string" && value.trim() === "") return "empty";
  if (Array.isArray(value)) return "json";
  if (typeof value === "object") return "json";
  return "scalar";
};

/**
 * The union of both sides of a diff, in a stable order: the keys of the OLD
 * side first (in their own order), then keys that only the new side has.
 *
 * `created` sends old_values: null and `deleted` sends new_values: null, so one
 * side being absent is normal and yields the other side's keys alone. Unchanged
 * keys never appear because the backend only writes changed ones — nothing here
 * re-adds them.
 */
export const diffKeys = (oldValues, newValues) => {
  const keys = [];
  const seen = new Set();
  const push = (source) => {
    Object.keys(source && typeof source === "object" ? source : {}).forEach(
      (key) => {
        if (!seen.has(key)) {
          seen.add(key);
          keys.push(key);
        }
      }
    );
  };
  push(oldValues);
  push(newValues);
  return keys;
};

export const hasKey = (object, key) =>
  Boolean(object) &&
  typeof object === "object" &&
  Object.prototype.hasOwnProperty.call(object, key);

/**
 * An FK column whose id can be linked to a record.
 *
 * `department_id: 3 → 7` stays as the ids the audit row actually holds — they
 * are NOT resolved with extra requests, which on a 15-row page would be dozens
 * of lookups for decoration. But a bare "3" is also not left dangling: the
 * column name says which type it points at, and AUDITABLE_META says whether
 * that type has a screen.
 *
 * @returns {string|null} the auditable short key this column refers to.
 */
export const foreignKeyType = (field) => {
  const match = /^(.*)_id$/.exec(String(field ?? ""));
  if (!match) return null;
  const base = match[1];
  // direct_manager_id / issued_by-style columns point at an employee; the
  // mapping is only for the names the audited models actually carry.
  const KNOWN = {
    department: "department",
    job_title: "job_title",
    employee: "employee",
    direct_manager: "employee",
    manager: "employee",
    user: "user",
    role: "role",
    permission: "permission",
  };
  return KNOWN[base] || null;
};

/**
 * The Arabic label for a raw enum int stored in an audit row, or null.
 *
 * ⚠️ THIS IS THE ONE SANCTIONED USE OF hrEnums AS A DISPLAY MAP, and the only
 * place in the app where a local enum label is rendered at all. Everywhere else
 * the API ships `{field}_label` beside each int and THAT is what gets rendered,
 * because a local map goes stale the day the backend adds or rewords a value.
 *
 * The audit table is the exception because it PREDATES that convention: it
 * stores `status: 1` with no `status_label`, the rows are immutable, and rows
 * already written can never be retrofitted with labels. Without a map, the
 * before/after of a status change reads "1 → 2", which is unreadable to the
 * person the audit exists for.
 *
 * THE CONDITION ON THE EXCEPTION, enforced by the caller (AuditDiff): the raw
 * value is ALWAYS shown beside the label — `نشط (1)`, never `نشط`. The ground
 * truth stays on screen, so a stale map degrades into a redundant label or an
 * unmapped number, never into a confident lie about what the row says.
 *
 * Only ints are mapped. `reason` is an int on a posting and free text on some
 * other models, so a non-numeric value simply gets no label rather than a
 * wrong one. Department `level` / `sector` are deliberately absent: the app has
 * no local map for them — it reads `level_label` from the server — and
 * inventing one here would be exactly the staleness this rule guards against.
 */
const ENUM_OPTIONS_BY_FIELD = {
  status: STATUS_OPTIONS,
  gender: GENDER_OPTIONS,
  marital_status: MARITAL_STATUS_OPTIONS,
  employment_type: EMPLOYMENT_TYPE_OPTIONS,
  salary_mode: SALARY_MODE_OPTIONS,
  activity_type: ACTIVITY_TYPE_OPTIONS,
  education_level: EDUCATION_LEVEL_OPTIONS,
  engineering_rank: ENGINEERING_RANK_OPTIONS,
  governorate: GOVERNORATE_OPTIONS,
  reason: ASSIGNMENT_REASON_OPTIONS,
};

export const enumLabelFor = (field, value) => {
  const options = ENUM_OPTIONS_BY_FIELD[String(field ?? "")];
  if (!options) return null;
  if (typeof value !== "number" && !/^\d+$/.test(String(value ?? ""))) {
    return null;
  }
  return options.find((o) => o.value === Number(value))?.label || null;
};
