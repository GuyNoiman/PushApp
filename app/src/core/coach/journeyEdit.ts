/**
 * journeyEdit — the language-free MODEL of a coach-led Journey edit (task J1). It owns three things,
 * all pure functions/types over the domain (no React, no UI, no vendor imports):
 *
 *   • {@link JourneyEdit}  — the validated, structured diff the coach proposes and
 *     {@link ../engines/JourneyEngine JourneyEngine.updateJourney} enacts in place (preserving Step
 *     ids, check-in history and XP). Every field is OPTIONAL; an empty object means "nothing to do".
 *   • {@link EditChange}   — a language-free description of ONE change, the ONLY thing the approval
 *     card renders from (via i18n interpolation). The card NEVER shows raw model prose.
 *   • {@link extractJourneyEdit} — the defensive parser (modelled on `extractGoals`): it reads the
 *     understanding model's strict JSON and VALIDATES every field against the REAL Journey — an
 *     unknown Step id is dropped, an unknown rhythm/cadence ignored, an empty/unparseable answer
 *     yields an empty edit — so the coach can never mutate something the user did not describe.
 *   • {@link summarizeEdit} — turns a validated edit into the {@link EditChange}[] the card shows.
 *
 * SECURITY-PRIVACY G1: the change text and the resulting edit are ON-DEVICE-ONLY raw signal — this
 * module never logs them and never widens what may leave the device. The {@link JourneyEditContext}
 * is a small on-device projection of the Journey the coach is editing.
 *
 * Pure TypeScript — no React, no UI, no vendor imports.
 */
import type { Cadence, Rhythm } from '../types/domain';

/** The valid {@link Rhythm} values, used to reject anything the model invents. */
const RHYTHMS: readonly Rhythm[] = ['daily', 'few-times-week', 'weekly'];
/** The valid {@link Cadence} values, used to reject anything the model invents. */
const CADENCES: readonly Cadence[] = ['once', 'daily', 'weekly'];

/** A new Step the edit adds (built through the engine's shared `makeStep`). */
export interface AddStepEdit {
  title: string;
  description?: string;
  cadence?: Cadence;
}

/** An in-place change to an EXISTING Step, addressed by its id. */
export interface EditStepEdit {
  stepId: string;
  title?: string;
  description?: string;
  cadence?: Cadence;
}

/**
 * The validated, structured diff a coach edit produces. Every field is OPTIONAL — only the parts the
 * user actually asked to change are present. Applied in place by
 * {@link ../engines/JourneyEngine JourneyEngine.updateJourney}.
 */
export interface JourneyEdit {
  title?: string;
  why?: string[];
  rhythm?: Rhythm;
  durationDays?: number;
  addSteps?: AddStepEdit[];
  editSteps?: EditStepEdit[];
  removeStepIds?: string[];
}

/**
 * A single, language-free change the approval card renders from. It carries only the SCALARS/enums a
 * localized template needs — never model prose. The card maps each `kind` to a `t()` key with
 * interpolation (e.g. `coach.edit.change.rename` with `{ title }`).
 */
export type EditChange =
  | { kind: 'rename'; title: string }
  | { kind: 'why'; count: number }
  | { kind: 'rhythm'; rhythm: Rhythm }
  | { kind: 'duration'; durationDays: number }
  | { kind: 'addStep'; title: string }
  | { kind: 'editStep'; title: string }
  | { kind: 'removeStep'; title: string };

/** A small on-device projection of ONE Step, for validating an edit against the real Journey. */
export interface JourneyEditStepContext {
  id: string;
  title: string;
  description?: string;
  cadence: Cadence;
  done: boolean;
  dropped: boolean;
}

/** The on-device projection of the Journey being edited — everything the parser validates against. */
export interface JourneyEditContext {
  id: string;
  title: string;
  why: string[];
  rhythm: Rhythm;
  durationDays: number;
  steps: JourneyEditStepContext[];
}

/** A defensive Rhythm guard — the model must return one of the known values, else it is ignored. */
function isRhythm(value: unknown): value is Rhythm {
  return typeof value === 'string' && (RHYTHMS as readonly string[]).includes(value);
}

/** A defensive Cadence guard — an unknown cadence is dropped rather than trusted. */
function isCadence(value: unknown): value is Cadence {
  return typeof value === 'string' && (CADENCES as readonly string[]).includes(value);
}

/** A trimmed non-empty string, or undefined — so the parser never stores blank titles/descriptions. */
function cleanString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** A finite, strictly-positive number, or undefined (rejects 0, negatives, NaN, non-numbers). */
function positiveNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

/** Validate the `why` field: an array of non-empty strings (or a single string), else undefined. */
function cleanWhy(value: unknown): string[] | undefined {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? [value] : undefined;
  if (!raw) return undefined;
  const lines = raw.map(cleanString).filter((l): l is string => l !== undefined);
  return lines.length > 0 ? lines : undefined;
}

