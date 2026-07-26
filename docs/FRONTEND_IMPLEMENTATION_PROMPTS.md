# Token-efficient prompts for implementing the Phase 1 frontend

These prompts are designed for `erp-dashboard` and the API contract in:

`C:\Users\ragab\Desktop\work\alraqi-erp-system\docs\API_DOCUMENTATION.md`

Run the prompts in order. Use one prompt per agent run/context so each run reads only the API section and source files it needs. If a phase is already partly implemented, the agent must preserve correct work and finish or repair it instead of creating parallel modules.

## How to use this pack

1. In a new agent context, send the **Shared execution contract** once.
2. Then send exactly one numbered phase prompt.
3. Let the agent edit the repository and verify the phase. Do not ask it to print code.
4. Commit or review the phase before starting the next prompt.
5. Use Prompt 9 only after Prompts 1–8 are complete.

The line ranges below match the API document dated July 18, 2026. If the file changes, use the named headings rather than blindly trusting the old line numbers.

---

## Shared execution contract

```text
Act as a senior React frontend engineer working directly in:
C:\Users\ragab\Desktop\work\erp-dashboard

Implement the requested phase in the repository; do not merely describe it and do not paste complete files or a large diff into chat.

Rules:
- Inspect the current implementation first. Preserve correct existing behavior and naming where practical; repair or complete it instead of duplicating it.
- Read only the API-document sections and source files named in this phase. Do not load the entire API document unless the phase explicitly says to.
- Stay with the existing stack: React 18, Vite, Redux/Redux Toolkit conventions already in the repo, Axios, React Bootstrap, Formik, and Yup. Do not add a dependency unless it is genuinely necessary and you explain why first.
- Reuse existing layout, table, pagination, modal, loader, toast, routing, and styling components.
- The backend contract is authoritative. Do not invent endpoints, query parameters, response fields, roles, or permissions.
- Keep Arabic/RTL behavior and the dashboard's established visual language. Use server-provided Arabic messages. Do not copy mojibake text caused by an incorrectly decoded terminal; read the document as UTF-8.
- Treat server data as untrusted. Render plain text by default; do not use dangerouslySetInnerHTML.
- Scope edits to this phase plus the smallest shared changes it requires. Do not refactor unrelated legacy features.
- Handle loading, empty, error, retry, and permission-denied states. Prevent double submissions and stale-request UI updates.
- Run the smallest relevant checks, then run `npm run build`. Run `npm run lint` too, but distinguish newly introduced failures from pre-existing repository failures.
- End with a concise report: changed files, behavior completed, checks run, and any real blocker. Do not include file contents or a full diff. Keep the final response under 250 words.
```

---

## Prompt 1 — HTTP, token, response, and error foundation

```text
Implement or audit the shared API-client foundation for Phase 1.

Read only:
- API_DOCUMENTATION.md lines 8–144: Base URL through Pagination.
- API_DOCUMENTATION.md lines 732–741: Frontend integration checklist.
- package.json
- src/redux/api.js
- src/utils/tokenStore.js
- src/utils/apiHelpers.js
- src/utils/toast.js
- imports/usages of those files found with a narrowly scoped rg search.

Required outcome:
1. One Axios client uses `VITE_API_URL`, with a sensible local `/api` fallback, and always sends `Accept: application/json` and JSON content type.
2. Access tokens are attached as bearer tokens. Follow the documented browser-storage recommendation: keep access token in memory; keep the JS-readable refresh token in persistent/session storage so reload bootstrap is possible. Never log either token.
3. Implement a single-flight refresh flow. Concurrent protected-request 401s must share one refresh call, immediately persist the rotated token pair, and retry each original request once.
4. Never run refresh logic for login or refresh requests, and never refresh a 403. A failed refresh, missing refresh token, or token-reuse response must clear local auth state and lead to the existing session-expired/sign-in flow without a redirect loop.
5. A refresh request must bypass the normal response interceptor so it cannot recurse. Never retry the same consumed refresh token.
6. Normalize the standard success/error envelope without assuming every response contains `success`. Preserve the field-keyed 422 `errors` object. Handle status-based bare 401 and 429 responses; expose `Retry-After` in a reusable form.
7. Preserve pagination as `{ data: [...], meta: {...} }`; do not rewrite it into an incompatible shape globally.
8. Avoid broad UI/module changes in this phase.

Verify with focused reasoning or existing tests for: concurrent 401s, refresh rotation, refresh failure, login 401, protected 403, bare 429, 422 field errors, and a response with no `data`. Then build the app.
```

