# Approvals, Leave and Attendance in the Dashboard: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the dashboard screens for the backend's approvals (§15), leave
(§16) and attendance oversight (§13–§14), against `API_DOCUMENTATION.md` as
synced from backend `5e302f5`.

**Architecture:** The plan follows the existing patterns:
- Every query and payload is built by a **pure module** tested under
  `node --test` (as `auditParams.js` is).
- Paged lists get a redux slice with request ids (as `warningsActions.jsx` and
  `warningReducer.jsx` do).
- One-off reads keep local state (as `Sessions.jsx` does).
- Screens are lazy routes in `Routingdata.jsx` with entries in
  `Sidemenudata.jsx`.
- Every displayed enum uses the server's `_label`.

**Tech Stack:** React 18, react-bootstrap 2, react-select 5, redux-toolkit 1.9
with thunk, axios, sweetalert2 (via `confirmDestructive`), react-toastify,
Vite 5, `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-19-approvals-leave-attendance-design.md`

## Global Constraints

- **Never `git add`, `git commit`, `git push` or switch branches.** The
  project owner decides every commit. A task ends at a checkpoint, not a
  commit.
- **Do not modify these files, which hold someone else's uncommitted
  changes:** `src/assets/css/styles.css`, `src/assets/scss/custom/*`,
  `src/data/Imagedata.jsx`, `src/pages/ChangePassword.jsx`,
  `src/pages/Signin.jsx`, `src/sections/accounts/UserFormModal.jsx`,
  `src/sections/system/AuditLog.jsx`, `src/sections/system/AuditLogFilters.jsx`,
  `src/sections/system/auditActor*.js`. If a task seems to need one, stop and
  ask.
- **Do not edit the backend repo.** If the API lacks something, add it to the
  step report; do not work around it.
- **Display text:** every enum on screen is the server's `{field}_label`.
  Option lists in `*Enums.js` feed form and filter controls only. Every error
  shown is `parseApiError(err).message`, and 422 `errors` map to fields.
- **Times** go through `formatAbsolute` (`src/sections/system/auditFormat.js`).
  Plain `YYYY-MM-DD` dates are rendered verbatim inside `<span dir="ltr">`.
- **Private files** (selfies, attachments) are fetched as blobs through `api`.
  Never put an API URL in `<img src>` or `<a href>`.
- **Paging:** the default `per_page` is 15, and `meta.per_page` is read back.
- **Polling:** nothing new polls.
- **Gates:** routes use `requiredPermissions` on `RouteData`; buttons use
  `ProtectedElement` or `hasPermission`. Approval buttons use only
  `approval.can_act`, `can_reassign` and `can_withdraw`, never a permission.
- **Copy:** Arabic and RTL. Page titles follow `الراقي ERP | <title>`.
- **Every step checkpoint:** `npm test` passes (baseline 124) and
  `npm run build` succeeds.

## Review Focus

1. **A decision taken elsewhere while the screen is open.** The approve call
   422s «ليس دورك…». The screen shows the message, then re-reads and drops the
   stale buttons. Test: `refreshAfterRefusal` in Task 3.
2. **The over-balance excuse refusal.** Its only marker is the text «أرسل force»
   in the message: the API gives no `errors` key and no code. The form must
   offer «تسجيل رغم ذلك» and resend with `force: 1`. A
   refusal for an attended day must never offer `force`. Test:
   `isForceableExcuseRefusal` in Task 8.
3. **An empty filter box.** It is omitted, never sent blank. A blank `?from=`
   is a 422 that breaks the screen the moment a field is cleared. Tests:
   every builder in Tasks 5, 8 and 14 gets an "untouched filters send only
   the page" case.
4. **An account with no employee** (super_admin, the technical department).
   «طلباتي» is hidden. If it is reached by URL, the 403 «لا يوجد موظف مرتبط
   بهذا الحساب.» is shown in place, not toasted. Test: `showsMyLeave` in
   Task 13.
5. **Reject reason 3 with no note.** It is blocked in the form before sending,
   matching the server's rule. Test: `validateReject` in Task 14.

---

## Step 2: Approvals

### Task 1: Permission catalogue

**Files:**
- Modify: `src/data/permissionsCatalog.js`
- Test: `src/data/permissionsCatalog.test.js`

**Interfaces:**
- Produces: the 14 names below in `ALL_PERMISSION_NAMES`;
  `permissionLabel(name)`.

- [ ] **Step 1: Update the tests.**
  - `ALL_PERMISSION_NAMES.length === 45`.
  - Each new name has the label below.
  - The company-only list in "the company-only set matches the server's" gains
    `leave.types.create`, `leave.types.delete` and `leave.types.update` (sorted
    into place).

  | name | label |
  |---|---|
  | `attendance.records.view` | عرض سجلات الحضور |
  | `attendance.records.correct` | تصحيح انصراف منسي |
  | `attendance.records.reject` | رفض سجل حضور |
  | `approvals.view` | عرض مسارات الاعتماد |
  | `approvals.reassign` | إعادة إسناد خطوة اعتماد |
  | `leave.types.create` | إضافة نوع إجازة |
  | `leave.types.update` | تعديل نوع إجازة |
  | `leave.types.delete` | حذف نوع إجازة |
  | `leave.balances.view` | عرض أرصدة الإجازات |
  | `leave.balances.update` | تعديل أرصدة الإجازات |
  | `leave.requests.view` | عرض طلبات الإجازات |
  | `leave.excuses.create` | تسجيل عذر غياب |
  | `leave.excuses.delete` | التراجع عن عذر غياب |
  | `leave.requests.returnToWork` | تسجيل العودة إلى العمل |

- [ ] **Step 2:** Run `npm test`. Expect the catalogue tests to FAIL.
- [ ] **Step 3: Update the catalogue.**
  - Add three groups, in this order, after الإنذارات:
    - «الحضور والانصراف», key `attendance.records`;
    - «الاعتمادات», key `approvals`, with a `note`: «الموافقة والرفض لا يحتاجان صلاحية: يقرّر صاحب الخطوة في مسار الاعتماد.»;
    - «الإجازات», key `leave`.
  - Append the 11 row-scoped names (all except `leave.types.*`) to
    `HONOURED_FROM_SCOPED_GRANT` under a comment citing
    `PermissionReach::ROW_SCOPED`.
  - Update the header comment to "45 rows: 42 route-level + 3 field-level".
