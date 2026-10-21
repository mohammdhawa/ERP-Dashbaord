# ERP Dashboard — Complete Manual Test Scenarios

**Baseline:** `phase_1` at `291cce0` on 2026-09-28

**Test surface:** the browser dashboard only. Do not call, replay, or modify API requests. Browser DevTools may be used only to observe requests, console errors, storage, focus, and responsive layout.

**Purpose:** a release-regression pack for every user-reachable route, permission gate, action, form rule, empty/error state, responsive state, and cross-module workflow currently represented in the dashboard source.

> “Complete” here means complete coverage of the current reachable dashboard behavior and its documented data states. It does not mean every mathematical permutation of every field. Re-run the inventory whenever routes, permissions, fields, or backend rules change.

## 1. How to run this pack

Run against a non-production environment. Record each scenario as **Pass**, **Fail**, **Blocked**, or **Not applicable**. A scenario passes only when every expected result is observed. For failures, capture the route, account, time, entered values, screenshot/video, visible message, console error, and the observed request status if DevTools was already open.

Do not manufacture results with Postman, cURL, Swagger, the browser console, direct database edits, or DevTools request replay. Test-data states that cannot be created through the dashboard must be prepared by the environment owner before execution; the tester still verifies them only through the dashboard.

Recommended run order:

1. Prepare accounts and data in section 2.
2. Run global, authentication, and authorization scenarios first.
3. Run master-data modules before employee workflows.
4. Run notifications and audit last so earlier actions produce evidence.
5. Finish with cross-browser, responsive, accessibility, and end-to-end regression journeys.

## 2. Required test matrix

### 2.1 Accounts

| Account ID | Required state |
|---|---|
| `A-SUPER` | Active `super_admin`; company scope; all permissions. |
| `A-FULL` | Active non-system administrator with every non-super-admin permission at company scope. |
| `A-VIEW` | Active account with view permissions only for all modules and no create/update/delete/assign/value permissions. |
| `A-HR-UNIT` | Employee-linked account with employee/assignment/warning permissions scoped to one unit subtree. |
| `A-HR-MANAGED` | Employee-linked manager with HR permissions at managed-units scope and at least one managed department. |
| `A-AUDIT-BASIC` | `auth.audit.view` only. |
| `A-AUDIT-VALUES` | Audit view/value permissions plus company-wide view permissions needed to reveal audited module values; include salary permission for salary-value checks. |
| `A-NOROLE` | Active account with no role grants. |
| `A-MUSTCHANGE` | Active account whose temporary/admin-reset password requires a password change. |
| `A-DISABLED` | Disabled account with known credentials. |
| `A-LIMITED-GRANTER` | Role assignment permission plus a deliberately limited set of permissions it actually holds. |

Keep two ordinary active accounts available for cross-tab and “do not disable/delete yourself” tests. Never use the sole recoverable administrator for destructive scenarios.

### 2.2 Data

Prepare through the dashboard wherever possible:

- A four-level department hierarchy: root, division, section, and office; a second branch outside the scoped accounts; active and inactive records; managers; one parent with children; and enough rows for two pages.
- Active, inactive, described, undescribed, referenced, and unreferenced job titles; at least one title with default activity/grade suggestions.
- Employees inside and outside each scoped account’s reach; active, suspended, and terminated employees; linked managers; records with and without optional values; engineering and industrial classifications; at least 11 employees for pagination.
- Users linked to employees, one unlinked user, active and disabled users, multiple scoped grants, and enough users for pagination.
- Editable custom roles, an unused deletable role, a used role, and system roles.
- Current, historical, open-ended, embedded, and legacy assignment examples; warnings with and without an issuer.
- Read and unread notifications, supported and unsupported reference types, and more than one notification page.
- Audit entries for create/update/delete/auth/request/security events, null/empty/absent values, foreign keys, enums, booleans, JSON, and salary fields.

Ask the environment owner to pre-seed these otherwise hard-to-create UI states: a soft-deleted related employee/user, a deleted manager or issuer reference, an orphan department, a legacy/orphaned role grant, a legacy imported assignment, an unknown audit event, an unknown audit actor/target, a redacted audit value, and an account with no managed units. Label those records clearly as QA fixtures.

### 2.3 Result record

| Field | Record |
|---|---|
| Build/commit | |
| Environment URL | |
| Browser and version | |
| Viewport/zoom | |
| Account ID | |
| Scenario ID | |
| Result | Pass / Fail / Blocked / N/A |
| Actual result | |
| Evidence | Screenshot/video/log reference |
| Defect ID | |

## 3. Authentication, session, and account state

| ID | Scenario and steps | Expected result |
|---|---|---|
| AUTH-001 | Open a protected deep link while signed out. | The sign-in page appears; protected content does not flash. After a successful sign-in, navigation reaches an authorized destination. |
| AUTH-002 | Sign in once using an employee number and once using an email. | Both accepted identifiers authenticate the same eligible account and land on the dashboard. |
| AUTH-003 | Submit with both sign-in fields empty, then each field empty separately. | Required feedback is visible and submission is blocked or safely rejected without leaving the page. |
| AUTH-004 | Enter a syntactically unusual login value and a wrong password. | The UI does not pretend to validate an email-only format; it shows the generic invalid-credentials state and exposes no account-existence detail. |
| AUTH-005 | Use a valid login with a wrong password. | A 401 is represented by a clear generic error; password is not cleared or exposed unexpectedly; protected content is not shown. |
| AUTH-006 | Trigger server-side validation with an invalid submitted combination. | Any 422 field messages appear beside the corresponding fields; focus/error association is understandable. |
| AUTH-007 | Make five failed attempts within the configured minute, then try again during the lockout and after its countdown. | The 429/rate-limit state shows a retry countdown, disables retry while required, then permits a new attempt when the wait ends. |
| AUTH-008 | Sign in as `A-DISABLED`. | A dedicated disabled-account page/state appears rather than the generic credential error; no authenticated navigation is available. |
| AUTH-009 | Toggle password visibility twice before sign-in. | The input alternates between masked and visible without changing the value or moving focus unexpectedly. |
| AUTH-010 | Toggle light/dark mode on the sign-in screen, refresh, and sign in. | Theme changes immediately and persists across refresh and into the authenticated shell. |
| AUTH-011 | Sign in as `A-MUSTCHANGE`. Try browser Back, direct dashboard URL, and another protected URL before changing the password. | The standalone change-password screen is enforced; normal authenticated pages and their data cannot be used. |
| AUTH-012 | On required password change, test missing current password, new passwords of 7 and 129 characters, same-as-current password, and mismatched confirmation. | Each invalid case is rejected with specific field feedback; no password is changed. |
| AUTH-013 | Enter the wrong current password on the change-password page. | The current-password field receives the authentication error; the new password remains masked and no success state is shown. |
| AUTH-014 | Complete a valid required password change, then try the old password in another browser. | The new credentials work, the old password fails, other sessions are revoked, and fresh authenticated navigation works. |
| AUTH-015 | From the profile menu, perform a voluntary valid password change. | The same validation applies, success is clearly confirmed, and other sessions are invalidated as designed. |
| AUTH-016 | Refresh an authenticated protected page. | The session bootstraps without a false sign-in redirect or protected-data flash; the same route is restored when authorized. |
| AUTH-017 | Leave the app idle until the access token needs renewal, then perform a normal dashboard action. | Silent renewal keeps the session usable without duplicate errors or a visible token prompt. |
| AUTH-018 | Open the app in two tabs under the same account and let both become eligible for token renewal. | Tabs remain consistent; renewal does not create a request storm, repeated logout, or corrupt session. |
| AUTH-019 | Log out in tab 1 while tab 2 is open. | Both tabs lose authenticated access promptly; Back/refresh cannot reveal protected content. |
| AUTH-020 | Arrange an invalid/expired refresh session, then refresh or perform an action. | The user reaches `/session-expired`, receives an understandable explanation/action, and cannot keep using stale protected data. |
| AUTH-021 | While authenticated, navigate directly to `/signin`. | The app redirects to the authenticated home instead of offering a second login. |
| AUTH-022 | Sign out from the profile menu, then use Back and reload. | Tokens/session state are cleared, the sign-in page remains authoritative, and cached protected screens are not usable. |
| AUTH-023 | Disconnect the browser network while signed in, then reconnect. | A clear offline banner/state appears; the shell does not crash; recovery removes the banner and subsequent UI actions work. |
| AUTH-024 | Inspect local browser storage before login, after login, after refresh, and after logout. | Only the intended refresh/session coordination and preferences are persisted; the access token is not left in local storage; logout removes authentication artifacts. |

## 4. Routing, shell, navigation, and dashboard home

