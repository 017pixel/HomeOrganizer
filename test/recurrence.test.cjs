const { describe, it, expect } = require('vitest');
const Recurrence = require('../js/logic/recurrence.js');

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

  it('unterstützt alle-2-Wochen-Logik (Biweekly)', () => {
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
});

