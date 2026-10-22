// Where a notification opens, as an app path.
//
// ONE copy, imported by the header dropdown, the notifications page and the
// detail modal — this lookup once lived verbatim in two of them, and updating
// only one left half the app deep-linking to null.
//
// The decision itself — type first, reference second — lives in
// notificationDestinations.js, which is pure so it can be tested under
// `node --test`. This file only adds BASE_URL, exactly as Routingdata.jsx
// builds its paths: a hardcoded "/hr/employees" once broke under a sub-path
// deployment.
import { destinationOf } from "./notificationDestinations";

/**
 * @returns {string|null} the route this notification opens, or null when it
 *   has nowhere to go — callers show its full text instead.
 */
export const notificationLink = (notification) => {
  const destination = destinationOf(notification);
  return destination === null ? null : `${import.meta.env.BASE_URL}${destination}`;
};
