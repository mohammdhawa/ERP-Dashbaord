import React, { useEffect, useMemo, useState } from "react";
import { Col, Collapse, Form, Row } from "react-bootstrap";
import Select, { components } from "react-select";
import { useSelector } from "react-redux";
import { hasPermission } from "../../data/permissionsCatalog";
import { useResourceOptions } from "../departments/useResourceOptions";
import {
  EVENT_META,
  EVENT_FALLBACK_LABELS,
  EVENT_GROUPS,
  EVENT_GROUP_LABELS,
  AUDITABLE_META,
  AUDITABLE_TYPES,
  eventGroup,
} from "../../data/auditEvents";
import {
  ACTOR_ANY_USER,
  ACTOR_SYSTEM,
  actorPatch,
  actorSelection,
  resolveActorOption,
} from "./auditActor";

// SERVER-SIDE filter toolbar for سجل التدقيق. Every control maps to a
// documented query parameter and nothing is filtered in the browser — filtering
// the fifteen rows that happen to be on screen would answer "what happened" with
// "whatever was on this page", which on an unbounded table is meaningless.
//
// The `event_group` value is NOT edited directly here. It is owned by the
// api_request switch on the parent screen (see AuditLog.jsx): one source of
// truth for "are routine requests included", stated on screen rather than
// hidden in code. The parent renders that switch into this panel's action bar
// through `barStart`, so it sits with the other filter controls while its
// state and locking rules stay where they are decided.
//
// PRIMARY vs ADVANCED. The four questions asked on nearly every visit — a
// description, who, what, when — stay on screen; the four that answer a
// specific investigation (which record, which address, which correlated
// operation, which direction) fold away.
//
// THE GRID. Both sections are the same four equal columns (lg 3·3·3·3, md 6·6,
// sm 12), so the advanced fields line up under the primary ones. Every cell is
// exactly one label and one control high: a question asked with two boxes
// (المنفّذ without a user directory, السجل, النطاق الزمني) puts them side by
// side in an `.audit-pair`, never stacked. Cells are TOP-aligned, so a hint
// under one control (يشمل اليوم بأكمله, an incomplete user list) extends only
// its own cell instead of pushing its neighbours' labels out of line.
//
// ⚠️ THE FOLD MUST NEVER HIDE AN ACTIVE FILTER. Same principle as the
// api_request chip on the parent: a narrowed table that LOOKS unnarrowed turns
// "I looked and there was nothing" into a false statement. Two things enforce
// that — the toggle carries a count of the advanced filters currently applied,
// and the section starts open whenever any of them is set, which covers arriving
// by shared link or by drill-down rather than by clicking.
const ADVANCED_KEYS = [
  "auditable_type",
  "auditable_id",
  "ip_address",
  "request_id",
  "sort",
];

const countAdvanced = (filters) =>
  ADVANCED_KEYS.filter((key) => (filters[key] || "") !== "").length;

const EVENT_OPTIONS = Object.keys(EVENT_META).map((key) => ({
  value: key,
  // The picker is a list of things to ASK FOR, not a rendering of a row, so a
  // local label is correct here — same reason the hrEnums lists exist. The raw
  // key rides along because that is what lands in the URL.
  label: `${EVENT_FALLBACK_LABELS[key] || key} — ${key}`,
  // What a selected chip shows. The menu is where an event is identified;
  // the chip only has to say which one was picked, in the width it has.
  short: EVENT_FALLBACK_LABELS[key] || key,
  group: EVENT_META[key].group,
}));

const GROUPED_EVENT_OPTIONS = EVENT_GROUPS.map((group) => ({
  label: EVENT_GROUP_LABELS[group],
  options: EVENT_OPTIONS.filter((o) => o.group === group),
}));

