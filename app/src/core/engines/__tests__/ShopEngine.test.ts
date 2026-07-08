/**
 * ShopEngine unit tests — pure TS. Verifies Coins are spent (never earned) here,
 * that purchases are validated (afford / not already owned), and that equipping
 * an owned cosmetic works while equipping an unowned one does not
 * (Engineering Bible §18 + §3 configuration-before-code).
 */
import type { ShopItem } from '../../config/shopItems';
import { EventBus } from '../../events/EventBus';
import type { ItemEquipped, ItemPurchased } from '../../events/events';
import type { AppState, Buddy } from '../../types/domain';
import { ShopEngine } from '../ShopEngine';

const ITEMS: ShopItem[] = [
  { id: 'hat', name: 'Hat', price: 30, kind: 'accessory', value: '🎩' },
  { id: 'tint', name: 'Tint', price: 15, kind: 'tint', value: '#F6E4C1' },
];

function makeBuddy(overrides: Partial<Buddy> = {}): Buddy {
  return {
    name: 'Pip',
    xp: 0,
    level: 1,
    stage: 'egg',
    coins: 100,
    ownedCosmetics: [],
    equippedCosmetic: null,
    ...overrides,
  };
}

function emptyState(buddy: Buddy): AppState {
  return { dreams: [], journeys: [], buddy, checkIns: [] };
}

function setup(buddy: Buddy = makeBuddy()) {
  const bus = new EventBus();
  const state = emptyState(buddy);
  const engine = new ShopEngine(bus, () => state, ITEMS);
  const purchased: ItemPurchased[] = [];
  const equipped: ItemEquipped[] = [];
  bus.on('ItemPurchased', (event) => purchased.push(event));
  bus.on('ItemEquipped', (event) => equipped.push(event));
  return { engine, state, purchased, equipped };
}

describe('ShopEngine', () => {
  it('purchases a cosmetic: deducts Coins, adds to owned, emits ItemPurchased', () => {
    const { engine, state, purchased } = setup();

    const ok = engine.purchase('hat');

    expect(ok).toBe(true);
    expect(state.buddy.coins).toBe(70); // 100 − 30
    expect(state.buddy.ownedCosmetics).toEqual(['hat']);
    expect(purchased).toHaveLength(1);
    expect(purchased[0].itemId).toBe('hat');
    expect(purchased[0].coinsSpent).toBe(30);
    expect(purchased[0].balance).toBe(70);
  });

  it('blocks a purchase when the Buddy cannot afford it', () => {
    const { engine, state, purchased } = setup(makeBuddy({ coins: 10 }));

    const ok = engine.purchase('hat');

    expect(ok).toBe(false);
    expect(state.buddy.coins).toBe(10);
    expect(state.buddy.ownedCosmetics).toEqual([]);
    expect(purchased).toHaveLength(0);
  });

  it('blocks buying a cosmetic that is already owned', () => {
    const { engine, state, purchased } = setup(makeBuddy({ ownedCosmetics: ['hat'] }));

    const ok = engine.purchase('hat');

    expect(ok).toBe(false);
    expect(state.buddy.coins).toBe(100); // unchanged — never charged twice
    expect(purchased).toHaveLength(0);
  });

  it('ignores an unknown item id', () => {
    const { engine, purchased } = setup();

    expect(engine.purchase('nope')).toBe(false);
    expect(purchased).toHaveLength(0);
  });

  it('equips an owned cosmetic and emits ItemEquipped', () => {
    const { engine, state, equipped } = setup(makeBuddy({ ownedCosmetics: ['hat'] }));

    const ok = engine.equip('hat');

    expect(ok).toBe(true);
    expect(state.buddy.equippedCosmetic).toBe('hat');
    expect(equipped).toHaveLength(1);
    expect(equipped[0].itemId).toBe('hat');
  });

  it('will not equip a cosmetic that is not owned', () => {
    const { engine, state, equipped } = setup();

    const ok = engine.equip('hat');

    expect(ok).toBe(false);
    expect(state.buddy.equippedCosmetic).toBeNull();
    expect(equipped).toHaveLength(0);
  });

  it('unequips the current cosmetic, emitting ItemEquipped(null)', () => {
    const { engine, state, equipped } = setup(
      makeBuddy({ ownedCosmetics: ['hat'], equippedCosmetic: 'hat' }),
    );

    engine.unequip();

    expect(state.buddy.equippedCosmetic).toBeNull();
    expect(equipped).toHaveLength(1);
    expect(equipped[0].itemId).toBeNull();
  });
});
