import { describe, it, expect } from 'vitest';
import Recurrence from '../js/logic/recurrence.js';

describe('HomeRecurrence', () => {
  it('berechnet wöchentliche Wiederholungen mit mehreren Tagen', () => {
    const r = Recurrence.normalizeRepeatConfig({
      kind: 'weekly',
      startDate: '2026-02-02',
      daysOfWeek: [0, 2],
      intervalWeeks: 1
    });
    expect(Recurrence.nextDueOnOrAfter('2026-02-02', r)).toBe('2026-02-02');
    expect(Recurrence.nextDueAfter('2026-02-02', r)).toBe('2026-02-04');
  });

  it('unterstützt alle-2-Wochen-Logik', () => {
    const r = Recurrence.normalizeRepeatConfig({
      kind: 'weekly',
      startDate: '2026-02-02',
      daysOfWeek: [0],
      intervalWeeks: 2
    });
    expect(Recurrence.nextDueOnOrAfter('2026-02-09', r)).toBe('2026-02-16');
  });

  it('berechnet monatliche Wiederholung über Monatswechsel', () => {
    const r = Recurrence.normalizeRepeatConfig({
      kind: 'monthly',
      startDate: '2026-01-10',
      dayOfMonth: 15,
      intervalMonths: 1
    });
    expect(Recurrence.nextDueOnOrAfter('2026-01-10', r)).toBe('2026-01-15');
    expect(Recurrence.nextDueAfter('2026-01-15', r)).toBe('2026-02-15');
  });

  it('mappt Quartal/Halbjahr/Jahr auf Monats-Intervalle', () => {
    const r = Recurrence.normalizeRepeatConfig({ kind: 'quarterly', startDate: '2026-01-20' });
    expect(r.kind).toBe('monthly');
    expect(r.intervalMonths).toBe(3);
    expect(r.dayOfMonth).toBe(20);
    expect(Recurrence.nextDueAfter('2026-01-20', r)).toBe('2026-04-20');
  });

  it('unterstützt Custom-Intervalle in Tagen', () => {
    const r = Recurrence.normalizeRepeatConfig({
      kind: 'custom',
      unit: 'day',
      every: 10,
      startDate: '2026-02-01'
    });
    expect(Recurrence.nextDueOnOrAfter('2026-02-01', r)).toBe('2026-02-01');
    expect(Recurrence.nextDueOnOrAfter('2026-02-05', r)).toBe('2026-02-11');
    expect(Recurrence.nextDueAfter('2026-02-11', r)).toBe('2026-02-21');
  });

  it('validiert ungültige Intervalle', () => {
    expect(() =>
      Recurrence.normalizeRepeatConfig({
        kind: 'monthly',
        startDate: '2026-01-10',
        dayOfMonth: 31,
        intervalMonths: 1
      })
    ).toThrow();
  });

  it('ensureTaskNextDue springt bei vergangener storedNextDue weiter (wöchentlich)', () => {
    const task = {
      id: 1,
      repeat: { kind: 'weekly', startDate: '2026-05-04', daysOfWeek: [2], intervalWeeks: 1 },
      nextDue: '2026-05-06',
      lastCompletedDue: null
    };
    const result = Recurrence.ensureTaskNextDue(task, '2026-05-13');
    expect(result.nextDue).toBe('2026-05-13');
  });

  it('ensureTaskNextDue springt bei mehrmals-pro-Woche zum nächsten Tag', () => {
    const task = {
      id: 2,
      repeat: { kind: 'weekly', startDate: '2026-05-04', daysOfWeek: [0, 1, 4], intervalWeeks: 1 },
      nextDue: '2026-05-11',
      lastCompletedDue: null
    };
    const result = Recurrence.ensureTaskNextDue(task, '2026-05-12');
    expect(result.nextDue).toBe('2026-05-12');
  });

  it('ensureTaskNextDue behält zukünftige storedNextDue', () => {
    const task = {
      id: 3,
      repeat: { kind: 'monthly', startDate: '2026-01-01', dayOfMonth: 15, intervalMonths: 1 },
      nextDue: '2026-05-15',
      lastCompletedDue: null
    };
    const result = Recurrence.ensureTaskNextDue(task, '2026-05-10');
    expect(result.nextDue).toBe('2026-05-15');
  });

  it('ensureTaskNextDue mit lastCompletedDue (completed task)', () => {
    const task = {
      id: 4,
      repeat: { kind: 'weekly', startDate: '2026-05-04', daysOfWeek: [2], intervalWeeks: 1 },
      nextDue: '2026-05-20',
      lastCompletedDue: '2026-05-13'
    };
    const result = Recurrence.ensureTaskNextDue(task, '2026-05-20');
    expect(result.nextDue).toBe('2026-05-20');
  });

  it('ensureTaskNextDue mit biweekly und vergangener storedNextDue', () => {
    const task = {
      id: 5,
      repeat: { kind: 'weekly', startDate: '2026-05-04', daysOfWeek: [0], intervalWeeks: 2 },
      nextDue: '2026-05-04',
      lastCompletedDue: null
    };
    const result = Recurrence.ensureTaskNextDue(task, '2026-05-11');
    expect(result.nextDue).toBe('2026-05-18');
  });

  it('ensureTaskNextDue mit custom-intervall (alle 3 Tage) und vergangener storedNextDue', () => {
    const task = {
      id: 6,
      repeat: { kind: 'custom', unit: 'day', every: 3, startDate: '2026-05-01' },
      nextDue: '2026-05-07',
      lastCompletedDue: null
    };
    const result = Recurrence.ensureTaskNextDue(task, '2026-05-10');
    expect(result.nextDue).toBe('2026-05-10');
  });

  it('ensureTaskNextDue mit keiner storedNextDue berechnet von today', () => {
    const task = {
      id: 7,
      repeat: { kind: 'weekly', startDate: '2026-05-04', daysOfWeek: [2], intervalWeeks: 1 },
      nextDue: null,
      lastCompletedDue: null
    };
    const result = Recurrence.ensureTaskNextDue(task, '2026-05-12');
    expect(result.nextDue).toBe('2026-05-13');
  });

  it('ensureTaskNextDue mit none-repeat gibt nextDue null', () => {
    const task = {
      id: 8,
      repeat: { kind: 'none' },
      nextDue: '2026-05-13',
      lastCompletedDue: null
    };
    const result = Recurrence.ensureTaskNextDue(task, '2026-05-12');
    expect(result.nextDue).toBeNull();
  });
});

