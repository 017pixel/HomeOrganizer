;(function (root, factory) {
  const api = factory(root.HomeRecurrence);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HomeWeekOverview = api;
})(typeof window !== 'undefined' ? window : globalThis, function (HomeRecurrence) {
  const R = HomeRecurrence;

  function isTaskDueOnDate(task, dateKey) {
    if (!R) return false;
    if (!task || !task.repeat || task.repeat.kind === 'none') return false;
    const repeat = R.normalizeRepeatConfig(task.repeat);
    if (repeat.kind === 'none') return false;

    if (repeat.kind === 'weekly') {
      const dow = R.weekdayIndexMonday0(dateKey);
      if (!repeat.daysOfWeek.includes(dow)) return false;
      const anchorWeekStart = R.startOfWeekMondayKey(repeat.startDate);
      const targetWeekStart = R.startOfWeekMondayKey(dateKey);
      const weeksSinceAnchor = Math.floor(R.daysBetween(anchorWeekStart, targetWeekStart) / 7);
      return weeksSinceAnchor >= 0 && weeksSinceAnchor % repeat.intervalWeeks === 0;
    }

    if (repeat.kind === 'monthly') {
      const date = R.dateFromKey(dateKey);
      if (date.getUTCDate() !== repeat.dayOfMonth) return false;
      const start = R.dateFromKey(repeat.startDate);
      const startMonth = start.getUTCFullYear() * 12 + start.getUTCMonth();
      const targetMonth = date.getUTCFullYear() * 12 + date.getUTCMonth();
      const monthsSinceStart = targetMonth - startMonth;
      return monthsSinceStart >= 0 && monthsSinceStart % repeat.intervalMonths === 0;
    }

    if (repeat.kind === 'custom' && repeat.unit === 'day') {
      const daysSinceStart = R.daysBetween(repeat.startDate, dateKey);
      return daysSinceStart >= 0 && daysSinceStart % repeat.every === 0;
    }

    return false;
  }

  return { isTaskDueOnDate };
});