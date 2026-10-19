# Approvals, leave and attendance in the dashboard: design

2026-10-19. Brings the dashboard up to the backend at `5e302f5` (work order
§4.5–§4.7). API contract: `API_DOCUMENTATION.md` §12–§16, synced from that
revision.

## 1. What this is for

Managers approve leave in the dashboard as well as in the app (decision of
2026-10-14). HR runs leave and attendance oversight here. The screens replace
the legacy dashboard's leave page, leave register, balances, types and
attendance pages, using the ERP's contract. Legacy is the behavioural reference,
not the shape: every enum is an int with its server `_label`, lists page by 15,
and the server decides every scope.

**The owner's decisions (2026-10-19)**

| Question | Answer |
|---|---|
| Employee self-service in the dashboard | **Yes, a «طلباتي» area**: file and withdraw one's own leave, plus one's balance |
| What «طلباتي» holds | **Leave and balance only.** Attendance self-service stays in the app (selfie and location) |
| Where HR's leave actions live | **Both places:** on the attendance screens where the day appears, and on the leave request screen |
| The per-employee attendance report | **A «الحضور» tab on the employee profile**, also opened from a monthly-report row |
| Approver screen vs leave screen | **One screen** per leave request, for everyone |
| Approve / reject from an inbox row | **No.** Only on the request screen, after the live state has been seen |
| An inbox count in the sidebar | **No badge.** `approval.step_pending` already raises the notification badge, and nothing else is polled |
| Sidebar | الاعتمادات · طلباتي · الحضور والانصراف (4) · الإجازات (3), as §3 |

**Out of scope:** the XLSX exports (they wait), and the attendance "schedules".
The schedules are server-side commands with no API. Check-in from the
dashboard is also out.

## 2. Groundwork (lands with step 2)

- **`data/permissionsCatalog.js`** gains three groups with the seeder's labels
  (`PermissionSeeder.php:160-173`): الحضور (3), الاعتمادات (2) and الإجازات (9).
  `HONOURED_FROM_SCOPED_GRANT` gains the 11 that are row-scoped; all of them
  except `leave.types.*` (`PermissionReach::ROW_SCOPED`). The role matrix then
  shows them with no change to the roles screen.
- **`utils/fetchBlob.js`** reads a streamed file (a selfie or an attachment)
  through `api` as a blob and returns an object URL. The API never hands out
  URLs for private files. It revokes the URL on unmount, and a 404 is shown
  as the server's own message («لا توجد صورة لهذا السجل.»).
- **`components/EmployeePicker.jsx`** is a searchable react-select over
  `GET /api/hr/employees`, walked by `useResourceOptions` as the warning and
  user forms already do (about 3 requests for 242 people). The excuse form and reassign use it, and so
  does the person filter on the attendance and leave lists. It needs
  `hr.employees.view` (the API doc says so for reassign). Without that
  permission the picker is not rendered, and the person filter falls back to
  `search` text.
- **A department filter** reuses `useResourceOptions` on `/departments`. That
  is a catalogue read, available from any grant. The API includes each unit's
  subtree.
- **`data/leaveEnums.js`, `data/attendanceEnums.js`** hold option lists for
  filter and form controls only. They are never used for display, which always
  uses `_label` (the `hrEnums.js` rule).

## 3. Routes and sidebar

| Path | Screen | Gate |
|---|---|---|
| `approvals` | ApprovalsInbox | auth only (approving is not a permission) |
| `my-leave` | MyLeave | auth only; hidden for an account with no employee |
| `leave/requests/:id` | LeaveRequest (the one request screen) | auth only; the server decides (403 / out_of_scope shown in place) |
| `leave/register` | LeaveRegister | `leave.requests.view` |
| `leave/balances` | LeaveBalances | `leave.balances.view` |
| `leave/types` | LeaveTypes | any of `leave.types.create/update/delete` |
| `attendance/records` | AttendanceRecords | `attendance.records.view` |
| `attendance/daily` | AttendanceDaily | `attendance.records.view` |
| `attendance/monthly` | AttendanceMonthly | `attendance.records.view` |
| `attendance/absent-today` | AbsentToday | `attendance.records.view` |
| `hr/employees/:id` → «الحضور» tab | EmployeeAttendance | `attendance.records.view` |

The sidebar has two flat links, الاعتمادات and طلباتي, then two groups:
الحضور والانصراف (السجلات، التقرير اليومي، التقرير الشهري، الغائبون اليوم) and
الإجازات (سجل الإجازات، الأرصدة، أنواع الإجازات). Each entry is filtered by its
gate as today. A group with nothing left is hidden.

