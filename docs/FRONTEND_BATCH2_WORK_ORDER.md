# Frontend work order — Batch 2 (HR restructure)

**Target repo:** `C:\Users\M.Hawa\Desktop\work\erp-dashboard`
**Authoritative contract:** `C:\Users\M.Hawa\Desktop\work\alraqi-erp-system\docs\API_DOCUMENTATION.md` (1236 lines, revision 2026-09-13)
**Companion:** `erp-dashboard/docs/FRONTEND_IMPLEMENTATION_PROMPTS.md` — the Phase 1 pack. This document is the **delta** on top of it, not a replacement.

Part A is the report: what changed, what is broken right now, and what is out of
scope. Part B is a prompt pack in the same format as the Phase 1 one — paste one
prompt per agent run.

---

## ⚠️ Step 0 — do this before anything else

`erp-dashboard/API_DOCUMENTATION.md` is a **stale 779-line copy** of the contract.
It predates both the departments `sector` work and the whole of Batch 2. An agent
that reads it will implement the wrong API and be confident about it.

Replace it with the current backend copy, then work from the replacement:

```powershell
Copy-Item "C:\Users\M.Hawa\Desktop\work\alraqi-erp-system\docs\API_DOCUMENTATION.md" `
          "C:\Users\M.Hawa\Desktop\work\erp-dashboard\API_DOCUMENTATION.md" -Force
