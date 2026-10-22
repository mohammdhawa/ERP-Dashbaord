import React from "react";
import { Col, Row } from "react-bootstrap";

// ملخّص السجل — `summary` and the answered window from beside `meta`
// (API doc §16.8). The summary covers the WHOLE filtered set, not the page of
// rows under it, and says so.
//
// `days` count working days inside the window; `calendar_days` the calendar
// ones; `deducted_days` those taken from a balance. A leave crossing the
// window's edge counts only the part inside it.

const TILES = [
  { key: "employees", label: "الموظفون" },
  { key: "requests", label: "الطلبات" },
  { key: "days", label: "أيام العمل" },
  { key: "calendar_days", label: "الأيام التقويمية" },
  { key: "deducted_days", label: "الأيام المخصومة" },
  { key: "excuses", label: "الأعذار" },
];

const RegisterSummary = ({ summary, window: range }) => {
  if (!summary) return null;

  return (
    <div className="mb-3">
      <div className="d-flex flex-wrap justify-content-between gap-2 mb-2">
        <div className="fw-semibold">ملخّص الفترة المحدّدة</div>
        {range?.from && range?.to && (
          <div className="text-muted">
            من <span dir="ltr">{range.from}</span> إلى{" "}
            <span dir="ltr">{range.to}</span>
          </div>
        )}
      </div>

      <Row className="g-2 mb-3">
        {TILES.map((tile) => (
          <Col key={tile.key} xs={6} md={4} xl={2}>
            <div className="border rounded p-2 text-center h-100">
              <div className="fs-5 fw-semibold">{summary[tile.key] ?? 0}</div>
              <div className="text-muted fs-12">{tile.label}</div>
            </div>
          </Col>
        ))}
      </Row>

      {summary.by_type?.length > 0 && (
        <div className="table-responsive">
          <table className="table table-sm table-wrap-sm mb-0">
            <thead>
              <tr>
                <th scope="col">النوع</th>
                <th scope="col">الطلبات</th>
                <th scope="col">الموظفون</th>
                <th scope="col">الأيام</th>
              </tr>
            </thead>
            <tbody>
              {summary.by_type.map((row) => (
                <tr key={row.leave_type_id}>
                  <td>{row.name}</td>
                  <td>{row.requests}</td>
                  <td>{row.employees}</td>
                  <td>{row.days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="text-muted fs-12 mt-2">
        الملخّص يشمل كل النتائج المطابقة للفلاتر، وليس الصفحة الحالية فقط.
      </div>
    </div>
  );
};

export default RegisterSummary;