| ID | Scenario and steps | Expected result |
|---|---|---|
| NAV-001 | Visit each route from the sidebar and by direct URL. | Dashboard `/`, Departments `/departments`, Employees `/hr/employees`, Job Titles `/hr/job-titles`, Users `/users`, Roles `/roles`, Audit `/audit-log`, and Notifications `/notifications` render their correct pages when authorized. |
| NAV-002 | Visit `/hr/employees/{valid-id}` directly and from an employee row. | The same employee profile loads in both paths; Back returns predictably. |
| NAV-003 | Visit an unknown URL. | A branded 404 state appears with a safe way back; no unrelated page or stack trace is exposed. |
| NAV-004 | As `A-NOROLE`, try permission-gated URLs directly. | Each route resolves to `/no_access` or the access-denied page; data does not flash and browser Back cannot bypass the gate. |
| NAV-005 | As a user lacking one module permission, inspect the sidebar and dashboard tiles, then type that module URL. | Its sidebar item/tile is absent and the direct route is denied. Auth-only Notifications and Dashboard remain available. |
| NAV-006 | Expand and collapse the HR and System sidebar groups; navigate among their children. | Group state and active-child highlighting are coherent, only one intended target opens, and labels/icons remain aligned in RTL. |
| NAV-007 | Collapse the desktop sidebar, hover it, navigate, and expand it again. | The collapsed form remains usable, hover behavior does not cover essential controls incorrectly, and the chosen state is visually clear. |
| NAV-008 | At 991 px and below, open the sidebar, use the backdrop, select an item, and press Escape if supported. Repeat at 992 px. | Mobile overlay/backdrop behavior works below the breakpoint, closes after navigation, and transitions to the desktop layout at 992 px without trapped overlays. |
| NAV-009 | Use the header sidebar control repeatedly during navigation and loading. | No duplicate overlay, layout jump, or unreachable content occurs. |
| NAV-010 | Open the profile dropdown, notification dropdown, and another header control; click inside and outside them. | Dropdowns do not close on legitimate internal interaction, close on intended outside/navigation actions, and do not overlap incorrectly. |
| NAV-011 | Use the keyboard from the top of a page and activate the skip link. | Focus moves to the main landmark; the focused target is visible and screen content is not obscured. |
| NAV-012 | Navigate all shell controls using Tab, Shift+Tab, Enter, Space, and Escape. | Focus order is logical, visible focus is never suppressed, controls have useful accessible names, and overlays do not trap focus after closing. |
| NAV-013 | Navigate through every route and inspect the browser/tab title. | The title reflects the current screen and does not remain stale after client-side navigation. |
| NAV-014 | Switch light/dark theme from the authenticated header, reload, sign out, and sign back in. | Theme is applied consistently to shell, tables, forms, modals, errors, and sign-in; preference persists. |
| NAV-015 | On Arabic data, inspect headings, inputs, icons, badges, dates, numbers, and mixed Latin identifiers. | RTL flow is correct while codes, email addresses, IDs, and numeric content remain readable. |
| NAV-016 | Sign in as an account with no module-view permission. | Dashboard shows its no-module-access guidance instead of empty/broken protected tiles; Notifications remains reachable. |
| HOME-001 | Sign in as `A-FULL`. | Greeting uses the current account/employee name; role labels are accurate; all authorized module tiles are visible. |
| HOME-002 | Sign in as `A-NOROLE`. | A clear no-role/no-module state appears; the page does not invent roles. |
| HOME-003 | Compare Dashboard tiles for view-only, scoped, and full accounts. | Departments, Employees, Users, and Roles tiles appear strictly by their view permissions; tile navigation respects the same guards. |
| HOME-004 | Create/read notifications, then click the unread summary/link on Dashboard. | The unread value is current enough for the UI design and the link opens Notifications. No unsupported “live statistics” are implied. |

## 5. Permission and scope enforcement from the UI

| ID | Scenario and steps | Expected result |
|---|---|---|
| ACL-001 | For every permission-gated route, compare `A-VIEW`, a user without view access, and `A-FULL`. | View access controls both navigation visibility and direct-route rendering; unauthorized data never flashes. |
| ACL-002 | For Departments, Employees, Job Titles, Users, Roles, Assignments, and Warnings, compare accounts missing create/update/delete permission. | The corresponding buttons/actions are absent or disabled with a meaningful reason; row clicks do not become a hidden mutation path. |
| ACL-003 | Sign in as `A-HR-UNIT`; compare employees in the selected unit, its descendants, a sibling branch, and a parent branch. | Unit scope includes the selected subtree only. Out-of-scope records/actions/fields follow the designed denial or redaction state. |
| ACL-004 | Sign in as `A-HR-MANAGED`; add/remove a department managed by its linked employee, then reload. | Managed-units reach follows current managed departments and their allowed descendants; it is not treated as permanent company scope. |
| ACL-005 | Use a managed-scope account that is unlinked, linked to a deleted employee, or has no managed unit. | The dashboard shows an empty/limited result with useful explanation and does not silently grant company access. |
| ACL-006 | Give a field permission (`viewSalary`, `viewIdentity`, or `viewValues`) without the underlying record/module view permission. | The field permission alone reveals nothing and does not add an unauthorized route/action. |
| ACL-007 | Give a scoped grant to a permission documented as company-only/inert under scope. | The UI warns that the scope will not make that permission effective and does not misrepresent effective access. |
| ACL-008 | Change the current user's own effective roles/permissions from an authorized second account; then navigate or refresh in the first account. | Menu, routes, buttons, and field visibility refresh to the new effective permissions without requiring unsafe stale access. |
| ACL-009 | Attempt the same disallowed action via direct URL, row click, keyboard activation, and stale open modal after permission removal. | Every path fails safely; UI hiding is not the only protection, and the user receives a coherent denial/recovery state. |
| ACL-010 | Use two tabs, remove a permission in one administrative session, then retry an already-open action in the affected user's tab. | The stale tab cannot complete the unauthorized mutation; after refresh/auth update, its UI gates match reality. |
| ACL-011 | Compare an out-of-scope record with a deleted/missing record by opening known URLs. | The UI does not leak sensitive existence details beyond the designed 403/404 behavior. |
| ACL-012 | Review all disabled controls and hover/focus them. | Disabled reasons are available where the restriction is not obvious; disabled actions cannot be triggered by keyboard or rapid clicks. |

## 6. Shared lists, tables, forms, and feedback

Run these checks on at least Departments, Employees, Job Titles, Users, Roles, Notifications, and Audit where the capability exists.

| ID | Scenario and steps | Expected result |
|---|---|---|
| UI-001 | Load a populated list normally. | A loading state appears only while needed, headers/rows align, and the final row count/pagination is coherent. |
| UI-002 | Use a fixture/filter that returns zero rows. | A specific empty/no-results state appears rather than a blank body; reset/create guidance is appropriate to permissions. |
| UI-003 | Cause or use a prepared list-load failure, then choose Retry. | An error state is distinguishable from empty, Retry repeats the load once, and stale rows are not presented as current. |
| UI-004 | Change rows per page among 10, 50, and 100. | Page size, range/count, and available rows update consistently and the current page is corrected if necessary. |
| UI-005 | Navigate with next/previous, direct page selection, and ±10-page controls on a large fixture. | Each control lands on the indicated page, boundary controls disable correctly, and duplicate fetches/rows do not appear. |
| UI-006 | Sort a supported column three times. | State cycles ascending → descending → default; indicator/`aria-sort`, row order, and URL state where supported agree. |
| UI-007 | Apply a filter/search while on a later page. | Results reset to page 1 and do not show an invalid empty page caused only by the former page number. |
| UI-008 | Click a row after selecting text inside it; then click links, checkboxes, switches, menus, and action buttons inside the row. | Text selection and inner controls do not trigger the row-level detail navigation. |
| UI-009 | Trigger detail, edit, and delete controls using mouse and keyboard. | Each control has a precise accessible name containing the target context and triggers only its intended action. |
| UI-010 | Open a create/edit form, change a value, and attempt close via X, Cancel, backdrop, Escape, route navigation, and browser Back. | Dirty-state protection appears for supported exits; choosing Stay preserves edits and choosing Discard exits without saving. |
| UI-011 | Open an edit form and save without changing anything. | The UI closes or reports no change without sending a misleading mutation/success state. |
| UI-012 | Double-click Save and press Enter repeatedly during a slow save. | Only one logical mutation occurs; the button shows progress and prevents duplicate submission. |
| UI-013 | Enter server-invalid or duplicate data after client validation passes. | Field/server errors are retained and displayed near the correct input; entered data is not unnecessarily lost. |
| UI-014 | Cancel a destructive confirmation, then repeat and confirm it. | Cancel makes no change; Confirm performs one mutation, reports success/failure, and refreshes the affected list. |
| UI-015 | Delete the only row on the last page. | The list moves to the previous valid page rather than remaining on an impossible page. |
| UI-016 | Observe success, validation, access-denied, conflict, and unexpected-error feedback. | Messages are readable, do not expose raw stack traces, and remain long enough or persistent enough to act on; repeated actions do not create a toast flood. |
| UI-017 | Enter `<script>alert(1)</script>`, quotes, Arabic/Latin mixed text, and leading/trailing spaces in safe text fields. | Values render as text, never execute, and trimming/preservation follows the field contract without breaking layout. |
| UI-018 | At 200% zoom and narrow width, inspect long codes, email, names, descriptions, badges, and action groups. | Important values remain readable via wrapping/scrolling; controls do not overlap, disappear, or become unreachable. |

