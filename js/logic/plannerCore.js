;(function (root, factory) {
  const api = factory(root.HomeRecurrence);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HomePlannerCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function (HomeRecurrence) {
  const R = HomeRecurrence || (typeof require === 'function' ? (() => { try { return require('./recurrence.js'); } catch { return null; } })() : null);
  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }
  function getDifficulty(duration) {
    if (duration <= 20) return 'easy';
    if (duration <= 45) return 'medium';
    return 'hard';
  }
  function toPlanTask(task) {
    return {
      id: task.id,
      title: task.title,
      duration: task.duration,
      difficulty: getDifficulty(task.duration),
      status: 'pending',
      fixed: false
    };
  }
  function toFixedPlanTask(task) {
    return {
      id: task.id,
      title: task.title,
      duration: task.duration,
      difficulty: getDifficulty(task.duration),
      status: 'pending',
      fixed: true,
      dueDate: task.nextDue || null
    };
  }
  function isFixed(task) {
    return task && task.repeat && task.repeat.kind && task.repeat.kind !== 'none';
  }
  function isDailyRepeat(task) {
    if (!task || !task.repeat) return false;
    const r = task.repeat;
    return r.kind === 'custom' && r.unit === 'day' && r.every === 1;
  }
  function compareDateKeys(a, b) {
    if (a === b) return 0;
    return a < b ? -1 : 1;
  }
  function buildPlanTasks({ dateKey, tasks, minutes, maxTasks = 3, rng = Math.random, excludeTaskIds = new Set(), taskUsageCounts = {} }) {
    assert(typeof dateKey === 'string' && dateKey.length === 10, 'Ungültiges Datum');
    const list = Array.isArray(tasks) ? tasks.slice() : [];
    const normalized = list.map((t) => (R ? R.ensureTaskNextDue(t, dateKey) : { ...t, nextDue: null }));
    const fixedCandidates = normalized
      .filter((t) => isFixed(t) && compareDateKeys(t.nextDue, dateKey) === 0)
      .sort((a, b) => {
        const d = compareDateKeys(a.nextDue, b.nextDue);
        if (d !== 0) return d;
        return (a.id ?? 0) - (b.id ?? 0);
      });
    const dailyFixed = fixedCandidates.filter(t => isDailyRepeat(t));
    let otherFixed = fixedCandidates.filter(t => !isDailyRepeat(t));
    const dailyPicked = dailyFixed.slice(0, 1).map(toFixedPlanTask);
    const maxOther = maxTasks - dailyPicked.length;
    if (otherFixed.length > maxOther) {
      for (let i = otherFixed.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [otherFixed[i], otherFixed[j]] = [otherFixed[j], otherFixed[i]];
      }
    }
    const otherPicked = otherFixed.slice(0, maxOther).map(toFixedPlanTask);
    const fixedPicked = [...dailyPicked, ...otherPicked].slice(0, maxTasks);
    const fixedIds = new Set(fixedPicked.map((t) => t.id));
    const slots = Math.max(0, maxTasks - fixedPicked.length);
    if (slots === 0) return { tasks: fixedPicked, targetDifficulty: 'fixed' };
    const freeTasks = normalized.filter((t) => !isFixed(t) && !fixedIds.has(t.id));
    if (!freeTasks.length) return { tasks: fixedPicked, targetDifficulty: 'fixed+empty' };
    let availableFree = freeTasks.filter(t => !excludeTaskIds.has(t.id));
    if (availableFree.length < slots) availableFree = freeTasks;
    const sorted = [...availableFree].sort((a, b) => {
      const aUsage = taskUsageCounts[a.id] || 0;
      const bUsage = taskUsageCounts[b.id] || 0;
      if (aUsage !== bUsage) return aUsage - bUsage;
      return rng() - 0.5;
    });
    const selected = sorted.slice(0, slots).map(toPlanTask);
    return { tasks: fixedPicked.concat(selected), targetDifficulty: 'balanced' };
  }
  return { buildPlanTasks, getDifficulty };
});
