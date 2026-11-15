import test from "node:test";
import assert from "node:assert/strict";
import {
  WEEK_ORDER,
  calendarCellTitle,
  daysText,
  displayPositions,
  durationFromTimes,
  endFromDuration,
  endsNextDay,
  scheduleDayLabel,
  shiftSpan,
} from "./shiftDisplay.js";

test("a shift's length comes from its start and end, wrapping past midnight", () => {
  assert.equal(durationFromTimes("09:00", "16:00"), 420);
  assert.equal(durationFromTimes("22:00", "06:00"), 480);
  assert.equal(durationFromTimes("08:00", "08:00"), 1440);
  assert.equal(durationFromTimes("23:30", "00:15"), 45);
  assert.equal(durationFromTimes("", "06:00"), null);
  assert.equal(durationFromTimes("9:00", "16:00"), null);
});

test("the end is the start plus the length", () => {
  assert.equal(endFromDuration("22:00", 480), "06:00");
  assert.equal(endFromDuration("09:00", 420), "16:00");
  assert.equal(endFromDuration("08:00", 1440), "08:00");
  assert.equal(endFromDuration("", 60), "");
});

test("an end at or before the start is the next day", () => {
  assert.equal(endsNextDay("22:00", "06:00"), true);
  assert.equal(endsNextDay("08:00", "08:00"), true);
  assert.equal(endsNextDay("09:00", "16:00"), false);
});

test("shiftSpan shows start and end, flagging the next day", () => {
  assert.equal(shiftSpan({ starts_at: "09:00", duration_minutes: 420, ends_next_day: false }), "09:00 – 16:00");
  assert.equal(
    shiftSpan({ starts_at: "22:00", duration_minutes: 480, ends_next_day: true }),
    "22:00 – 06:00 (اليوم التالي)"
  );
  assert.equal(
    shiftSpan({ starts_at: "08:00", duration_minutes: 1440, ends_next_day: true }),
    "08:00 – 08:00 (اليوم التالي)"
  );
});

test("a weekly schedule is shown from Saturday, a cycle from day 1", () => {
  assert.deepEqual(WEEK_ORDER, [6, 0, 1, 2, 3, 4, 5]);
  assert.deepEqual(displayPositions(1, 7), [6, 0, 1, 2, 3, 4, 5]);
  assert.deepEqual(displayPositions(2, 6), [0, 1, 2, 3, 4, 5]);
});

test("day labels: weekday names for weekly, numbered days for a cycle", () => {
  assert.equal(scheduleDayLabel(1, 6), "السبت");
  assert.equal(scheduleDayLabel(1, 5), "الجمعة");
  assert.equal(scheduleDayLabel(2, 0), "اليوم 1");
});

test("calendarCellTitle names the shift and its span, or a rest day", () => {
  assert.equal(calendarCellTitle(null), "راحة");
  assert.equal(
    calendarCellTitle({
      name: "مناوبة حراسة",
      starts_at: "2026-11-10T08:00:00+03:00",
      ends_at: "2026-11-11T08:00:00+03:00",
    }),
    "مناوبة حراسة · 08:00 – 08:00"
  );
});

test("daysText agrees with the number in Arabic", () => {
  const cases = [
    [1, "يوم واحد"],
    [2, "يومان"],
    [3, "3 أيام"],
    [6, "6 أيام"],
    [7, "7 أيام"],
    [10, "10 أيام"],
    [11, "11 يوماً"],
    [28, "28 يوماً"],
  ];
  for (const [n, text] of cases) assert.equal(daysText(n), text);
});
