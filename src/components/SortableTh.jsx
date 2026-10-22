import React from "react";

// One header cell for every table that sorts by the SERVER's keys: the
// three-state cycle, the aria text and the button markup live here so that
// DataTableServer and the report tables cannot drift apart.

// Three-state cycle on the column you clicked: unsorted → ascending →
// descending → unsorted. The third state matters — without it there is no way
// back to the server's own default ordering once you have touched a header,
// and for these lists the default is itself meaningful (newest first).
//
// Clicking a DIFFERENT column always starts that column at ascending rather
// than inheriting the previous column's direction, which would silently apply a
// direction the user chose for something else.
const nextSortValue = (sortKey, currentSort) => {
  if (currentSort === sortKey) return `-${sortKey}`;
  if (currentSort === `-${sortKey}`) return "";
  return sortKey;
};

const sortDirection = (sortKey, currentSort) => {
  if (currentSort === sortKey) return "asc";
  if (currentSort === `-${sortKey}`) return "desc";
  return null;
};

const SortableTh = ({ label, sortKey, sort = "", onSortChange, className = "" }) => {
  // A column is sortable only when it names a key the SERVER can order by AND
  // the screen wired up a handler. A header that looks clickable but produces a
  // 422 is worse than a plain one.
  const sortable = Boolean(sortKey && onSortChange);
  const direction = sortable ? sortDirection(sortKey, sort) : null;

  return (
    <th
      scope="col"
      className={className}
      // aria-sort belongs on the header CELL, not the button, and "none" on
      // every other sortable column is what tells a screen-reader user the rest
      // are sortable but inactive.
      aria-sort={
        !sortable
          ? undefined
          : direction === "asc"
          ? "ascending"
          : direction === "desc"
          ? "descending"
          : "none"
      }
    >
      {sortable ? (
        <button
          type="button"
          className={`table-sort-button${direction ? " is-sorted" : ""}`}
          onClick={() => onSortChange(nextSortValue(sortKey, sort))}
          // The visible label already names the column, so the accessible name
          // only has to add what the click does.
          aria-label={`${label} — ${
            direction === "asc"
              ? "مرتّب تصاعدياً، اضغط للترتيب تنازلياً"
              : direction === "desc"
              ? "مرتّب تنازلياً، اضغط لإلغاء الترتيب"
              : "اضغط للترتيب تصاعدياً"
          }`}
        >
          <span>{label}</span>
          <i
            className={
              direction === "asc"
                ? "ri-arrow-up-line"
                : direction === "desc"
                ? "ri-arrow-down-line"
                : "ri-arrow-up-down-line"
            }
            aria-hidden="true"
          ></i>
        </button>
      ) : (
        label
      )}
    </th>
  );
};

export default SortableTh;