// الحدث STAYS ONE CONTROL HIGH. A multi-select grows a line per few chips, so
// picking events made its cell taller than its neighbours and knocked the grid
// out of line. The chips now never wrap: the first MAX_EVENT_CHIPS show, and the
// rest collapse into a "+N" badge whose tooltip names them. Nothing selected is
// hidden — the badge counts it, and the menu keeps selected events listed
// (hideSelectedOptions off) so they can be seen and unticked there.
const MAX_EVENT_CHIPS = 2;

const EventMultiValue = (props) => {
  const { index, selectProps } = props;
  if (index < MAX_EVENT_CHIPS) return <components.MultiValue {...props} />;
  if (index > MAX_EVENT_CHIPS) return null;
  const hidden = (selectProps.value || []).slice(MAX_EVENT_CHIPS);
  return (
    // dir="ltr": in an RTL run the neutral "+" would otherwise land after the
    // digit and read "3+".
    <span
      dir="ltr"
      className="badge bg-primary-transparent audit-chip-more"
      title={hidden.map((o) => o.label).join("\n")}
    >
      +{hidden.length}
    </span>
  );
};

const EVENT_SELECT_COMPONENTS = { MultiValue: EventMultiValue };

const EVENT_SELECT_STYLES = {
  valueContainer: (base) => ({
    ...base,
    flexWrap: "nowrap",
    overflow: "hidden",
  }),
  multiValue: (base) => ({ ...base, minWidth: 0, flexShrink: 1 }),
};

const formatEventLabel = (option, { context }) =>
  context === "value" ? option.short : option.label;

const AUDITABLE_OPTIONS = AUDITABLE_TYPES.map((key) => ({
  value: key,
  label: `${AUDITABLE_META[key].label} — ${key}`,
}));

// المنفّذ with a user directory: one select, whose fixed choices come first.
// The mapping onto actor_type/user_id lives in auditActor.js. `الكل` is the
// cleared state (the placeholder) rather than an option, the same idiom as
// الترتيب below.
const ACTOR_FIXED_OPTIONS = [
  { value: ACTOR_ANY_USER, label: "أي مستخدم" },
  { value: ACTOR_SYSTEM, label: "النظام (مهمة أو أمر مجدول)" },
];

// المنفّذ WITHOUT a user directory: the plain actor-type select, paired with a
// numeric id box.
const ACTOR_TYPE_OPTIONS = [
  { value: "user", label: "مستخدم" },
  { value: "system", label: "النظام" },
];

const SORT_OPTIONS = [
  { value: "-created_at", label: "الأحدث أولاً (افتراضي)" },
  { value: "created_at", label: "الأقدم أولاً" },
];

const userToOption = (u) => ({
  value: u.id,
  // A user row is { id, name, email, ... }; the email disambiguates the two
  // accounts that genuinely share a display name.
  label: [u.name, u.email].filter(Boolean).join(" — ") || `مستخدم #${u.id}`,
});

// One column of the four-column grid. Every filter cell goes through this, so
// the breakpoints cannot drift apart between the two sections.
const FilterCell = ({ children }) => (
  <Col xs={12} md={6} lg={3}>
    {children}
  </Col>
);