## 7. Departments

| ID | Scenario and steps | Expected result |
|---|---|---|
| DEP-001 | Open Departments with a populated hierarchy. | Both list and full-tree capabilities load; codes, names, parent, level, sector, status, manager, and creation date display correctly. |
| DEP-002 | Compare root and child rows. | Root shows the designed root label; children resolve the correct parent; unavailable/deleted relations use an explicit fallback rather than a false name. |
| DEP-003 | Inspect a division with its own sector and descendants inheriting that sector. | The division shows its sector; descendants show the inherited sector state/indicator accurately. |
| DEP-004 | Inspect managers with and without `hr.employees.view`, including the deleted-manager fixture. | Authorized live managers link to employee profiles; without employee view the value is non-linking; a deleted relation is explicitly identified. |
| DEP-005 | Switch between list and tree during a normal load. | The selected view renders the same underlying records, keeps coherent state, and does not duplicate loading/errors. |
| DEP-006 | Search by name, code, level label, and sector label, including a descendant whose ancestors do not match. | Matching records are found and the necessary ancestors remain visible for context; matching branches auto-expand. |
| DEP-007 | While search is active, try the list/tree toggle and then clear search. | The toggle follows its documented disabled state during search; clearing restores normal view controls and hierarchy state. |
| DEP-008 | In tree view use Expand all and Collapse all, then manually toggle one branch. | All valid branches respond, leaves do not show false expanders, and manual state remains coherent. |
| DEP-009 | Inspect tree depth, connectors, descendant counts, inactive nodes, and the orphan fixture. | Visual hierarchy and counts are accurate; inactive state is identifiable; orphan records appear in an explicit orphan grouping rather than disappearing. |
| DEP-010 | Force/use a prepared tree-load error and retry it. | Tree error/retry is distinct from a legitimate empty hierarchy; retry restores the tree without corrupting list state. |
| DEP-011 | Open Create and submit missing name, a name over 255 characters, code over 50, invalid/missing level, and description over 1000. | Each boundary is rejected at the relevant field; no department is created. |
| DEP-012 | Create a valid root department with blank optional code, parent, manager, and description. | Creation succeeds; blank optionals remain blank; the new root appears in list/tree and audit where permitted. |
| DEP-013 | Create each child level and inspect available parent options. | Only valid previous-level parents are offered; the resulting hierarchy is correct. A manual-ID fallback is available when full pickers are not authorized/complete. |
| DEP-014 | Create/edit a level-2 division and choose each sector value. Then inspect non-level-2 records. | Level 2 offers Administrative Offices and Administrative Bodies; other levels do not accept their own sector and instead show inheritance where applicable. |
| DEP-015 | Change a division to another level after choosing a sector. | The no-longer-applicable sector is cleared/omitted and does not remain as hidden stale data. |
| DEP-016 | Assign/change/clear a manager using the picker; repeat under an account lacking employee-list permission using the manual-ID path. | Valid choices save and resolve correctly; clear removes the relation; fallback validates IDs and does not expose the full employee directory. |
| DEP-017 | Open a department whose current parent/manager is outside the currently loaded picker page or scope. | The current value remains represented and is not silently cleared; partial-picker warnings explain limitations. |
| DEP-018 | Edit name, code, level/parent, description, active state, and manager one at a time. | Each saved field persists after reload, updates both list/tree, and produces consistent related displays. |
| DEP-019 | Try to create a circular/invalid hierarchy or choose an invalid parent through available UI paths. | Invalid choices are unavailable or rejected with a useful message; the existing hierarchy remains intact. |
| DEP-020 | Toggle a department inactive and inspect it in list/tree and employee/role pickers. | Inactive status is visible and picker behavior/labels do not mislead the tester into treating it as active. |
| DEP-021 | Attempt to delete a parent with children from list and tree. | Delete is disabled or blocked with an explicit child-dependency reason; no descendants are lost. |
| DEP-022 | Delete an unreferenced leaf, first canceling and then confirming. | Cancel preserves it; confirm removes it from both views, adjusts pagination if needed, and reports success. |
| DEP-023 | Attempt to delete a department referenced by employees/other records. | The conflict is understandable and persistent enough to read; the department remains present and usable. |
| DEP-024 | Create/edit/delete a department while the tree has cached expanded branches, then switch views and reload. | Tree invalidation is correct: no stale node, duplicate node, wrong count, or missing parent remains. |

## 8. Employees — list, filters, and profile

| ID | Scenario and steps | Expected result |
|---|---|---|
| EMP-001 | Open Employees with no filters, then reload and use browser Back/Forward after visiting a profile. | The list loads with stable default ordering; route/history returns to the prior list state without stale profile data. |
| EMP-002 | Search separately by employee number, first/middle/last/full name, Arabic text, and a no-match value. | Search is debounced, matching rows are correct, no-result state is explicit, and old requests do not overwrite newer search text. |
| EMP-003 | Filter status by Active, Suspended, and Terminated. | Each option returns only its intended status and the badge/label matches the stored value. |
| EMP-004 | Filter by department and job title, including inactive choices already used by employees. | Results match the selected relation; retained inactive values are clearly labeled rather than disappearing. |
| EMP-005 | As a salary-authorized user, filter by activity; repeat as a user without salary permission. | Authorized filtering returns the chosen activity. Without salary access, the filter and any inferred salary-classification data are absent. |
| EMP-006 | Combine search, status, department, job title, and activity, then use Reset. | Filters combine rather than replace one another; Reset returns to defaults and page 1. |
| EMP-007 | Sort employee number, first/full name, last name where exposed, hire date, and creation date through all sort states. | Server order, sort indicator, and current URL query agree; the third activation restores default order. |
| EMP-008 | Configure filters, sort, page, and page size; copy the URL into a second tab. | The second tab reproduces the same shareable list state; invalid/stale query values recover safely. |
| EMP-009 | Inspect columns under `A-FULL`, `A-VIEW`, and scoped/field-limited accounts. | Employee number, name, title, department, phone, hire date, and status are accurate. National ID appears only with identity permission and uses the designed lock/redaction state when record scope blocks it. |
| EMP-010 | Select text in a row, activate the row with mouse/keyboard, and use its detail/edit/delete actions. | Text selection does not navigate; row/detail opens the profile; edit/delete appear strictly by permission and act on the correct employee. |
| EMP-011 | Delete an unreferenced QA employee, first canceling, then confirming; repeat on the last row of a page. | Confirmation identifies the employee; cancel is inert; confirmed deletion refreshes the list and corrects the page. |
| EMP-012 | Attempt to delete an employee with protected dependencies. | A useful conflict/error is shown and the employee remains unchanged; the UI does not optimistically remove the row permanently. |
| EMP-013 | Open a valid profile, rapidly switch to another profile, then open a missing/forbidden ID. | The correct current employee is shown; previous profile data is cleared during transition; forbidden shows non-retry access denial, while other load errors offer Retry. |
| EMP-014 | On the profile header inspect name, number, status, hire date, job title/department, and manager link. | Values match the list/form; manager links only when permitted and target exists; missing/deleted values have explicit fallbacks. |
| EMP-015 | Open Overview and inspect Identity, Personal, Contact, Military, Education, Work, and Salary sections plus fill counts. | Each section shows saved values and accurate completion/fill counts; empty, false, zero, and unknown are not conflated. Salary is visible only when authorized for that record. |
| EMP-016 | With salary permission but no record scope, open a known out-of-reach profile. | The designed out-of-reach explanation/redaction appears; salary data and other protected values never flash. |
| EMP-017 | Compare profile tabs for accounts with assignment, warning, audit, and update permissions present or absent. | Overview is available when the profile is viewable; Assignments, Warnings, Audit, and Edit surface only under their respective gates. |

## 9. Employees — create and edit form

### 9.1 Form shell and identity

