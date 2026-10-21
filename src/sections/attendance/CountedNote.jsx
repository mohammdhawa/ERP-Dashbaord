import React from "react";
import { countedSpan } from "./monthlyFilters";

// Where a report stopped counting (API doc §14, 2026-10-20, parity audit S-1):
// the monthly report and the grid count only up to today, and a day after it
// is «لم يُسجَّل بعد», not absent. Nothing is said when the whole window is
// counted.
const CountedNote = ({ report }) => {
  const span = countedSpan(report);
  if (span === "whole") return null;
  return (
    <span className="badge bg-light text-default fs-12 fw-normal">
      {span === "none" ? (
        "الفترة تبدأ بعد اليوم، فلا أيام محسوبة بعد"
      ) : (
        <>
          محسوبة حتى <span dir="ltr">{report.counted_to}</span> — ما بعدها لم
          يأتِ بعد
        </>
      )}
    </span>
  );
};

export default CountedNote;