---

## Prompt 2 — Authentication and session lifecycle

```text
Implement or audit login, logout, current-user hydration, and application session bootstrap.

Assume Prompt 1 is complete.

Read only:
- API_DOCUMENTATION.md lines 179–327: Auth endpoints.
- src/pages/Signin.jsx
- src/pages/SessionsExpired.jsx
- src/redux/actions/authActions.jsx
- src/redux/redurcers/authReducer.jsx
- src/main.jsx
- src/pages/App.jsx
- src/pages/layout/ProtectedRoute.jsx
- the token/API helpers from Prompt 1.

Required outcome:
1. Login posts only `email` and `password`, validates the documented constraints, stores the new token pair, and hydrates the exact returned user, roles, and flattened permissions.
2. Invalid credentials (401), disabled account (403), validation (422), throttling (429 with Retry-After), and network errors have distinct, useful UI behavior. A login 401 must never trigger token refresh.
3. On application boot, if a refresh token exists, validate the session with `GET /auth/me`. Allow the Prompt-1 interceptor to refresh an expired in-memory access token once. Do not render protected routes until bootstrap resolves.
4. Store the current user and the flattened `permissions` array in auth state. Do not infer permissions from role names, including `super_admin`; trust the payload.
5. Logout calls `POST /auth/logout` when possible, then always clears local auth state/tokens and navigates safely even if the network call fails.
6. Avoid flicker and redirect loops among sign-in, protected routes, no-access, and session-expired pages.
7. Do not add registration, forgot-password, profile-edit, or password-change API calls; they are not in this Phase 1 contract.

Verify cold start without a token, reload with a valid refresh token, expired access token, invalid refresh token, disabled account, successful login, and logout. Run the build.
```

---

## Prompt 3 — Permission gates, protected navigation, and the Phase 1 shell

```text
Implement or audit permission-aware routes, navigation, page actions, and dashboard visibility.

Assume Prompts 1–2 are complete.

Read only:
- API_DOCUMENTATION.md lines 145–177: RBAC model and Phase 1 permission catalogue.
- src/pages/layout/ProtectedRoute.jsx
- src/pages/layout/ProtectedElement.jsx
- src/data/Routingdata.jsx
- src/data/Sidemenudata.jsx
- src/data/permissionsCatalog.js
- src/components/Sidebar.jsx
- src/components/Menuloop.jsx
- src/sections/dashboard/Dashboard.jsx
- src/main.jsx routing composition.

Required outcome:
1. Use only the flattened permission strings from auth state. Do not call a `/permissions` endpoint; none exists in this API contract.
2. Define one clear permission-check convention and use it consistently. Single-resource pages require their `.view` permission. Buttons/actions require their exact create/update/delete permission.
3. Protect routes from direct URL access and hide unavailable sidebar/dashboard entries. An authenticated user without access should reach the existing no-access experience, not be treated as logged out.
4. Auth-only notifications remain available to every authenticated user and require no RBAC permission.
5. Use the exact Phase 1 catalogue:
   - auth.users.view/create/update/delete
   - auth.roles.view/create/update/delete
   - departments.view/create/update/delete
   - hr.employees.view/create/update/delete
6. Keep permission metadata centralized and use stable machine names for checks. Labels are presentation only.
7. Remove or isolate stale legacy permission checks only where they interfere with Phase 1 routes; do not rewrite unrelated legacy modules.
8. Ensure the shell waits for auth bootstrap before deciding visibility.

Verify at least these permission sets conceptually or with existing tests: none, view-only for each module, create without update/delete, and the full flattened catalogue. Run the build.
```