```

Section line numbers quoted below refer to the **1236-line** file. If the file
changes again, trust the headings, not the numbers.

---

# Part A — Report

## A1. What the backend shipped

Batch 2 restructured the `employees` table and added three resources beside it.
It was done deliberately **before** the company's real staff are imported — this
was the last release in which it was a schema migration rather than a data
migration.

| | Before | After |
| --- | --- | --- |
| Endpoints | 27 | **38** (+11) |
| Permissions | 16 in the frontend catalogue | **28** (26 route-level + 2 field-level) |
| HR resources | employees | employees, job titles, posting history, warnings |

**New endpoints**

| # | Method | Path | Permission |
| --- | --- | --- | --- |
| 28–32 | GET/POST/GET/PUT/DELETE | `/api/hr/job-titles[/{jobTitle}]` | `hr.job_titles.view` `.create` `.update` `.delete` |
| 33–34 | GET/POST | `/api/hr/employees/{employee}/assignments` | `hr.assignments.view` `.create` |
| 35–36 | GET/POST | `/api/hr/employees/{employee}/warnings` | `hr.warnings.view` `.create` |
| 37–38 | PUT/DELETE | `/api/hr/warnings/{warning}` | `hr.warnings.update` `.delete` |

**New permissions** (12): the four `hr.job_titles.*`, the two `hr.assignments.*`,
the four `hr.warnings.*`, plus
`hr.employees.viewSalary` and `hr.employees.viewIdentity` which exist in the
backend catalogue but are **missing from `src/data/permissionsCatalog.js`**.

The Arabic labels are **not in the API document** — §2 lists machine names only,
and the API never serves a permission label. They live in
`database/seeders/PermissionSeeder.php`, reproduced here so nobody invents them:

| Permission | Label |
| --- | --- |
| `hr.employees.viewSalary` | عرض رواتب الموظفين |
| `hr.employees.viewIdentity` | عرض أرقام هوية الموظفين |
| `hr.job_titles.view` | عرض المسميات الوظيفية |
| `hr.job_titles.create` | إنشاء مسمى وظيفي |
| `hr.job_titles.update` | تعديل مسمى وظيفي |
| `hr.job_titles.delete` | حذف مسمى وظيفي |
| `hr.assignments.view` | عرض سجل التعيين |
| `hr.assignments.create` | تسجيل تعيين أو نقل |
| `hr.warnings.view` | عرض الإنذارات |
| `hr.warnings.create` | إصدار إنذار |
| `hr.warnings.update` | تعديل إنذار |
| `hr.warnings.delete` | حذف إنذار |

## A2. The breaking change to the employee shape

| Was | Is now |
| --- | --- |
| `name` | `first_name` + `middle_name` (اسم الأب) + `last_name` (الكنية) + read-only `full_name` |
| `job_title` (free string) | `job_title_id` (FK) + embedded `job_title: {id, name}` |
| `salary` | **gone.** Pay is computed from criteria; the negotiated track uses `agreed_salary` |
| `status: "active"` | `status: 1` + `status_label: "نشط"`. `"inactive"` is now **`2` موقوف (suspended)**, not "inactive" |

Plus **41 new columns**: demographics, contact, military service, education,
employment, the classification axes and the pay reference. Full object at
**§8.1, lines 803–885**.

`GET /api/auth/me` and `/api/auth/users` still return `name` — that key is an
**account's** display name and did not change. Only the employee resource split.

## A3. Field-level gating widened

Gated keys are **absent from the JSON entirely**, never `null`. An absent key
says "you may not see this"; `null` would say "this employee has no national id".

| Permission | Gates |
| --- | --- |
| `hr.employees.viewIdentity` | `national_id` |
| `hr.employees.viewSalary` | `salary_mode(_label)`, `agreed_salary`, `sham_cash_account` **and all nine classification axes**: `activity_type(_label)`, `organizational_grade`, `experience_level`, `engineering_rank(_label)`, `industrial_experience_years`, `has_hazard_pay`, `has_scarcity_pay`, `has_dual_role_pay`, `distinction_grade` |

The axes are gated with the amount because they are the inputs the salary is
computed from — publishing them while hiding the result lets anyone with the
rate table reconstruct the pay.

**The existing rule in `EmployeeFormModal.jsx` still holds and now covers
thirteen form inputs instead of two: a field you cannot read is a field you must
not render and must not submit.** Submitting a blank input for a hidden field
wipes stored data the editor was never allowed to see.

## A4. What is broken in `erp-dashboard` today

Every item below is a confirmed read of current code, not a guess.

| File | Problem |
| --- | --- |
| `src/sections/hr/Employees.jsx:48` | column `name` — the key no longer exists; every row renders blank |
| `src/sections/hr/Employees.jsx:56` | column `job_title` reads a string; it is now an object |
| `src/sections/hr/Employees.jsx:60-69` | department column renders `قسم #{id}`; the payload now carries `department.name` |
| `src/sections/hr/Employees.jsx:76-80` | `salary` column — the field is gone from the API |
| `src/sections/hr/Employees.jsx:16-20, 90-99` | `STATUS_BADGES` keyed on `"active"/"inactive"/"terminated"`; status is now `1/2/3` with `status_label` |
| `src/sections/hr/EmployeeFormModal.jsx:23-35` | `emptyForm` carries `name`, `job_title`, `salary`, `status: "active"` |
| `src/sections/hr/EmployeeFormModal.jsx:129-154` | payload submits `name`, `job_title`, `salary`, `status: "active"` → **422 on every create and update**, and no `first_name`/`middle_name`/`last_name`/`gender`, which are now required on create |
| `src/sections/accounts/UserFormModal.jsx:20` | employee picker labels use `e.name` → every option degrades to `موظف #id` |
| `src/data/permissionsCatalog.js` | 16 of 28 permissions. The role-permission matrix cannot grant any HR permission added in Batch 2 |
| `src/data/Routingdata.jsx`, `src/data/Sidemenudata.jsx` | no entry for job titles, no employee profile route |
| — | no UI at all for job titles, posting history or warnings |

**What already works in the HR files and must survive the rewrite:** the
permission-gated column building in `Employees.jsx:39-40`; the "don't render,
don't send" rule for gated fields in `EmployeeFormModal.jsx:49-60` and `146-154`;
omitting `employee_number` when blank so the server generates it
(`EmployeeFormModal.jsx:156-159`); string-only decimal handling; verbatim
`YYYY-MM-DD` rendering with no `Date` parsing; the last-page repair after a
delete. All of these are right — they just need to cover more fields.

