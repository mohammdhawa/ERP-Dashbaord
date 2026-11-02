import React, { useMemo, useState } from "react";
import { Col, Form, Row, Table } from "react-bootstrap";
import { OUTCOME_LABELS, SEVERITY_LABELS, filterRows } from "./importReport";

// السطور — one line per workbook row: what the import did with it and every
// issue it raised. The two filters are the ones HR works the report by:
// "show me what was refused" and "show me every warning".
//
// While a run is under review (`selectable`), a checkbox leaves a row out of
// this import (backend design §12). Ticking only selects; EmployeeImport
// sends the list when HR applies it.

const OUTCOME_BADGES = {
  created: "bg-success-transparent",
  updated: "bg-info-transparent",
  restored: "bg-primary-transparent",
  skipped: "bg-warning-transparent",
  failed: "bg-danger-transparent",
  excluded: "bg-secondary-transparent",
};

const SEVERITY_BADGES = {
  error: "bg-danger-transparent",
  warning: "bg-warning-transparent",
  info: "bg-light text-muted",
};

const ORDER = { error: 0, warning: 1, info: 2 };

const dash = <span className="text-muted">—</span>;

const ImportRowsTab = ({
  rows = [],
  selectable = false,
  ticked = new Set(),
  onToggle = () => {},
  // (row) => null | { disabled } — see rowCheckbox in importReport.js.
  checkboxFor = () => null,
}) => {
  const [filters, setFilters] = useState({ outcome: "", severity: "" });
  const shown = useMemo(() => filterRows(rows, filters), [rows, filters]);

  const set = (key) => (e) =>
    setFilters((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <>
      <Row className="g-2 mb-3">
        <Col sm={6} md={4}>
          <Form.Select
            aria-label="النتيجة"
            value={filters.outcome}
            onChange={set("outcome")}
          >
            <option value="">كل النتائج</option>
            {Object.entries(OUTCOME_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col sm={6} md={4}>
          <Form.Select
            aria-label="الملاحظات"
            value={filters.severity}
            onChange={set("severity")}
          >
            <option value="">كل الملاحظات</option>
            {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                فيها «{label}»
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col className="d-flex align-items-center text-muted fs-12">
          {shown.length} من {rows.length} سطر
        </Col>
      </Row>

      <div className="table-responsive">
        <Table bordered size="sm" className="align-middle mb-0">
          <thead>
            <tr>
              {selectable && (
                <th scope="col" style={{ width: "1%" }}>
                  <span className="visually-hidden">استبعاد</span>
                </th>
              )}
              <th scope="col">السطر</th>
              <th scope="col">الاسم</th>
              <th scope="col">النتيجة</th>
              <th scope="col">الرقم الوظيفي</th>
              <th scope="col">الملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan={selectable ? 6 : 5} className="text-center text-muted py-4">
                  لا توجد سطور تطابق الاختيار.
                </td>
              </tr>
            )}
            {shown.map((row) => (
              <tr key={row.row} className={ticked.has(row.row) ? "table-secondary" : undefined}>
                {selectable && (
                  <td>
                    {checkboxFor(row) && (
                      <Form.Check
                        aria-label={`استبعاد السطر ${row.row}`}
                        checked={ticked.has(row.row)}
                        disabled={checkboxFor(row).disabled}
                        onChange={() => onToggle(row.row)}
                      />
                    )}
                  </td>
                )}
                <td>{row.row}</td>
                <td>{row.name || dash}</td>
                <td>
                  <span className={`badge ${OUTCOME_BADGES[row.outcome] || "bg-light"}`}>
                    {OUTCOME_LABELS[row.outcome] || row.outcome}
                  </span>
                </td>
                <td>{row.employee_number || dash}</td>
                <td>
                  {(row.issues || []).length === 0
                    ? dash
                    : [...row.issues]
                        .sort((a, b) => (ORDER[a.severity] ?? 9) - (ORDER[b.severity] ?? 9))
                        .map((issue, i) => (
                          <div key={i} className="mb-1">
                            <span className={`badge me-1 ${SEVERITY_BADGES[issue.severity] || "bg-light"}`}>
                              {SEVERITY_LABELS[issue.severity] || issue.severity}
                            </span>
                            {issue.message}
                          </div>
                        ))}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </>
  );
};

export default ImportRowsTab;