const AuditLogFilters = ({
  filters,
  onChange,
  onReset,
  hasAnyFilter,
  barStart,
}) => {
  const { permissions } = useSelector((state) => state.auth);

  // The user picker reads /auth/users, which needs auth.users.view. A caller
  // without it gets a plain numeric id box: the id is still a legitimate filter
  // and the URL still carries it, but no directory is invented for someone the
  // server has decided may not read one.
  const canReadUsers = hasPermission(permissions, "auth.users.view");
  const users = useResourceOptions("/auth/users", userToOption, canReadUsers);
  const hasUserDirectory = canReadUsers && !users.error;

  // `search` matches the row description and is debounced; every other control
  // commits immediately.
  const [searchDraft, setSearchDraft] = useState(filters.search || "");
  useEffect(() => {
    setSearchDraft(filters.search || "");
  }, [filters.search]);

  useEffect(() => {
    const draft = searchDraft;
    if (draft === (filters.search || "")) return undefined;
    const timer = setTimeout(() => onChange({ search: draft }), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  const selectedEvents = useMemo(
    () =>
      (filters.event || [])
        .map((key) => EVENT_OPTIONS.find((o) => o.value === key))
        .filter(Boolean),
    [filters.event]
  );

  const actorOptions = useMemo(
    () => [
      { label: "نوع المنفّذ", options: ACTOR_FIXED_OPTIONS },
      { label: "المستخدمون", options: users.options },
    ],
    [users.options]
  );

  const typeChosen = (filters.auditable_type || "") !== "";

  // A system row has no user to name, so the id box is suppressed rather than
  // left looking usable. AuditLog clears `user_id` at the same moment the type
  // is set, so the suppressed box is also genuinely empty.
  const systemOnly = filters.actor_type === "system";

  const advancedCount = countAdvanced(filters);

  // Open on first render if the incoming filters already use the section, and
  // re-open if one of them is set from the outside afterwards — the request-id
  // drill-down does exactly that. Never auto-CLOSES: collapsing the panel out
  // from under someone mid-edit would be its own small betrayal.
  const [showAdvanced, setShowAdvanced] = useState(() => advancedCount > 0);
  useEffect(() => {
    if (advancedCount > 0) setShowAdvanced(true);
  }, [advancedCount]);

  const handleEventsChange = (options) => {
    const events = (options || []).map((o) => o.value);
    // Asking for an event whose GROUP is excluded returns nothing at all: the
    // server ANDs the two filters. AuditLog already DERIVES the group from this
    // selection, so the contradiction cannot be reached either way; what this
    // adds is the user's intent. Flipping the switch on here means that later
    // deselecting `api_request` leaves requests shown — the table they were
    // just looking at — instead of silently narrowing it back.
    const needsRequestGroup = events.some((e) => eventGroup(e) === "request");
    onChange(
      needsRequestGroup
        ? { event: events, includeApiRequests: true }
        : { event: events }
    );
  };

  return (
    <div className="audit-filters mb-3">
      <Row className="g-3 align-items-start">
        <FilterCell>
          <Form.Label htmlFor="audit-search">بحث في الوصف</Form.Label>
          <Form.Control
            id="audit-search"
            type="search"
            placeholder="نص الوصف"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </FilterCell>

        <FilterCell>
          {hasUserDirectory ? (
            <>
              <Form.Label htmlFor="audit-f-actor">المنفّذ</Form.Label>
              <Select
                inputId="audit-f-actor"
                classNamePrefix="Select2"
                options={actorOptions}
                value={resolveActorOption(
                  actorSelection(filters),
                  ACTOR_FIXED_OPTIONS,
                  users.options
                )}
                onChange={(opt) => onChange(actorPatch(opt ? opt.value : null))}
                isClearable
                isLoading={users.loading}
                placeholder="الكل"
                noOptionsMessage={() => "لا يوجد مستخدمون"}
                menuPosition="fixed"
              />
              {/* The directory is walked page by page, and a page that fails
                  leaves it short. Said out loud for the same reason the
                  api_request chip is: a picker that is quietly missing the
                  person being looked for turns "they are not in the list"
                  into a false statement. */}
              {users.incomplete && (
                <div className="form-text text-warning">
                  تعذّر تحميل كل المستخدمين، القائمة غير مكتملة.
                </div>
              )}
            </>
          ) : (
            <>
              {/* Two boxes, one question. The heading is a plain <span> — a
                  <label> may name only one control — and each box carries
                  its own accessible name. */}
              <span className="form-label">المنفّذ</span>
              <div className="audit-pair">
                <Select
                  inputId="audit-f-actor"
                  aria-label="نوع المنفّذ"
                  className="audit-pair__main"
                  classNamePrefix="Select2"
                  options={ACTOR_TYPE_OPTIONS}
                  value={
                    ACTOR_TYPE_OPTIONS.find(
                      (o) => o.value === filters.actor_type
                    ) || null
                  }
                  onChange={(opt) =>
                    // Picking النظام CLEARS the user, because the two compose
                    // rather than override: a system row has user_id null, so
                    // sending both asks for a row that cannot exist.
                    onChange(
                      opt?.value === "system"
                        ? { actor_type: "system", user_id: "" }
                        : { actor_type: opt ? opt.value : "" }
                    )
                  }
                  isClearable
                  placeholder="الكل"
                  menuPosition="fixed"
                />
                <Form.Control
                  id="audit-f-user"
                  type="number"
                  min={1}
                  className="audit-pair__id"
                  aria-label="معرّف المستخدم"
                  // Disabled rather than hidden while النظام is selected, so
                  // it stays visible that the filter exists and what is
                  // suppressing it.
                  disabled={systemOnly}
                  title={systemOnly ? "لا ينطبق عند اختيار النظام" : undefined}
                  placeholder="#"
                  value={filters.user_id}
                  onChange={(e) => onChange({ user_id: e.target.value })}
                />
              </div>
            </>
          )}
        </FilterCell>

        <FilterCell>
          <Form.Label htmlFor="audit-f-event">الحدث</Form.Label>
          <Select
            inputId="audit-f-event"
            classNamePrefix="Select2"
            options={GROUPED_EVENT_OPTIONS}
            value={selectedEvents}
            onChange={handleEventsChange}
            isMulti
            isClearable
            hideSelectedOptions={false}
            closeMenuOnSelect={false}
            placeholder="كل الأحداث"
            noOptionsMessage={() => "لا توجد أحداث"}
            formatOptionLabel={formatEventLabel}
            components={EVENT_SELECT_COMPONENTS}
            styles={EVENT_SELECT_STYLES}
            menuPosition="fixed"
          />
        </FilterCell>

        <FilterCell>
          <span className="form-label">النطاق الزمني</span>
          <div className="audit-pair">
            <Form.Control
              id="audit-f-from"
              type="date"
              aria-label="من تاريخ"
              value={filters.date_from}
              onChange={(e) => onChange({ date_from: e.target.value })}
            />
            <span className="audit-pair__sep" aria-hidden="true">
              —
            </span>
            <Form.Control
              id="audit-f-to"
              type="date"
              aria-label="إلى تاريخ"
              value={filters.date_to}
              onChange={(e) => onChange({ date_to: e.target.value })}
            />
          </div>
          <div className="form-text">يشمل اليوم بأكمله في الطرفين</div>
        </FilterCell>
      </Row>

      <Collapse in={showAdvanced}>
        <div id="audit-advanced-filters">
          {/* The spacing lives on this inner wrapper, not on the collapsing
              element: padding on the element being animated makes the height
              transition jump at both ends. */}
          <div className="pt-3">
            <Row className="g-3 align-items-start">
              <FilterCell>
                <span className="form-label">السجل</span>
                <div className="audit-pair">
                  <Select
                    inputId="audit-f-type"
                    aria-label="نوع السجل"
                    className="audit-pair__main"
                    classNamePrefix="Select2"
                    options={AUDITABLE_OPTIONS}
                    value={
                      AUDITABLE_OPTIONS.find(
                        (o) => o.value === filters.auditable_type
                      ) || null
                    }
                    onChange={(opt) =>
                      // Clearing the type clears the id with it: the server
                      // rejects an id without a type, and leaving a stale id in
                      // the URL would make the next type selection silently
                      // narrow to a record nobody asked for.
                      onChange(
                        opt
                          ? { auditable_type: opt.value }
                          : { auditable_type: "", auditable_id: "" }
                      )
                    }
                    isClearable
                    placeholder="كل الأنواع"
                    menuPosition="fixed"
                  />
                  <Form.Control
                    id="audit-f-type-id"
                    type="number"
                    min={1}
                    className="audit-pair__id"
                    aria-label="معرّف السجل"
                    // Disabled rather than hidden, so it is visible that the
                    // id filter exists and what unlocks it.
                    disabled={!typeChosen}
                    title={typeChosen ? undefined : "اختر نوع السجل أولاً"}
                    placeholder="#"
                    value={filters.auditable_id}
                    onChange={(e) =>
                      onChange({ auditable_id: e.target.value })
                    }
                  />
                </div>
              </FilterCell>

              <FilterCell>
                <Form.Label htmlFor="audit-f-ip">عنوان IP</Form.Label>
                <Form.Control
                  id="audit-f-ip"
                  type="text"
                  dir="ltr"
                  inputMode="numeric"
                  className="audit-ltr-input"
                  placeholder="192.168.1.10"
                  value={filters.ip_address}
                  onChange={(e) => onChange({ ip_address: e.target.value })}
                />
              </FilterCell>

              <FilterCell>
                <Form.Label htmlFor="audit-f-request">معرّف الطلب</Form.Label>
                {/* The same correlation the detail panel drills into, reachable
                    by hand: every response carries X-Request-Id and the API doc
                    tells clients to log it, so "the id from this bug report" is
                    a first-class way into this screen. Setting it switches the
                    list into drill-down mode — the chip above the table names
                    it and clears it. */}
                <Form.Control
                  id="audit-f-request"
                  type="text"
                  dir="ltr"
                  className="audit-ltr-input"
                  placeholder="X-Request-Id"
                  value={filters.request_id}
                  onChange={(e) =>
                    onChange({ request_id: e.target.value.trim() })
                  }
                />
              </FilterCell>

              <FilterCell>
                <Form.Label htmlFor="audit-f-sort">الترتيب</Form.Label>
                {/* Only created_at is indexed on this table, so these two values
                    are the entire sort vocabulary the endpoint accepts. There
                    is deliberately no sortable column header anywhere on this
                    screen for anything else — a header that 422s is worse than
                    a plain one. */}
                <Select
                  inputId="audit-f-sort"
                  classNamePrefix="Select2"
                  options={SORT_OPTIONS}
                  value={
                    SORT_OPTIONS.find((o) => o.value === filters.sort) || null
                  }
                  onChange={(opt) => onChange({ sort: opt ? opt.value : "" })}
                  isClearable
                  placeholder="الأحدث أولاً (افتراضي)"
                  menuPosition="fixed"
                />
              </FilterCell>
            </Row>
          </div>
        </div>
      </Collapse>

      {/* THE ACTION BAR — everything that is not itself a filter value, on one
          line under the fields it acts on. The parent's api_request switch
          takes the start side; the disclosure and the reset take the end. */}
      <div className="audit-filters__bar">
        {barStart}
        <div className="audit-filters__actions">
          <button
            type="button"
            className="btn btn-sm btn-light btn-wave"
            onClick={() => setShowAdvanced((open) => !open)}
            aria-expanded={showAdvanced}
            aria-controls="audit-advanced-filters"
          >
            <i
              className={`align-middle me-1 ${
                showAdvanced ? "ri-arrow-up-s-line" : "ri-arrow-down-s-line"
              }`}
              aria-hidden="true"
            ></i>
            فلاتر متقدمة
            {/* The count is what keeps the fold honest — a collapsed section
                that is narrowing the table says so, and says by how many. */}
            {advancedCount > 0 && (
              <span className="badge bg-primary-transparent ms-1">
                {advancedCount}
              </span>
            )}
          </button>

          {hasAnyFilter && (
            <button
              type="button"
              className="btn btn-sm btn-light btn-wave"
              onClick={onReset}
            >
              <i
                className="ri-filter-off-line align-middle me-1"
                aria-hidden="true"
              ></i>
              مسح الفلاتر
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogFilters;
