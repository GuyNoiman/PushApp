import {
  DEFAULT_REMINDER_HOUR,
  DEFAULT_REMINDER_MINUTE,
  resolveReminderRule,
} from '../reminderView';
import type { ReminderRule, ReminderTrigger } from '../../types/domain';

function fixedTrigger(hour: number, minute: number, weekdays?: number[]): ReminderTrigger {
  return { kind: 'fixedTime', hour, minute, ...(weekdays ? { weekdays } : {}) };
}

function rule(partial: Partial<ReminderRule> & { trigger?: ReminderTrigger }): ReminderRule {
  return {
    id: 'r1',
    journeyId: 'j1',
    trigger: partial.trigger ?? fixedTrigger(8, 30),
    title: 'Title',
    body: 'Body',
    enabled: true,
    scheduledNotificationIds: [],
    ...partial,
  };
}

describe('resolveReminderRule', () => {
  it('no rule → Off at the default time, no ruleId', () => {
    const v = resolveReminderRule(undefined);
    expect(v).toEqual({
      mode: 'off',
      hour: DEFAULT_REMINDER_HOUR,
      minute: DEFAULT_REMINDER_MINUTE,
      weekdays: [],
    });
    expect(v.ruleId).toBeUndefined();
  });

  it('enabled rule without a mode → derives Fixed and carries the time + weekdays', () => {
    const v = resolveReminderRule(rule({ enabled: true, trigger: fixedTrigger(7, 15, [1, 2, 3]) }));
    expect(v).toEqual({ ruleId: 'r1', mode: 'fixed', hour: 7, minute: 15, weekdays: [1, 2, 3] });
  });

  it('disabled rule without a mode → derives Off', () => {
    const v = resolveReminderRule(rule({ enabled: false }));
    expect(v.mode).toBe('off');
    expect(v.ruleId).toBe('r1');
  });

  it('a stored mode wins over the enabled flag (smart is preserved)', () => {
    expect(resolveReminderRule(rule({ mode: 'smart', enabled: true })).mode).toBe('smart');
    expect(resolveReminderRule(rule({ mode: 'off', enabled: true })).mode).toBe('off');
    expect(resolveReminderRule(rule({ mode: 'fixed', enabled: false })).mode).toBe('fixed');
  });

  it('fixedTime without weekdays → every day (empty array)', () => {
    expect(resolveReminderRule(rule({ trigger: fixedTrigger(9, 0) })).weekdays).toEqual([]);
  });
});
