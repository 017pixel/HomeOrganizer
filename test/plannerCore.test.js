import { describe, it, expect } from 'vitest';
import PlannerCore from '../js/logic/plannerCore.js';

describe('HomePlannerCore', () => {
  // 2026-02-10 is a Tuesday (dayOfWeek: [1])
  it('priorisiert feste Aufgaben und begrenzt auf 3 pro Tag', () => {
    const tasks = [
      { id: 1, title: 'Fest 1', duration: 30, repeat: { kind: 'weekly', startDate: '2026-02-03', daysOfWeek: [1], intervalWeeks: 1 } },
      { id: 2, title: 'Fest 2', duration: 15, repeat: { kind: 'weekly', startDate: '2026-02-03', daysOfWeek: [1], intervalWeeks: 1 } },
      { id: 3, title: 'Fest 3', duration: 60, repeat: { kind: 'monthly', startDate: '2026-01-10', dayOfMonth: 10, intervalMonths: 1 } },
      { id: 4, title: 'Fest 4', duration: 15, repeat: { kind: 'weekly', startDate: '2026-02-03', daysOfWeek: [1], intervalWeeks: 1 } },
      { id: 10, title: 'Frei 1', duration: 15 },
      { id: 11, title: 'Frei 2', duration: 30 }
    ];
    const plan = PlannerCore.buildPlanTasks({ dateKey: '2026-02-10', tasks, minutes: 60, maxTasks: 3, rng: () => 0.5 });
    expect(plan.tasks).toHaveLength(3);
    expect(plan.tasks.every(t => t.fixed)).toBe(true);
    expect(plan.tasks.map(t => t.id)).toEqual([1, 4, 2]);
  });

  it('füllt freie Slots nach festen Aufgaben auf', () => {
    const tasks = [
      { id: 1, title: 'Fest', duration: 30, repeat: { kind: 'weekly', startDate: '2026-02-03', daysOfWeek: [1], intervalWeeks: 1 } },
      { id: 10, title: 'Frei A', duration: 15 },
      { id: 11, title: 'Frei B', duration: 60 }
    ];
    const plan = PlannerCore.buildPlanTasks({ dateKey: '2026-02-10', tasks, minutes: 60, maxTasks: 3, rng: () => 0.5 });
    expect(plan.tasks).toHaveLength(3);
    expect(plan.tasks[0].fixed).toBe(true);
    expect(plan.tasks.slice(1).every(t => !t.fixed)).toBe(true);
  });

  it('nimmt wöchentliche Aufgaben nur an ihrem Wochentag auf (nicht immer)', () => {
    // 2026-02-10 is Tuesday (dow 1). A Monday task must NOT appear.
    const tasks = [
      { id: 1, title: 'Montags-Aufgabe', duration: 30, repeat: { kind: 'weekly', startDate: '2026-02-02', daysOfWeek: [0], intervalWeeks: 1 } },
      { id: 10, title: 'Frei A', duration: 15 },
      { id: 11, title: 'Frei B', duration: 60 },
      { id: 12, title: 'Frei C', duration: 30 }
    ];
    const plan = PlannerCore.buildPlanTasks({ dateKey: '2026-02-10', tasks, minutes: 60, maxTasks: 3, rng: () => 0.5 });
    expect(plan.tasks).toHaveLength(3);
    expect(plan.tasks.some(t => t.fixed)).toBe(false);
  });

  it('bevorzugt weniger genutzte Aufgaben (Fair-Rotation)', () => {
    const tasks = [
      { id: 10, title: 'Viel genutzt', duration: 15 },
      { id: 11, title: 'Wenig genutzt', duration: 15 }
    ];
    const plan = PlannerCore.buildPlanTasks({
      dateKey: '2026-02-10',
      tasks,
      minutes: 60,
      maxTasks: 3,
      rng: () => 0.99,
      taskUsageCounts: { 10: 5, 11: 0 }
    });
    expect(plan.tasks.map(t => t.id)).toContain(11);
    const idx10 = plan.tasks.findIndex(t => t.id === 10);
    const idx11 = plan.tasks.findIndex(t => t.id === 11);
    expect(idx11).toBeLessThan(idx10);
  });

  it('schließt ausgeschlossene Aufgaben aus, solange genug andere existieren', () => {
    const tasks = [
      { id: 10, title: 'Gestern', duration: 15 },
      { id: 11, title: 'Frei A', duration: 30 },
      { id: 12, title: 'Frei B', duration: 30 },
      { id: 13, title: 'Frei C', duration: 30 }
    ];
    const plan = PlannerCore.buildPlanTasks({
      dateKey: '2026-02-10',
      tasks,
      minutes: 60,
      maxTasks: 3,
      rng: () => 0.1,
      excludeTaskIds: new Set([10])
    });
    expect(plan.tasks.map(t => t.id)).not.toContain(10);
    expect(plan.tasks).toHaveLength(3);
  });

  it('begrenzt tägliche feste Aufgaben auf maximal eine pro Tag', () => {
    const tasks = [
      { id: 1, title: 'Täglich 1', duration: 15, repeat: { kind: 'custom', unit: 'day', every: 1, startDate: '2026-02-01' } },
      { id: 2, title: 'Täglich 2', duration: 15, repeat: { kind: 'custom', unit: 'day', every: 1, startDate: '2026-02-01' } },
      { id: 3, title: 'Täglich 3', duration: 15, repeat: { kind: 'custom', unit: 'day', every: 1, startDate: '2026-02-01' } },
      { id: 10, title: 'Frei A', duration: 15 },
      { id: 11, title: 'Frei B', duration: 30 }
    ];
    const plan = PlannerCore.buildPlanTasks({ dateKey: '2026-02-10', tasks, minutes: 60, maxTasks: 3, rng: () => 0.5 });
    const daily = plan.tasks.filter(t => t.fixed);
    expect(daily).toHaveLength(1);
    expect(plan.tasks).toHaveLength(3);
    expect(plan.tasks.filter(t => !t.fixed)).toHaveLength(2);
  });

  it('mappt überfällige feste Aufgaben nur an ihrem Fälligkeitstag', () => {
    const tasks = [
      { id: 1, title: 'Überfällig (Montag)', duration: 30, repeat: { kind: 'weekly', startDate: '2026-02-02', daysOfWeek: [0], intervalWeeks: 1 }, nextDue: '2026-02-03' },
      { id: 10, title: 'Frei A', duration: 15 },
      { id: 11, title: 'Frei B', duration: 30 },
      { id: 12, title: 'Frei C', duration: 30 }
    ];
    const plan = PlannerCore.buildPlanTasks({ dateKey: '2026-02-10', tasks, minutes: 60, maxTasks: 3, rng: () => 0.5 });
    expect(plan.tasks.some(t => t.id === 1 && t.fixed)).toBe(false);
  });
});

