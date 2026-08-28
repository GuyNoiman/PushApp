/**
 * The canary tests (`Operational_Monitoring_Admin_Console_PRD` §11.5 — "Proof, not promise").
 *
 * Every prohibited category from §11.4 is planted as a distinctive string, pushed through the
 * scrubber, and the FINAL SERIALIZED payload is searched for it. A release fails if any canary
 * survives.
 *
 * They are written before the vendor exists on purpose. A crash reporter is an afternoon; the thing
 * that makes it safe to add is a rule it cannot get around, and a rule with no test is a comment.
 */
import { ALLOWED_KEYS, bucket, safeScreen, safeStack, scrubEvent } from '../telemetryContract';

/** One planted string per prohibited category in §11.4. Distinctive so a match cannot be accidental. */
const CANARIES: Record<string, string> = {
  coachTranscript: 'CANARY_COACH_I_feel_stuck_at_work',
  journeyTitle: 'CANARY_JOURNEY_drink_a_protein_shake',
  stepTitle: 'CANARY_STEP_lace_up_and_walk',
  reasonNote: 'CANARY_REASON_I_was_ill_all_week',
  toolAnswer: 'CANARY_TOOL_my_best_possible_year_text',
  mirrorContribution: 'CANARY_MIRROR_what_your_friend_wrote',
  messagePlaintext: 'CANARY_DM_see_you_at_eight',
  notificationBody: 'CANARY_NOTIFICATION_time_for_your_step',
  displayName: 'CANARY_NAME_Guy_Noiman',
  email: 'CANARY_EMAIL_someone@example.com',
  birthDate: 'CANARY_BIRTHDATE_1994-01-02',
  handle: 'CANARY_HANDLE_quiet_otter_9019',
  authToken: 'CANARY_TOKEN_eyJhbGciOiJIUzI1NiJ9',
  deepLinkQuery: 'CANARY_DEEPLINK_invite_abc123',
  clipboard: 'CANARY_CLIPBOARD_pasted_text',
  requestBody: 'CANARY_BODY_prompt_dots',
  storageDump: 'CANARY_STORAGE_pushapp_profile',
  breadcrumb: 'CANARY_BREADCRUMB_tapped_Save',
};

const serialize = (o: unknown) => JSON.stringify(o);

describe('the canaries — §11.5', () => {
  it('survives none of them, however they are nested', () => {
    const event = {
      errorClass: 'TypeError',
      handled: true,
      ...CANARIES,
      extra: { ...CANARIES, nested: { deeper: CANARIES } },
      contexts: { app: CANARIES },
      tags: CANARIES,
      user: { id: CANARIES.handle, email: CANARIES.email, username: CANARIES.displayName },
      breadcrumbs: Object.values(CANARIES).map((message) => ({ message })),
      request: { url: `https://x/y?${CANARIES.deepLinkQuery}`, data: CANARIES.requestBody },
    };

    const payload = serialize(scrubEvent(event));
    for (const [category, canary] of Object.entries(CANARIES)) {
      expect(`${category}:${payload.includes(canary)}`).toBe(`${category}:false`);
    }
  });

  it('keeps what §11.3 actually allows, so the report is still worth having', () => {
    const scrubbed = scrubEvent({
      errorClass: 'TypeError',
      errorCode: 'E_NULL',
      handled: false,
      fatal: true,
      appVersion: '1.0.0',
      platform: 'ios',
      osVersion: '18.2',
      installationId: 'inst_9f2c',
      screen: '/journey/:id',
      count: 3,
      durationBucket: '<1000ms',
      featureFlags: { smartTiming: true },
    });
    expect(scrubbed.errorClass).toBe('TypeError');
    expect(scrubbed.fatal).toBe(true);
    expect(scrubbed.installationId).toBe('inst_9f2c');
    expect(scrubbed.featureFlags).toEqual({ smartTiming: true });
  });

  it('drops an unknown key even when it looks harmless', () => {
    expect(scrubEvent({ errorClass: 'X', somethingNew: 'probably fine' })).toEqual({ errorClass: 'X' });
  });

  it('refuses structure under an allowed key rather than walking into it', () => {
    expect(scrubEvent({ count: { nested: CANARIES.journeyTitle } })).toEqual({});
    expect(scrubEvent({ stack: ['frame', CANARIES.coachTranscript] })).toEqual({});
  });

  it('caps a string so a transcript cannot ride an allowed key', () => {
    const long = 'x'.repeat(5000);
    expect(String(scrubEvent({ errorClass: long }).errorClass)).toHaveLength(512);
  });

  it('the allowlist is exactly §11.3, with nothing quietly added', () => {
    expect(ALLOWED_KEYS).toHaveLength(25);
    for (const forbidden of ['extra', 'contexts', 'tags', 'user', 'breadcrumbs', 'request', 'message']) {
      expect(ALLOWED_KEYS).not.toContain(forbidden);
    }
  });
});

describe('safeScreen — an identifier, never route parameters', () => {
  it('reduces every id to its shape', () => {
    expect(safeScreen('/journey/abc123')).toBe('/journey/:id');
    expect(safeScreen('/friend/9f2c-4b1a')).toBe('/friend/:id');
    expect(safeScreen('/dream/550e8400-e29b-41d4-a716-446655440000')).toBe('/dream/:id');
  });

  it('drops the query string, which is where invitations and tokens live', () => {
    expect(safeScreen('/coach?firstRun=1&invite=secret')).toBe('/coach');
    // An unknown segment is masked either way, which is the allowlist doing its job.
    expect(safeScreen('/x#frag')).toBe('/:id');
    expect(safeScreen('/settings/profile?id=secret')).toBe('/settings/profile');
  });

  it('keeps a plain route readable', () => {
    expect(safeScreen('/settings/notifications')).toBe('/settings/notifications');
    expect(safeScreen('/')).toBe('/');
  });
});

describe('safeStack and bucket', () => {
  it('strips absolute paths, which carry a username', () => {
    const stack = 'at f (/Users/guynoiman/Documents/PushApp/app/src/x.ts:1:1)';
    expect(safeStack(stack)).not.toContain('guynoiman');
    expect(safeStack(stack)).toContain('x.ts');
  });

  it('caps the frame count', () => {
    expect(safeStack(Array.from({ length: 200 }, () => 'at f').join('\n'))!.split('\n')).toHaveLength(40);
  });

  it('buckets a duration instead of reporting it exactly', () => {
    expect(bucket(42)).toBe('<100ms');
    expect(bucket(2500)).toBe('<3000ms');
    expect(bucket(120000)).toBe('>=30000ms');
    expect(bucket(-1)).toBe('unknown');
  });
});
