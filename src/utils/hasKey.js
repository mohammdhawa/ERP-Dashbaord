// "Is this key PRESENT on the object?" — as opposed to "is its value set?".
//
// The distinction carries meaning across this API: a field-gated key is ABSENT
// when the caller may not read it and present-but-null when it is readable and
// empty; an audit row's `old_values` is absent on some events and null on
// others. `record.key == null` collapses both, so every such check goes through
// here.
//
// Pure and dependency-free on purpose: the node:test suites import it directly.
export const hasKey = (object, key) =>
  Boolean(object) &&
  typeof object === "object" &&
  Object.prototype.hasOwnProperty.call(object, key);
