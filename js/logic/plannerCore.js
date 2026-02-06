;(function (root, factory) {
  const api = factory(root.HomeRecurrence);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HomePlannerCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function (HomeRecurrence) {
  const R = HomeRecurrence || (typeof require === 'function' ? (() => { try { return require('./recurrence.js'); } catch { return null; } })() : null);
  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }
  function pickRandom(arr, rng) {
    if (!arr.length) return null;
    return arr[Math.floor(rng() * arr.length)];
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
  function compareDateKeys(a, b) {
    if (a === b) return 0;
    return a < b ? -1 : 1;
  }
  function buildPlanTasks({ dateKey, tasks, minutes, maxTasks = 3, rng = Math.random }) {
    assert(typeof dateKey === 'string' && dateKey.length === 10, 'Ungültiges Datum');
    const list = Array.isArray(tasks) ? tasks.slice() : [];
    const normalized = list.map((t) => (R ? R.ensureTaskNextDue(t, dateKey) : { ...t }));
    const fixedCandidates = normalized
      .filter((t) => isFixed(t) && t.nextDue && compareDateKeys(t.nextDue, dateKey) <= 0)
      .sort((a, b) => {
        const d = compareDateKeys(a.nextDue, b.nextDue);
        if (d !== 0) return d;
        return (a.id ?? 0) - (b.id ?? 0);
      });
    const fixedPicked = fixedCandidates.slice(0, maxTasks).map(toFixedPlanTask);
    const fixedIds = new Set(fixedPicked.map((t) => t.id));
    const slots = Math.max(0, maxTasks - fixedPicked.length);
    if (slots === 0) return { tasks: fixedPicked, targetDifficulty: 'fixed' };
    const freeTasks = normalized.filter((t) => !isFixed(t) && !fixedIds.has(t.id));
    if (!freeTasks.length) return { tasks: fixedPicked, targetDifficulty: 'fixed+empty' };
    const easyTasks = freeTasks.filter((t) => t.duration <= 20);
    const mediumTasks = freeTasks.filter((t) => t.duration > 20 && t.duration < 45);
    const hardTasks = freeTasks.filter((t) => t.duration >= 45);
    let target = 'balanced';
    let picked = [];
    if (minutes <= 45) {
      target = 'easy';
      picked = Array.from({ length: slots }, () => pickRandom(easyTasks.length ? easyTasks : freeTasks, rng));
    } else if (minutes <= 60) {
      target = 'mixed';
      picked = [pickRandom(easyTasks.length ? easyTasks : freeTasks, rng), pickRandom(easyTasks.length ? easyTasks : freeTasks, rng), pickRandom(mediumTasks.length ? mediumTasks : freeTasks, rng)].slice(0, slots);
    } else {
      target = 'balanced';
      picked = [pickRandom(easyTasks.length ? easyTasks : freeTasks, rng), pickRandom(easyTasks.length ? easyTasks : freeTasks, rng), pickRandom(hardTasks.length ? hardTasks : freeTasks, rng)].slice(0, slots);
    }
    const selected = [];
    for (const p of picked) {
      if (p && !selected.find((x) => x.id === p.id) && !fixedIds.has(p.id)) selected.push(p);
    }
    while (selected.length < slots) {
      const r = pickRandom(freeTasks, rng);
      if (!r) break;
      if (freeTasks.length < slots || !selected.find((x) => x.id === r.id)) selected.push(r);
      if (selected.length >= freeTasks.length) break;
    }
    return { tasks: fixedPicked.concat(selected.slice(0, slots).map(toPlanTask)), targetDifficulty: target };
  }
  return { buildPlanTasks, getDifficulty };
});
