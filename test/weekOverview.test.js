import { describe, it, expect } from 'vitest';
import Recurrence from '../js/logic/recurrence.js';

globalThis.HomeRecurrence = Recurrence;
const WeekOverview = await import('../js/logic/weekOverview.js');

describe('HomeWeekOverview', () => {
  it('erkennt woechentliche Aufgaben am richtigen Tag', () => {
    const task = {
      repeat: {
        kind: 'weekly',
        startDate: '2026-02-02',
        daysOfWeek: [0],
        intervalWeeks: 1
      }
    };
    expect(WeekOverview.default.isTaskDueOnDate(task, '2026-02-02')).toBe(true);
    expect(WeekOverview.default.isTaskDueOnDate(task, '2026-02-03')).toBe(false);
    expect(WeekOverview.default.isTaskDueOnDate(task, '2026-02-09')).toBe(true);
  });

  it('erkennt 2-Wochen-Intervalle korrekt', () => {
    const task = {
      repeat: {
        kind: 'weekly',
        startDate: '2026-02-02',
        daysOfWeek: [0],
        intervalWeeks: 2
      }
    };
    expect(WeekOverview.default.isTaskDueOnDate(task, '2026-02-02')).toBe(true);
    expect(WeekOverview.default.isTaskDueOnDate(task, '2026-02-09')).toBe(false);
    expect(WeekOverview.default.isTaskDueOnDate(task, '2026-02-16')).toBe(true);
  });

  it('erkennt monatliche Aufgaben korrekt', () => {
    const task = {
      repeat: {
        kind: 'monthly',
        startDate: '2026-01-10',
        dayOfMonth: 15,
        intervalMonths: 1
      }
    };
    expect(WeekOverview.default.isTaskDueOnDate(task, '2026-01-15')).toBe(true);
    expect(WeekOverview.default.isTaskDueOnDate(task, '2026-01-10')).toBe(false);
    expect(WeekOverview.default.isTaskDueOnDate(task, '2026-02-15')).toBe(true);
  });

  it('erkennt taegliche Custom-Intervalle korrekt', () => {
    const task = {
      repeat: {
        kind: 'custom',
        unit: 'day',
        every: 3,
        startDate: '2026-02-01'
      }
    };
    expect(WeekOverview.default.isTaskDueOnDate(task, '2026-02-01')).toBe(true);
    expect(WeekOverview.default.isTaskDueOnDate(task, '2026-02-02')).toBe(false);
    expect(WeekOverview.default.isTaskDueOnDate(task, '2026-02-04')).toBe(true);
  });

  it('gibt false fuer nicht-wiederholende Aufgaben', () => {
    const task = { repeat: { kind: 'none' } };
    expect(WeekOverview.default.isTaskDueOnDate(task, '2026-02-02')).toBe(false);
  });
});