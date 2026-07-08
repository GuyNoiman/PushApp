/**
 * EventBus — a tiny synchronous, typed pub/sub. No React, no vendor imports.
 * Handlers registered for a type receive exactly that event shape.
 */
import type { DomainEvent, DomainEventType, EventOf } from './events';

type AnyHandler = (event: DomainEvent) => void;

export class EventBus {
  private readonly handlers = new Map<DomainEventType, Set<AnyHandler>>();

  on<T extends DomainEventType>(type: T, handler: (event: EventOf<T>) => void): void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler as AnyHandler);
  }

  off<T extends DomainEventType>(type: T, handler: (event: EventOf<T>) => void): void {
    this.handlers.get(type)?.delete(handler as AnyHandler);
  }

  emit(event: DomainEvent): void {
    const set = this.handlers.get(event.type);
    if (!set) return;
    // Copy so handlers may (un)subscribe during dispatch without disturbing this run.
    for (const handler of [...set]) handler(event);
  }
}
