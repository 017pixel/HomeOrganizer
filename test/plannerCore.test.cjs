const { describe, it, expect } = require('vitest');

const Recurrence = require('../js/logic/recurrence.js');
global.HomeRecurrence = Recurrence;
const PlannerCore = require('../js/logic/plannerCore.js');

describe('HomePlannerCore', () => {
  it('priorisiert feste Aufgaben und begrenzt auf 3 pro Tag', () => {
    const tasks = [
      { id: 1, title: 'Fest 1', duration: 30, repeat: { kind: 'weekly', startDate: '2026-02-01', daysOfWeek: [0], intervalWeeks: 1 }, nextDue: '2026-02-09' },
      { id: 2, title: 'Fest 2', duration: 15, repeat: { kind: 'weekly', startDate: '2026-02-01', daysOfWeek: [1], intervalWeeks: 1 }, nextDue: '2026-02-08' },
      { id: 3, title: 'Fest 3', duration: 60, repeat: { kind: 'monthly', startDate: '2026-01-01', dayOfMonth: 7, intervalMonths: 1 }, nextDue: '2026-02-07' },
      { id: 4, title: 'Fest 4', duration: 15, repeat: { kind: 'weekly', startDate: '2026-02-01', daysOfWeek: [2], intervalWeeks: 1 }, nextDue: '2026-02-10' },
      { id: 10, title: 'Frei 1', duration: 15 },
      { id: 11, title: 'Frei 2', duration: 30 }
    ];
    const plan = PlannerCore.buildPlanTasks({ dateKey: '2026-02-10', tasks, minutes: 60, maxTasks: 3, rng: () => 0.1 });
    expect(plan.tasks).toHaveLength(3);
    expect(plan.tasks.every(t => t.fixed)).toBe(true);
    expect(plan.tasks.map(t => t.id)).toEqual([3, 2, 1]);
  });

  it('füllt freie Slots nach festen Aufgaben auf', () => {
    const tasks = [
      { id: 1, title: 'Fest', duration: 30, repeat: { kind: 'weekly', startDate: '2026-02-01', daysOfWeek: [0], intervalWeeks: 1 }, nextDue: '2026-02-10' },
      { id: 10, title: 'Frei A', duration: 15 },
      { id: 11, title: 'Frei B', duration: 60 }
    ];
    const plan = PlannerCore.buildPlanTasks({ dateKey: '2026-02-10', tasks, minutes: 60, maxTasks: 3, rng: () => 0.0 });
    expect(plan.tasks).toHaveLength(3);
    expect(plan.tasks[0].fixed).toBe(true);
    expect(plan.tasks.slice(1).every(t => !t.fixed)).toBe(true);
  });
});