"No employee" is read from `/auth/me`'s `name`, which is null exactly when the
account has no employee link (API doc §3.4). The `/me/*` 403 «لا يوجد موظف مرتبط
بهذا الحساب.» is still handled in place, in case the two disagree.

## 4. Step 2: approvals

**ApprovalsInbox** has two tabs, «بانتظار قراري» (`GET /api/me/approvals`) and
«قراراتي» (`?status=decided`). Each row shows the requester, the subject's
`title` and `summary`, the step order, and `submitted_at` (with `acted_at` and
`status_label` on the decided tab). It is a paged table with no filters,
because the API takes none. A row opens the request screen by its subject:
`leave_request` maps to `leave/requests/{subject.id}`. A subject type with no
screen yet (documents, in November) shows its title with no link.

**LeaveRequest** (`leave/requests/:id`) reads `GET /api/leave/requests/{id}`,
which every party may read: the employee, anyone on the chain, and
`leave.requests.view` within reach. It draws:

- the leave: type, dates, `requested_days`, reason, status, origin (a request
  or an HR excuse), the cancelled / shortened fields when set, and the files
  (downloaded through `fetchBlob`, under their original name);
- the **chain** from the embedded `approval`: steps in `step_order` (parallel
  steps side by side), each with approver, status, `skip_reason_label`,
  `acted_by`, `acted_at` and note; then the reassignment log;
- the **actions**, each shown only when its flag or permission says so:

| Action | Shown when | Call |
|---|---|---|
| موافقة / رفض, with an optional note (≤ 500) | `approval.can_act` | `POST /api/approvals/{id}/steps/{current_step_id}/approve` or `/reject` |
| إعادة إسناد (employee + reason 3–500) | `approval.can_reassign` | `PATCH …/steps/{step}/assignee`, on a pending step the user picks |
| سحب الطلب | `approval.can_withdraw` (the requester) | `POST /api/me/leave-requests/{id}/cancel`, the leave's own cancel (§16.3) |
| العودة إلى العمل | approved, not an excuse, `leave.requests.returnToWork` | §16.7 |
| التراجع عن العذر | an excuse (`origin` 2), approved, `leave.excuses.delete` | §16.6 |

**The live state:** every action response carries the fresh approval or leave
object, and the screen redraws from it, never from a cached copy. A 422 such as
«ليس دورك في اعتماد هذا الطلب.» is shown, and the screen then re-reads, so a
decision someone else took a moment earlier replaces the stale buttons.

**Notifications** (`notificationDestinations.js` `BY_TYPE`):

- `approval.step_pending` and `approval.step_assigned` open
  `leave/requests/{reference.id}` when `reference.type` is `leave_request`;
  any other reference type gets null (the full text).
- `leave.submitted`, `leave.approved`, `leave.rejected` and `leave.cancelled`
  open the same screen.
- `leave.excuse_*`, `leave.returned_to_work` and `attendance.*` keep the full
  text, as the contract's dashboard column says.

## 5. Step 3: leave

- **MyLeave** («طلباتي»): a balance card (`GET /api/me/leave-balance`, with a
  year picker) and my requests (`GET /api/me/leave-requests`, paged, with
  status, type, year and the excuse filter). There is a «طلب إجازة» form:
  types from `?for=requests`, dates, a reason when the type requires it, and
  up to 5 PDF/JPG/PNG files of at most 10 MB each, required when the type says
  so. The form is sent as multipart, and every 422 maps to its field or is
  shown as the message. A row opens the request screen, and withdrawing is
  there.
- **LeaveTypes**: a table of the active types, with a toggle for the retired
  ones (`?active=0`, which needs `.update`). A create / edit modal covers
  every field. Delete uses the server's own outcome message, which may be
  "deactivated instead".
- **LeaveBalances**: a paged list for a year, with the person and department
  filters. «تعديل الرصيد» (`leave.balances.update`) opens a modal for the
  allocation (0–365), the adjustment (−365…365) and a note. The modal shows the
  server's floor refusal as it comes.
- **LeaveRegister**: a window (a month by default; from/to, month+year or a
  year, at most 366 days), status (approved by default; pending can be added,
  which is how HR finds a stuck request), type, excuse and person filters, and
  the paged rows with `days_in_range`. A summary bar is computed over the
  whole set (`meta.summary`: totals, by type, by status). Rows open the
  request screen.
