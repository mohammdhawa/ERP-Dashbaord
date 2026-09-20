import React, { useEffect, useMemo, useState } from "react";
import { Col, Collapse, Form, Row } from "react-bootstrap";
import Select from "react-select";
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

// SERVER-SIDE filter toolbar for سجل التدقيق. Every control maps to a
// documented query parameter and nothing is filtered in the browser — filtering
// the fifteen rows that happen to be on screen would answer "what happened" with
// "whatever was on this page", which on an unbounded table is meaningless.
//
// The `event_group` value is NOT edited directly here. It is owned by the
// api_request switch on the parent screen (see AuditLog.jsx): one source of
// truth for "are routine requests included", stated on screen rather than
// hidden in code.
//
// PRIMARY vs ADVANCED. Ten controls do not fit the house toolbar idiom, which
// budgets twelve grid columns for one row (see EmployeeFilters). Forcing all ten
// through it cost two full rows of chrome above the table on every visit,
// including the overwhelmingly common one: "show me what just happened".
//
// So the four that answer the usual questions — a description, who, what, when —
// stay on screen, and the five that answer a specific investigation (which
// record, which address, which correlated operation, which direction) fold away.
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
  group: EVENT_META[key].group,
}));

const GROUPED_EVENT_OPTIONS = EVENT_GROUPS.map((group) => ({
  label: EVENT_GROUP_LABELS[group],
  options: EVENT_OPTIONS.filter((o) => o.group === group),
}));

const AUDITABLE_OPTIONS = AUDITABLE_TYPES.map((key) => ({
  value: key,
  label: `${AUDITABLE_META[key].label} — ${key}`,
}));

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

