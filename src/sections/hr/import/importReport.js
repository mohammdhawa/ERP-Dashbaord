// استيراد الموظفين — the pure half of the import screen
// (EMPLOYEE_IMPORT_UPLOAD_DESIGN.md §6 in the backend repo).
//
// PURE — no React, no import.meta — so `node --test` runs it, as
// fileDownload.js's helper is run.

// The report's own words, as the backend's ImportReportWriter writes them, so
// the screen and the downloaded xlsx say the same thing.
export const OUTCOME_LABELS = Object.freeze({
  created: "جديد",
  updated: "تحديث",
  restored: "استعادة",
  excluded: "مستبعد",
  skipped: "لم يُستورد",
  failed: "مرفوض",
});

export const SEVERITY_LABELS = Object.freeze({
  error: "خطأ",
  warning: "تنبيه",
  info: "للعلم",
});

// The السطور tab's two filters. A severity keeps a row with at least one issue
// of it — a row is "a warning row" if anything on it warns.
export const filterRows = (rows = [], { outcome = "", severity = "" } = {}) =>
  rows.filter(
    (row) =>
      (!outcome || row.outcome === outcome) &&
      (!severity || (row.issues || []).some((i) => i.severity === severity))
  );

// Arabic counts agree with their number: 1 and 2 have their own forms, 3–10
// take the plural, 11 and up the singular accusative.
const countPhrase = (n, { one, two, few, many }) => {
  if (n === 1) return one;
  if (n === 2) return two;
  return n >= 3 && n <= 10 ? `${n} ${few}` : `${n} ${many}`;
};

export const minutesPhrase = (n) =>
  countPhrase(n, { one: "دقيقة واحدة", two: "دقيقتين", few: "دقائق", many: "دقيقة" });

// After «بيانات» (genitive), so the dual is «موظفَين».
export const employeesPhrase = (n) =>
  countPhrase(n, { one: "موظف واحد", two: "موظفَين", few: "موظفين", many: "موظفاً" });

// "تنتهي صلاحية هذا الفحص بعد …", minutes rounded UP — saying "0 minutes"
// while the run still works would send HR to upload again for nothing. Null
// once it has passed: the screen then offers a new upload. `deadline` is a
// time in ms (withDeadline) or an ISO string.
export const expiryLabel = (deadline, now = Date.now()) => {
  const end =
    typeof deadline === "number" ? deadline : deadline ? Date.parse(deadline) : NaN;
  if (Number.isNaN(end) || end <= now) return null;

  return `تنتهي صلاحية هذا الفحص بعد ${minutesPhrase(Math.ceil((end - now) / 60000))}`;
};

// A run as received, with its deadline on THIS browser's clock: the time it
// arrived plus the server's `seconds_left`. Counting down from `expires_at`
// trusted a browser clock that may be off (final review, Part 1).
export const withDeadline = (run, receivedAt = Date.now()) =>
  run
    ? {
        ...run,
        deadline:
          typeof run.seconds_left === "number"
            ? receivedAt + run.seconds_left * 1000
            : Date.parse(run.expires_at),
      }
    : run;

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// The credentials workbook arrives base64 in the real run's response — the one
// place its passwords exist (U4). Turned into a Blob for an immediate save and
// kept in component state only, never in browser storage.
export const base64ToBlob = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: XLSX });
};

// --- Excluding rows before the real import (backend design §12) ---

const CHECKED = 1;

// A row HR may tick: the run is still a checked one inside its hour, and the
// row is one the FIRST dry run would import (`importable_rows`) — the current
// report already shows ticked rows as "excluded", so it cannot decide this.
export const canExclude = (run, row, now = Date.now()) =>
  run?.status === CHECKED &&
  expiryLabel(run.deadline ?? run.expires_at, now) !== null &&
  (run.importable_rows || []).includes(row?.row);

// The checkbox a row gets in السطور: none when it cannot be excluded, and a
// disabled one while a re-check is in flight — a tick made then would be
// dropped when the re-checked run arrives and resets the ticks.
export const rowCheckbox = (run, row, { now = Date.now(), applying = false } = {}) =>
  canExclude(run, row, now) ? { disabled: applying } : null;

const uniqueSorted = (rows) =>
  [...new Set(Array.from(rows || []))].sort((a, b) => a - b);

// Whether the ticks on screen are the list the server holds. While they
// differ, the import button stays disabled: a real run must never import a
// list HR has not seen re-checked.
export const sameRows = (a, b) => {
  const left = uniqueSorted(a);
  const right = uniqueSorted(b);
  return left.length === right.length && left.every((row, i) => row === right[i]);
};

// The PUT body: the whole list each time, sorted, each row once.
export const exclusionPayload = (ticked) => ({ rows: uniqueSorted(ticked) });

// The real import's body: the exclusion list this screen shows. The server
// refuses another list than the one it saved, so a stale screen (a lost apply
// response, a second tab) cannot confirm counts for a list it did not show.
export const executePayload = (run) => ({
  excluded_rows: uniqueSorted(run?.excluded_rows),
});

// After an apply or an import fails, show the run as the server now has it
// when the failure was a refusal (expired, already imported, a stale list) or
// no response at all — the server may have acted before the answer was lost.
// A 409 (another import running) changed nothing: keep the screen as it is.
export const reloadAfterFailure = (status) => status === 422 || status === 0;

// What the page does when `?run=` and the run on screen disagree: load the
// one the address names, or — Back, or the menu link to the bare page — go
// back to choosing files.
export const urlAction = (runIdInUrl, run) => {
  if (runIdInUrl) return String(run?.id) === String(runIdInUrl) ? "none" : "load";
  return run ? "reset" : "none";
};

// A run named in the address that cannot be loaded: a 404 (someone else's,
// or a typo) starts over, saying why rather than silently.
export const loadFailure = (status) =>
  status === 404
    ? { startOver: true, message: "لم يُعثر على هذا الاستيراد؛ ابدأ برفع الملف." }
    : { startOver: false, message: null };
