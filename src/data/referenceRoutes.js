// Maps a notification `reference` ({ type, id }) to a module route for
// deep-linking.
//
// ONE copy, imported by both the header dropdown and the notifications page.
// This lived verbatim in each of them — map, helper and this comment — so
// adding the fifth alias the API already emits, or any Batch-3 module, meant
// editing two files that nothing links together. Updating only one would have
// left half the app deep-linking to null, with no test or type to catch it.
//
// `reference.type` is a STABLE ALIAS from the API's enforced morph map —
// "employee", "department", "user", "role", "permission" — not a PHP class
// name. It used to be the fully-qualified class ("App\Modules\HR\Models\Employee"),
// which is why this once matched with substring tests; an exact lookup is
// correct now and, unlike `.includes()`, cannot mis-fire when one alias
// contains another.
//
// Paths are built from BASE_URL exactly as Routingdata.jsx builds them. The
// previous hardcoded "/hr/employees" broke under a sub-path deployment — and
// broke in two places at once, which is the duplication problem restated.
const path = (segment) => `${import.meta.env.BASE_URL}${segment}`;

const REFERENCE_ROUTES = {
  employee: () => path("hr/employees"),
  department: () => path("departments"),
  user: () => path("users"),
  role: () => path("roles"),
};

/**
 * @returns {string|null} route for this reference, or null when the type has
 *   no screen to land on — callers render plain text in that case rather than
 *   a link that goes nowhere.
 */
export const referenceLink = (reference) => {
  const build = REFERENCE_ROUTES[String(reference?.type || "").toLowerCase()];
  return build ? build() : null;
};