- [ ] **Step 4:** Run `npm test`. Expect PASS.

### Task 2: Shared plumbing

**Files:**
- Create: `src/utils/fileDownload.js`, `src/utils/fileDownload.test.js`
- Create: `src/data/employeeOption.js`
- Create: `src/components/EmployeePicker.jsx`, `src/components/StatePanel.jsx`

**Interfaces:**
- Produces:
  - `filenameFromDisposition(header: string|undefined, fallback: string) => string`.
    It is pure and handles `filename*=UTF-8''…` (decoded) before `filename="…"`.
  - `fetchBlobUrl(path: string) => Promise<{ url: string, filename: string|null }>`.
    It calls `api.get(path, { responseType: "blob" })`. The caller revokes the
    URL. A failed blob is parsed back to the JSON envelope so `parseApiError`
    sees the Arabic message.
  - `downloadFile(path: string, fallbackName: string) => Promise<void>`.
    It clicks a temporary `<a download>` and revokes the URL.
  - `employeeToOption(e) => { value, label }`: «الاسم — EMP-…», or «الاسم (#id)»
    when there is no staff number. This is UserFormModal's rule. **Do not edit
    UserFormModal.**
  - `<EmployeePicker value={id|""} onChange={(id|"") => void} inputId placeholder isDisabled />`.
    It uses `useResourceOptions("/hr/employees", employeeToOption, canView)`
    with react-select (clearable, searchable, RTL). It renders `null` without
    `hr.employees.view`, so callers fall back to the `search` text box.
  - `<StatePanel loading error onRetry>{children}</StatePanel>`. It shows the
    MutatingDots loader or the error-and-retry panel, markup copied from
    `Sessions.jsx`, and otherwise renders its children.

- [ ] **Step 1: Write the failing tests** in `fileDownload.test.js`:
  - `filenameFromDisposition("attachment; filename=\"a.pdf\"", "x")` returns `"a.pdf"`.
  - With `filename*=UTF-8''%D8%AA%D9%82%D8%B1%D9%8A%D8%B1.pdf` it returns `"تقرير.pdf"`.
  - With `undefined` it returns the fallback.
- [ ] **Step 2:** Run `npm test`. Expect FAIL (module missing).
- [ ] **Step 3: Implement the module.** Keep `filenameFromDisposition` in
  `fileDownload.js` with no `api` import at module top. Import `api` lazily
  inside `fetchBlobUrl` (`const { default: api } = await import("../redux/api")`)
  so the test file loads under Node. `api.js` reads `import.meta.env`.
- [ ] **Step 4:** Run `npm test`. Expect PASS. Then add the picker and the
  panel, and run `npm run build`. Expect success.

### Task 3: Approval view logic

**Files:**
- Create: `src/sections/approvals/approvalView.js`, `src/sections/approvals/approvalView.test.js`

**Interfaces:**
- Produces:
  - `subjectPath(subject) => string|null`. `{type:"leave_request", id}` maps to
    `leave/requests/${id}` (BASE_URL-relative). Any other type, or a null
    subject, maps to `null`.
  - `stagesOf(steps) => Array<{ order: number, steps: Step[] }>`. It groups by
    `step_order`, ascending; parallel steps share a stage.
  - `reassignableSteps(approval) => Step[]`. These are the steps with
    `status === 1`, and only when `approval.can_reassign` is true.
  - `leaveActions(leave, permissions) => { act, reassign, withdraw, returnToWork, undoExcuse }`,
    all booleans:
    - `act` is `approval?.can_act`;
    - `reassign` is true when `reassignableSteps(approval)` is non-empty;
    - `withdraw` is `approval?.can_withdraw`;
    - `returnToWork` is `status===2 && origin===1` and holds
      `leave.requests.returnToWork`;
    - `undoExcuse` is `status===2 && origin===2` and holds
      `leave.excuses.delete`.
  - `refreshAfterRefusal(status: number) => boolean`. It is true for 403, 404
    and 422: the screen re-reads after showing the message.

- [ ] **Step 1: Write the tests.**
  - `subjectPath` returns `"leave/requests/9"` for a leave request and `null`
    for `{type:"document"}` and for `null`.
  - `stagesOf` turns steps with orders `[2,1,2]` into two stages, ordered 1
    then 2, with the second holding two steps.
  - `leaveActions` gives:
    - for a pending request with `can_act:true`: `act` only;
    - for an approved excuse with `leave.excuses.delete`: `undoExcuse` only;
    - for the same excuse without that permission: no actions;
    - for an approved request with `leave.requests.returnToWork`:
      `returnToWork` only;
    - for a cancelled leave (status 4): nothing, even with every permission.
  - `refreshAfterRefusal(422)` is true and `refreshAfterRefusal(0)` is false.
- [ ] **Step 2:** Run `npm test`. Expect FAIL.
- [ ] **Step 3: Implement it.** The module is pure, and permissions go through
  `hasPermission` from `src/data/permissionsCatalog.js`.
- [ ] **Step 4:** Run `npm test`. Expect PASS.

### Task 4: Notifications open the request screen

**Files:**
- Modify: `src/data/notificationDestinations.js`
- Test: `src/data/notificationDestinations.test.js`

**Interfaces:**
- Consumes: `subjectPath` (Task 3) is NOT imported. Keep this module
  dependency-free and inline the `leave_request` rule.

- [ ] **Step 1: Write the tests.**
  - `approval.step_pending` and `approval.step_assigned` with
    `{type:"leave_request", id:9}` give `"leave/requests/9"`.
  - The same two types with `{type:"document", id:3}` give `null`.
  - `leave.submitted`, `leave.approved`, `leave.rejected` and
    `leave.cancelled` with a leave reference give `"leave/requests/9"`.
  - `leave.excuse_filed`, `leave.excuse_cancelled`, `leave.returned_to_work`,
    `attendance.record_rejected` and `attendance.checkout_reminder` give `null`.
  - Keep the existing tests.
- [ ] **Step 2:** Run `npm test`. Expect FAIL.
- [ ] **Step 3: Implement it.** Fill `BY_TYPE` with one helper
  `toLeaveRequest = ({ reference }) => reference?.type === "leave_request" && reference.id ? \`leave/requests/${reference.id}\` : null`
  for the six types. Update the header comment ("Empty until…") to say which
  types now open what, and why the excuse and attendance types stay on the
  full text (the contract's dashboard column).
- [ ] **Step 4:** Run `npm test`. Expect PASS.

### Task 5: Inbox data layer

**Files:**
- Create: `src/redux/actions/approvalsParams.js`, `src/redux/actions/approvalsParams.test.js`
- Create: `src/redux/actions/approvalsActions.jsx`, `src/redux/redurcers/approvalReducer.jsx`
- Modify: `src/redux/Store.jsx` (add `approvals: approvalsReducer`)

**Interfaces:**
- Produces:
  - `INBOX_TABS = ["pending", "decided"]`.
  - `buildInboxParams(tab, page, perPage) => object`. `decided` adds
    `status: "decided"`; `pending` or an unknown tab sends only the page.
  - The thunk `fetchInbox(tab, page = 1, perPage = 15)`.
  - State `state.approvals = { items, meta, fetchLoading, error, listRequestId }`,
    following the shape and the stale-response rule of `warningReducer`.

- [ ] **Step 1: Write the tests.**
  - `buildInboxParams("pending", 1, 15)` deep-equals `{page:1, per_page:15}`.
  - `"decided"` adds `status:"decided"`.
  - `"bogus"` returns the plain page.
- [ ] **Step 2:** Run `npm test`. Expect FAIL.
- [ ] **Step 3: Implement** the params module, then the actions and reducer
  (`GET /me/approvals`). Register the reducer.
- [ ] **Step 4:** Run `npm test`. Expect PASS. Run `npm run build`. Expect
  success.

### Task 6: ApprovalsInbox screen

**Files:**
- Create: `src/sections/approvals/ApprovalsInbox.jsx`
- Modify: `src/data/Routingdata.jsx` (route `approvals`, `requiredPermissions: []`)
- Modify: `src/data/Sidemenudata.jsx` (top-level link «الاعتمادات», icon `ri-checkbox-multiple-line`, after لوحة التحكم)

**Interfaces:**
- Consumes: `fetchInbox` (Task 5), `subjectPath` (Task 3), `DataTableServer`.

- [ ] **Step 1: Build the screen.**
  - PageHeader «الاعتمادات». Nav tabs «بانتظار قراري» / «قراراتي», with the
    tab kept in `?tab=` through `useSearchParams`.
  - Columns:
    - مقدّم الطلب: `requester.full_name` and `employee_number`;
    - الطلب: `subject.title` with `subject.summary` muted, or «طلب لم يعد موجوداً»
      when `subject.title` is null;
    - المرحلة: `step_order`;
    - تاريخ التقديم: `submitted_at` through `formatAbsolute`;
    - on the decided tab, also القرار (`status_label`) and تاريخ القرار
      (`acted_at`).
  - `onRowClick` navigates to `subjectPath(row.subject)` when non-null.
  - Empty text: «لا توجد طلبات بانتظار قرارك» / «لم تتخذ أي قرار بعد».
  - `showActions={false}`.
- [ ] **Step 2: Verify.** Run `npm run build` (success). Then check it by hand
  in the dev server (`npm run dev`, `.env.development` URL) as an account that
  holds a pending step. A row should open `leave/requests/{id}`, which is
  Task 7's route. Until Task 7, the 404 page is expected.

### Task 7: The leave request screen (the approver's view)

**Files:**
- Create: `src/sections/leave/LeaveRequest.jsx`, `src/sections/approvals/ApprovalChain.jsx`, `src/sections/approvals/DecisionModal.jsx`, `src/sections/approvals/ReassignModal.jsx`
- Modify: `src/data/Routingdata.jsx` (route `leave/requests/:id`, `requiredPermissions: []`)

**Interfaces:**
- Consumes: `leaveActions`, `stagesOf`, `reassignableSteps` and
  `refreshAfterRefusal` (Task 3); `downloadFile` and `EmployeePicker`
  (Task 2); `StatePanel`.
- Produces:
  - `<LeaveRequest />` keeps local state `{ leave, loading, error }`.
  - `reload()` re-reads `GET /leave/requests/{id}`.
  - `applyLeave(leave)` replaces the state from an action response.
  - It exposes an `extraActions` slot (`renderHrActions(leave, applyLeave, reload)`),
    which Task 11 fills.
  - `<DecisionModal show mode={"approve"|"reject"} onHide onSubmit={(note) => Promise} />`.
  - `<ReassignModal show steps={Step[]} onHide onSubmit={({stepId, employee_id, reason}) => Promise} />`.

- [ ] **Step 1: Build the screen** (spec §4).
  - **Header:** the employee, the type, the status badge (`status_label`)
    and the origin badge.
  - **Details card:** dates, `requested_days`, reason, and the cancelled and
    shortened fields only when non-null. Attachments are buttons calling
    `downloadFile(\`/leave/requests/${id}/attachments/${a.id}\`, a.name)`.
  - **ApprovalChain:** stages from `stagesOf`, each step showing
    `resolver_label`, `approver.full_name`, `status_label` (highlighted when
    `is_current`), `skip_reason_label`, `acted_by.name`, `acted_at` and `note`.
    The `reassignments` log goes below. When `approval` is null (an excuse),
    show «عذر سجّلته الموارد البشرية — بلا مسار اعتماد» with `created_by`.
  - **Action bar:** buttons only where `leaveActions` says so.
    - Approve and reject call
      `POST /approvals/{approval.id}/steps/{approval.current_step_id}/approve|reject`
      with `{ note }` (omitted when empty).
    - On success, merge `response.data.data` (an approval) into
      `leave.approval`. Then `reload()`, so the leave's status catches up with
      the final approval.
    - Reassign calls
      `PATCH /approvals/{id}/steps/{stepId}/assignee` `{employee_id, reason}`.
      The reason is validated client-side as 3–500 characters.
    - Withdraw calls `confirmDestructive`, then
      `POST /me/leave-requests/{id}/cancel`, then `applyLeave(data)`.
  - **On any action error:** toast the message. If
    `refreshAfterRefusal(status)`, call `reload()`.
  - **A load error** (403, out_of_scope or 404) renders in `StatePanel`
    with no retry for 403.
- [ ] **Step 2: Verify.** Run `npm run build` (success). Then, in the dev
  server:
  - an approver sees approve and reject;
  - after approving, the buttons disappear and the chain shows the decision;
  - a second tab acting on a decided step shows «ليس دورك…» and redraws.

### Checkpoint: Step 2

- [ ] Run `npm test`: all pass (124 + the new ones). Run `npm run build`:
  success.
- [ ] Report to the owner: what was built, what the API lacked (spec §8 items
  2, 3), and the uncommitted file list (`git status --short`, excluding the
  owner's own changes). **Stop and wait for the owner** before Step 3.

---

## Step 3: Leave

### Task 8: Leave params, payloads and enums

**Files:**
- Create: `src/redux/actions/leaveParams.js`, `src/redux/actions/leaveParams.test.js`, `src/data/leaveEnums.js`

**Interfaces:**
- Produces:
  - `LEAVE_STATUS_OPTIONS`: 1 قيد الاعتماد · 2 معتمدة · 3 مرفوضة · 4 ملغاة.
  - `EXCUSE_FILTER_OPTIONS`: `""` الكل · `"0"` طلبات الموظفين · `"1"` أعذار إدارية.
  - `REGISTER_SORT_KEYS = ["start_date","end_date","requested_days","created_at","employee_name","id"]`, each also with `-`.
  - `MY_LEAVE_SORT_KEYS = ["created_at","start_date","end_date","requested_days","status","decided_at","id"]`.
  - `BALANCE_SORT_KEYS = ["employee_name","employee_number"]`.
  - `buildRegisterParams(page, perPage, f) => object`. The window, by
    precedence:
    1. `from` and `to` (both, full dates);
    2. else `month` with `year`;
    3. else `year` alone;
    4. else nothing (the server's current month).

    Then `statuses` as CSV, `leave_type_ids` as CSV, `is_excuse` (`"0"`/`"1"`),
    `employee_id`, `department_id`, trimmed `search`, and `sort` when in the
    keys. Empties are omitted.
  - `buildMyLeaveParams(page, perPage, f)` sends the same status, type, `year`
    and `is_excuse` rules, with `MY_LEAVE_SORT_KEYS`.
  - `buildBalancesParams(page, perPage, f)` sends `year`, `employee_id`,
    `department_id`, `search` and `sort`.
  - `buildLeaveRequestForm(values) => FormData`. It carries `leave_type_id`,
    `start_date`, `end_date`, `reason` (when non-empty) and
    `attachments[]` × n.
  - `validateAttachments(files, { required }) => string|null`. It returns
    «يمكن إرفاق 5 ملفات كحد أقصى.» when more than 5;
    «الملفات المسموحة: PDF أو JPG أو PNG.» for another type;
    «حجم الملف يجب ألا يتجاوز 10 ميغابايت.» when a file exceeds 10 × 1024 × 1024;
    «نوع الإجازة يتطلب إرفاق مستند.» when required and empty. Otherwise null.
  - `buildExcuseForm(values, { force }) => FormData`. It is
    `buildLeaveRequestForm`'s fields plus `employee_id`, and `force=1` only
    when `force`.
  - `isForceableExcuseRefusal(parsedError) => boolean`. It is true when
    `status === 422` and `message.includes("force")`. A comment says this text
    is the only marker the API gives (spec §8, item 6).

- [ ] **Step 1: Write the tests.** Untouched filters send only the page.
  - **Window precedence:** a builder given `from`, `to`, `month` and `year`
    sends only `from` and `to`. Given `month` and `year`, it sends both. Given
    `year` alone, it sends it. Given only `from`, it sends no `from` (half a
    range is a 422).
  - `statuses: [1, 2]` becomes `"1,2"`.
  - An unknown sort is dropped.
  - `buildExcuseForm(v, {force:false})` has no `force`, and `{force:true}` has
    `force === "1"`.
  - `validateAttachments`: one assertion per message.
  - `isForceableExcuseRefusal`: true for the over-balance message; false for
    «للموظف حضور مسجّل في بعض هذه الأيام…»; false for status 403.
  - FormData is built through the global `FormData`; it exists in Node 18 and
    later.
- [ ] **Step 2:** Run `npm test`. Expect FAIL.
- [ ] **Step 3: Implement it.** The module is pure; copy `csvParam` and
  `textParam` from `auditParams.js`'s idiom.
- [ ] **Step 4:** Run `npm test`. Expect PASS.

### Task 9: Leave types screen

**Files:**
- Create: `src/sections/leave/LeaveTypes.jsx`, `src/sections/leave/LeaveTypeFormModal.jsx`
- Modify: `src/data/Routingdata.jsx` (route `leave/types`, `requiredPermissions: ["leave.types.create","leave.types.update","leave.types.delete"]`)
- Modify: `src/data/Sidemenudata.jsx` (sub group «الإجازات», icon `ri-calendar-check-line`, child «أنواع الإجازات»)

**Interfaces:**
- Produces: `<LeaveTypeFormModal show type={null|LeaveType} onHide onSaved={(type) => void} />`

- [ ] **Step 1: Build the screen.**
  - Local state; `GET /leave/types` (not paged).
  - A «عرض الأنواع الموقوفة» switch, shown only with `leave.types.update`,
    toggles `?active=0`.
  - Columns:
    - code (ltr);
    - `name_ar`;
    - `name_en`;
    - ✓/— for `deducts_balance`, `for_requests`, `for_excuses`,
      `requires_reason` and `requires_attachment`;
    - status «فعّال»/«موقوف».
  - The modal:
    - Create sends every field.
    - Edit sends only changed fields, with `code` read-only since a type keeps
      its own code.
    - A small text under the deducts switch says changing it does not change
      leave already filed.
  - Delete uses `confirmDestructive`, then `DELETE`. Toast
    `response.data.message` verbatim: it may be the "deactivated instead"
    text. Then re-read.
- [ ] **Step 2:** Run `npm run build` (success). Check by hand: create a type,
  then delete it; a used type comes back «موقوف».

### Task 10: Balances screen

**Files:**
- Create: `src/redux/actions/leaveBalancesActions.jsx`, `src/redux/redurcers/leaveBalanceReducer.jsx` (register as `leaveBalances`)
- Create: `src/sections/leave/LeaveBalances.jsx`, `src/sections/leave/EditBalanceModal.jsx`
- Modify: `Routingdata.jsx` (`leave/balances`, `["leave.balances.view"]`); `Sidemenudata.jsx` (child «الأرصدة»)

**Interfaces:**
- Consumes: `buildBalancesParams` (Task 8), `EmployeePicker`.
- Produces: the thunk `fetchBalances(page, perPage, filters)`. The state is
  `warningReducer`'s shape plus `extra: { year, default_days }` from the
  response, read from beside `meta`.

- [ ] **Step 1: Build the screen.**
  - Filters: year (default this year), employee, department and search, with
    sort on الاسم / الرقم الوظيفي.
  - Columns: employee, department, `allocated_days` (with «افتراضي» when
    `!is_custom`), `adjustment_days`, `used_days`, `remaining_days`,
    `over_balance_days` (highlighted when > 0), `non_deducting_days`, note.
  - A subtitle: «الرصيد الافتراضي: {default_days} يوماً».
  - With `leave.balances.update`, the row button «تعديل الرصيد» opens the
    modal. `allocated_days` is 0–365 and required; `adjustment_days` is
    −365…365 (default 0); `note` is ≤ 255. It sends
    `PUT /leave/balances/{employee.id}/{year}`. Field errors map to the
    inputs; the floor refusal is shown as the form's message.
- [ ] **Step 2:** Run `npm run build` (success). Check by hand: setting below
  the used days shows «لا يمكن أن يقل الرصيد…».

### Task 11: HR leave actions (excuse, undo, return to work)

**Files:**
- Create: `src/sections/leave/actions/ExcuseFormModal.jsx`, `src/sections/leave/actions/UndoExcuseModal.jsx`, `src/sections/leave/actions/ReturnToWorkModal.jsx`, `src/sections/leave/actions/BalanceNote.jsx`
- Modify: `src/sections/leave/LeaveRequest.jsx` (fill `renderHrActions`)

**Interfaces:**
- Consumes: `buildExcuseForm`, `validateAttachments` and
  `isForceableExcuseRefusal` (Task 8); `leaveActions` (Task 3);
  `EmployeePicker`.
- Produces, used later by Tasks 12, 13, 17, 19 and 20:
  - `<ExcuseFormModal show onHide onSaved={({leave_request, balance}) => void} initial={{ employee_id?, start_date?, end_date? }} />`
  - `<UndoExcuseModal show leave={LeaveRequest} onHide onDone={({leave_request, balance}) => void} />`
  - `<ReturnToWorkModal show leave={LeaveRequest|{id, employee, leave_type_name, start_date, end_date}} onHide onDone={({leave_request, cancelled, days_returned, balance}) => void} />`
  - `<BalanceNote balance />`, a one-line «المتبقي X من Y يوماً».

- [ ] **Step 1: The excuse form.**
  - Types come from `GET /leave/types?for=excuses`. The reason is required
    when the chosen type has `requires_reason`. Files are optional.
  - Submit `POST /leave/excuses` (multipart).
  - On `isForceableExcuseRefusal`, show the server message in an inline alert
    with «تسجيل رغم ذلك» / «إلغاء». Confirming resends with `force: true`.
  - On success, toast the message and call `onSaved`.
- [ ] **Step 2: The undo excuse modal.** It shows the excuse (type, dates)
  and takes an optional reason (≤ 2000). It sends
  `DELETE /leave/excuses/{id}` with `{ data: { reason } }`, and shows the
  message and `BalanceNote`.
- [ ] **Step 3: The return-to-work modal.**
  - `returned_on` is a date input, defaulting to today and clamped to
    `[start_date, end_date]` with min/max. The reason is optional.
  - It sends `POST /leave/requests/{id}/return-to-work`.
  - The success toast is the server message. When `days_returned > 0`, add
    «أُعيد {n} يوم إلى الرصيد».
- [ ] **Step 4: Wire into LeaveRequest.**
  - `returnToWork` and `undoExcuse` from `leaveActions` show the buttons.
  - `onDone` calls `applyLeave(result.leave_request)`.
- [ ] **Step 5:** Run `npm run build` (success). Check by hand on an approved
  leave: return to work mid-leave shortens it, and on the first day it
  cancels.

### Task 12: Leave register

**Files:**
- Create: `src/redux/actions/leaveRegisterActions.jsx`, `src/redux/redurcers/leaveRegisterReducer.jsx` (register as `leaveRegister`)
- Create: `src/sections/leave/LeaveRegister.jsx`, `src/sections/leave/LeaveRegisterFilters.jsx`, `src/sections/leave/RegisterSummary.jsx`
- Modify: `Routingdata.jsx` (`leave/register`, `["leave.requests.view"]`); `Sidemenudata.jsx` (child «سجل الإجازات», first in the group)

**Interfaces:**
- Consumes: `buildRegisterParams` and the enums (Task 8); the Task 11
  modals; `EmployeePicker`.
- Produces: the thunk `fetchRegister(page, perPage, filters)`. The state holds
  `meta` plus `window: {from, to}` and `summary`, read from beside `meta`.

- [ ] **Step 1: The filters.**
  - A window mode: الشهر (month + year, the default being this month),
    الفترة (from/to) or السنة. Status is multi-select, defaulting to «معتمدة»
    only; adding «قيد الاعتماد» finds stuck requests. Then type
    (multi-select), source (`EXCUSE_FILTER_OPTIONS`), employee, department,
    search and sort.
  - The filters are kept in the URL the way `Employees.jsx` keeps its own.
- [ ] **Step 2: The summary bar** from `summary`:
  - tiles for employees, requests, days, `calendar_days`, `deducted_days` and
    excuses;
  - a `by_type` table (name, requests, employees, days);
  - the window `from → to`.
- [ ] **Step 3: The rows.**
  - Columns: employee, type, «عذر» badge when `is_excuse`, from/to,
    `days_in_range` (the `calendar_days_in_range` in muted text),
    `status_label`, `decided_at`.
  - A row opens `leave/requests/{id}`.
  - Row actions: «العودة إلى العمل» or «التراجع عن العذر», by
    `leaveActions(row, permissions)`.
  - A toolbar button «تسجيل عذر» (`ProtectedElement` on
    `leave.excuses.create`) opens `ExcuseFormModal`.
  - Every success re-fetches the current page.
- [ ] **Step 4:** Run `npm run build` (success). Check by hand: a leave from
  28 May to 3 June shows 3 days in June.

### Task 13: «طلباتي»: my leave and balance

**Files:**
- Create: `src/sections/leave/myLeaveGate.js`, `src/sections/leave/myLeaveGate.test.js`
- Create: `src/redux/actions/myLeaveActions.jsx`, `src/redux/redurcers/myLeaveReducer.jsx` (register as `myLeave`)
- Create: `src/sections/leave/MyLeave.jsx`, `src/sections/leave/LeaveRequestFormModal.jsx`
- Modify: `Routingdata.jsx` (`my-leave`, `[]`); `Sidemenudata.jsx` (top-level link «طلباتي», icon `ri-file-list-3-line`, `requiresEmployee: true`, after الاعتمادات)
- Modify: `src/components/Sidebar.jsx:754-762` (the top-level filter also drops a `requiresEmployee` link when `!showsMyLeave(user)`)

**Interfaces:**
- Consumes: `buildMyLeaveParams`, `buildLeaveRequestForm` and
  `validateAttachments` (Task 8); `BalanceNote` (Task 11).
- Produces: `showsMyLeave(user) => boolean`, true when `user?.name` is a
  non-empty string. A comment cites API doc §3.4 ("`name` is null when the
  account has no employee link") and spec §8 item 5.

- [ ] **Step 1: Write the tests.** `showsMyLeave({name:"نور"})` is true;
  `{name:null}`, `{}` and `null` are false.
- [ ] **Step 2:** Run `npm test`. Expect FAIL. Implement it. Run again.
  Expect PASS.
- [ ] **Step 3: The screen.**
  - **Balance card:** `GET /me/leave-balance?year=` with a year select, showing
    allocated, used, remaining, `non_deducting_days` and
    `over_balance_days` when > 0.
  - **My requests table:** status, type, year and source filters; a row opens
    `leave/requests/{id}`, where withdrawing lives.
  - **«طلب إجازة»:**
    - Types come from `?for=requests`.
    - The reason is required by the type's `requires_reason`; files are
      required by `requires_attachment`, and `accept=".pdf,.jpg,.jpeg,.png"`.
    - `validateAttachments` runs before sending. The form sends
      `POST /me/leave-requests` (multipart).
    - Field errors map to the inputs (`attachments.N` → the files input);
      other refusals show as the form message.
    - On 201, toast and show the returned `balance` in the card. Re-fetch
      page 1.
  - **A 403 on either read** (no employee) renders `StatePanel` with the
    server message and no retry.
- [ ] **Step 4:** Run `npm run build` (success). Check by hand:
  - an account with no employee (super_admin) has no «طلباتي» link, and
    `/my-leave` shows the 403 text;
  - sick leave without a file is refused before sending.

### Checkpoint: Step 3

- [ ] Run `npm test` (all pass) and `npm run build` (success).
- [ ] Report: what was built, and the API gaps (spec §8 items 1, 5 and 6, the
  force marker). **Stop and wait for the owner.**

---

## Step 4: Attendance

### Task 14: Attendance params, payloads and enums

**Files:**
- Create: `src/redux/actions/attendanceParams.js`, `src/redux/actions/attendanceParams.test.js`, `src/data/attendanceEnums.js`

**Interfaces:**
- Produces:
  - `RECORD_TYPE_OPTIONS`: 1 حضور · 2 انصراف.
  - `REJECTION_REASON_OPTIONS`: 1 الموقع المسجَّل لا يطابق موقع العمل ·
    2 الصورة الشخصية غير صحيحة أو غير واضحة · 3 مخالفة تعليمات تسجيل الحضور.
  - `DAY_STATE_OPTIONS`: 1–8 with the §14 labels.
  - `RECORDS_SORT_KEYS`: `recorded_at, date, type, status, work_hours, created_at, rejected_at, id, employee_name, employee_number`.
  - `DAILY_SORT_KEYS`: `employee_name, department, status, check_in_time, check_out_time, work_hours`.
  - `MONTHLY_SORT_KEYS`: `employee_name, department, expected_days, present_days, on_leave_days, excused_days, excused_deducted_days, excused_not_deducted_days, absent_days, rejected_days, missing_checkouts, total_work_hours, attendance_rate`.
  - `GRID_SORT_KEYS`: `date, status, work_hours`.
  - `ABSENT_SORT_KEYS`: `employee_name, employee_number`.
  - Each sort key is also accepted with `-`.
  - `buildRecordsParams(page, perPage, f)`. The date, by precedence: `date`,
    else `from` and `to` (both), else `month` with `year`, else `year`.
    Then `type`; `missing_checkout`, `is_corrected` and `rejected`
    (`"1"`/`"0"`, omitted when empty); `rejection_reason`; the person filters
    (`employee_id`, `department_id`, `search`); `sort`.
  - `buildDailyParams(f)` sends `date` and `sort` plus the person filters.
  - `buildMonthlyParams(f)` sends `from` and `to` (both) or `month` and
    `year`; `has_absences` and `has_missing_checkouts` (`"1"` when true); the
    person filters; `sort`.
  - `buildEmployeeGridParams(employeeId, f)` sends `employee_id` always;
    `from`/`to` or `month`/`year`; `status`; `working_days_only` (`"1"`);
    `sort`.
  - `buildAbsentParams(page, perPage, f)` sends `date`, the person filters
    and `sort`.
  - `rangeTooLong(from, to, maxDays = 92) => boolean`. It is inclusive and
    computed on UTC dates.
  - `validateReject({reason, note}) => { reason?: string, note?: string }`.
    No reason gives «يجب اختيار سبب الرفض.». Reason 3 with an empty note gives
    «الملاحظة مطلوبة عند اختيار هذا السبب.». A note over 500 characters gives
    «الملاحظة يجب ألا تتجاوز 500 حرف.».
  - `buildCheckoutCorrection({date, time, note}) => { checked_out_at, note? }`.
    `checked_out_at` is `"${date}T${time}:00+03:00"`, Damascus, as every
    stored time (API doc §1).
  - `gridDayActions(day, permissions) => { correct, excuse, undoExcuse }`:
    - `correct` is `status === 3 && check_in_id` and holds
      `attendance.records.correct`;
    - `excuse` is `status === 6` and holds `leave.excuses.create`;
    - `undoExcuse` is `status === 5 && excuse?.is_excuse && excuse.leave_request_id`
      and holds `leave.excuses.delete`.

- [ ] **Step 1: Write the tests.**
  - Untouched filters send only the page.
  - **Date precedence:** `date` beats `from`/`to`.
  - `buildMonthlyParams` with `month` only sends `month` and `year` (the
    current year when absent).
  - `rangeTooLong("2026-06-01","2026-08-31")` is false (92 days);
    `…"2026-09-01"` is true.
  - `validateReject` gives each message.
  - `buildCheckoutCorrection({date:"2026-06-21", time:"16:30"})` gives
    `{checked_out_at:"2026-06-21T16:30:00+03:00"}`.
  - `gridDayActions`: one case per action, plus a day with no permissions
    giving nothing.
- [ ] **Step 2:** Run `npm test`. Expect FAIL.
- [ ] **Step 3: Implement it.** The module is pure.
- [ ] **Step 4:** Run `npm test`. Expect PASS.

### Task 15: Record actions (selfie, refuse, undo, correct)

**Files:**
- Create: `src/sections/attendance/actions/SelfieModal.jsx`, `src/sections/attendance/actions/RejectRecordModal.jsx`, `src/sections/attendance/actions/CorrectCheckoutModal.jsx`, `src/sections/attendance/actions/undoRejection.js`

**Interfaces:**
- Consumes: `fetchBlobUrl` (Task 2); `validateReject` and
  `buildCheckoutCorrection` (Task 14).
- Produces:
  - `<SelfieModal show recordId onHide />`. It reads
    `/attendance/records/{id}/selfie`, revokes on hide, and shows a 404 as the
    server message.
  - `<RejectRecordModal show record={{id, employee, recorded_at, type_label}} onHide onDone={({record, rejected_records}) => void} />`
    sends `PATCH /attendance/records/{id}/reject` `{reason, note?}`.
  - `undoRejection(record) => Promise<{record, restored_records}|null>`
    confirms via `confirmDestructive` («التراجع عن الرفض»), then sends
    `DELETE /attendance/records/{id}/reject`, then toasts the message. It
    returns null when the dialog is cancelled. A 422 is toasted and rethrown.
  - `<CorrectCheckoutModal show checkIn={{id, employee, recorded_at}} onHide onDone={({check_in, check_out}) => void} />`
    takes the date (fixed to the check-in's day, editable), the time and an
    optional note. It sends `PATCH /attendance/records/{id}/checkout`.

- [ ] **Step 1: Build the modals.** Their messages are the spec's. Every
  success toasts `response.data.message`.
- [ ] **Step 2:** Run `npm run build`. Expect success.

### Task 16: Records list

**Files:**
- Create: `src/redux/actions/attendanceRecordsActions.jsx`, `src/redux/redurcers/attendanceRecordReducer.jsx` (register as `attendanceRecords`)
- Create: `src/sections/attendance/AttendanceRecords.jsx`, `src/sections/attendance/AttendanceRecordFilters.jsx`
- Modify: `Routingdata.jsx` (`attendance/records`, `["attendance.records.view"]`); `Sidemenudata.jsx` (sub group «الحضور والانصراف», icon `ri-fingerprint-line`, children: السجلات، التقرير اليومي، التقرير الشهري، الغائبون اليوم; this task adds the first)

**Interfaces:**
- Consumes: `buildRecordsParams` (Task 14) and the Task 15 actions.
- Produces: the thunk `fetchAttendanceRecords(page, perPage, filters)`.

- [ ] **Step 1: The filters.** A date mode (يوم, the default today, or
  فترة or شهر), type, three tri-state selects (missing check-out, corrected,
  rejected), the rejection reason (shown when rejected = 1), employee,
  department, search and sort. They are kept in the URL.
- [ ] **Step 2: The rows.**
  - Columns:
    - the employee (name and number);
    - `type_label`;
    - `recorded_at`;
    - `work_hours_formatted`;
    - `source_label`;
    - badges: «انصراف مفقود» when `status === 1`, «مصحَّح» with
      `corrected_by.name` and `correction_note` in a tooltip, «مرفوض» with
      `rejection_reason_label`, `rejection_note` and `rejected_by.name`.
  - Row actions:
    - a selfie button when `has_selfie`;
    - رفض (`attendance.records.reject`, not rejected);
    - التراجع عن الرفض (rejected);
    - تصحيح الانصراف (`attendance.records.correct`, `type === 1`,
      `status === 1`, not rejected).
  - After any action, re-fetch the current page. The response's arrays may
    name rows on other pages.
- [ ] **Step 3:** Run `npm run build` (success). Check by hand: refusing a
  check-in also marks that day's check-out as refused.

### Task 17: Daily board

**Files:**
- Create: `src/sections/attendance/AttendanceDaily.jsx`, `src/sections/attendance/DailySection.jsx`
- Modify: `Routingdata.jsx` (`attendance/daily`, `["attendance.records.view"]`); `Sidemenudata.jsx` (child «التقرير اليومي»)

**Interfaces:**
- Consumes: `buildDailyParams`; the Task 15 actions; `ReturnToWorkModal` and
  `UndoExcuseModal` (Task 11), passed
  `{id: row.leave_request_id, employee: row.employee, leave_type_name: row.leave_type_name, start_date: row.start_date, end_date: row.end_date}`.

- [ ] **Step 1: Build the screen.**
  - A date picker (today), the person filters and a sort select.
  - Summary tiles from `summary`. Show «يوم عطلة» when `working_day` is false.
  - `DailySection` per bucket, in this order: checked_in, checked_out,
    missing_checkout, rejected, on_leave, excused. `present` is the sum of
    the first two and is not rendered twice.
  - **Attendance rows:**
    - the employee, the department, check-in and check-out times and the
      hours;
    - selfie buttons per `*_has_selfie`, using `record_id` and
      `check_out_record_id`;
    - `correction` and `rejection` details;
    - actions on `record_id`: refuse, undo refusal (rejected bucket, by
      `rejection.record_id`), and correct (missing_checkout bucket).
  - **Leave rows:** type, from/to, `approved_by` or the excuse's
    `recorded_by`. on_leave rows offer «العودة إلى العمل» when
    `!is_excuse && returnToWork` is held; excused rows offer «التراجع عن
    العذر».
  - A toolbar «تسجيل عذر» opens `ExcuseFormModal`. After any action,
    re-fetch.
- [ ] **Step 2:** Run `npm run build`. Expect success.

### Task 18: Monthly report

**Files:**
- Create: `src/sections/attendance/AttendanceMonthly.jsx`
- Modify: `Routingdata.jsx` (`attendance/monthly`); `Sidemenudata.jsx` (child «التقرير الشهري»)

**Interfaces:**
- Consumes: `buildMonthlyParams` and `rangeTooLong` (Task 14).
- Produces: links to `hr/employees/{id}?tab=attendance&from=…&to=…` (Task 19
  reads them).

- [ ] **Step 1: Build the screen.**
  - Month + year (this month) or a range. Over 92 days, block it inline with
    «الفترة لا يجب أن تتجاوز 92 يوماً.» and send nothing.
  - The two row filters, the person filters, and sortable column headers
    (`MONTHLY_SORT_KEYS`).
  - Columns: every count, `total_work_hours_formatted` and
    `attendance_rate` %.
  - A totals row from `totals`.
  - A row click opens the profile tab with the report's `from` and `to`
    (only with `hr.employees.view`; otherwise rows are not clickable).
  - The report is not paged, as the API says.
- [ ] **Step 2:** Run `npm run build`. Expect success.

### Task 19: Profile «الحضور» tab

**Files:**
- Create: `src/sections/attendance/EmployeeAttendance.jsx`
- Modify: `src/sections/hr/EmployeeProfile.jsx:53-97,280-322` (a tab `attendance`, «الحضور», shown with `attendance.records.view`; the initial tab comes from `?tab=`)

**Interfaces:**
- Consumes: `buildEmployeeGridParams`, `gridDayActions` and `rangeTooLong`
  (Task 14); `CorrectCheckoutModal` (Task 15); `ExcuseFormModal` and
  `UndoExcuseModal` (Task 11).
- Produces: `<EmployeeAttendance employee={Employee} initialFrom initialTo />`.

- [ ] **Step 1: Build the tab.**
  - The range defaults to this month, or `?from`/`?to` when given. Add a
    status filter and «أيام العمل فقط».
  - `summary` tiles cover the whole range, with a label saying so.
  - The day list:
    - date and weekday name;
    - `status_label`;
    - in/out times and hours;
    - `leave_type`;
    - `rejection`, `correction` and `excuse` details.
  - Actions by `gridDayActions`:
    - correct uses `check_in_id`;
    - «تسجيل عذر» prefills `{employee_id, start_date: day.date, end_date: day.date}`;
    - undo builds `{id: excuse.leave_request_id, leave_type_name: excuse.leave_type_name}`.
  - Re-read after each.
  - A 403 out_of_scope renders in `StatePanel`.
- [ ] **Step 2:** Run `npm run build` (success). Check by hand: a monthly row
  opens this tab with the same window.

### Task 20: Absent today

**Files:**
- Create: `src/sections/attendance/AbsentToday.jsx`
- Modify: `Routingdata.jsx` (`attendance/absent-today`); `Sidemenudata.jsx` (child «الغائبون اليوم»)

- [ ] **Step 1: Build the screen.**
  - Local paged state (`buildAbsentParams`): a date picker (today), the
    person filters and a sort on name or number.
  - Columns: employee and department.
  - A row action «تسجيل عذر» (`leave.excuses.create`) prefills the employee
    and the date.
  - After saving, re-fetch: the person drops off the list.
- [ ] **Step 2:** Run `npm run build`. Expect success.

### Checkpoint: Step 4 (and done)

- [ ] Run `npm test` (all pass) and `npm run build` (success). Run
  `npm run lint` and fix findings in new files only.
- [ ] Run a whole-change review (superpowers:requesting-code-review) over the
  uncommitted diff of this plan's files.
- [ ] Report to the owner. Cover:
  - each step's result;
  - the API gaps (spec §8, plus 6: the over-balance excuse refusal has no
    machine-readable marker);
  - the follow-ups in spec §9;
  - the file list.

  **Commit nothing**; the owner decides how to commit.