const AuditLogFilters = ({ filters, onChange, onReset, hasAnyFilter }) => {
  const { permissions } = useSelector((state) => state.auth);

  // The user picker reads /auth/users, which needs auth.users.view. A caller
  // without it gets a plain numeric id box: the id is still a legitimate filter
  // and the URL still carries it, but no directory is invented for someone the
  // server has decided may not read one.
  const canReadUsers = hasPermission(permissions, "auth.users.view");
  const users = useResourceOptions("/auth/users", userToOption, canReadUsers);

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

  const typeChosen = (filters.auditable_type || "") !== "";

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
    <div className="mb-3">
      {/* PRIMARY — exactly twelve columns at lg, so it is one row and stays one
          row. Anything added here has to take width from a sibling. */}
      <Row className="g-2 align-items-end">
        <Col sm={12} md={6} lg={3}>
          <Form.Label htmlFor="audit-search" className="fs-12 mb-1">
            بحث في الوصف
          </Form.Label>
          <Form.Control
            id="audit-search"
            type="search"
            placeholder="نص الوصف"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </Col>

        <Col sm={12} md={6} lg={3}>
          <Form.Label htmlFor="audit-f-user" className="fs-12 mb-1">
            المستخدم
          </Form.Label>
          {canReadUsers && !users.error ? (
            <>
              <Select
                inputId="audit-f-user"
                classNamePrefix="Select2"
                options={users.options}
                value={
                  users.options.find(
                    (o) => String(o.value) === String(filters.user_id)
                  ) || null
                }
                onChange={(opt) => onChange({ user_id: opt ? opt.value : "" })}
                isClearable
                isLoading={users.loading}
                placeholder="الكل"
                noOptionsMessage={() => "لا يوجد مستخدمون"}
                menuPosition="fixed"
              />
              {/* The directory is walked page by page, and a page that fails
                  leaves it short. Said out loud for the same reason the
                  api_request chip is: a picker that is quietly missing the
                  person being looked for turns "they are not in the list" into
                  a false statement. The numeric id box below is not offered as
                  a fallback here — the picker still works for everyone it did
                  load, and the id can be typed into the URL. */}
              {users.incomplete && (
                <div className="text-warning small mt-1">
                  تعذّر تحميل كل المستخدمين، القائمة غير مكتملة.
                </div>
              )}
            </>
          ) : (
            <Form.Control
              id="audit-f-user"
              type="number"
              min={1}
              placeholder="معرّف المستخدم"
              value={filters.user_id}
              onChange={(e) => onChange({ user_id: e.target.value })}
            />
          )}
        </Col>

        <Col sm={12} md={6} lg={3}>
          <Form.Label htmlFor="audit-f-event" className="fs-12 mb-1">
            الحدث
          </Form.Label>
          <Select
            inputId="audit-f-event"
            classNamePrefix="Select2"
            options={GROUPED_EVENT_OPTIONS}
            value={selectedEvents}
            onChange={handleEventsChange}
            isMulti
            isClearable
            placeholder="كل الأحداث"
            noOptionsMessage={() => "لا توجد أحداث"}
            menuPosition="fixed"
          />
        </Col>

        {/* THE DATE RANGE IS ONE CONTROL, NOT TWO.
            As two sibling Cols these read as unrelated fields, and the "يشمل
            اليوم بأكمله" note under the second one made the row taller on that
            side only — with align-items-end that pushed إلى تاريخ visibly above
            من تاريخ, so the pair never shared a baseline. Grouped, the note
            belongs to the range it qualifies and both inputs sit level.
            The group heading is a plain <span>: a <label> may name one control,
            and each input carries its own accessible name instead. */}
        <Col sm={12} md={6} lg={3}>
          <span className="fs-12 mb-1 d-block">النطاق الزمني</span>
          <div className="d-flex align-items-center gap-1 flex-nowrap audit-date-range">
            <Form.Control
              id="audit-f-from"
              type="date"
              aria-label="من تاريخ"
              className="flex-grow-1 w-100"
              value={filters.date_from}
              onChange={(e) => onChange({ date_from: e.target.value })}
            />
            <span className="text-muted" aria-hidden="true">
              —
            </span>
            <Form.Control
              id="audit-f-to"
              type="date"
              aria-label="إلى تاريخ"
              className="flex-grow-1 w-100"
              value={filters.date_to}
              onChange={(e) => onChange({ date_to: e.target.value })}
            />
          </div>
          <span className="text-muted fs-11">
            يشمل اليوم بأكمله في الطرفين
          </span>
        </Col>
      </Row>

      {/* CONTROL ROW — the disclosure and the reset, together, on one line. */}
      <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
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
          {/* The count is what keeps the fold honest — a collapsed section that
              is narrowing the table says so, and says by how many. */}
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
            <i className="ri-filter-off-line align-middle me-1"></i>
            مسح الفلاتر
          </button>
        )}
      </div>

      <Collapse in={showAdvanced}>
        <div id="audit-advanced-filters">
          <Row className="g-2 align-items-end pt-2">
            <Col sm={6} md={3} lg={3}>
              <Form.Label htmlFor="audit-f-type" className="fs-12 mb-1">
                نوع السجل
              </Form.Label>
              <Select
                inputId="audit-f-type"
                classNamePrefix="Select2"
                options={AUDITABLE_OPTIONS}
                value={
                  AUDITABLE_OPTIONS.find(
                    (o) => o.value === filters.auditable_type
                  ) || null
                }
                onChange={(opt) =>
                  // Clearing the type clears the id with it: the server rejects an id
                  // without a type, and leaving a stale id in the URL would make the
                  // next type selection silently narrow to a record nobody asked for.
                  onChange(
                    opt
                      ? { auditable_type: opt.value }
                      : { auditable_type: "", auditable_id: "" }
                  )
                }
                isClearable
                placeholder="الكل"
                menuPosition="fixed"
              />
            </Col>

            <Col sm={6} md={3} lg={2}>
              <Form.Label htmlFor="audit-f-type-id" className="fs-12 mb-1">
                معرّف السجل
              </Form.Label>
              <Form.Control
                id="audit-f-type-id"
                type="number"
                min={1}
                // Disabled rather than hidden, so it is visible that the id filter
                // exists and what unlocks it.
                disabled={!typeChosen}
                title={typeChosen ? undefined : "اختر نوع السجل أولاً"}
                placeholder="#"
                value={filters.auditable_id}
                onChange={(e) => onChange({ auditable_id: e.target.value })}
              />
            </Col>

            <Col sm={6} md={3} lg={2}>
              <Form.Label htmlFor="audit-f-ip" className="fs-12 mb-1">
                عنوان IP
              </Form.Label>
              <Form.Control
                id="audit-f-ip"
                type="text"
                dir="ltr"
                inputMode="numeric"
                placeholder="192.168.1.10"
                value={filters.ip_address}
                onChange={(e) => onChange({ ip_address: e.target.value })}
              />
            </Col>

            <Col sm={12} md={6} lg={3}>
              <Form.Label htmlFor="audit-f-request" className="fs-12 mb-1">
                معرّف الطلب
              </Form.Label>
              {/* The same correlation the detail panel drills into, reachable by
                  hand: every response carries X-Request-Id and the API doc tells
                  clients to log it, so "the id from this bug report" is a first-class
                  way into this screen. Setting it switches the list into drill-down
                  mode — the chip above the table names it and clears it. */}
              <Form.Control
                id="audit-f-request"
                type="text"
                dir="ltr"
                placeholder="من رأس X-Request-Id"
                value={filters.request_id}
                onChange={(e) => onChange({ request_id: e.target.value.trim() })}
              />
            </Col>

            <Col sm={6} md={3} lg={2}>
              <Form.Label htmlFor="audit-f-sort" className="fs-12 mb-1">
                الترتيب
              </Form.Label>
              {/* Only created_at is indexed on this table, so these two values are
                  the entire sort vocabulary the endpoint accepts. There is
                  deliberately no sortable column header anywhere on this screen for
                  anything else — a header that 422s is worse than a plain one. */}
              <Select
                inputId="audit-f-sort"
                classNamePrefix="Select2"
                options={SORT_OPTIONS}
                value={SORT_OPTIONS.find((o) => o.value === filters.sort) || null}
                onChange={(opt) => onChange({ sort: opt ? opt.value : "" })}
                isClearable
                placeholder="الأحدث أولاً (افتراضي)"
                menuPosition="fixed"
              />
            </Col>

          </Row>
        </div>
      </Collapse>
    </div>
  );
};

export default AuditLogFilters;
