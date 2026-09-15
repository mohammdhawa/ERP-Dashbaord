import { useEffect, useState } from "react";
import api from "../../redux/api";
import { parseApiError } from "../../utils/apiHelpers";

// Loads a full Format-A paginated list for use as form lookup options by
// walking the documented `?page=N` pages one at a time (page 1 first, then
// 2..last_page from the server `meta`). It never uses an undocumented
// `?all=true`. `enabled` gates the load on permission ownership + modal open.
//
// Returns the raw `items`, mapped `options`, and honest loading/error/
// incomplete flags so the caller can show a truthful fallback when the
// related list cannot be read in full.
const PER_PAGE = 100;
const MAX_PAGES = 20;

export const useResourceOptions = (path, mapItem, enabled = true) => {
  const [state, setState] = useState({
    items: [],
    options: [],
    loading: false,
    error: null,
    incomplete: false,
  });

  useEffect(() => {
    if (!enabled) {
      setState({ items: [], options: [], loading: false, error: null, incomplete: false });
      return;
    }

    let cancelled = false;
    const load = async () => {
      setState((s) => ({ ...s, loading: true, error: null, incomplete: false }));
      try {
        // `per_page` at the API maximum (100, clamped server-side). Walking at
        // the server default of 15 meant ~17 sequential requests to fill one
        // picker over the 242 employees this system is sized for; at 100 it is
        // three. Same walk, same result, a fifth of the round trips.
        const first = await api.get(path, {
          params: { page: 1, per_page: PER_PAGE },
        });
        let items = first.data.data || [];
        const lastPage = first.data.meta?.last_page || 1;
        let incomplete = false;

        // MAX_PAGES is a hard stop so a mis-set `last_page` cannot spin
        // forever; the list is marked incomplete rather than silently truncated.
        const cappedLastPage = Math.min(lastPage, MAX_PAGES);

        for (let p = 2; p <= cappedLastPage; p += 1) {
          if (cancelled) return;
          try {
            const res = await api.get(path, {
              params: { page: p, per_page: PER_PAGE },
            });
            items = items.concat(res.data.data || []);
          } catch {
            // A mid-walk failure leaves the list partially loaded: surface it
            // rather than silently pretending the options are complete.
            incomplete = true;
            break;
          }
        }

        if (cancelled) return;
        setState({
          items,
          options: items.map(mapItem),
          loading: false,
          error: null,
          incomplete: incomplete || lastPage > MAX_PAGES,
        });
      } catch (error) {
        if (cancelled) return;
        setState({
          items: [],
          options: [],
          loading: false,
          error: parseApiError(error).message,
          incomplete: false,
        });
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // mapItem is a stable module-scope fn per caller; path/enabled drive reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, enabled]);

  return state;
};