| ID | Scenario and steps | Expected result |
|---|---|---|
| EFORM-001 | Open Create Employee and inspect tabs as users with and without salary access. | Identity, Personal, Contact, Military, Education, and Work are present; Classification appears only with salary permission. Fixed footer/save controls remain reachable. |
| EFORM-002 | Attempt to save with all fields blank. | Required identity/work feedback appears, the first invalid tab is selected, its tab is marked, and focus moves to the first actionable error. |
| EFORM-003 | Fill first, middle, and last names and each gender option; test missing required names/gender and overlong server-bound text. | Required and length rules are enforced; saved full name is assembled correctly and remains readable in RTL. |
| EFORM-004 | Leave employee number blank on create, then save a valid employee. | A unique number is generated and displayed after creation. It is not silently reused from another employee. |
| EFORM-005 | Enter a valid custom employee number, a duplicate, and leading/trailing spaces. On edit, try to clear the number. | Valid unique input persists; duplicate is rejected clearly; normalization is consistent; the existing number cannot be cleared in edit. |
| EFORM-006 | As an identity-authorized user, set/change/clear national ID and test over 50 characters; repeat without identity permission. | Authorized values obey the limit and persist. Without permission the field/value is absent and not submitted or overwritten. |
| EFORM-007 | Fill and clear mother’s name and other optional identity values. | Optional values can be left blank/cleared and do not reappear after reload. |
| EFORM-008 | Change data, attempt every close/navigation method, choose Stay once and Discard once. | Stay preserves all tab values and current tab; Discard exits without partial creation/update. |
| EFORM-009 | Submit while a lookup is loading or partially unavailable. | Save cannot bind the wrong lookup value; clear loading/partial/fallback guidance is visible and manual-ID behavior follows permissions. |

### 9.2 Personal, contact, military, and education

| ID | Scenario and steps | Expected result |
|---|---|---|
| EFORM-010 | Set birth date to yesterday, today, and a future date. | Only a date before today is accepted; invalid dates identify the Personal tab and field. |
| EFORM-011 | Set birth place, each available origin/residence governorate, nationality, second nationality, then clear optionals. | The 14 governorates are selectable as designed; defaults are not falsely stored when untouched; clearable optionals stay cleared. |
| EFORM-012 | Cycle marital status through Single, Married, Divorced, and Widowed. Set wives to 0/4/5 and switch away from Married. | Wives is enabled only for Married, accepts at most 4, and is cleared/sent as 0 when not applicable. |
| EFORM-013 | Set sons/daughters to 0, 50, 51, negative, and non-integer values. | Only valid integer boundaries are accepted; derived children total is read-only and equals sons plus daughters. |
| EFORM-014 | Enter primary/secondary phone, valid/invalid email, and an address at/over 1000 characters; clear them on edit. | Email and length errors are specific; optional contact values save and can be cleared without stale display. |
| EFORM-015 | Cycle military service through unset, Yes, and No; add/remove a discharge date. | Tri-state is preserved distinctly. Dependent date behavior is coherent and cleared values do not return. |
| EFORM-016 | Select every education level option, qualification, specialization, graduation tri-state, and graduation date; then clear optionals. | All 13 levels are represented correctly; unknown/yes/no remain distinct; saved and cleared values match Overview. |

### 9.3 Work placement and automatic assignment behavior

| ID | Scenario and steps | Expected result |
|---|---|---|
| EFORM-017 | Choose a department and job title from pickers, then use manual-ID fallbacks under restricted lookup permissions. | Valid relations resolve after save; fallback does not expose unauthorized directory data and invalid IDs produce clear errors. |
| EFORM-018 | Select active and retained inactive job titles/departments. | Active choices are prioritized; inactive current/legacy values are labeled and not silently replaced. |
| EFORM-019 | Choose a department with a manager, save, and inspect the employee profile/current assignment. | Manager/organizational context is derived consistently and links only when permitted. |
| EFORM-020 | On create, choose a title with default activity and grade while those fields are blank. Then override both. | Defaults are suggestions only: they populate when eligible, are visually identifiable as suggestions, and remain user-overridable. |
| EFORM-021 | Enter activity/grade first, then choose a title with defaults. | Explicit user values are not overwritten by later title selection. |
| EFORM-022 | Under a scoped salary account, choose a title whose suggested classification is not writable. | The form handles the suggestion safely; if the server rejects untouched suggestions, it retries/recovers as designed without losing the employee or inventing authorization. |
| EFORM-023 | Select each employment type and status value, set workplace, and clear optional work fields. | Values map to their correct labels and persist without enum drift. |
| EFORM-024 | Test hire date with blank/valid values; set termination before, equal to, and after hire date; clear it. | Termination earlier than hire is rejected; equal/later behavior follows the contract; cleared termination does not remain stale. |
| EFORM-025 | Edit only department, only title, and only organizational grade on separate employees. | Each effective organizational change automatically records an internal-transfer assignment dated today, without duplicate assignment entries. |
| EFORM-026 | Edit non-organizational fields only. | No spurious assignment is created. |

### 9.4 Salary/classification fields

| ID | Scenario and steps | Expected result |
|---|---|---|
| EFORM-027 | As `A-FULL`, cycle activity, organizational grade 1–5, experience grade 1–5, and distinction boundary 0/255/256/negative. | Valid values persist with correct labels; out-of-range distinction is rejected. |
| EFORM-028 | Choose Engineering, set engineering rank, then switch to a non-engineering activity. | Engineering rank is available only for Engineering and is cleared/omitted when activity changes. |
| EFORM-029 | Choose Industrial, set industrial years, then switch to a non-industrial activity. | Industrial years is available only for Industrial and is cleared/omitted when no longer applicable. |
| EFORM-030 | Cycle each tri-state pay/classification flag through unset, Yes, and No. | All three states save distinctly and render accurately in profile/audit. |
| EFORM-031 | Choose System salary mode after entering an agreed salary. | Agreed salary is disabled and cleared/omitted for System mode. |
| EFORM-032 | Choose Agreement salary mode and test blank, zero, negative, valid integer, valid two-decimal, and three-decimal salary. | Agreement requires a positive salary with at most two decimal places; only valid values save. |
| EFORM-033 | Test Sham Cash with 15 digits, exactly 16 digits, 17 digits, spaces, and letters. | Only exactly 16 digits is accepted; the value is displayed safely and is not reformatted destructively. |
| EFORM-034 | As a user without salary permission, edit several non-salary fields on an employee that has salary data. | All 12 gated salary/classification fields remain hidden and are not cleared or changed by the save. |
| EFORM-035 | As an authorized user, change one gated salary field only. | Only the intended change is reflected; unchanged gated fields retain their existing values. |

### 9.5 Submission, recovery, and consistency

| ID | Scenario and steps | Expected result |
|---|---|---|
| EFORM-036 | Create one minimal valid employee and one fully populated employee. | Both save successfully; minimal optional fields stay empty and every full value matches list/profile after reload. |
| EFORM-037 | Cause validation errors on multiple tabs and submit. Fix them one at a time. | Invalid tabs remain marked until resolved; each submit focuses the earliest remaining error and never loses valid data on other tabs. |
| EFORM-038 | Trigger a general server error not tied to one field. | A focusable error banner explains failure; the form remains editable and no duplicate employee/update is created. |
| EFORM-039 | Save while clicking twice and navigating in another tab. | One logical record/update is produced; pending state prevents accidental duplication and final navigation is coherent. |
| EFORM-040 | Edit a record, save, reopen, and compare every visible field with Overview and Audit. | Form, profile, list, and audit representations agree, including blank versus zero versus No versus unknown. |

## 10. Employee assignments

| ID | Scenario and steps | Expected result |
|---|---|---|
| ASN-001 | Open Assignments on a profile with history. | Entries are newest first; the current entry is identified; open-ended dates show an “ongoing” equivalent; page count is coherent. |
| ASN-002 | Compare embedded modern relations, legacy imported text, deleted relations, and missing values. | Each is represented honestly; legacy data is not falsely linked and soft-deleted/missing relations do not break the table. |
| ASN-003 | Inspect assignment capabilities under view-only, create, update/delete-only, and no-view permissions. | The module supports view/create only: no edit/delete action is invented; Add appears only with create permission. |
| ASN-004 | Open Add Assignment and submit without date or reason; test a future date and each available reason. | Date and reason are required, future dates are rejected, and all six reasons save with correct labels. |
| ASN-005 | For department, job title, and grade, test Keep, Set, and Clear modes independently. | Keep copies current value, Set uses the selected/manual value, Clear stores an explicit removal; controls match the chosen mode. |
| ASN-006 | Use picker and manual-ID paths for assignment relations. | Valid IDs resolve; invalid IDs fail clearly; restricted accounts do not gain directory browsing through the modal. |
| ASN-007 | Add a later-dated assignment with changed department/title/grade and notes. | The previous assignment closes on the preceding day, the new one becomes current, and employee work details update consistently. |
| ASN-008 | Add a later assignment that keeps all three organizational values. | The historical event is recorded with the chosen reason/notes without corrupting current placement. |
| ASN-009 | Add a date equal to or before the current assignment start. | The warning explains that the current entry will be amended rather than appended; confirming produces the documented amendment with no impossible overlapping range. |
| ASN-010 | Enter notes at 2000 and 2001 characters. | The maximum is accepted and the overflow is rejected without truncating silently. |
| ASN-011 | Modify the modal and close it through all supported exits. | Dirty confirmation protects changes; discard does not create or amend an assignment. |
| ASN-012 | Paginate assignment history, add a new current assignment, and reload. | Current/newest entry remains visible and correctly marked; pagination/counts update without duplicate history. |

