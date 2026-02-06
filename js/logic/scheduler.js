function todayKey() {
  const d = new Date();
  return d.toISOString().slice(0,10);
}
function weekday() {
  return new Date().toLocaleDateString('de-DE', { weekday: 'long' }).toLowerCase();
}
async function getAvailableMinutes() {
  const s = await HomeDB.settings.get('availability');
  const w = weekday();
  if (s && s[w]) return s[w];
  return 60;
}
function pickRandom(arr) {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random()*arr.length)];
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
    status: 'pending'
  };
}

class DailyPlanner {
  async generateBalancedPlan() {
    const tasks = await HomeDB.tasks.list();
    const minutes = await getAvailableMinutes();

    if (!tasks.length) {
      const fallback = [
        { id: -1, title: 'Aufgabe hinzufügen', duration: 15 },
        { id: -2, title: 'Aufgabe hinzufügen', duration: 30 },
        { id: -3, title: 'Aufgabe hinzufügen', duration: 60 }
      ];
      const plan = {
        date: todayKey(),
        tasks: fallback.map(toPlanTask),
        minutes,
        difficulty: 'balanced',
        swapsRemaining: 3
      };
      await HomeDB.dailyPlans.put(plan);
      return plan;
    }

    const easyTasks = tasks.filter(t => t.duration <= 20);
    const mediumTasks = tasks.filter(t => t.duration > 20 && t.duration < 45);
    const hardTasks = tasks.filter(t => t.duration >= 45);

    let target = 'balanced';
    let picked = [];

    if (minutes <= 45) {
      target = 'easy';
      picked = [pickRandom(easyTasks), pickRandom(easyTasks), pickRandom(easyTasks)];
    } else if (minutes <= 60) {
      target = 'mixed';
      picked = [pickRandom(easyTasks), pickRandom(easyTasks), pickRandom(mediumTasks)];
    } else {
      target = 'balanced';
      picked = [pickRandom(easyTasks), pickRandom(easyTasks), pickRandom(hardTasks)];
    }

    const selected = [];
    for (const p of picked) {
      if (p && !selected.find(x => x.id === p.id)) selected.push(p);
    }
    while (selected.length < 3) {
      const r = pickRandom(tasks);
      if (!r) break;
      if (tasks.length < 3 || !selected.find(x => x.id === r.id)) selected.push(r);
      if (selected.length >= tasks.length) break;
    }

    const plan = {
      date: todayKey(),
      tasks: selected.slice(0, 3).map(toPlanTask),
      minutes,
      difficulty: target,
      swapsRemaining: 3
    };

    await HomeDB.dailyPlans.put(plan);
    return plan;
  }

  async getOrFixTodayPlan() {
    const key = todayKey();
    let plan = await HomeDB.dailyPlans.get(key);
    if (!plan || !plan.tasks || plan.tasks.length < 3) plan = await this.generateBalancedPlan();

    if (plan.date !== key) plan.date = key;
    if (typeof plan.swapsRemaining !== 'number') plan.swapsRemaining = 3;
    if (!plan.difficulty) plan.difficulty = 'balanced';
    plan.tasks = (plan.tasks || []).map(t => ({
      ...t,
      difficulty: t.difficulty || getDifficulty(t.duration || 0),
      status: t.status || 'pending'
    }));
    await HomeDB.dailyPlans.put(plan);
    return plan;
  }

  async swapTask(planDate, oldTaskId) {
    const plan = await HomeDB.dailyPlans.get(planDate);
    if (!plan) throw new Error('Kein Plan gefunden');
    if (!plan.swapsRemaining || plan.swapsRemaining <= 0) throw new Error('Keine Swaps mehr verfügbar (max 3/Tag)');

    const idx = (plan.tasks || []).findIndex(t => t.id === oldTaskId);
    if (idx === -1) throw new Error('Aufgabe nicht im Plan');

    const allTasks = await HomeDB.tasks.list();
    const existing = new Set(plan.tasks.map(t => t.id));
    const candidates = allTasks.filter(t => !existing.has(t.id));
    const next = pickRandom(candidates.length ? candidates : allTasks.filter(t => t.id !== oldTaskId));
    if (!next) throw new Error('Keine Ersatzaufgabe verfügbar');

    const timestamp = new Date().toISOString();
    await HomeDB.taskSwaps.add({
      originalTaskId: oldTaskId,
      newTaskId: next.id,
      date: planDate,
      timestamp
    });

    plan.tasks[idx] = { ...toPlanTask(next), swappedAt: timestamp };
    plan.swapsRemaining = Math.max(0, (plan.swapsRemaining || 0) - 1);
    await HomeDB.dailyPlans.put(plan);
    return plan;
  }

  async completeTask(planDate, taskId) {
    const plan = await HomeDB.dailyPlans.get(planDate);
    if (!plan) return null;
    plan.tasks = (plan.tasks || []).map(t => (t.id === taskId ? { ...t, status: 'done' } : t));
    await HomeDB.dailyPlans.put(plan);
    return plan;
  }

  async completePlan(planDate) {
    const plan = await HomeDB.dailyPlans.get(planDate);
    if (!plan) return null;
    plan.tasks = (plan.tasks || []).map(t => ({ ...t, status: 'done' }));
    await HomeDB.dailyPlans.put(plan);
    return plan;
  }

  getNextCardIndex(currentIndex, totalCards, direction) {
    if (!totalCards) return 0;
    if (direction === 'up' || direction === 'next') return (currentIndex + 1) % totalCards;
    if (direction === 'down' || direction === 'prev') return (currentIndex - 1 + totalCards) % totalCards;
    return currentIndex;
  }
}

const planner = new DailyPlanner();
window.HomeScheduler = {
  generateDailyPlan: () => planner.generateBalancedPlan(),
  generateBalancedPlan: () => planner.generateBalancedPlan(),
  getOrFixTodayPlan: () => planner.getOrFixTodayPlan(),
  swapTask: (date, oldId) => planner.swapTask(date, oldId),
  completeTask: (date, taskId) => planner.completeTask(date, taskId),
  completePlan: (date) => planner.completePlan(date),
  getNextIndex: (idx, total, dir) => planner.getNextCardIndex(idx, total, dir)
};
