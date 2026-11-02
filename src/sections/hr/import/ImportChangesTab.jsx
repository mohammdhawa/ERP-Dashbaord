import React from "react";
import { Table } from "react-bootstrap";
import { employeesPhrase } from "./importReport";

// التغييرات — for each person already in the ERP, every field the import
// changes, old → new. The workbook is the source (U2): this tab is where an
// edit made in the ERP shows before the upload overwrites it. The table
// follows the audit log's old/new layout (AuditDiff) so it reads the same.

const empty = <span className="text-muted">فارغ</span>;

const ImportChangesTab = ({ changes = [] }) => {
  if (changes.length === 0) {
    return (
      <div className="border rounded p-4 text-center text-muted">
        لا يغيّر هذا الملف أي بيانات لموظف موجود في النظام.
      </div>
    );
  }

  return (
    <>
      <p className="text-muted fs-12">
        تتغيّر بيانات {employeesPhrase(changes.length)}. ما في عمود «القيمة في
        النظام» يُستبدل بما في الملف عند الاستيراد.
      </p>
      {changes.map((change) => (
        <div key={change.row} className="mb-3">
          <h6 className="fw-medium mb-2">
            {change.name}{" "}
            <span className="text-muted fs-12">
              — السطر {change.row}
              {change.employee_number ? ` · الرقم الوظيفي ${change.employee_number}` : ""}
            </span>
          </h6>
          <div className="table-responsive">
            <Table bordered size="sm" className="align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col" style={{ width: "28%" }}>
                    الحقل
                  </th>
                  <th scope="col">القيمة في النظام</th>
                  <th scope="col">القيمة في الملف</th>
                </tr>
              </thead>
              <tbody>
                {change.fields.map((field) => (
                  <tr key={field.field}>
                    <th scope="row" className="fw-medium">
                      {field.label}
                    </th>
                    <td className="text-danger">{field.old ?? empty}</td>
                    <td className="text-success">{field.new ?? empty}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      ))}
    </>
  );
};

export default ImportChangesTab;
