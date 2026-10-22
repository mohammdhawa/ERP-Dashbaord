import { useCallback, useEffect, useState } from "react";
import api from "../../redux/api";
import { parseApiError } from "../../utils/apiHelpers";

// The leave types as select options ({ value: "id", label }). GET /leave/types
// is open to every account and not paginated; with no `for` it returns every
// active type, requests and excuses alike. A failed read is returned as
// `error` with `reload`, so a screen shows a retry — never an empty list that
// looks like "no types".
const useLeaveTypeOptions = () => {
  const [types, setTypes] = useState({
    options: [],
    loading: true,
    error: null,
  });
  const reload = useCallback(async () => {
    setTypes((t) => ({ ...t, loading: true, error: null }));
    try {
      const response = await api.get("/leave/types");
      setTypes({
        options: (response.data.data || []).map((t) => ({
          value: String(t.id),
          label: t.name_ar || `نوع #${t.id}`,
        })),
        loading: false,
        error: null,
      });
    } catch (err) {
      setTypes({
        options: [],
        loading: false,
        error: parseApiError(err).message,
      });
    }
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  return { ...types, reload };
};

export default useLeaveTypeOptions;