**Departments are already correct.** `DepartmentFormModal.jsx` handles `sector`,
`sector_label`, the four levels and the level-4 مكتب tier. Leave it alone.

**Users/roles pagination is already correct.** `fetchAllPages` in
`src/utils/apiHelpers.js` walks the documented pages. Note that API doc §4.1 and
§5.1 still contain the sentence "Returns the full collection" — that line is
**stale**; §1 Pagination (lines 138–197) is authoritative and the controllers are
paginated. Do not "fix" the frontend to match the stale sentence.

## A5. Contract details that are easy to get wrong

1. **Not every optional field is nullable.** The habit of converting `""` → `null`
   is a 422 on these: `nationality` (string, no `nullable`), `wives_count`,
   `sons_count`, `daughters_count`, `has_hazard_pay`, `has_scarcity_pay`,
   `has_dual_role_pay`, `status`, `salary_mode`, and `employee_number` on update
   (rule is `filled` — it cannot be cleared). **Omit these instead of nulling them.**
2. **`employee_number` is auto-generated** (`EMP-00001`) when omitted on create.
   A supplied value is kept as-is and only checked for uniqueness.
3. **Enum fields ship as int + `_label`.** Render the label from the server. Static
   option lists are permitted **for form inputs only** — never for display, and
   never as a second copy of the mapping used to render a table cell.
4. **`education_level` and `engineering_rank` are ordered scales, not amounts.**
   سنة 4، سنة 5 and كلية are three rungs carrying one identical pay value. Never
   compute anything from a case number.
5. **Cross-field rules return 422 with a field key.** Mirror them client-side to
   save a round trip, but the server is the authority:
   - engineering rank only when `activity_type = 1` (هندسي)
   - industrial experience years only when `activity_type = 2` (صناعي)
   - `agreed_salary` **required** when `salary_mode = 2`, **forbidden** when `= 1`
   - `wives_count > 0` only when `marital_status = 2` (متزوج)
   - `termination_date` may not precede `hire_date`
   - `sham_cash_account` exactly 16 digits, unique
6. **Posting history is append-only.** No update, no delete, and no permission
   that could reach one. An omitted field **carries forward**; an explicit `null`
   **clears it**. These are different instructions — send `"department_id": null`
   only when you mean "no unit".
7. **`PUT /api/hr/employees/{id}` records a transfer automatically** when
   `department_id`, `job_title_id` or `organizational_grade` changes, with
   `reason: 2 (نقل داخلي)` and today's date. Use the assignments endpoint instead
   when the real reason or the real date matters.
8. **Warning `sequence` is computed, not stored.** Never send it. Withdrawing #2
   of 3 renumbers the third.
9. **Deleting a job title held by anyone — now or ever — is a 409**, not a 422,
   and the response carries `message` with **no `errors` object**. Same for the
   other domain errors: `JobTitleInUse` → 409, `AssignmentConflict` → 422,
   `EmployeeClassification` → 422. Render them as a global message.
10. **A soft-deleted job title keeps its name reserved** — `محاسب` cannot be
    recreated until the old row is force-deleted. Surface the server's message
    rather than claiming the name is free.

## A6. Out of scope — do not build

- **Employee documents.** `employee_documents` exists as a table and a model, and
  the four intake-form images per hire will land through the importer, but there
  are **no endpoints**. File upload belongs to the Documents module being ported
  from the legacy system. Building a second file pipeline here is exactly the
  duplication the merge plan's stage ordering exists to prevent.
- **Salary computation or display of a computed amount.** The rate tables are not
  in the API. `agreed_salary` is the only pay figure that exists, and only on the
  إتفاق track.
- **Any `/permissions` endpoint.** There is none; the catalogue is static.