---

## Prompt 4 — Departments / organizational units

```text
Implement or audit the Departments frontend as a complete permission-aware, server-paginated CRUD feature.

Assume Prompts 1–3 are complete.

Read only:
- API_DOCUMENTATION.md lines 110–143: pagination shape.
- API_DOCUMENTATION.md lines 566–636: Departments.
- src/redux/actions/departmentsActions.jsx
- src/redux/redurcers/departmentReducer.jsx
- src/sections/departments/**
- src/components/DataTableServer.jsx
- src/components/TablePaginationServer.jsx
- only the route/sidebar entries for departments.

Required outcome:
1. Use only `GET/POST/GET-one/PUT-or-PATCH/DELETE /departments` as documented. List requests use only `?page=N`; do not invent search, sort, `per_page`, tree, or lookup endpoints.
2. Consume the flat `data` array and sibling `meta` object. Page controls use server metadata and handle an empty/deleted last page by returning to the nearest valid page.
3. Present the domain as Arabic organizational units, not merely generic departments. Display `level_label` from the server; do not hardcode the level label map for rendering.
4. Create/edit forms cover only documented fields and apply safe client validation while leaving hierarchy truth to the server. Map 422 field errors to controls and show 409 root/child deletion messages.
5. Correctly represent nullable `code`, `description`, `parent_id`, and `manager_id`, plus boolean `is_active`. Do not send empty strings where `null` is intended.
6. Gate view/create/update/delete UI with the exact `departments.*` permissions. Confirmation is required before delete.
7. Parent and manager selectors may use only documented list endpoints and only permissions the user owns. If a selector needs more than one page, explicitly load supported pages and show loading/incomplete states; never fake an undocumented `?all=true`. Provide a truthful fallback when the related list cannot be read.
8. Do not simulate hierarchy validation client-side as a replacement for server errors, and do not add drag-and-drop tree mutation.

Verify CRUD state transitions, page changes, 422 hierarchy errors, 409 delete errors, null fields, view-only access, and action-button permissions. Run the build.
```

---

## Prompt 5 — HR employees

```text
Implement or audit the HR Employees frontend as a complete permission-aware, server-paginated CRUD feature.

Assume Prompts 1–4 are complete.

Read only:
- API_DOCUMENTATION.md lines 110–143: pagination shape.
- API_DOCUMENTATION.md lines 637–697: HR — Employees.
- src/redux/actions/employeesActions.jsx
- src/redux/redurcers/employeeReducer.jsx
- src/sections/hr/**
- the existing server table/pagination components.
- only the route/sidebar entries for employees.

Required outcome:
1. Use the documented `/hr/employees` endpoints and `?page=N` only. Consume flat `data` plus sibling `meta`.
2. List and form states must cover all documented fields without inventing fields. `employee_number` is optional on create and may be auto-generated by the server.
3. Keep salary precision: treat the returned decimal as a string for display and avoid binary-float transformations. Validate submitted salary as numeric and non-negative without changing its intended decimal value.
4. Use a date-only input/value for `hire_date`; do not apply timezone conversion to `YYYY-MM-DD`.
5. Status values sent to the API are exactly `active`, `inactive`, or `terminated`; translate labels only in the UI.
6. Convert empty optional values to `null` or omission consistently with create/update semantics. Map 422 errors by exact field.
7. Gate the page and actions using `hr.employees.view/create/update/delete`. Confirm soft delete and refetch/repair the current page after mutation.
8. A department selector may only use documented department pages and requires `departments.view`. If that permission is absent, provide a truthful fallback or leave the optional link unset; never call an invented lookup endpoint.
9. Loading, empty, retry, and no-access states must be accessible and consistent with the dashboard.

Verify auto-number omission, decimal salary, date-only behavior, every status, duplicate employee/national IDs, missing department, server pagination, and view-only mode. Run the build.
```

