// المنفّذ — "who did this" — as ONE select over two query parameters.
//
// The endpoint takes `actor_type` (user | system) and `user_id` separately, and
// the screen used to render them as two stacked boxes. That made المنفّذ twice
// the height of every other filter and broke the toolbar's shared baseline. The
// question is one question, so it is one control: الكل (cleared), أي مستخدم,
// النظام, then the users themselves. These helpers are the whole mapping
// between that one value and the two parameters; nothing else translates.
//
// The two sentinels cannot collide with a user option: a user's value is its
// numeric id.
export const ACTOR_ANY_USER = "actor:user";
export const ACTOR_SYSTEM = "actor:system";

const isSet = (value) => value !== "" && value != null;

// Filters → the selected value, or null for الكل. `system` wins over a stray
// user_id because that is also what AuditLog sends: the pair is a
// contradiction, and the user is the half that gets dropped.
export const actorSelection = ({ actor_type, user_id }) => {
  if (actor_type === "system") return ACTOR_SYSTEM;
  if (isSet(user_id)) return String(user_id);
  if (actor_type === "user") return ACTOR_ANY_USER;
  return null;
};

// The selected value → a filter patch. Both keys are always written, so a
// choice replaces whatever the previous choice left behind. A specific user
// drops actor_type=user: it is implied, and a shorter URL reads better.
export const actorPatch = (value) => {
  if (value === ACTOR_SYSTEM) return { actor_type: "system", user_id: "" };
  if (value === ACTOR_ANY_USER) return { actor_type: "user", user_id: "" };
  if (!isSet(value)) return { actor_type: "", user_id: "" };
  return { actor_type: "", user_id: value };
};

// The selected value → the option object react-select renders. An applied
// user that is not in the list (still loading, a partial directory, or an id
// that arrived by shared link) gets a stand-in option rather than no option:
// a select that shows الكل while the table is narrowed to one person is a
// false statement.
export const resolveActorOption = (selection, fixedOptions, userOptions) => {
  if (selection == null) return null;
  const fixed = fixedOptions.find((o) => o.value === selection);
  if (fixed) return fixed;
  const user = userOptions.find((o) => String(o.value) === selection);
  return user || { value: selection, label: `مستخدم #${selection}` };
};
