import React from "react";
import { Alert, Table } from "react-bootstrap";

// غير موجودين في الملف — everyone on the roll this file did not match. The
// import never terminates anyone (U3): a person who has left is ended in the
// employee screen, with a date and a reason, so this tab only lists them.

const dash = <span className="text-muted">—</span>;

const ImportMissingTab = ({ people = [] }) => (
  <>
    <Alert variant="info" className="fs-13">
      هؤلاء على رأس عملهم في النظام ولا يرد اسمهم في الملف. الاستيراد لا يغيّر
      شيئاً في بياناتهم؛ من ترك العمل منهم تُنهى خدمته من شاشة الموظف.
    </Alert>
    {people.length === 0 ? (
      <div className="border rounded p-4 text-center text-muted">
        كل من في النظام موجود في الملف.
      </div>
    ) : (
      <div className="table-responsive">
        <Table bordered size="sm" className="align-middle mb-0">
          <thead>
            <tr>
              <th scope="col">الرقم الوظيفي</th>
              <th scope="col">الاسم</th>
              <th scope="col">الوحدة</th>
              <th scope="col">المصدر</th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr key={person.employee_id}>
                <td>{person.employee_number}</td>
                <td>{person.name}</td>
                <td>{person.unit || dash}</td>
                <td>
                  <span
                    className={`badge ${
                      person.imported ? "bg-info-transparent" : "bg-light text-muted"
                    }`}
                  >
                    {person.imported ? "مستورد سابقاً" : "مُضاف يدوياً"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    )}
  </>
);

export default ImportMissingTab;