## A7. Two questions for the backend, not blockers

- `?activity_type=` filters the employee list with **no `viewSalary` check**, so a
  caller without the permission can still partition staff by a gated axis.
  Recommendation for now: **gate the filter control behind `hr.employees.viewSalary`
  in the UI** and raise it with the backend.
- **GAP-12** (tracked in `API_BUILD_STANDARD.md` §12): `hr.employees.update` alone
  authorizes *writing* salary and identity fields a caller cannot read. The
  frontend mitigation — don't render, don't send — is the correct behaviour and
  must be preserved.

---

# Part B — Prompt pack

Same protocol as the Phase 1 pack: send the shared contract once per agent
context, then exactly one numbered prompt. Review or commit between phases.

## Shared execution contract

```text
Act as a senior React frontend engineer working directly in:
C:\Users\M.Hawa\Desktop\work\erp-dashboard

Implement the requested phase in the repository. Do not merely describe it, and do not paste complete files or a large diff into chat.

Context: the backend shipped "Batch 2", which restructured the HR employee resource and added three resources beside it. The authoritative contract is API_DOCUMENTATION.md at the repository root — confirm it is the 1236-line revision dated 2026-09-13 before you read it. If it is the older 779-line file, stop and say so; it is stale and describes the pre-Batch-2 API.

Rules:
- Inspect the current implementation first. Preserve correct existing behavior and naming; repair or complete it instead of duplicating it.
- Read only the API-document sections and source files named in this phase.
- Stay with the existing stack: React 18, Vite, the Redux action/reducer conventions already in src/redux, Axios, React Bootstrap, react-select, SweetAlert2, react-toastify. Do not add a dependency unless it is genuinely necessary and you explain why first.
- Reuse the existing shell: PageHeader, DataTableServer, TablePaginationServer, Loader, ProtectedElement/ProtectedRoute, utils/toast, utils/apiHelpers (parseApiError, fetchAllPages), sections/departments/useResourceOptions.
- The backend contract is authoritative. Do not invent endpoints, query parameters, response fields, or permissions.
- Enum fields arrive as an int plus a `{field}_label` in Arabic. Render the server's label. A static option list is allowed for a form input only, never as a display mapping.
- Gated fields are ABSENT from the payload, not null. A field the user cannot read must not be rendered and must not be submitted — submitting a blank input for it destroys data the editor was never allowed to see.
- Not every optional field is nullable. Omit a field rather than sending null unless the contract marks it nullable.
- Keep Arabic/RTL behavior and the dashboard's visual language. Use server-provided Arabic messages. Read the document as UTF-8; do not copy mojibake from a mis-decoded terminal.
- Treat server data as untrusted. Render plain text; never use dangerouslySetInnerHTML.
- Scope edits to this phase plus the smallest shared change it requires. Do not refactor unrelated legacy sections (advertisements, vehicles, packages, subscribers, faqs, complaints).
- Handle loading, empty, error, retry and permission-denied states. Prevent double submission and stale-response UI updates.
- Run `npm run build`. Run `npm run lint` too, and distinguish new failures from pre-existing repository failures. There is no test runner configured — do not add one.
- End with a concise report: changed files, behavior completed, checks run, real blockers. No file contents, no full diff. Under 250 words.
```

---

## Prompt B2-1 — Shared HR foundation: permissions, enums, navigation

