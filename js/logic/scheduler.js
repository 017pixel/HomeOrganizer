function todayKey() {
  const d = new Date();
  return d.toISOString().slice(0,10);
}
function weekday(dateKey) {
  const d = dateKey ? new Date(dateKey + 'T12:00:00.000Z') : new Date();
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const mapping = ['sonntag', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag'];
  return mapping[day];
}
async function getAvailableMinutes(dateKey) {
  const s = await HomeDB.settings.get('availability');
  const w = weekday(dateKey);
  if (s && s[w]) return s[w];
  return 60;
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

class DailyPlanner {
  async generateBalancedPlan(dateKey = todayKey(), excludeTaskIds = new Set(), taskUsageCounts = {}) {
    const tasks = await HomeDB.tasks.list();
    const minutes = await getAvailableMinutes(dateKey);

    if (!tasks.length) {
      const fallback = [
        { id: -1, title: 'Aufgabe hinzufügen', duration: 15 },
        { id: -2, title: 'Aufgabe hinzufügen', duration: 30 },
        { id: -3, title: 'Aufgabe hinzufügen', duration: 60 }
      ];
      const plan = {
        date: dateKey,
        tasks: fallback.map(toPlanTask),
        minutes,
        difficulty: 'balanced',
        swapsRemaining: 3
      };
      await HomeDB.dailyPlans.put(plan);
      return plan;
    }

    let normalized = tasks;
    if (window.HomeRecurrence) {
      normalized = tasks.map(t => window.HomeRecurrence.ensureTaskNextDue(t, dateKey));
      for (let i = 0; i < tasks.length; i++) {
        const before = tasks[i];
        const after = normalized[i];
        if ((before.nextDue || null) !== (after.nextDue || null) || JSON.stringify(before.repeat || null) !== JSON.stringify(after.repeat || null) || (before.repeatError || null) !== (after.repeatError || null)) {
          await HomeDB.tasks.put(after);
        }
      }
    }

    let result = null;
    if (window.HomePlannerCore && typeof window.HomePlannerCore.buildPlanTasks === 'function') {
      result = window.HomePlannerCore.buildPlanTasks({ dateKey, tasks: normalized, minutes, maxTasks: 3, excludeTaskIds, taskUsageCounts });
    }

    const plan = {
      date: dateKey,
      tasks: result && Array.isArray(result.tasks) ? result.tasks.slice(0, 3) : normalized.slice(0, 3).map(toPlanTask),
      minutes,
      difficulty: result && result.targetDifficulty ? result.targetDifficulty : 'balanced',
      swapsRemaining: 3
    };

    await HomeDB.dailyPlans.put(plan);
    return plan;
  }

  async loadTaskUsageForDays(days = 14) {
    const counts = {};
    if (!window.HomeRecurrence) return counts;
    const today = todayKey();
    for (let i = 0; i < days; i++) {
      const dateKey = window.HomeRecurrence.addDaysKey(today, i);
      const plan = await HomeDB.dailyPlans.get(dateKey);
      if (plan && plan.tasks) {
        for (const t of plan.tasks) {
          if (!t.fixed) {
            counts[t.id] = (counts[t.id] || 0) + 1;
          }
        }
      }
    }
    return counts;
  }

  async getOrFixTodayPlan() {
    const key = todayKey();
    let plan = await HomeDB.dailyPlans.get(key);
    if (!plan || !plan.tasks || plan.tasks.length < 3) plan = await this.generateBalancedPlan(key);

    if (plan && plan.tasks && window.HomeRecurrence) {
      const hasCompleted = plan.tasks.some(t => t.status === 'done');
      if (!hasCompleted) {
        const excludeIds = new Set();
        for (let i = 1; i <= 3; i++) {
          const prevKey = window.HomeRecurrence.addDaysKey(key, -i);
          const prevPlan = await HomeDB.dailyPlans.get(prevKey);
          if (prevPlan && prevPlan.tasks) {
            prevPlan.tasks.forEach(t => {
              if (!t.fixed) excludeIds.add(t.id);
            });
          }
        }
        const todayFreeIds = plan.tasks.filter(t => !t.fixed).map(t => t.id);
        const hasOverlap = todayFreeIds.some(id => excludeIds.has(id));
        if (hasOverlap && excludeIds.size > 0) {
          const taskUsageCounts = await this.loadTaskUsageForDays(14);
          plan = await this.generateBalancedPlan(key, excludeIds, taskUsageCounts);
        }
      }
    }

    if (plan.date !== key) plan.date = key;
    if (typeof plan.swapsRemaining !== 'number') plan.swapsRemaining = 3;
    if (!plan.difficulty) plan.difficulty = 'balanced';
    plan.tasks = (plan.tasks || []).map(t => ({
      ...t,
      difficulty: t.difficulty || getDifficulty(t.duration || 0),
      status: t.status || 'pending',
      fixed: !!t.fixed
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
    if (plan.tasks[idx] && plan.tasks[idx].fixed) throw new Error('Feste Aufgaben können nicht getauscht werden');

    const allTasks = await HomeDB.tasks.list();
    const existing = new Set(plan.tasks.map(t => t.id));
    const freeOnly = allTasks.filter(t => !t.repeat || !t.repeat.kind || t.repeat.kind === 'none');
    const candidates = freeOnly.filter(t => !existing.has(t.id));
    const pool = candidates.length ? candidates : freeOnly.filter(t => t.id !== oldTaskId);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const next = shuffled[0] || null;
    if (!next) throw new Error('Keine Ersatzaufgabe verfügbar');

    const timestamp = new Date().toISOString();
    await HomeDB.taskSwaps.add({
      originalTaskId: oldTaskId,
      newTaskId: next.id,
      date: planDate,
      timestamp
    });

    plan.tasks[idx] = { ...toPlanTask(next), swappedAt: timestamp, fixed: false };
    plan.swapsRemaining = Math.max(0, (plan.swapsRemaining || 0) - 1);
    await HomeDB.dailyPlans.put(plan);
    return plan;
  }

  async completeTask(planDate, taskId) {
    const plan = await HomeDB.dailyPlans.get(planDate);
    if (!plan) return null;
    const target = (plan.tasks || []).find(t => t.id === taskId) || null;
    const now = new Date().toISOString();
    plan.tasks = (plan.tasks || []).map(t => (t.id === taskId ? { ...t, status: 'done', completedAt: now } : t));
    await HomeDB.dailyPlans.put(plan);
    if (target && target.fixed && target.dueDate && window.HomeRecurrence) {
      const src = await HomeDB.tasks.get(taskId);
      if (src && src.repeat && src.repeat.kind && src.repeat.kind !== 'none') {
        const repeat = src.repeat;
        const nextDue = window.HomeRecurrence.nextDueAfter(target.dueDate, repeat);
        await HomeDB.tasks.put({ ...src, lastCompletedDue: target.dueDate, nextDue });
      }
    }
    return plan;
  }

  async completePlan(planDate) {
    const plan = await HomeDB.dailyPlans.get(planDate);
    if (!plan) return null;
    const fixedCompleted = (plan.tasks || []).filter(t => t.fixed && t.dueDate && t.status !== 'done');
    const now = new Date().toISOString();
    plan.tasks = (plan.tasks || []).map(t => ({ ...t, status: 'done', completedAt: now }));
    await HomeDB.dailyPlans.put(plan);
    if (fixedCompleted.length && window.HomeRecurrence) {
      for (const t of fixedCompleted) {
        const src = await HomeDB.tasks.get(t.id);
        if (!src || !src.repeat || !src.repeat.kind || src.repeat.kind === 'none') continue;
        const nextDue = window.HomeRecurrence.nextDueAfter(t.dueDate, src.repeat);
        await HomeDB.tasks.put({ ...src, lastCompletedDue: t.dueDate, nextDue });
      }
    }
    return plan;
  }

  getNextCardIndex(currentIndex, totalCards, direction) {
    if (!totalCards) return 0;
    if (direction === 'up' || direction === 'next') return (currentIndex + 1) % totalCards;
    if (direction === 'down' || direction === 'prev') return (currentIndex - 1 + totalCards) % totalCards;
    return currentIndex;
  }

  async ensurePlansForDays(days = 14) {
    const today = todayKey();
    if (!window.HomeRecurrence) return;
    const allFreeTasks = (await HomeDB.tasks.list()).filter(t => !t.repeat || !t.repeat.kind || t.repeat.kind === 'none');
    const taskUsageCounts = {};
    for (let i = 0; i < days; i++) {
      const dateKey = window.HomeRecurrence.addDaysKey(today, i);
      let plan = await HomeDB.dailyPlans.get(dateKey);
      if (!plan || !plan.tasks || plan.tasks.length < 3) {
        let excludeTaskIds = new Set();
        for (let lookback = 3; lookback >= 0; lookback--) {
          excludeTaskIds = new Set();
          for (let j = Math.max(0, i - lookback); j < i; j++) {
            const prevDate = window.HomeRecurrence.addDaysKey(today, j);
            const prevPlan = await HomeDB.dailyPlans.get(prevDate);
            if (prevPlan && prevPlan.tasks) {
              prevPlan.tasks.forEach(t => {
                if (!t.fixed) excludeTaskIds.add(t.id);
              });
            }
          }
          if (lookback === 0 || allFreeTasks.length - excludeTaskIds.size >= 3) break;
        }
        plan = await this.generateBalancedPlan(dateKey, excludeTaskIds, taskUsageCounts);
      }
      if (plan && plan.tasks) {
        for (const t of plan.tasks) {
          if (!t.fixed) {
            taskUsageCounts[t.id] = (taskUsageCounts[t.id] || 0) + 1;
          }
        }
      }
    }
  }

  async regenerateFuturePlans(fromDateKey) {
    const plans = await HomeDB.dailyPlans.list();
    for (const plan of plans) {
      if (plan.date >= fromDateKey) {
        await HomeDB.dailyPlans.del(plan.date);
      }
    }
    await this.ensurePlansForDays(14);
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
  getNextIndex: (idx, total, dir) => planner.getNextCardIndex(idx, total, dir),
  ensurePlansForDays: (days) => planner.ensurePlansForDays(days),
  regenerateFuturePlans: (fromDateKey) => planner.regenerateFuturePlans(fromDateKey)
};