/** Validate one `addSteps` entry: a non-empty title is required; description/cadence are optional. */
function cleanAddStep(value: unknown): AddStepEdit | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const rec = value as { title?: unknown; description?: unknown; cadence?: unknown };
  const title = cleanString(rec.title);
  if (!title) return undefined; // never add a nameless Step
  const description = cleanString(rec.description);
  return {
    title,
    ...(description ? { description } : {}),
    ...(isCadence(rec.cadence) ? { cadence: rec.cadence } : {}),
  };
}

/**
 * Validate one `editSteps` entry against the real Journey: the `stepId` MUST name a Step in
 * `context` (an unknown or cross-Journey id is dropped) and at least one field must actually change.
 */
function cleanEditStep(value: unknown, context: JourneyEditContext): EditStepEdit | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const rec = value as { stepId?: unknown; title?: unknown; description?: unknown; cadence?: unknown };
  const stepId = typeof rec.stepId === 'string' ? rec.stepId : '';
  if (!context.steps.some((s) => s.id === stepId)) return undefined; // guard unknown/cross-Journey ids
  const title = cleanString(rec.title);
  const description = cleanString(rec.description);
  const cadence = isCadence(rec.cadence) ? rec.cadence : undefined;
  if (title === undefined && description === undefined && cadence === undefined) return undefined;
  return {
    stepId,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(cadence ? { cadence } : {}),
  };
}

/**
 * Read the understanding model's answer into a validated {@link JourneyEdit}. Expects a
 * `{ title?, why?, rhythm?, durationDays?, addSteps?, editSteps?, removeStepIds? }` JSON object; each
 * field is validated DEFENSIVELY against `context` (the real Journey): an unknown Step id is dropped,
 * an unknown rhythm/cadence ignored, blank titles rejected. Returns an EMPTY edit `{}` when the answer
 * is unparseable or carries nothing usable — so the coach never mutates something the user did not
 * describe, and a transport/LLM failure (handled upstream) degrades to the same safe no-op.
 */
export function extractJourneyEdit(text: string, context: JourneyEditContext): JourneyEdit {
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (!objectMatch) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(objectMatch[0]);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== 'object') return {};
  const rec = parsed as Record<string, unknown>;

  const edit: JourneyEdit = {};

  const title = cleanString(rec.title);
  if (title) edit.title = title;

  const why = cleanWhy(rec.why);
  if (why) edit.why = why;

  if (isRhythm(rec.rhythm)) edit.rhythm = rec.rhythm;

  const durationDays = positiveNumber(rec.durationDays);
  if (durationDays !== undefined) edit.durationDays = Math.round(durationDays);

  if (Array.isArray(rec.addSteps)) {
    const adds = rec.addSteps.map(cleanAddStep).filter((s): s is AddStepEdit => s !== undefined);
    if (adds.length > 0) edit.addSteps = adds;
  }

  if (Array.isArray(rec.editSteps)) {
    const edits = rec.editSteps
      .map((e) => cleanEditStep(e, context))
      .filter((e): e is EditStepEdit => e !== undefined);
    if (edits.length > 0) edit.editSteps = edits;
  }

  if (Array.isArray(rec.removeStepIds)) {
    const removes = rec.removeStepIds.filter(
      (id): id is string => typeof id === 'string' && context.steps.some((s) => s.id === id),
    );
    if (removes.length > 0) edit.removeStepIds = removes;
  }

  return edit;
}

/**
 * Turn a validated {@link JourneyEdit} into the language-free {@link EditChange}[] the approval card
 * renders. Step-level changes resolve their DISPLAY title from `context` (the current Journey) so the
 * card can name a removed/edited Step without the caller re-reading state. Pure and order-stable.
 */
export function summarizeEdit(edit: JourneyEdit, context: JourneyEditContext): EditChange[] {
  const changes: EditChange[] = [];

  if (edit.title !== undefined) changes.push({ kind: 'rename', title: edit.title });
  if (edit.why !== undefined) changes.push({ kind: 'why', count: edit.why.length });
  if (edit.rhythm !== undefined) changes.push({ kind: 'rhythm', rhythm: edit.rhythm });
  if (edit.durationDays !== undefined) changes.push({ kind: 'duration', durationDays: edit.durationDays });

  for (const add of edit.addSteps ?? []) {
    changes.push({ kind: 'addStep', title: add.title });
  }
  for (const change of edit.editSteps ?? []) {
    const current = context.steps.find((s) => s.id === change.stepId);
    changes.push({ kind: 'editStep', title: change.title ?? current?.title ?? '' });
  }
  for (const stepId of edit.removeStepIds ?? []) {
    const current = context.steps.find((s) => s.id === stepId);
    changes.push({ kind: 'removeStep', title: current?.title ?? '' });
  }

  return changes;
}

/** Whether a validated edit actually changes anything (drives the approval card's presence). */
export function isEmptyEdit(edit: JourneyEdit): boolean {
  return (
    edit.title === undefined &&
    edit.why === undefined &&
    edit.rhythm === undefined &&
    edit.durationDays === undefined &&
    !edit.addSteps?.length &&
    !edit.editSteps?.length &&
    !edit.removeStepIds?.length
  );
}