---

## Prompt 6 — Administrative users

```text
Implement or audit the Phase 1 administrative Users feature.

Assume Prompts 1–5 are complete.

Read only:
- API_DOCUMENTATION.md lines 328–405: Users (admin).
- src/redux/actions/usersActions.jsx
- src/redux/redurcers/userReducer.jsx
- src/sections/accounts/**
- route/sidebar entries that point to the Phase 1 users screen.
- employee-list code only if needed for the employee selector.

Required outcome:
1. Use only `/auth/users` list/create/update/delete. The list is a full collection, not paginated, and has no `meta` object.
2. Use the exact user shape. There is no stored `name` field: display `name` returned from the linked employee and never submit `name` to Users endpoints.
3. Create requires `employee_id`, `email`, and password; `is_active` is optional. Update is partial, and a blank password must be omitted—not submitted as an empty password.
4. Roles are read-only chips/details on this screen. Do not submit role IDs/names through Users endpoints; role assignment belongs to Prompt 7.
5. Map 422 errors for employee uniqueness/existence, email uniqueness, and other fields. Prevent or clearly handle self-delete; still display the authoritative server message if it returns 422.
6. Gate page/actions with `auth.users.view/create/update/delete`. Do not confuse current-user auth permissions with any stale legacy permission store.
7. An employee picker may use only the paginated `/hr/employees` endpoint and requires `hr.employees.view`. Load documented pages explicitly if a complete picker is required. If the user can create accounts but cannot list employees, provide a truthful numeric-ID/manual fallback or an explanatory blocked selector; do not invent an employee lookup endpoint.
8. Local filtering is allowed only over the full Users collection. Make it clear that employee selector filtering is not server search unless it truly is local over all loaded pages.

Verify create, partial update, omitted password, active toggle, linked/unlinked names, role display, delete-other, self-delete error, permission gates, and the non-paginated response shape. Run the build.
```

---

## Prompt 7 — Roles, permission catalogue, and role assignment

```text
Implement or audit the Phase 1 Roles and RBAC management frontend.

Assume Prompts 1–6 are complete.

Read only:
- API_DOCUMENTATION.md lines 145–177: RBAC model/catalogue.
- API_DOCUMENTATION.md lines 406–511: Roles & Permissions.
- src/data/permissionsCatalog.js
- src/redux/actions/rolesActions.jsx
- src/redux/redurcers/roleReducer.jsx
- src/sections/rbac/**
- users actions/state only where required for assignment.
- route/sidebar entries for roles.

Required outcome:
1. Use only the documented role list/create/update/delete and `/auth/roles/assign|unassign` endpoints. The role list is a full collection and has no pagination metadata.
2. Since Phase 1 exposes no permissions-list endpoint, use one centralized static catalogue containing exactly the 16 documented permission names and Arabic display labels. Do not call legacy `/permissions` APIs for this feature.
3. Role forms handle `name`, nullable `label`, nullable `description`, and permission-name strings. Never submit `is_system`.
4. Preserve update sync semantics exactly: including `permissions` replaces the entire set; `permissions: []` intentionally clears it; omitting `permissions` leaves it unchanged. Make this distinction explicit in form state and payload construction.
5. A system role cannot be renamed, edited, or deleted. Disable those controls from `is_system`, while still surfacing a server 409. Assignment/unassignment of a system role remains allowed.
6. Assign/unassign payloads contain numeric `user_id` and `role_id`. Refresh affected user/role/current-user state after a successful change so chips and live permissions are not stale.
7. Gate the page/actions with `auth.roles.view/create/update/delete`. Listing users for assignment additionally requires `auth.users.view`; show a clear unavailable state if it is missing.
8. Display role label preferentially while retaining the stable machine name. Confirm deletion and show server validation/conflict messages.

Verify create, edit metadata without changing permissions, replace permissions, intentionally clear all permissions, system-role protections, assign, unassign, missing users-view permission, and non-paginated lists. Run the build.
```

---

