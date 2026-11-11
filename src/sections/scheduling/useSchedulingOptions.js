import { useMemo } from "react";
import { useResourceOptions } from "../departments/useResourceOptions.jsx";

const toOption = (item) => ({
  value: item.id,
  label: `${item.code} — ${item.name}`,
  item,
});

const SHIFTS_PATH = "/scheduling/shifts";
const SCHEDULES_PATH = "/scheduling/schedules";

const activeOnly = (options) => options.filter((option) => option.item.is_active);

// Active shifts and schedules for pickers. Both lists are unpaginated on the
// server; the shared walker reads them as a single page.
export const useSchedulingOptions = (enabled) => {
  const shifts = useResourceOptions(SHIFTS_PATH, toOption, enabled);
  const schedules = useResourceOptions(SCHEDULES_PATH, toOption, enabled);

  const shiftOptions = useMemo(() => activeOnly(shifts.options), [shifts.options]);
  const scheduleOptions = useMemo(() => activeOnly(schedules.options), [schedules.options]);
  const { reload: reloadShifts } = shifts;
  const { reload: reloadSchedules } = schedules;
  const reload = useMemo(
    () => () => {
      reloadShifts();
      reloadSchedules();
    },
    [reloadShifts, reloadSchedules]
  );

  return {
    shifts: shiftOptions,
    schedules: scheduleOptions,
    loading: shifts.loading || schedules.loading,
    error: shifts.error || schedules.error,
    reload,
  };
};
