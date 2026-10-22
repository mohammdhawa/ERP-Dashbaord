import React, { useMemo, useState } from "react";
import { Alert, Card, Col, Form, Row, Spinner } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import Swal from "sweetalert2";
import { assignRole, unassignRole } from "../../redux/actions/rolesActions";
import { fetchAllUsers } from "../../redux/actions/usersActions";
import { refreshCurrentUser } from "../../redux/actions/authActions";
import { hasPermission, permissionLabel } from "../../data/permissionsCatalog";
import {
  departmentToOption,
  useResourceOptions,
} from "../departments/useResourceOptions";
import {
  SCOPE_COMPANY,
  SCOPE_MANAGED,
  SCOPE_OPTIONS,
  SCOPE_UNIT,
  assignReachIsCompany,
  buildGrantBody,
  buildRevokeAllBody,
  describeGrantScope,
  grantAdvisories,
  grantInertPermissions,
  grantKey,
  managesAnyUnit,
  revokeGrantBody,
} from "./grantScope";

// Assign/unassign roles ⇄ users via the dedicated RBAC endpoints
// (POST /auth/roles/assign|unassign) — the single source of truth for grants.
// Requires auth.roles.assign (auth.roles.update until GAP-15, 2026-09-26, when
// assigning was split from editing role definitions); the user dropdown
// additionally needs auth.users.view, so we fall back to a raw user-ID input
// without it.
//
// ⚙️ A GRANT HAS A SCOPE since 2026-09-24 (GAP-3, API doc §5.4) — the role
// says which verbs, the scope says which employees: the whole company, a named
// unit and everything beneath it, or «الوحدات التي أديرها». So this card:
//
//   - asks for the scope when ASSIGNING, and a unit when the scope is one;
//   - lists the selected user's current grants, each with its own revoke, which
//     removes exactly that grant (the same role may be held over two units);
//   - keeps the main «سحب» button meaning what it always meant: take the role
//     away — over EVERY scope it is held in.
//
// The grants list needs auth.users.view (it reads the users directory). Without
// it, only revoke-all is available, which is still correct, just coarser.

// The scope text is ALWAYS shown — on the admin's own account most of all,
// since "one grant or every scope?" is exactly what they must not get wrong
// about themselves. The self warning is added to it, not swapped in for it.
const confirmRevoke = async ({ isSelf, text }) => {
  const confirm = await Swal.fire({
    title: "سحب الدور من هذا المستخدم؟",
    text: isSelf
      ? `${text} هذا حسابك — قد تفقد الوصول إلى شاشات تستخدمها الآن.`
      : text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "سحب",
    cancelButtonText: "إلغاء",
    reverseButtons: true,
    customClass: {
      confirmButton: "btn btn-danger me-2",
      cancelButton: "btn btn-light me-2",
    },
    buttonsStyling: false,
  });
  return confirm.isConfirmed;
};