## 11. Employee warnings

| ID | Scenario and steps | Expected result |
|---|---|---|
| WRN-001 | Open Warnings on a profile with multiple records. | Sequence, type, book number, issue date, issuer, and notes display correctly in server order. |
| WRN-002 | Compare warning buttons under view/create/update/delete permission combinations. | Add/Edit/Withdraw surfaces strictly follow the respective permissions. |
| WRN-003 | Create with missing type/date, future issue date, type over 255, book number over 50, and notes over 5000. | Each invalid boundary is rejected at its field; sequence is never user-editable. |
| WRN-004 | Create minimal and fully populated valid warnings. | Both save; the server assigns/renumbers sequence; optional values remain truly empty when omitted. |
| WRN-005 | Choose/change/clear an issuer through picker and manual-ID paths. | Valid issuer resolves, clearing works, invalid IDs fail safely, and lookup access is not broadened. |
| WRN-006 | Inspect a warning whose issuer was soft-deleted. | The historical issuer relationship remains understandable and does not link to an inaccessible/broken profile. |
| WRN-007 | Edit each mutable warning field and reload. | Changes persist, sequence remains server-controlled, and audit/history remains coherent where visible. |
| WRN-008 | Try to leave a dirty create/edit modal, choosing Stay and Discard. | Dirty guard works; discard does not create a partial warning. |
| WRN-009 | Cancel the delete confirmation, then confirm it. | Language makes clear this is a soft withdrawal; cancel is inert; confirm removes it from active view while preserving auditable history. |
| WRN-010 | Withdraw a warning from the middle and from the last page. | Remaining warnings are renumbered as designed and pagination returns to a valid page. |

## 12. Job titles

| ID | Scenario and steps | Expected result |
|---|---|---|
| JOB-001 | Open Job Titles with populated data. | Name, default organizational grade, default activity, description status, active state, and permitted actions are accurate. |
| JOB-002 | Search by full/partial name, rapidly change the query, and enter a no-match value. | Search is debounced; the newest query wins; no-results is distinct from load failure. |
| JOB-003 | Filter Described = Yes and No, Active = Yes and No, and combine filters. | Each filter returns only matching records and combinations intersect correctly. |
| JOB-004 | Sort by name and creation time ascending/descending; use the name header through its third/default state. | Row order, controls, and sort indicator agree; default order is restored on the third state. |
| JOB-005 | Open the “awaiting description” worklist/count, then describe one item. | Only undescribed titles appear; count decreases after a successful description and survives reload. |
| JOB-006 | Apply all filter types while on a later page, then Reset. | Every change returns to page 1; Reset restores defaults and removes stale count/query state. |
| JOB-007 | Create with blank name, name over 255, duplicate name, and description over 10,000 characters. | Invalid submissions are rejected with field-specific feedback and no duplicate record is created. |
| JOB-008 | Create a minimal active title and a fully populated title with grade 1–5, each activity 1–5, described state, and description. | Valid values save with the correct Arabic/business labels; optional defaults stay optional. |
| JOB-009 | Toggle Described without a description, then add/remove description text. | The switch is stored as an explicit workflow flag and does not silently fabricate/remove text unless the UI clearly says so. Character count is accurate. |
| JOB-010 | Mark a title inactive and inspect employee create/edit pickers plus an employee already using it. | Inactive status is visible; it is not presented as a normal new active choice, while retained usage remains labeled and intact. |
| JOB-011 | Edit name, grade, activity, description, described state, and active state one at a time. | Each field persists after reload and feeds employee suggestion/display behavior correctly. |
| JOB-012 | Choose the employee-list action for a job title. | It opens `/hr/employees?job_title_id=…` with the correct filter and results; Back returns to the job-title state. |
| JOB-013 | Create/edit a title, change data, and attempt every modal exit. | Dirty guard protects changes; choosing Discard leaves the stored title unchanged. |
| JOB-014 | Delete an unreferenced title, cancel first, then confirm. | Cancel preserves it; confirm removes it and corrects the current page/count. |
| JOB-015 | Delete a title referenced by a current employee. | A 409/conflict explanation remains visible until dismissed; the title and employee relation remain unchanged. |
| JOB-016 | Delete a title referenced only by employee history. | Historical use still blocks deletion and is explained rather than orphaning history. |
| JOB-017 | Compare module behavior for view-only, create-only-without-view if constructible, update, and delete permissions. | The screen and actions reflect effective permissions consistently; mutation permission does not create an unintended browse surface. |

## 13. Users

| ID | Scenario and steps | Expected result |
|---|---|---|
| USR-001 | Open Users and paginate with 10/50/100 rows. | Name, email, linked employee, role grants/scopes, active state, and actions are correct across pages. |
| USR-002 | Search for a user located on a later server page by account name, email, employee full name, and employee number. | Whole-directory search lazily scans as designed and finds the account, not just the currently loaded page. |
| USR-003 | Change the search quickly, clear it mid-load, and test no match. | Search progress/status/count is understandable; stale page loads do not overwrite the newest query; clearing restores normal server pagination. |
| USR-004 | Use a prepared directory-search failure and choose Retry. | Failure is explicit, Retry resumes safely, and partial results are not mislabeled as the full directory. |
| USR-005 | Inspect live-linked, unlinked, and soft-deleted employee relations. | Each state is distinct; links appear only when authorized and valid. |
| USR-006 | Inspect users with company, unit, and managed-unit grants. | Grant chips identify role and scope clearly enough to distinguish multiple grants. |
| USR-007 | Create with missing employee/password, invalid email, password under 8, and an employee already linked to another user. | Validation is field-specific; uniqueness/conflict does not create a second account. |
| USR-008 | Create a valid user with picker-selected employee, blank email, 8+ character temporary password, and active state. | User is created, blank email remains null/empty, and first sign-in requires the intended password-change flow. |
| USR-009 | Create under an account without employee directory view using manual employee ID. | Valid ID works without exposing the picker directory; invalid/duplicate ID fails clearly. |
| USR-010 | Edit account name/employee link where supported, change/clear email, and relink/clear employee. | Nullable fields really clear; valid relinking updates displays; uniqueness prevents invalid linkage. |
| USR-011 | Edit while leaving password blank. | Existing password remains valid and the account is not forced into password change. |
| USR-012 | Set a new valid password from Edit. | Save succeeds, the user is required to change the temporary/admin-reset password, and old sessions/credentials behave as designed. |
| USR-013 | Inspect role information in the user form. | Roles are read-only there and direct the tester to the role-assignment workflow; they cannot be silently edited from the wrong screen. |
| USR-014 | Change a create/edit field and test close/route exits. | Dirty confirmation works and no partial account update occurs after discard. |
| USR-015 | As an updater, disable another active user and cancel/confirm the prompt. | Disabling requires explicit confirmation; cancel is inert; confirm updates the row and prevents future sign-in. |
| USR-016 | Re-enable a disabled user. | The intended no-extra-confirmation flow completes once, row state updates, and sign-in becomes eligible again. |
| USR-017 | Rapidly toggle different users and double-click one toggle. | Per-row pending state prevents overlap/duplicates; one row’s spinner does not block or mislabel another row. |
| USR-018 | Try to disable the current account. | Self-disable is unavailable with a clear reason; keyboard/mouse cannot bypass it. |
| USR-019 | Try to delete the current account; delete another unused QA account with cancel/confirm. | Self-delete is disabled; cancel preserves the other user; confirm deletes only the selected account and adjusts pagination. |
| USR-020 | Attempt to delete an account with protected grants/history. | Conflict/failure is clear and the row is restored/retained; related history is not corrupted. |

## 14. Roles, permission matrix, and scoped grants

