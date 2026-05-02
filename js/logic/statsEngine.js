;(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HomeStats = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {

  async function loadPlans() {
    return await HomeDB.dailyPlans.list();
  }

  function weekdayFromKey(dateKey) {
    const d = new Date(dateKey + 'T12:00:00.000Z');
    return (d.getUTCDay() + 6) % 7;
  }

  function weekNumber(dateKey) {
    const d = new Date(dateKey + 'T12:00:00.000Z');
    const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const diff = (d - start) / 86400000;
    return Math.ceil((diff + ((start.getUTCDay() + 6) % 7 + 1)) / 7);
  }

  function getDifficulty(duration) {
    if (duration <= 20) return 'easy';
    if (duration <= 45) return 'medium';
    return 'hard';
  }

  function getTimeBlock(hour) {
    if (hour >= 6 && hour < 12) return 0;
    if (hour >= 12 && hour < 14) return 1;
    if (hour >= 14 && hour < 18) return 2;
    if (hour >= 18 && hour < 22) return 3;
    return 4;
  }

  const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const TIME_LABELS = ['Morgen\n6-12', 'Mittag\n12-14', 'Nachm.\n14-18', 'Abend\n18-22', 'Nacht\n22-6'];
  const DIFFICULTY_LABELS = { easy: 'Kurz (≤20)', medium: 'Mittel (21-45)', hard: 'Lang (≥45)' };
  const DIFFICULTY_COLORS = { easy: '#6b9080', medium: '#a8dadc', hard: '#e76f51' };

  async function weekdayDistribution() {
    const plans = await loadPlans();
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const plan of plans) {
      if (!plan.tasks) continue;
      const dow = weekdayFromKey(plan.date);
      const done = plan.tasks.filter(t => t.status === 'done').length;
      counts[dow] += done;
    }
    const max = Math.max(...counts, 1);
    const bars = counts.map((v, i) => ({
      label: WEEKDAY_LABELS[i],
      value: v,
      pct: Math.round(v / max * 100),
      isBest: v === Math.max(...counts) && v > 0
    }));
    const bestDay = bars.find(b => b.isBest);
    return { bars, bestDay: bestDay ? bestDay.label : null, total: counts.reduce((a, b) => a + b, 0) };
  }

  async function difficultyDistribution() {
    const plans = await loadPlans();
    const counts = { easy: 0, medium: 0, hard: 0 };
    for (const plan of plans) {
      if (!plan.tasks) continue;
      for (const t of plan.tasks) {
        if (t.status !== 'done') continue;
        const diff = t.difficulty || getDifficulty(t.duration || 30);
        if (counts[diff] !== undefined) counts[diff]++;
      }
    }
    const total = counts.easy + counts.medium + counts.hard || 1;
    const segments = [
      { key: 'easy', label: DIFFICULTY_LABELS.easy, value: counts.easy, pct: Math.round(counts.easy / total * 100), color: DIFFICULTY_COLORS.easy },
      { key: 'medium', label: DIFFICULTY_LABELS.medium, value: counts.medium, pct: Math.round(counts.medium / total * 100), color: DIFFICULTY_COLORS.medium },
      { key: 'hard', label: DIFFICULTY_LABELS.hard, value: counts.hard, pct: Math.round(counts.hard / total * 100), color: DIFFICULTY_COLORS.hard }
    ];
    return { segments, total: counts.easy + counts.medium + counts.hard };
  }

  async function weeklyTrend() {
    const plans = await loadPlans();
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentWeek = weekNumber(now.toISOString().slice(0, 10));
    const weekMap = {};
    for (const plan of plans) {
      if (!plan.tasks) continue;
      const kw = weekNumber(plan.date);
      const year = new Date(plan.date + 'T12:00:00.000Z').getUTCFullYear();
      const key = year + '-KW' + String(kw).padStart(2, '0');
      if (!weekMap[key]) weekMap[key] = { kw, year, label: key, done: 0, total: 0 };
      for (const t of plan.tasks) {
        weekMap[key].total++;
        if (t.status === 'done') weekMap[key].done++;
      }
    }
    const weeks = Object.values(weekMap).sort((a, b) => a.year - b.year || a.kw - b.kw);
    const last8 = weeks.slice(-8);
    const maxDone = Math.max(...last8.map(w => w.done), 1);
    const bars = last8.map(w => ({
      label: 'KW' + w.kw,
      value: w.done,
      pct: Math.round(w.done / maxDone * 100),
      isCurrent: w.year === currentYear && w.kw === currentWeek
    }));
    return { bars, total: last8.reduce((s, w) => s + w.done, 0) };
  }

  async function fixedVsFree() {
    const plans = await loadPlans();
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentWeek = weekNumber(now.toISOString().slice(0, 10));
    const weekMap = {};
    for (const plan of plans) {
      if (!plan.tasks) continue;
      const kw = weekNumber(plan.date);
      const year = new Date(plan.date + 'T12:00:00.000Z').getUTCFullYear();
      const key = year + '-KW' + String(kw).padStart(2, '0');
      if (!weekMap[key]) weekMap[key] = { kw, year, label: key, fixed: 0, free: 0 };
      for (const t of plan.tasks) {
        if (t.status !== 'done') continue;
        if (t.fixed) weekMap[key].fixed++;
        else weekMap[key].free++;
      }
    }
    const weeks = Object.values(weekMap).sort((a, b) => a.year - b.year || a.kw - b.kw);
    const last8 = weeks.slice(-8);
    const maxVal = Math.max(...last8.map(w => w.fixed + w.free), 1);
    const bars = last8.map(w => ({
      label: 'KW' + w.kw,
      fixed: w.fixed,
      free: w.free,
      total: w.fixed + w.free,
      pct: Math.round((w.fixed + w.free) / maxVal * 100),
      isCurrent: w.year === currentYear && w.kw === currentWeek
    }));
    const totalFixed = bars.reduce((s, b) => s + b.fixed, 0);
    const totalFree = bars.reduce((s, b) => s + b.free, 0);
    return { bars, totalFixed, totalFree };
  }

  async function timeOfDayDistribution() {
    const plans = await loadPlans();
    const counts = [0, 0, 0, 0, 0];
    for (const plan of plans) {
      if (!plan.tasks) continue;
      for (const t of plan.tasks) {
        if (t.status !== 'done' || !t.completedAt) continue;
        const d = new Date(t.completedAt);
        const hour = d.getHours();
        const block = getTimeBlock(hour);
        counts[block]++;
      }
    }
    const max = Math.max(...counts, 1);
    const bars = counts.map((v, i) => ({
      label: TIME_LABELS[i].replace('\n', ' '),
      labelShort: TIME_LABELS[i].split('\n')[0],
      value: v,
      pct: Math.round(v / max * 100),
      isBest: v === Math.max(...counts) && v > 0
    }));
    const bestBlock = bars.find(b => b.isBest);
    return { bars, bestBlock: bestBlock ? bestBlock.label : null, total: counts.reduce((a, b) => a + b, 0) };
  }

  return {
    weekdayDistribution,
    difficultyDistribution,
    weeklyTrend,
    fixedVsFree,
    timeOfDayDistribution
  };
});
