;(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HomeRecurrence = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }
  function isDateKey(s) {
    return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  }
  function dateFromKey(dateKey) {
    assert(isDateKey(dateKey), 'Ungültiges Datum (YYYY-MM-DD erwartet)');
    return new Date(dateKey + 'T12:00:00.000Z');
  }
  function keyFromDate(d) {
    return new Date(d.getTime()).toISOString().slice(0, 10);
  }
  function addDaysKey(dateKey, days) {
    const d = dateFromKey(dateKey);
    d.setUTCDate(d.getUTCDate() + days);
    return keyFromDate(d);
  }
  function startOfWeekMondayKey(dateKey) {
    const d = dateFromKey(dateKey);
    const mondayIndex = weekdayIndexMonday0(dateKey);
    d.setUTCDate(d.getUTCDate() - mondayIndex);
    return keyFromDate(d);
  }
  function weekdayIndexMonday0(dateKey) {
    const d = dateFromKey(dateKey);
    const jsDay = d.getUTCDay();
    return (jsDay + 6) % 7;
  }
  function daysBetween(aKey, bKey) {
    const a = dateFromKey(aKey);
    const b = dateFromKey(bKey);
    return Math.round((b - a) / (24 * 60 * 60 * 1000));
  }
  function compareDateKeys(a, b) {
    if (a === b) return 0;
    return a < b ? -1 : 1;
  }
  function clampInt(n, min, max) {
    const v = typeof n === 'number' ? n : parseInt(String(n), 10);
    assert(Number.isFinite(v), 'Ungültige Zahl');
    const vi = Math.trunc(v);
    assert(vi >= min && vi <= max, `Zahl außerhalb des gültigen Bereichs (${min}-${max})`);
    return vi;
  }
  function normalizeDaysOfWeek(days) {
    assert(Array.isArray(days), 'Wochentage müssen eine Liste sein');
    const normalized = Array.from(new Set(days.map((x) => clampInt(x, 0, 6)))).sort((a, b) => a - b);
    assert(normalized.length > 0, 'Mindestens ein Wochentag muss gewählt sein');
    return normalized;
  }
  function normalizeTimeHHMM(time) {
    if (time == null || time === '') return null;
    assert(typeof time === 'string' && /^\d{2}:\d{2}$/.test(time), 'Ungültige Uhrzeit (HH:MM erwartet)');
    const hh = parseInt(time.slice(0, 2), 10);
    const mm = parseInt(time.slice(3, 5), 10);
    assert(hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59, 'Ungültige Uhrzeit');
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
  function normalizeRepeatConfig(input) {
    if (!input || typeof input !== 'object') return { kind: 'none' };
    const kind = typeof input.kind === 'string' ? input.kind : 'none';
    if (kind === 'none') return { kind: 'none' };
    const startDate = isDateKey(input.startDate) ? input.startDate : keyFromDate(new Date());
    const time = normalizeTimeHHMM(input.time);
    if (kind === 'weekly') {
      const daysOfWeek = normalizeDaysOfWeek(input.daysOfWeek || []);
      const intervalWeeks = clampInt(input.intervalWeeks ?? 1, 1, 52);
      return { kind: 'weekly', startDate, time, daysOfWeek, intervalWeeks };
    }
    if (kind === 'monthly') {
      const dayOfMonth = clampInt(input.dayOfMonth, 1, 28);
      const intervalMonths = clampInt(input.intervalMonths ?? 1, 1, 120);
      return { kind: 'monthly', startDate, time, dayOfMonth, intervalMonths };
    }
    if (kind === 'quarterly') return { kind: 'monthly', startDate, time, dayOfMonth: clampInt(input.dayOfMonth ?? parseInt(startDate.slice(8, 10), 10), 1, 28), intervalMonths: 3 };
    if (kind === 'halfyear') return { kind: 'monthly', startDate, time, dayOfMonth: clampInt(input.dayOfMonth ?? parseInt(startDate.slice(8, 10), 10), 1, 28), intervalMonths: 6 };
    if (kind === 'yearly') return { kind: 'monthly', startDate, time, dayOfMonth: clampInt(input.dayOfMonth ?? parseInt(startDate.slice(8, 10), 10), 1, 28), intervalMonths: 12 };
    if (kind === 'custom') {
      const unit = input.unit;
      assert(unit === 'day' || unit === 'week' || unit === 'month', 'Ungültige Custom-Einheit');
      const every = clampInt(input.every, 1, 365);
      if (unit === 'day') return { kind: 'custom', unit, every, startDate, time };
      if (unit === 'week') return { kind: 'weekly', startDate, time, daysOfWeek: normalizeDaysOfWeek(input.daysOfWeek || []), intervalWeeks: every };
      const dayOfMonth = clampInt(input.dayOfMonth, 1, 28);
      return { kind: 'monthly', startDate, time, dayOfMonth, intervalMonths: every };
    }
    throw new Error('Unbekanntes Wiederholungsmuster');
  }
  function nextDueOnOrAfter(dateKey, repeat) {
    const r = normalizeRepeatConfig(repeat);
    if (r.kind === 'none') return null;
    const baseKey = compareDateKeys(dateKey, r.startDate) < 0 ? r.startDate : dateKey;
    if (r.kind === 'custom' && r.unit === 'day') return nextEveryNDaysOnOrAfter(baseKey, r);
    if (r.kind === 'weekly') return nextWeeklyOnOrAfter(baseKey, r);
    if (r.kind === 'monthly') return nextMonthlyOnOrAfter(baseKey, r);
    throw new Error('Nicht unterstütztes Wiederholungsmuster');
  }
  function nextDueAfter(completedDueKey, repeat) {
    return nextDueOnOrAfter(addDaysKey(completedDueKey, 1), repeat);
  }
  function nextWeeklyOnOrAfter(baseKey, r) {
    const anchorWeekStart = startOfWeekMondayKey(r.startDate);
    const baseWeekStart = startOfWeekMondayKey(baseKey);
    const weeksSinceAnchor = Math.floor(daysBetween(anchorWeekStart, baseWeekStart) / 7);
    for (let w = Math.max(0, weeksSinceAnchor - 1); w <= weeksSinceAnchor + 120; w++) {
      if (w % r.intervalWeeks !== 0) continue;
      const weekStart = addDaysKey(anchorWeekStart, w * 7);
      for (const dow of r.daysOfWeek) {
        const candidate = addDaysKey(weekStart, dow);
        if (compareDateKeys(candidate, baseKey) < 0) continue;
        if (compareDateKeys(candidate, r.startDate) < 0) continue;
        return candidate;
      }
    }
    return null;
  }
  function nextMonthlyOnOrAfter(baseKey, r) {
    const base = dateFromKey(baseKey);
    const start = dateFromKey(r.startDate);
    const startMonth = start.getUTCFullYear() * 12 + start.getUTCMonth();
    const baseMonth = base.getUTCFullYear() * 12 + base.getUTCMonth();
    let m = Math.max(startMonth, baseMonth);
    for (let guard = 0; guard < 240; guard++) {
      const year = Math.floor(m / 12);
      const month0 = m % 12;
      const candidateDate = new Date(Date.UTC(year, month0, r.dayOfMonth, 12, 0, 0));
      const candidateKey = keyFromDate(candidateDate);
      if (compareDateKeys(candidateKey, r.startDate) < 0) {
        m += 1;
        continue;
      }
      if (compareDateKeys(candidateKey, baseKey) < 0) {
        m += r.intervalMonths;
        continue;
      }
      const monthsSinceStart = m - startMonth;
      if (monthsSinceStart % r.intervalMonths === 0) return candidateKey;
      m += 1;
    }
    return null;
  }
  function nextEveryNDaysOnOrAfter(baseKey, r) {
    const startKey = r.startDate;
    if (compareDateKeys(baseKey, startKey) <= 0) return startKey;
    const delta = daysBetween(startKey, baseKey);
    const steps = Math.ceil(delta / r.every);
    return addDaysKey(startKey, steps * r.every);
  }
  function formatGermanDate(dateKey) {
    if (!isDateKey(dateKey)) return '';
    const d = dateFromKey(dateKey);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  function formatGermanDateTime(dateKey, time) {
    const date = formatGermanDate(dateKey);
    const t = normalizeTimeHHMM(time);
    return t ? `${date} ${t}` : date;
  }
  function ensureTaskNextDue(task, todayKey) {
    if (!task || typeof task !== 'object') return task;
    const repeatRaw = task.repeat;
    let repeat;
    try {
      repeat = normalizeRepeatConfig(repeatRaw);
    } catch (e) {
      return { ...task, repeat: { kind: 'none' }, repeatError: e && e.message ? e.message : 'Ungültiges Intervall', nextDue: null };
    }
    if (repeat.kind === 'none') return { ...task, repeat, nextDue: null };
    const lastCompletedDue = isDateKey(task.lastCompletedDue) ? task.lastCompletedDue : null;
    const storedNextDue = isDateKey(task.nextDue) ? task.nextDue : null;
    const computed = lastCompletedDue ? nextDueAfter(lastCompletedDue, repeat) : (storedNextDue || nextDueOnOrAfter(todayKey, repeat));
    return { ...task, repeat, nextDue: computed };
  }
  return {
    isDateKey,
    dateFromKey,
    keyFromDate,
    addDaysKey,
    weekdayIndexMonday0,
    formatGermanDate,
    formatGermanDateTime,
    normalizeRepeatConfig,
    nextDueOnOrAfter,
    nextDueAfter,
    ensureTaskNextDue
  };
});