### 14.1 Role records and permission matrix

| ID | Scenario and steps | Expected result |
|---|---|---|
| ROLE-001 | Open Roles and paginate. | Arabic label, machine name, system badge, description, permission badges, and actions are accurate. |
| ROLE-002 | Open Create Role and inspect every permission group. | All 31 current permissions are represented, grouped by module; field-level permissions are labeled/explained and counts are correct. |
| ROLE-003 | Toggle an entire group, individual children, and then some children. | Parent checkbox selects/clears all children and shows an indeterminate state for a partial selection; counts update immediately. |
| ROLE-004 | Create with blank/over-255/duplicate name, over-255 label/description, then valid minimal input. | Invalid values are rejected specifically; valid unique machine name creates one custom role. |
| ROLE-005 | Create a role with an empty permission matrix. | A clear warning requires deliberate confirmation or correction; the saved result exactly matches the user’s confirmed choice. |
| ROLE-006 | Create a role with selected view, mutation, and field permissions. | Creation synchronizes the exact selected set; no unselected permission is added. |
| ROLE-007 | Edit role metadata without touching the permission matrix. | Metadata changes save while the existing permission set remains unchanged. |
| ROLE-008 | Edit the permission matrix, adding and removing several permissions. | Only the final selected set remains after reload; current-user access refreshes promptly if its own role changed. |
| ROLE-009 | As `A-LIMITED-GRANTER`, open/create/edit a role containing permissions the caller does not hold. | Missing-caller-permission danger is visible; the dashboard/server refuses unauthorized grant escalation rather than merely hiding the warning. |
| ROLE-010 | Select `auth.roles.assign` without `auth.roles.view`, or other dependency-sensitive combinations. | The UI warns about the ineffective/awkward combination and never implies broader access than will exist. |
| ROLE-011 | Change role values and test X, Cancel, backdrop, Escape, route change, and browser Back. | Dirty guard covers supported exits; Stay preserves selections and Discard restores stored data. |
| ROLE-012 | Inspect a system role. | Edit and delete are disabled with a reason; assignment remains possible only when authorized. |
| ROLE-013 | Delete an unused custom role with cancel/confirm. | The confirmation explains impact; cancel is inert; confirm deletes only the intended role and corrects pagination. |
| ROLE-014 | Attempt to delete a role that still has grants or is protected. | A clear conflict/protection state appears and no grant/user is silently orphaned. |
| ROLE-015 | Rename/edit/delete a role affecting the current user from another admin. | The current user’s role labels, sidebar, route access, and actions refresh to effective permissions; stale UI cannot perform removed actions. |

### 14.2 Assign and revoke role grants

| ID | Scenario and steps | Expected result |
|---|---|---|
| GRANT-001 | Open the assignment card with and without `auth.roles.assign`. | Only authorized users can see/use assignment/revocation controls; role viewing alone is read-only. |
| GRANT-002 | Load role and user pickers when records span multiple pages. | Full picker aggregation includes all eligible records once; progress/partial failure is explained and does not mislabel an incomplete set as complete. |
| GRANT-003 | Under no user-view permission, assign using a manual user ID. | The fallback permits the targeted action without exposing the whole user directory; invalid IDs fail safely. |
| GRANT-004 | Assign a normal role at Company scope. | One grant chip appears with Company scope; the user receives the role’s effective company-wide permissions after refresh. |
| GRANT-005 | Assign at Unit scope using picker and manual unit ID. | Unit is required, identified on the chip, and access applies to that unit plus its permitted subtree—not siblings or ancestors. |
| GRANT-006 | Choose Unit scope without a unit or with an invalid/inactive unit. | Submission is blocked/rejected with a useful unit error and creates no partial grant. |
| GRANT-007 | Assign at Managed Units scope to a linked manager with managed departments. | Chip identifies managed scope and resulting access follows currently managed units. |
| GRANT-008 | Assign Managed Units to an unlinked user, deleted employee link, or employee with no managed departments. | A strong warning/empty-effective-scope state appears; it never falls back to company access. |
| GRANT-009 | Assign the same role with multiple distinct scopes to one user. | Each grant is separately visible and effective reach is the union of valid scopes without duplicate chips. |
| GRANT-010 | Attempt an exact duplicate grant. | The duplicate is prevented or handled idempotently with a clear message; no indistinguishable duplicate grant is created. |
| GRANT-011 | Assign a scoped role containing only company-only/inert permissions. | The UI refuses a wholly ineffective scoped grant or makes its ineffectiveness unmistakable. |
| GRANT-012 | Assign a scoped role mixing scoped-effective and company-only permissions. | Warning lists/explains ineffective portions; only valid scoped permissions become effective. |
| GRANT-013 | As `A-LIMITED-GRANTER`, attempt to grant a role/permission not held by the caller, change an existing grant to broaden it, and revoke a permission/grant beyond the caller’s rights. | GAP-16 enforcement is consistent: grant, broaden/change, and revoke operations are limited to permissions the caller holds; no privilege escalation succeeds. |
| GRANT-014 | As a non-super-admin, attempt to grant or revoke `super_admin`. | The action is unavailable or rejected; only a current super-admin may manage it. |
| GRANT-015 | As `A-SUPER`, assign `super_admin` and inspect available scopes. | Only Company scope is allowed; unit/managed variants cannot be produced. |
| GRANT-016 | Revoke one exact grant from a user with multiple grants, cancel first, then confirm. | Confirmation identifies exact role/scope; cancel is inert; confirm removes only that grant. |
| GRANT-017 | Revoke all grants from a normal user, cancel first, then confirm. | Warning explains full access impact; confirmed action removes all grants and affected navigation/access updates. |
| GRANT-018 | Attempt to revoke the current user’s own exact/all grants. | A prominent self-impact warning appears; resulting behavior is safe and current effective access refreshes immediately if confirmed by an authorized account. |
| GRANT-019 | Inspect the legacy/orphaned grant fixture and try exact revoke, then revoke-all if permitted. | Exact revoke is disabled/explained when its identity cannot be represented; revoke-all offers the supported cleanup route without corrupting other users. |
| GRANT-020 | Modify department management after a managed-scope grant exists. | Effective access follows the new management graph after refresh and does not retain stale departments indefinitely. |

## 15. Notifications

| ID | Scenario and steps | Expected result |
|---|---|---|
| NOTIF-001 | Open Notifications with mixed read/unread data and paginate 10/50/100. | Newest items appear first; read/unread styling, total/unread count, page controls, and empty state are correct. |
| NOTIF-002 | Inspect the header badge at 0, 1, 99, and more than 99 unread notifications using fixtures. | Badge hides/reads correctly at zero and caps as `+99` above 99 without layout breakage. |
| NOTIF-003 | Open the header dropdown with more than six notifications. | It shows the latest six only, correctly marks unread items, and provides a working View all action. |
| NOTIF-004 | Click an unread notification with a supported employee reference. | It is marked read once, unread counts decrement, and navigation reaches the permitted employee destination/list behavior. |
| NOTIF-005 | Click supported Department, User, and Role references. | Each resolves to the correct dashboard module/destination; the dropdown closes after navigation. |
| NOTIF-006 | Click a reference whose target module is not permitted. | Read handling remains coherent, navigation is denied safely, and protected data does not flash. |
| NOTIF-007 | Click an unsupported reference type, a missing target, and an item without a reference. | Item is non-actionable or fails gracefully; it never navigates to a misleading unrelated record. |
| NOTIF-008 | Click an already-read notification. | It does not decrement the count again or generate duplicate read behavior; valid navigation still works. |
| NOTIF-009 | Rapidly click one unread item twice and open it from two tabs. | Count never becomes negative and the item reaches one consistent read state. |
| NOTIF-010 | Use a prepared mark-read failure. | Failure is reported safely, optimistic count is corrected/re-synced, and the item can be retried. |
| NOTIF-011 | Keep the tab visible for longer than one polling interval, then generate a notification elsewhere. | Header count refreshes on the intended ~60-second visible-tab cadence without a request flood. |
| NOTIF-012 | Hide/background the tab across an interval, generate a notification, then return. | Polling pauses while hidden and refreshes when visible again; count becomes current promptly. |
| NOTIF-013 | Open dropdown, click inside/scroll, click outside, and navigate with keyboard. | Legitimate internal interaction does not close it prematurely; outside/navigation closes it; focus returns logically. |
| NOTIF-014 | Compare two different users. | Notifications are owner-scoped: neither account can see the other’s items or infer their content. |

## 16. Audit log

### 16.1 List, filters, and URL state