const AssignRoleCard = () => {
  const dispatch = useDispatch();
  // allItems, not items: these are PICKERS and must list everything that
  // exists, not the page the table behind them happens to be showing.
  const { allItems: roles } = useSelector((state) => state.roles);
  const { allItems: users } = useSelector((state) => state.users);
  const { permissions, user: currentUser } = useSelector((state) => state.auth);

  const canListUsers = permissions.includes("auth.users.view");
  const canReadDepartments = hasPermission(permissions, "departments.view");

  const [selectedUser, setSelectedUser] = useState(null);
  const [manualUserId, setManualUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState(null);
  const [scopeType, setScopeType] = useState(SCOPE_COMPANY);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [manualUnitId, setManualUnitId] = useState("");
  // "assign" | "unassign" | a grant key while that one grant is being revoked
  const [submitting, setSubmitting] = useState(null);

  const needsUnit = scopeType === SCOPE_UNIT;

  const userOptions = useMemo(
    () =>
      users.map((u) => ({
        value: u.id,
        // email is nullable now; the employee number is what staff sign in
        // with, so it disambiguates just as well when there is no address.
        label: `${u.name || `مستخدم #${u.id}`} (${
          u.email || u.employee?.employee_number || `#${u.id}`
        })`,
      })),
    [users]
  );
  // Prefer the Arabic label for display, keep the machine name for clarity.
  const roleOptions = useMemo(
    () =>
      roles.map((r) => ({
        value: r.id,
        label: r.label ? `${r.label} (${r.name})` : r.name,
      })),
    [roles]
  );

  const resolvedUserId = canListUsers
    ? selectedUser?.value
    : manualUserId
    ? Number(manualUserId)
    : null;

  // The directory row for the selected user — the source of their grants, and
  // of whether the account is linked to an employee at all.
  const selectedUserRecord = useMemo(
    () =>
      canListUsers && resolvedUserId
        ? users.find((u) => u.id === resolvedUserId) || null
        : null,
    [canListUsers, resolvedUserId, users]
  );
  const currentGrants = selectedUserRecord?.grants || [];

  // The unit picker needs the list, and so does the «الوحدات التي أديرها»
  // check (see managesNothing) — but only for a user it could say something
  // about: a live linked employee, about to be given that scope or already
  // holding it. An unlinked account needs no list to be known to manage
  // nothing, and no user needs no check at all.
  const needsManagers =
    !!selectedUserRecord?.employee &&
    (scopeType === SCOPE_MANAGED ||
      currentGrants.some((g) => Number(g.scope_type) === SCOPE_MANAGED));
  const departments = useResourceOptions(
    "/departments",
    departmentToOption,
    (needsUnit || needsManagers) && canReadDepartments
  );
  const unitPickerAvailable = canReadDepartments && !departments.error;

  const handleScopeChange = (e) => {
    const next = Number(e.target.value);
    setScopeType(next);
    // The list is shared with the managed check, so moving from it to a unit
    // scope may not flip the load on — and a walk that failed there, where the
    // error is not shown, would otherwise leave the picker on manual entry.
    if (next === SCOPE_UNIT && departments.error) departments.reload();
  };

  const assignBody = buildGrantBody({
    userId: resolvedUserId,
    roleId: selectedRole?.value,
    scopeType,
    departmentId: unitPickerAvailable
      ? selectedUnit?.value
      : manualUnitId || null,
  });
  const revokeAllBody = buildRevokeAllBody({
    userId: resolvedUserId,
    roleId: selectedRole?.value,
  });

  // What the server will make of this role over this scope, said before the
  // request rather than after it (grantAdvisories in grantScope.js):
  //   - super_admin over anything but the company is refused by NAME, so the
  //     button is disabled — a role's name cannot go stale;
  //   - GAP-15: over a unit a grant confers only the permissions whose scope
  //     the server enforces. Read from the cached roles list, so a WARNING and
  //     never a block — another tab may have changed the role, and the server
  //     answers with its own 422 if the grant would confer nothing at all;
  //   - GAP-16 (2026-09-28): you can only give — or take away — what you hold,
  //     and super_admin only if you are one. The caller's own permissions come
  //     from /auth/me, which carries no scopes, so a permission missing there
  //     is a certain refusal and one present is not a promise: a warning.
  const selectedRoleRecord = selectedRole
    ? roles.find((r) => r.id === selectedRole.value) || null
    : null;
  const caller = { roles: currentUser?.roles, permissions };
  const advice = grantAdvisories(selectedRoleRecord, scopeType, caller);

  // «الوحدات التي أديرها» resolves through the account's EMPLOYEE — the units
  // whose manager is that person. An unlinked account manages nothing, nor
  // does one linked to a soft-deleted employee (`employee_id` survives, the
  // embedded `employee` is null — the same third state Users.jsx shows), nor a
  // live employee who runs no unit today. The grant then reaches no one.
  //
  // For a company-wide assigner that is legal, and occasionally intended (the
  // link or the appointment may come later). For a SCOPED assigner the server
  // refuses it — granting and revoking alike (403, 2026-09-26): the grant's
  // reach would be set by whatever unit the person runs next, beyond the
  // assigner's. Both read cached lists, so a warning either way, never a block.
  const departmentsKnown =
    departments.loaded && !departments.incomplete;
  const managesNothing =
    selectedUserRecord == null
      ? null
      : !selectedUserRecord.employee_id
      ? "unlinked"
      : selectedUserRecord.employee === null
      ? "deleted"
      : departmentsKnown &&
        !managesAnyUnit(selectedUserRecord.employee_id, departments.items)
      ? "manages-none"
      : null;
  const managesNothingReason =
    managesNothing === "deleted"
      ? "الموظف المرتبط بهذا الحساب لم يعد متاحاً (سجل محذوف)"
      : managesNothing === "unlinked"
      ? "هذا الحساب غير مرتبط بموظف"
      : "الموظف المرتبط بهذا الحساب لا يدير حالياً أي وحدة";
  const managedEmployeeGap =
    scopeType === SCOPE_MANAGED ? managesNothing : null;
  // true / false / null (cannot tell) — see assignReachIsCompany.
  const callerCompanyWide = managesNothing
    ? assignReachIsCompany(
        users.find((u) => u.id === currentUser?.id) || null,
        roles
      )
    : null;
  // The rule, for the assign alert and the revoke confirmations alike. `false`
  // comes from the cached roles list too, so it says "likely", not "will".
  const managedRefusal =
    callerCompanyWide === true
      ? null
      : `لا يمنح نطاق «الوحدات التي أديرها» لمستخدم لا يدير أي وحدة ولا يسحبه منه إلا من يملك صلاحية الإسناد على مستوى «الشركة كاملة»${
          callerCompanyWide === false
            ? "، وصلاحيتك — بحسب قائمة الأدوار المحمّلة — ليست كذلك، فالأرجح أن يرفضه الخادم."
            : "."
        }`;
  // Appended to a revoke confirmation that would take away a managed grant
  // from this user: the server checks each grant a revoke removes.
  const managedRevokeNote = (grants) =>
    managesNothing &&
    managedRefusal &&
    grants.some((g) => Number(g.scope_type) === SCOPE_MANAGED)
      ? ` تنبيه: ${managesNothingReason}. ${managedRefusal}`
      : "";

  const afterChange = (response) => {
    // The response carries the updated user and the reducer has already
    // patched it in (ROLE_ASSIGNMENT_CHANGED). Walk the whole directory only if
    // it did not — an unexpected response shape must not leave the list stale.
    if (canListUsers && !response?.data?.id) dispatch(fetchAllUsers());
    // Re-pull /auth/me in case the admin changed their own grants.
    if (resolvedUserId === currentUser?.id) dispatch(refreshCurrentUser());
  };

  const run = async (key, thunk) => {
    setSubmitting(key);
    try {
      afterChange(await dispatch(thunk));
    } catch {
      /* toast already shown by the action */
    } finally {
      setSubmitting(null);
    }
  };

  const handleAssign = () => {
    if (!assignBody) return;
    run("assign", assignRole(assignBody));
  };

  // Revoking a role is destructive and silently takes screens away from
  // whoever held it — including, if they pick their own account, the admin
  // doing it. Every delete in this app confirms first.
  const handleRevokeAll = async () => {
    if (!revokeAllBody) return;
    // Name the grants that go with it when the directory tells us. Revoke-all
    // is also the only remedy for a grant that cannot be revoked on its own
    // (see below), so the admin must see what else it takes with it.
    const roleName = roles.find((r) => r.id === revokeAllBody.role_id)?.name;
    const affected = currentGrants.filter((g) => g.role === roleName);
    const scopes = affected.map((g) => `«${describeGrantScope(g)}»`).join("، ");
    const ok = await confirmRevoke({
      isSelf: resolvedUserId === currentUser?.id,
      text: `سيُسحب الدور من كل النطاقات الممنوح عليها${
        affected.length ? ` (${scopes})` : ""
      }، ويفقد المستخدم كل الصلاحيات التي يمنحها.${managedRevokeNote(
        affected
      )}`,
    });
    if (ok) run("unassign", unassignRole(revokeAllBody));
  };

  const handleRevokeGrant = async (grant) => {
    const body = revokeGrantBody(resolvedUserId, grant, roles);
    if (!body) return;
    const ok = await confirmRevoke({
      isSelf: resolvedUserId === currentUser?.id,
      text: `سيُسحب الدور «${grant.role}» على نطاق «${describeGrantScope(
        grant
      )}» فقط، وتبقى منحه الأخرى إن وُجدت.${managedRevokeNote([grant])}`,
    });
    if (ok) run(grantKey(grant), unassignRole(body));
  };

  const busy = !!submitting;

  return (
    <Card className="custom-card">
      <Card.Header>
        <Card.Title>إسناد الأدوار للمستخدمين</Card.Title>
      </Card.Header>
      <Card.Body>
        <Row className="g-3 align-items-end">
          <Col sm={12} md={6} xl={3}>
            {/* htmlFor + inputId: without the pair these labels were floating
                text and neither select had an accessible name. The employee and
                job-title filters already wire theirs up this way. */}
            <Form.Label htmlFor="assign-user">المستخدم</Form.Label>
            {canListUsers ? (
              <Select
                inputId="assign-user"
                options={userOptions}
                classNamePrefix="Select2"
                placeholder="اختر المستخدم"
                value={selectedUser}
                onChange={setSelectedUser}
                isClearable
              />
            ) : (
              <>
                <Alert variant="warning" className="py-2 px-3 mb-2">
                  <i className="ri-information-line align-middle me-1"></i>
                  قائمة المستخدمين غير متاحة — تتطلب صلاحية{" "}
                  <code>auth.users.view</code>. أدخل معرّف المستخدم يدويًا.
                </Alert>
                <Form.Control
                  id="assign-user"
                  type="number"
                  min={1}
                  placeholder="معرّف المستخدم (ID)"
                  value={manualUserId}
                  onChange={(e) => setManualUserId(e.target.value)}
                />
              </>
            )}
          </Col>
          <Col sm={12} md={6} xl={3}>
            <Form.Label htmlFor="assign-role">الدور</Form.Label>
            <Select
              inputId="assign-role"
              options={roleOptions}
              classNamePrefix="Select2"
              placeholder="اختر الدور"
              value={selectedRole}
              onChange={setSelectedRole}
              isClearable
            />
          </Col>
          <Col sm={12} md={6} xl={2}>
            <Form.Label htmlFor="assign-scope">النطاق</Form.Label>
            <Form.Select
              id="assign-scope"
              value={scopeType}
              onChange={handleScopeChange}
            >
              {SCOPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Form.Select>
          </Col>
          {needsUnit && (
            <Col sm={12} md={6} xl={2}>
              <Form.Label htmlFor="assign-unit">الوحدة</Form.Label>
              {unitPickerAvailable ? (
                <>
                  <Select
                    inputId="assign-unit"
                    options={departments.options}
                    classNamePrefix="Select2"
                    placeholder="اختر الوحدة"
                    value={selectedUnit}
                    onChange={setSelectedUnit}
                    isLoading={departments.loading}
                    isClearable
                    noOptionsMessage={() => "لا توجد وحدات"}
                  />
                  {departments.incomplete && (
                    <div className="text-warning small mt-1">
                      تعذّر تحميل كل الوحدات، القائمة غير مكتملة.
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Form.Control
                    id="assign-unit"
                    type="number"
                    min={1}
                    placeholder="معرّف الوحدة (ID)"
                    value={manualUnitId}
                    onChange={(e) => setManualUnitId(e.target.value)}
                  />
                  <div className="text-muted small mt-1">
                    {canReadDepartments
                      ? "تعذّر تحميل قائمة الوحدات، أدخل المعرّف يدوياً."
                      : "قائمة الوحدات تتطلب صلاحية departments.view، أدخل المعرّف يدوياً."}
                  </div>
                </>
              )}
            </Col>
          )}
          <Col sm={12} md={6} xl={needsUnit ? 2 : 4}>
            <div className="d-flex gap-2">
              {/* type="button" on both: these sit in a Card, not a form today,
                  but an untyped <button> defaults to submit and would post the
                  moment this block is ever wrapped in one. */}
              <button
                type="button"
                className="btn btn-secondary flex-fill"
                // Only a refusal that cannot go stale disables this: see
                // `advice` above.
                disabled={!assignBody || busy || !!advice.blocked}
                onClick={handleAssign}
              >
                {submitting === "assign" ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  "إسناد"
                )}
              </button>
              <button
                type="button"
                className="btn btn-outline-danger flex-fill"
                disabled={!revokeAllBody || busy}
                onClick={handleRevokeAll}
                title="سحب الدور من كل النطاقات الممنوح عليها"
              >
                {submitting === "unassign" ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  "سحب"
                )}
              </button>
            </div>
          </Col>
        </Row>

        {scopeType === SCOPE_MANAGED && (
          <div className="text-muted small mt-2">
            يصل هذا النطاق إلى كل وحدة يديرها الموظف المرتبط بالحساب وما تحتها،
            ويتبع الهيكل التنظيمي تلقائياً عند تغيّر مدير أي وحدة.
          </div>
        )}
        {advice.blocked && (
          <Alert variant="danger" className="py-2 px-3 mt-2 mb-0">
            <i className="ri-forbid-line align-middle me-1"></i>
            {advice.blocked}
          </Alert>
        )}
        {/* No advice to "grant it company-wide instead": an assigner whose
            own grant is scoped would get a 403 for trying. The fact, and the
            one remedy open to every assigner — a different role. */}
        {advice.inert.length > 0 && (
          <Alert variant="warning" className="py-2 px-3 mt-2 mb-0">
            <i className="ri-error-warning-line align-middle me-1"></i>
            {advice.whollyInert
              ? "لن يمنح هذا الإسناد أي صلاحية على هذا النطاق: كل صلاحيات هذا الدور لا تعمل إلا بإسناد على مستوى «الشركة كاملة»، وسيرفضه الخادم. اختر دوراً آخر لهذا النطاق."
              : "بعض صلاحيات هذا الدور لا تعمل إلا بإسناد على مستوى «الشركة كاملة»، ولن يمنحها هذا الإسناد:"}
            {!advice.whollyInert && (
              <span className="d-block mt-1">
                {advice.inert
                  .map((name) => `«${permissionLabel(name)}»`)
                  .join("، ")}
              </span>
            )}
          </Alert>
        )}
        {/* Same rule as above: the remedy offered is a different role, not
            the company scope, which a scoped assigner cannot grant. */}
        {/* GAP-16: the server refuses (403) to grant OR revoke a role that
            confers something the caller does not hold — so both buttons are
            named. Not a disabled button: it reads the cached roles list, and
            the server's 403, which names what is missing, is the backstop. */}
        {advice.notHeld.length > 0 && (
          <Alert variant="danger" className="py-2 px-3 mt-2 mb-0">
            <i className="ri-shield-keyhole-line align-middle me-1"></i>
            لا يُمنح دور ولا يُسحب إلا ممن يملك كل ما يمنحه هذا الدور، وأنت لا
            تملك — فسيرفض الخادم الإسناد والسحب:
            <span className="d-block mt-1">
              {advice.notHeld
                .map((name) => `«${permissionLabel(name)}»`)
                .join("، ")}
            </span>
          </Alert>
        )}
        {managedEmployeeGap && (
          <Alert
            variant={callerCompanyWide === false ? "danger" : "warning"}
            className="py-2 px-3 mt-2 mb-0"
          >
            <i className="ri-error-warning-line align-middle me-1"></i>
            {managesNothingReason}
            ، فلن يصل نطاق «الوحدات التي أديرها» إلى أي موظف
            {managedEmployeeGap === "manages-none"
              ? " حتى يُعيَّن مديراً لوحدة."
              : " حتى يُربط بموظف يدير وحدة."}
            {managedRefusal && (
              <span className="d-block mt-1">{managedRefusal}</span>
            )}
          </Alert>
        )}

        {selectedUserRecord && (
          <div className="mt-3">
            <div className="text-muted fs-12 mb-2">
              الأدوار الممنوحة لهذا المستخدم
            </div>
            {currentGrants.length === 0 ? (
              <span className="text-muted">بدون أدوار</span>
            ) : (
              <div className="d-flex flex-wrap gap-2">
                {currentGrants.map((grant) => {
                  const key = grantKey(grant);
                  const revocable = revokeGrantBody(resolvedUserId, grant, roles);
                  // Why the × is off, when it is: the role is not in the list,
                  // or the grant's unit was deleted and the server sent no id
                  // to name it by — then only «سحب» (every scope) reaches it.
                  const blockedReason = revocable
                    ? null
                    : roles.some((r) => r.name === grant.role)
                    ? "تعذّر تحديد وحدة هذا الإسناد (قد تكون محذوفة) — لا يمكن سحبه منفرداً، استخدم «سحب» لإزالة الدور من كل نطاقاته."
                    : "الدور غير موجود في قائمة الأدوار — لا يمكن سحب هذا الإسناد منفرداً.";
                  // GAP-15 left some older scoped grants partly or wholly
                  // inert. Without a mark here the chip looks fully effective
                  // while its holder gets 403s. Display only, so the cached
                  // roles list is good enough.
                  const inert = grantInertPermissions(grant, roles);
                  const role = roles.find((r) => r.name === grant.role);
                  const inertNote =
                    inert.length === 0
                      ? null
                      : inert.length === (role?.permissions?.length ?? -1)
                      ? "لا يمنح هذا الإسناد أي صلاحية على نطاقه: كل صلاحيات الدور لا تعمل إلا بإسناد على مستوى «الشركة كاملة»."
                      : `صلاحيات لا تعمل على هذا النطاق: ${inert
                          .map((name) => `«${permissionLabel(name)}»`)
                          .join("، ")}`;
                  return (
                    <span
                      key={key}
                      className="badge bg-primary-transparent d-inline-flex align-items-center gap-1 fs-12"
                      // On the chip too: a disabled button's own title is not
                      // shown by every browser.
                      title={
                        [inertNote, blockedReason].filter(Boolean).join("\n") ||
                        undefined
                      }
                    >
                      {inertNote && (
                        <i
                          className="ri-error-warning-line text-warning"
                          aria-label={inertNote}
                        ></i>
                      )}
                      {grant.role}
                      <span className="text-muted fw-normal">
                        · {describeGrantScope(grant)}
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-link text-danger p-0 ms-1 lh-1"
                        onClick={() => handleRevokeGrant(grant)}
                        disabled={!revocable || busy}
                        aria-label={`سحب ${grant.role} على نطاق ${describeGrantScope(
                          grant
                        )}`}
                        title={blockedReason || "سحب هذا الإسناد فقط"}
                      >
                        {submitting === key ? (
                          <Spinner animation="border" size="sm" />
                        ) : (
                          <i className="ri-close-line"></i>
                        )}
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default AssignRoleCard;