## Prompt 8 — Notifications and unread badge

```text
Implement or audit authenticated notifications, unread count, and the navigation badge.

Assume Prompts 1–7 are complete.

Read only:
- API_DOCUMENTATION.md lines 512–565: Notifications.
- API_DOCUMENTATION.md lines 110–143: pagination.
- src/redux/actions/notificationsActions.jsx
- src/redux/redurcers/notificationReducer.jsx
- src/sections/notifications/**
- src/components/Header.jsx
- notification route/sidebar entries.

Required outcome:
1. Notifications are auth-only and owner-scoped; do not require or invent an RBAC permission.
2. List `GET /auth/notifications` with documented server pagination (`?page=N`, flat `data`, sibling `meta`) and render newest-first as returned.
3. Poll only `/auth/notifications/unread-count` for the badge at a reasonable interval. Start only for an authenticated, initialized session; stop on logout/unmount; avoid overlapping polls; pause or reduce work while the page is hidden if practical.
4. Mark one item read with `POST /auth/notifications/{id}/read`. Update that item and unread count optimistically or from the response, but roll back/refetch on error. Treat the operation as idempotent.
5. Render nullable `type`, `body`, and `reference` safely. Deep-link only through an explicit allowlist of known reference types/routes; never turn server-provided strings into arbitrary URLs.
6. A 404 for mark-read means missing or not owned; show a generic safe message and refresh the current page.
7. Do not add mark-all-read, delete-notification, WebSocket, or push-subscription calls because Phase 1 does not provide them.
8. The badge and list must have accessible labels, loading/empty/error states, and sensible RTL layout.

Verify zero/nonzero count, polling cleanup, page changes, already-read click, mark-read 404, nullable content/reference, and session logout while polling. Run the build.
```

---

## Prompt 9 — Integration audit, edge cases, and release verification

```text
Perform a bounded Phase 1 frontend integration audit and fix only confirmed issues.

Assume Prompts 1–8 are complete. This is not a redesign.

Read only:
- API_DOCUMENTATION.md lines 698–741: endpoint quick reference and frontend checklist.
- git diff/status and the Phase 1 files changed by Prompts 1–8.
- package.json scripts.
Do not reread the detailed API sections unless a concrete mismatch requires it.

Build a private checklist for all 27 documented endpoints; do not print the full checklist unless an item is missing. Confirm:
1. Every frontend request has the correct method/path, auth behavior, permission, payload, response shape, and pagination mode.
2. No undocumented endpoints or query parameters remain in active Phase 1 flows.
3. No Phase 1 screen imports stale legacy permission/user/role APIs when the new auth state or static catalogue is required.
4. Refresh is single-flight and rotation-safe; login 401 and all 403s bypass refresh; session bootstrap and logout cannot loop.
5. All create/update forms map server 422 field errors and global errors, prevent duplicate submission, and preserve nullable/omitted-field semantics.
6. All destructive actions are permission-gated and confirmed. System-role, self-delete, root-department, and department-with-children errors remain visible.
7. Server-paginated screens use `meta`; Users and Roles do not pretend to be server-paginated.
8. Arabic/RTL, keyboard operation, form labels, modal focus, loading, empty, error, and no-access states are coherent at desktop and mobile widths.
9. There are no token logs, unsafe HTML rendering, obvious secrets, or unhandled promises.

Run `npm run build` and `npm run lint`. If a test framework already exists, run relevant tests; do not add a new framework solely for this audit. Report pass/fail accurately and separate pre-existing failures from regressions introduced by Phase 1 work. Keep the final response concise and list only remaining actionable gaps.
```

---

## Optional compact follow-up prompt for any failed phase

```text
Continue the previous Phase [NUMBER] implementation. Read only the previous agent's concise report, `git diff`, and the files involved in the reported failure. Do not restart the phase or reread the whole API document. Reproduce the specific failure, make the smallest correct fix consistent with the authoritative API section, rerun the failed check plus `npm run build`, and respond in under 150 words without pasting code or a full diff.
```