| ID | Scenario and steps | Expected result |
|---|---|---|
| AUD-001 | Open Audit as `A-AUDIT-BASIC`; repeat without `auth.audit.view`. | Authorized account sees the read-only log; unauthorized route/sidebar access is denied with no data flash. No create/edit/delete controls exist. |
| AUD-002 | Load the default view and inspect the filter summary. | Newest-first ordering is active; `api_request` events are excluded by default and a visible chip/message explains that exclusion. |
| AUD-003 | Enable “include request events,” then disable it. | Request events appear/disappear consistently; counts/pages reset as needed and the control reflects the actual filter. |
| AUD-004 | Search the primary description field, change it rapidly, and clear it. | Debounce prevents stale overwrites; matching descriptions return; clearing restores the unfiltered default. |
| AUD-005 | Filter actor type by User and System. | User returns user-attributed rows; System returns system rows and clears/disables incompatible user selection. |
| AUD-006 | Select a user through the picker; repeat with manual user ID under restricted user-view permission. | Results match the actor; manual fallback does not expose the directory and invalid IDs fail clearly. |
| AUD-007 | Select individual and grouped model, authentication, and request events. | Multi-select groups produce the intended event union; parent/group control and selected chips/count stay synchronized. |
| AUD-008 | Set From and To dates individually, equal, reversed, and across day boundaries. | Dates are inclusive; a reversed range is rejected or clearly corrected; displayed Damascus timestamps fall into the expected local dates. |
| AUD-009 | Open Advanced filters, then filter auditable type and auditable ID. | Advanced active-count updates; ID is usable only with a type; target results match both. |
| AUD-010 | Filter by IP address and request ID, including exact copied values from a row/detail. | Exact related operations are returned and empty/invalid filters do not crash or expose raw query errors. |
| AUD-011 | Switch newest/oldest ordering and paginate. | Chronology is correct and stable across pages; no row is duplicated or skipped due only to sorting. |
| AUD-012 | Apply basic and advanced filters, copy the URL to another tab, reload, then use browser Back/Forward. | Filter disclosure, values, chips, sort, and page restore from URL; active advanced filters auto-open their section. |
| AUD-013 | Change any filter while on a later page, then Reset all. | Page resets to 1; Reset removes every basic/advanced filter and restores default request-event exclusion/newest order. |
| AUD-014 | Choose a request event or request-operation drilldown while request events were excluded. | The include-request control is forced on/disabled as needed so the selected data is not hidden by a contradictory filter. |
| AUD-015 | Compare empty states for “no audit exists,” “filters match nothing,” and default exclusion hiding only request events. | Each state explains the real condition and offers the appropriate reset/include action. |
| AUD-016 | Use a prepared 403 and a non-403 load failure. | 403 is an access-denied state without a misleading Retry; transient/other failures provide Retry. |
| AUD-017 | Leave Audit open while another action creates an audit event. | No hidden live polling is implied; the row appears only after explicit Refresh or a deliberate reload/filter action. |
| AUD-018 | Click Refresh with active filters and URL state. | Data refreshes once while the current intentional filters remain intact. |

### 16.2 Rows, detail, drilldown, and value visibility

| ID | Scenario and steps | Expected result |
|---|---|---|
| AUD-019 | Inspect row time display and activate its timestamp/detail control. | Absolute and relative Damascus time agree and update/render without timezone confusion. |
| AUD-020 | Inspect live user, soft-deleted user, system, and unknown actor fixtures. | Four actor states are distinguishable; deleted/unknown actors are not falsely linked to a live user. |
| AUD-021 | Inspect model/auth/request/security/unknown event rows. | Known events have correct readable labels/group badges; security-sensitive events are conspicuous; unknown event remains readable without crashing. |
| AUD-022 | Inspect live, deleted, missing, and unknown target types. | Live targets link only when both supported and permitted; other states use honest fallbacks and reveal no unauthorized values. |
| AUD-023 | Inspect Changed fields for 0, 1–3, and more than 3 fields. | Summary shows the first three and a correct `+n` count; zero-change events do not invent changed fields. |
| AUD-024 | Open a row by row click and by keyboard; also select text/click an inner link. | Detail opens accessibly from the row, while text selection and inner controls do not trigger duplicate navigation. |
| AUD-025 | In detail, inspect event/time, security alert, actor, target, IP, request ID, user agent, and description. Use every copy control. | Summary matches the row; copy controls place the exact intended text on clipboard and report success/failure accessibly. |
| AUD-026 | Start a request-ID drilldown, navigate its rows/pages, then restore prior filters. | Drilldown shows all audit rows from the operation, identifies the active request, and restores the exact pre-drilldown filter state. |
| AUD-027 | From an employee profile, open its Audit tab/trail and compare with the global audit result for that employee. | Relevant events agree; profile trail remains contextual and does not expose the global request-drilldown capability if it is not designed there. |
| AUD-028 | As `A-AUDIT-BASIC`, inspect create/update/delete details with changed values. | Field names may be visible as designed, but protected old/new values remain redacted/absent because `auth.audit.view_values` is missing. |
| AUD-029 | As `A-AUDIT-VALUES`, inspect values for a module where it has company-wide module view. | Permitted old/new values are revealed, with null, empty string, absent/not-recorded, and redacted represented as distinct states. |
| AUD-030 | Give value permission but only scoped/no underlying module view, then inspect the same event. | Values remain protected; audit-value permission never bypasses company-wide module authorization. |
| AUD-031 | Inspect employee salary changes with audit value/module view but without salary permission, then with salary permission. | Salary values remain redacted until every required permission is present; non-salary permitted values behave independently. |
| AUD-032 | Inspect create, update, and delete events. | Create shows new value only, delete old value only, and update clear before/after values without manufacturing the missing side. |
| AUD-033 | Inspect boolean, enum, JSON/object, blank, null, absent, and multiline values. | Booleans are human-readable; enums show raw and readable label where supported; JSON/multiline is safe and legible; state distinctions survive. |
| AUD-034 | Inspect department/user/employee/job-title foreign-key changes. | Authorized values resolve/link where supported; unresolved/deleted IDs remain identifiable without misleading live links. |
| AUD-035 | Enter malicious-looking text through a normal dashboard field, create its audit event, and inspect row/detail. | The value is escaped as text in both places and cannot execute markup/script. |
| AUD-036 | Perform ordinary audit reading, filtering, opening detail, copying, and refreshing; then refresh the audit list again. | Read-only interactions do not generate recursive audit-write noise. |

## 17. Responsive layout, accessibility, resilience, and browser safety

Run each route’s representative populated, empty, error, and modal state at 390, 768, 991, 992, and 1440 CSS pixels, then repeat the critical routes at 200% browser zoom.

| ID | Scenario and steps | Expected result |
|---|---|---|
| QUAL-001 | At each target width, inspect shell, page heading/actions, filters, cards, tables, pagination, and modals. | No content is cut off or overlapped; intended wrapping/horizontal scroll is available; primary actions remain reachable. |
| QUAL-002 | At 991 and 992 px, verify sidebar and backdrop transition on every top-level route. | Breakpoint behavior is consistent and no invisible backdrop blocks the desktop page. |
| QUAL-003 | At 390 px, open the longest employee form and role-permission form; scroll every tab/modal to its footer. | Header/body/footer remain usable, current field stays visible when focused, and Save/Cancel do not cover content. |
| QUAL-004 | At 200% zoom, use filters and tables with long Arabic names, emails, IDs, badges, and descriptions. | Text reflows or scrolls without loss of meaning; no action is available only by precise pointer positioning. |
| QUAL-005 | Complete sign-in, navigation, table operations, create/edit modal, confirm dialog, profile tabs, and logout using keyboard only. | Every operation is reachable; focus indicator is visible; order is logical; Enter/Space semantics are correct. |
| QUAL-006 | Open and close every modal/dropdown with keyboard while noting focused element before open. | Focus moves into the surface, stays within true modal dialogs, closes with supported Escape, and returns to the invoking control. |
| QUAL-007 | Inspect labels, descriptions, errors, required state, switches, checkboxes, tabs, sortable headers, pagination, and icon-only buttons with browser accessibility tools. | Programmatic names/roles/states are present, error relationships are meaningful, and `aria-sort`/selected/expanded states match visuals. |
| QUAL-008 | Trigger asynchronous loading, success, failure, form error, and notification-count changes while using a screen reader if available. | Important status changes are announced appropriately without repeated/noisy announcements. |
| QUAL-009 | Check light/dark contrast for text, focus rings, placeholder, disabled state, badges, status colors, errors, links, and selected rows. | Meaning does not depend only on color and content remains legible in both themes. |
| QUAL-010 | Resize/zoom while a sidebar, dropdown, modal, tooltip, or confirmation is open. | The surface repositions or closes safely; focus and backdrop are not stranded. |
| QUAL-011 | Simulate slow network during list load, search, save, delete, picker load, and notification read. | Clear pending state prevents duplicate actions; prior data is not falsely presented as a confirmed new state. |
| QUAL-012 | Disconnect during a mutation, reconnect, and use the UI’s retry/reload path without replaying requests manually. | The user can determine whether the action succeeded; retry does not silently duplicate a record. |
| QUAL-013 | Cause a session expiry while a clean page is open and while a dirty modal is open. | Protected action is blocked and session-expired flow is clear; unsaved-data behavior is honest and no stale mutation succeeds. |
| QUAL-014 | Open two tabs editing the same record; save different changes sequentially. | The second save either detects/confirms conflict or produces a deterministic last-write result with refreshed truth; it never displays a false saved state. |
| QUAL-015 | Paste very long Unicode, Arabic diacritics, emoji, bidirectional text, HTML, and formula-like strings into allowed text fields. | Length validation is stable, display remains contained, and no HTML/script/formula execution occurs. |
| QUAL-016 | Review browser console during one clean pass of every route and core workflow. | No uncaught exception, infinite render loop, repeated key warning, sensitive-token log, or avoidable accessibility/runtime error appears. |
| QUAL-017 | Observe Network only while navigating and filtering normally; do not replay/edit requests. | No obvious uncontrolled request loop, duplicate mutation, token in URL, or cross-user cached response is visible. |
| QUAL-018 | Use refresh, Back/Forward, duplicate tab, and direct bookmarked URLs throughout the app. | Route state restores safely, unauthorized state is rechecked, and no blank screen or stale-account data appears. |
| QUAL-019 | Sign out user A, sign in user B in the same browser profile, and revisit cached/back URLs. | User B never sees user A’s protected records, form values, notifications, or permission-derived menu state. |
| QUAL-020 | Print or invoke browser page find/copy where relevant. | Sensitive content is not unexpectedly expanded from hidden/redacted areas; copied visible text matches what the user is authorized to see. |