```text
Lay the shared foundation the rest of Batch 2 builds on. No screens in this phase.

Read only:
- API_DOCUMENTATION.md §2 "RBAC model" (lines 199–263) and §8.5 "Enum reference" (lines 1145–1167).
- src/data/permissionsCatalog.js
- src/data/Routingdata.jsx
- src/data/Sidemenudata.jsx
- src/sections/index.js
- src/pages/layout/ProtectedRoute.jsx and ProtectedElement.jsx

Required outcome:
1. Extend PERMISSIONS_CATALOG from 16 to the full 28 permissions, grouped so the role-permission matrix stays readable. Add: hr.employees.viewSalary (عرض رواتب الموظفين), hr.employees.viewIdentity (عرض أرقام هوية الموظفين), hr.job_titles.view (عرض المسميات الوظيفية) / create (إنشاء مسمى وظيفي) / update (تعديل مسمى وظيفي) / delete (حذف مسمى وظيفي), hr.assignments.view (عرض سجل التعيين) / create (تسجيل تعيين أو نقل), hr.warnings.view (عرض الإنذارات) / create (إصدار إنذار) / update (تعديل إنذار) / delete (حذف إنذار). These labels come from the backend seeder — the API document lists machine names only and no endpoint serves a permission label, so use exactly these and do not invent alternatives. Do not change the hasPermission convention.
2. Mark the two field-level permissions visibly as field-level in the matrix UI's data (a flag on the entry is enough) — they gate fields, not routes, and an admin granting them should see that.
3. Create ONE module, src/data/hrEnums.js, exporting option lists for form inputs only: gender, marital_status, status, employment_type, salary_mode, activity_type, education_level, engineering_rank, governorate, assignment reason. Each option is {value: <int>, label: <Arabic>}. Add a file-top comment stating that display always uses the server's {field}_label and these lists exist only to populate select inputs.
4. Add route + sidebar entries for two new screens, both under the existing "الموارد البشرية" group: hr/job-titles (requires hr.job_titles.view) and hr/employees/:id (requires hr.employees.view, route only — no sidebar entry for a detail page). Register placeholder-free lazy sections only if the components exist; otherwise add the entries in the same commit as Prompts B2-4 and B2-5 and say so.
5. Do not call any /permissions endpoint. None exists.

Verify the matrix renders all 28 rows, existing gating still passes for a super_admin (whose permissions array is the full catalogue) and for a view-only user. Build.
```

---

## Prompt B2-2 — Employees list: new shape, filters, search, sort

```text
Migrate the employees list to the Batch 2 contract and add the documented query parameters.

Assume B2-1 is complete.

Read only:
- API_DOCUMENTATION.md §8.0 (lines 778–802), §8.1 (lines 803–985), §1 Pagination (lines 138–197).
- src/sections/hr/Employees.jsx
- src/redux/actions/employeesActions.jsx
- src/redux/redurcers/employeeReducer.jsx
- src/components/DataTableServer.jsx and TablePaginationServer.jsx
- src/data/hrEnums.js

Required outcome:
1. Replace the broken columns. `name` becomes `full_name`. `job_title` reads the embedded `job_title.name` (fall back to `—`, never to `job_title_id`). The department column renders `department.name`, not `قسم #{id}`. Delete the salary column entirely — the field no longer exists.
2. Status is the int 1/2/3 rendered from `status_label`. Keep contextual colours keyed on the int: 1 نشط success, 2 موقوف warning, 3 منتهي الخدمة danger. Note that the old "inactive" is now "موقوف (suspended)", a different meaning — do not carry the old label over.
3. Add `legacy_number` as a column or a secondary line under the staff number. HR will hold paper carrying M024333 for years after the import.
4. Add a filter toolbar sending only documented params: status, department_id, job_title_id, activity_type, search, sort. Filters are server-side; do not filter the current page in the browser and call it a filter.
5. Gate the activity_type filter behind hr.employees.viewSalary, matching the field-level gate on that axis.
6. Sort keys are exactly employee_number, first_name, last_name, hire_date, created_at, each with an optional leading `-` for descending. `full_name` is NOT sortable — it is a computed accessor. An unknown sort is a 422, so never send one.
7. Changing any filter resets to page 1. Keep the existing per_page control and read `meta.per_page` back rather than assuming the request was honoured.
8. Keep the existing soft-delete confirmation and last-page repair behaviour.
9. Make each row open the employee profile route added in B2-1 (hr/employees/:id). Keep the inline edit modal action as it is for now.