- **The excuse form** (`ExcuseFormModal`, `leave.excuses.create`) takes the
  employee, a type from `?for=excuses`, dates, a reason when required, and
  optional files. When the server refuses with the over-balance message, the
  form asks «تسجيل رغم ذلك؟» and resends with `force: true`. The refusal for a
  day the employee attended is shown as it is (`force` never overrides it).
  The form is opened from AbsentToday, the daily board, the employee grid's
  absent days (prefilled), and from the register's toolbar.
- **Undo excuse / return to work** are confirm dialogs with an optional reason
  (return to work also has a `returned_on` date, today by default). They show
  the server's message and the returned `balance`. They are offered on the
  request screen, on the register rows, and on the attendance screens where
  the row carries a `leave_request_id` (§6).

## 6. Step 4: attendance

- **AttendanceRecords**: a paged list (today by default) with the §13.1
  filters: date or range, type, missing check-out, corrected, rejected and the
  rejection reason, plus the person, department and sort. Each row offers:
  - **the selfie** (`fetchBlob`, in a modal; "no selfie" for a corrected
    check-out);
  - **رفض** (`attendance.records.reject`): reason 1–3, with a note required
    for 3;
  - **التراجع عن الرفض** on a rejected row;
  - **تصحيح الانصراف** (`attendance.records.correct`) on a check-in with a
    missing check-out: `checked_out_at` and a note.

  After an action the rows the decision touched are redrawn
  (`rejected_records` / `restored_records`).
- **AttendanceDaily**: a date picker; summary tiles; and one section per
  bucket (checked in, checked out, missing check-out, rejected, on leave,
  excused). Present rows take the same record actions via `record_id`.
  On-leave rows offer return to work, and excused rows offer undo excuse, both
  through `leave_request_id`.
- **AttendanceMonthly**: from/to or month+year (at most 92 days), the two row
  filters, person filters, sortable columns, and the totals row. A row opens
  that employee's «الحضور» tab with the same window.
- **EmployeeAttendance** (the profile tab): a range picker, a status filter,
  the working-days toggle, the `summary` tiles, and the day list. A day with
  `check_in_id` and status 3 offers the check-out correction. An absent day
  offers «تسجيل عذر» (prefilled). An excused day offers undo through
  `excuse.leave_request_id`. Rejection and correction details are shown inline.
- **AbsentToday**: a date picker, a paged list, and the person filters. Each
  row offers «تسجيل عذر».

## 7. State, errors, tests

- **State follows the house split.** Lists that page get a redux slice in the
  pattern of `warningsActions` and `warningReducer`, with request ids so a
  stale response is dropped. One-off reads (a request screen, a report) keep
  local state, like `Sessions.jsx`. Query parameters are built by **pure
  modules** (`approvalsParams.js`, `leaveParams.js`, `attendanceParams.js`),
  as `auditParams.js` is.
- Every failure shows the server's Arabic `message` (`parseApiError`), and
  422 `errors` map to fields. A 403 `out_of_scope` on a screen is shown in
  place, not toasted.
- Times use `auditFormat`'s `formatAbsolute`. Plain dates are shown verbatim.
- **Tests (`node --test`)** cover the parameter builders (window precedence,
  CSV ids, sort keys); the payload builders (the multipart for a leave
  request or excuse, and the reject note rule); the action-visibility rules
  for the request screen; and the notification destinations for every new
  type.
- **Each step ends with `npm test` and `npm run build` green, and a short
  report** of what was built and what the API lacked.

## 8. What the API lacks (reported, not worked around)

1. API_DOCUMENTATION §2 still lists 30 permissions. The 14 new ones are only in
   the seeder, which is where this design takes their labels from.
2. `GET /api/me/approvals` takes no filter and no sort.
3. There is no list of all pending approvals for `approvals.view`. HR finds a
   stuck leave through the register, which needs `leave.requests.view`.
4. The employee day grid gives an on-leave day only the type's name and no
   `leave_request_id`, so return to work is not offered from the grid (it is
   on the daily board, the register and the request screen).
5. `/auth/me` has no `employee_id`. «طلباتي» relies on `name` being null for an
   unlinked account, which the doc states.
6. The over-balance excuse refusal (§16.5) has no `errors` key and no code,
   only its message, which ends «أرسل force لتسجيله رغم ذلك.» The excuse form
   detects it by that text, in one tested function. The message also shows
   the word `force` to HR.

## 9. Noticed, outside this work

- The audit log does not know the new record types (`attendance_record`,
  `approval*`, `leave_*`, `attachment`). They render as unknown types.
  `auditEvents.js` needs entries for them.
- GAP-20: the users form should warn that deactivating an account or resetting
  its password signs it out everywhere, including the admin's own account.
  `UserFormModal.jsx` currently has someone else's uncommitted changes, so it
  is left alone here.