## 18. End-to-end dashboard journeys

These journeys are the final release gate. They intentionally cross modules and verify that related screens converge on the same state.

| ID | Journey and steps | Expected result |
|---|---|---|
| E2E-001 | As `A-FULL`, create a division/section, create a job title with activity/grade defaults, create an employee in them, and open the profile. | Relations, inherited sector, title suggestions, manager, current assignment, list filters, and profile values all agree. |
| E2E-002 | Move that employee to another department/title/grade from Edit, then inspect Assignments and Audit. | Work values update, exactly one appropriate internal-transfer history entry exists, prior range closes correctly, and audit reflects only actual changes. |
| E2E-003 | Add a warning, edit it, withdraw it, and inspect Audit after each step. | Sequence/display is correct; withdrawal is soft; create/update/delete history remains understandable and authorized values obey redaction. |
| E2E-004 | Create a user linked to the employee with a temporary password; sign in as that user, change the password, sign out, and sign in again. | Required-change gate works, old credentials/sessions are revoked, and the final session uses the new password with correct identity. |
| E2E-005 | Create a view-only HR role, assign it at Unit scope, sign in as the recipient, and compare in-subtree/out-of-subtree employees. | Sidebar/actions/fields match view-only access and only the unit subtree is reachable; sibling/parent/company records are not leaked. |
| E2E-006 | Change the same grant to Managed Units, change which department the recipient manages, and recheck access. | Effective employee reach follows managed departments after refresh; stale unit access disappears and unrelated company access never appears. |
| E2E-007 | As `A-LIMITED-GRANTER`, attempt to create/modify/assign a role containing a permission it lacks. | Warnings are visible and every escalation path is refused; audit/security evidence is produced where designed. |
| E2E-008 | As `A-SUPER`, grant a normal custom role, grant/revoke super-admin within allowed rules, then revoke the normal exact grant. | Company-only super-admin rule holds; exact revocation leaves unrelated grants intact; both users’ effective UI updates safely. |
| E2E-009 | Generate more than six notifications through normal dashboard activity, inspect header dropdown, open Notifications, and follow permitted and denied references. | Badge/dropdown/page stay consistent; read count updates once per item; allowed links work and denied links reveal no data. |
| E2E-010 | Perform create/update/delete actions across Department, Job Title, Employee, User, and Role, then filter Audit by actor, date, event, target, and request ID. | Every expected event can be found with accurate actor/time/target; detail diffs and permission-based redaction match the originating UI action. |
| E2E-011 | Start with an authorized page open in two tabs; remove the user’s role in an admin session and retry navigation/mutation in both tabs. | Both tabs converge on revoked access, no stale mutation completes, and logout/session coordination remains stable. |
| E2E-012 | Run E2E-001 through E2E-004 on desktop light theme, then recheck key views at 390 px dark theme using keyboard only. | The same business outcomes remain possible and readable across theme, viewport, and input method. |

## 19. Release completion and traceability

A release candidate is not manually approved until:

- Every scenario has a recorded result; no blank result is treated as Pass.
- All Critical/High defects are fixed and the affected scenario plus neighboring regression scenarios are rerun.
- Any Blocked/N/A item names the missing account, fixture, environment capability, or intentional product decision.
- Authentication, authorization, scope, salary/identity/audit redaction, destructive actions, and cross-user isolation have direct evidence.
- At least one Chromium browser and the team’s supported secondary browser complete the E2E gate.
- The tested commit/build and environment are recorded; results from another commit are not reused.

### Coverage map

| Surface | Scenario ranges |
|---|---|
| Authentication/session/password/account state | AUTH-001–AUTH-024 |
| Routes, shell, responsive sidebar, theme, home | NAV-001–NAV-016, HOME-001–HOME-004 |
| Permissions and scope | ACL-001–ACL-012, GRANT-001–GRANT-020 |
| Shared tables/forms/feedback | UI-001–UI-018 |
| Departments | DEP-001–DEP-024 |
| Employee list/profile/form | EMP-001–EMP-017, EFORM-001–EFORM-040 |
| Assignments and warnings | ASN-001–ASN-012, WRN-001–WRN-010 |
| Job titles | JOB-001–JOB-017 |
| Users | USR-001–USR-020 |
| Roles and permission matrix | ROLE-001–ROLE-015 |
| Notifications | NOTIF-001–NOTIF-014 |
| Audit | AUD-001–AUD-036 |
| Accessibility/resilience/browser safety | QUAL-001–QUAL-020 |
| Cross-module release journeys | E2E-001–E2E-012 |

### Exact route inventory

| Route | Access rule | Primary scenario coverage |
|---|---|---|
| `/` | Authenticated | NAV-001, HOME-001–HOME-004 |
| `/departments` | `departments.view` | DEP-001–DEP-024 |
| `/hr/employees` | `hr.employees.view` | EMP-001–EMP-012 |
| `/hr/employees/:id` | `hr.employees.view` | EMP-013–EMP-017, ASN, WRN, profile Audit |
| `/hr/job-titles` | `hr.job_titles.view` | JOB-001–JOB-017 |
| `/users` | `auth.users.view` | USR-001–USR-020 |
| `/roles` | `auth.roles.view` | ROLE-001–ROLE-015, GRANT-001–GRANT-020 |
| `/audit-log` | `auth.audit.view` | AUD-001–AUD-036 |
| `/notifications` | Authenticated; owner-scoped | NOTIF-001–NOTIF-014 |

### Exact permission catalogue checklist

For each row, verify the role matrix label, whether the user can see the related UI surface, whether the action succeeds when permitted, and whether every mouse/keyboard/direct-route path fails safely when not permitted.

| Module | Permission keys |
|---|---|
| Departments | `departments.view`, `departments.create`, `departments.update`, `departments.delete` |
| Employees | `hr.employees.view`, `hr.employees.create`, `hr.employees.update`, `hr.employees.delete` |
| Employee fields | `hr.employees.viewSalary`, `hr.employees.viewIdentity` |
| Job titles | `hr.job_titles.view`, `hr.job_titles.create`, `hr.job_titles.update`, `hr.job_titles.delete` |
| Assignments | `hr.assignments.view`, `hr.assignments.create` |
| Warnings | `hr.warnings.view`, `hr.warnings.create`, `hr.warnings.update`, `hr.warnings.delete` |
| Users | `auth.users.view`, `auth.users.create`, `auth.users.update`, `auth.users.delete` |
| Roles | `auth.roles.view`, `auth.roles.create`, `auth.roles.update`, `auth.roles.delete`, `auth.roles.assign` |
| Audit | `auth.audit.view`, `auth.audit.viewValues` |

**Total:** 319 unique executable manual scenarios, all initiated and judged through the dashboard UI.
<!-- End of manual test pack. -->