Verify: every column against a payload from a caller WITHOUT viewSalary and WITHOUT viewIdentity; each filter alone and combined; search by name part and by legacy_number; ascending and descending sort; an out-of-range page; an empty result. Build.
```

---

## Prompt B2-3 — Employee form: the full record

```text
Rebuild the employee create/edit form for the Batch 2 contract. This is the largest phase; do not start it in the same context as another.

Assume B2-1 and B2-2 are complete.

Read only:
- API_DOCUMENTATION.md §8.1 (lines 803–985) and §8.5 (lines 1145–1167).
- src/sections/hr/EmployeeFormModal.jsx
- src/redux/actions/employeesActions.jsx
- src/sections/departments/useResourceOptions.jsx
- src/data/hrEnums.js
- src/data/permissionsCatalog.js

Required outcome:
1. Group the form into labelled sections: الهوية، البيانات الشخصية، التواصل، الخدمة العسكرية، التعليم، العمل، التصنيف والرواتب. A single flat column of 40 inputs is not usable. Prefer a tabbed or accordion modal, or a full-page form if the modal cannot carry it — say which you chose and why.
2. Required on create: first_name, middle_name (اسم الأب), last_name (الكنية), gender. Everything else is optional. employee_number is optional and auto-generated as EMP-00001 when omitted; on UPDATE it may not be cleared (the rule is `filled`).
3. Reproduce the nullable/omit distinction exactly. Send null only for fields the contract marks nullable. OMIT — never null — nationality, wives_count, sons_count, daughters_count, has_hazard_pay, has_scarcity_pay, has_dual_role_pay, status, salary_mode, and employee_number on update.
4. The entire classification and pay block (activity_type, organizational_grade, experience_level, engineering_rank, industrial_experience_years, the three pay flags, distinction_grade, salary_mode, agreed_salary, sham_cash_account) renders ONLY with hr.employees.viewSalary, and national_id ONLY with hr.employees.viewIdentity. Without the permission the fields are absent from the form AND absent from the payload. This prevents silent data loss, not just a blank box.
5. Mirror the cross-field rules client-side with Arabic messages, and still map the server's 422 by exact field name:
   - engineering_rank enabled only when activity_type = 1; industrial_experience_years only when activity_type = 2. Clear and disable the other.
   - salary_mode = 2 (إتفاق) requires agreed_salary; salary_mode = 1 (نظام رواتب) forbids it.
   - wives_count enabled only when marital_status = 2.
   - termination_date may not precede hire_date.
   - sham_cash_account is exactly 16 digits.
   children_count is derived from sons_count + daughters_count — display it, never submit it.
6. job_title_id uses a selector over GET /hr/job-titles (requires hr.job_titles.view), preferring is_active titles. On selection, PRE-FILL organizational_grade and activity_type from the title's default_* values if those inputs are empty, and make clear they are suggestions the user may override — the employee's own columns are the fact.
7. department_id keeps the existing departments.view selector. direct_manager_id is a selector over /hr/employees requiring hr.employees.view; the employee may not be their own manager. Where a selector's permission is missing, fall back truthfully — never invent a lookup endpoint.
8. All dates are date-only YYYY-MM-DD. Do not parse them through Date or moment; a timezone shift moves a birthday.
9. agreed_salary is a decimal string. Validate as non-negative with at most two decimals using string operations; never round-trip it through a float.
10. On success, refetch the current page with the active filters intact.

Verify: create with only the four required fields; create with the full record; an update that touches one field; every cross-field rule rejected client-side and then accepted from the server; a caller without viewSalary editing an employee who HAS a salary (the stored value must survive); a caller without viewIdentity; duplicate employee_number / national_id / sham_cash_account; an engineer switched to إداري. Build.
```

---

## Prompt B2-4 — Job titles catalogue (دليل المسميات الوظيفية)

```text
Build the job-title catalogue as a new permission-aware, server-paginated CRUD screen.

