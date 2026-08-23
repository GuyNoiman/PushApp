/**
 * MockReminderEngine — a headless stand-in for the real {@link ../../engines/ReminderEngine} used
 * by the closed-loop simulation (S1.14). The real engine is the only file that touches
 * expo-notifications; in a pure Node simulation we don't want the OS, so this mock records what
 * the {@link ../../engines/CommunicationScheduler} ASKED it to schedule/cancel instead of talking
 * to a device. It implements exactly the methods the scheduler calls (`scheduleRule`, `cancel`,
 * `cancelRepeating`), so it can be passed where a ReminderEngine is expected.
 *
 * Pure TypeScript — no React, no UI, no vendor imports.
 */
import type { ReminderRule } from '../../types/domain';

/** One fixed-time notification the scheduler asked the engine to schedule. */
export interface ScheduledNudge {
  ruleId: string;
  /** JS weekdays (0=Sun … 6=Sat), or undefined for a plain daily. */
  weekdays?: number[];
  hour: number;
  minute: number;
}

export class MockReminderEngine {
  private counter = 0;
  /** Every notification scheduled since the last {@link drain}. */
  private pending: ScheduledNudge[] = [];
  /** Ids that were cancelled (for eyeballing the teardown half of a reconcile). */
  readonly cancelled: string[] = [];

  /** Record what one rule would schedule and return synthetic OS ids. */
  async scheduleRule(rule: ReminderRule): Promise<string[]> {
    if (!rule.enabled) return [];
    const t = rule.trigger;
    if (t.kind !== 'fixedTime') return []; // dormant seams schedule nothing in the sim
    this.pending.push({ ruleId: rule.id, weekdays: t.weekdays, hour: t.hour, minute: t.minute });
    return [`notif_${this.counter++}`];
  }

  /** Record a cancel (no real OS call). */
  async cancel(id: string): Promise<void> {
    this.cancelled.push(id);
  }

  /**
   * The pre-schedule sweep. In the simulation there is no OS holding notifications from a previous
   * launch, so there is nothing to find — but the method has to exist, because the scheduler calls
   * it on every reconcile and an absent one would make the sim diverge from the device.
   */
  async cancelRepeating(): Promise<number> {
    this.cancelled.push('sweep');
    return 0;
  }

  /** Take and clear everything scheduled since the last call — one reconcile's worth. */
  drain(): ScheduledNudge[] {
    const out = this.pending;
    this.pending = [];
    return out;
  }
}