Assume B2-1 to B2-3 are complete.

Read only:
- API_DOCUMENTATION.md §8.2 (lines 986–1036) and §1 Pagination (lines 138–197).
- src/sections/departments/** as the structural model for a CRUD section
- src/redux/actions/departmentsActions.jsx and src/redux/redurcers/departmentReducer.jsx as the model for a new action/reducer pair
- src/data/hrEnums.js, src/data/permissionsCatalog.js, Routingdata.jsx, Sidemenudata.jsx

Required outcome:
1. New section src/sections/hr/jobTitles/** plus a jobTitlesActions/jobTitleReducer pair following the existing conventions. Register the reducer in src/redux/Store.jsx.
2. Endpoints: GET/POST /hr/job-titles, GET/PUT/DELETE /hr/job-titles/{id}. Query params: page, per_page, search, is_described, is_active, sort (name | -name | created_at | -created_at). Default order is by name.
3. This is ONE shared company-wide catalogue. There is no department_id on a job title. Do not add a department column, filter or field — "which units use this title?" is answered by filtering employees on job_title_id, and the screen should offer that as a link into the employees list.
4. Boolean filters send 1/0. An unknown value is a 422, not a silent fallback.
5. The form covers name (required, unique), default_organizational_grade (1–5, nullable), default_activity_type (enum, nullable), is_described, description (max 10000), is_active. Label the two default_* fields as suggestions that pre-fill the employee form, not constraints.
6. `?is_described=0` is قسم التحليل والتوصيف's worklist — give it a first-class preset filter for titles still awaiting a job description, and show the count.
7. DELETE returns 409 with a message and NO errors object when the title is held by any employee or any historical posting. Render the server message as a global error on the row/modal. Do not present it as a field error and do not soften it — the title is undeletable while history references it.
8. A soft-deleted title keeps its name reserved, so recreating it returns a 422 uniqueness error. Show the server's message rather than claiming the name is free.
9. Gate page and actions on hr.job_titles.view/create/update/delete. Confirm before delete.

Verify: create, edit, both boolean filters, search, both sorts, the undescribed preset, a 409 delete, a duplicate name against a soft-deleted row, view-only access, an empty catalogue. Build.
```

---

## Prompt B2-5 — Employee profile: posting history and warnings

```text
Build the employee profile page and the two nested records that only exist under a person.

Assume B2-1 to B2-4 are complete.

Read only:
- API_DOCUMENTATION.md §8.3 (lines 1037–1104) and §8.4 (lines 1105–1144), and §8.1 for the employee object.
- src/sections/hr/** as built in B2-2 and B2-3
- src/components/DataTableServer.jsx, TablePaginationServer.jsx
- src/data/hrEnums.js, permissionsCatalog.js, Routingdata.jsx

Required outcome:
1. A route hr/employees/:id backed by GET /hr/employees/{id}, gated on hr.employees.view, with a header carrying full_name, employee_number, legacy_number, department.name, job_title.name and the status badge. Tabs: نظرة عامة / سجل التعيين / الإنذارات.
2. The overview tab renders the full record read-only, honouring both field-level gates exactly as the form does — an absent key is "not permitted", not "empty".
3. سجل التعيين tab (hr.assignments.view): paginated, newest first, showing department, job title, organizational grade, from_date, to_date, reason_label and notes. Mark the row with `is_current: true` clearly. Render `legacy_workplace` and `legacy_manager_name` when present — they exist so an unresolvable imported value stays visible to a human.
4. Recording a posting (hr.assignments.create) requires from_date (may be back-dated, may NOT be in the future) and reason (int, no default — the user must choose). department_id, job_title_id and organizational_grade are optional and this is the subtle part: OMITTING a field carries the current value forward; sending an explicit null CLEARS it. Build the form so a promotion can state only the new grade and a title change only the new title, and so "no unit" is a deliberate, separate action. Explain the distinction in the UI copy.
5. There is NO update and NO delete for a posting, and no permission that could authorize one. Do not render edit or delete affordances. A posting recorded wrongly is corrected by recording the correction. Note in the UI that a posting dated on or before the current one's start amends it in place rather than stacking a new row.
6. Tell the user, where they edit department/job title/grade on the employee form, that saving there records a transfer automatically with reason نقل داخلي dated today — and that this screen is the way to record the real reason or a back-dated one.
7. الإنذارات tab (hr.warnings.view): paginated, newest first. Create is nested under the employee; update and delete are NOT nested — they address /hr/warnings/{warning}. `sequence` is computed by the server; display it and never send it. `issued_by` is an EMPLOYEE id, not a user id — a line manager may have no login; use an employee selector.
8. Fields: type (required on create), issued_on (required, not in the future), number (رقم كتاب الإنذار, optional), issued_by (optional), notes (optional, max 5000). Delete is soft — withdrawn is not the same as never happened — so word the confirmation as withdrawal, not erasure.
9. Each tab gates independently: a user with employees.view but not warnings.view sees the profile without that tab, not an error.

Verify: an employee with no postings and no warnings; a transfer that carries department forward while changing grade; an explicit null that clears a department; a future from_date rejected; a back-dated posting that amends rather than stacks; warning sequence after withdrawing a middle warning; each tab with and without its permission. Build.
```

---

## Prompt B2-6 — Ripple fixes and Batch 2 integration audit

```text
Fix the remaining reads of the old employee shape, then audit the Batch 2 surface. This is not a redesign.

Assume B2-1 to B2-5 are complete.

Read only:
- API_DOCUMENTATION.md §9 "Endpoint quick reference" (lines 1170–1222) and §10 "Frontend integration checklist" (lines 1225–1236).
- src/sections/accounts/UserFormModal.jsx and Users.jsx
- git diff/status for the files changed by B2-1 to B2-5
- the result of a narrow ripgrep for `\.name` and `job_title` and `salary` across src/sections and src/redux

Required outcome:
1. src/sections/accounts/UserFormModal.jsx builds its employee picker label from `e.name`, which no longer exists. Use `full_name`, and include employee_number so two people with the same name are distinguishable. Keep submitting only employee_id.
2. `user.name` on the Users screen is an ACCOUNT display name and is unchanged — do not touch it. Confirm you can tell the two apart before editing anything.
3. Sweep for any other consumer of the removed employee keys (name, job_title as a string, salary, status as a string) and fix each against the contract.
4. Build a private checklist of all 38 endpoints. Confirm method, path, permission, payload and pagination mode for every Batch 2 call the frontend now makes. Report only mismatches.
5. Confirm no undocumented query parameter survives, and that every 422 maps to fields while 409 and message-only domain errors render globally.
6. Confirm both field-level gates hold on every new surface: list, form, profile overview. A user without viewSalary must never see a classification axis and must never submit one.
7. Confirm append-only posting history has no edit or delete affordance anywhere, including a stray action column inherited from DataTableServer.
8. Confirm Arabic/RTL, keyboard operation, modal focus, and the loading/empty/error/no-access states are coherent at desktop and mobile widths on the new screens.
9. Do not re-audit departments, auth, roles or notifications unless a Batch 2 change touched them.

Run `npm run build` and `npm run lint`. Report pass/fail honestly and separate pre-existing failures from regressions. List only remaining actionable gaps.
```

---

## Compact follow-up for a failed phase

```text
Continue the previous Batch 2 Phase [NUMBER]. Read only the previous agent's report, `git diff`, and the files named in the reported failure. Do not restart the phase or reread the whole API document. Reproduce the specific failure, make the smallest correct fix consistent with the authoritative API section, rerun the failed check plus `npm run build`, and answer in under 150 words with no code and no full diff.
```
