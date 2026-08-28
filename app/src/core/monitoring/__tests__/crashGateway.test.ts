/**
 * The crash gateway's contract — asserted, rather than trusted to a comment.
 *
 * Sentry's own quickstart enables session replay, PII, console breadcrumbs and performance tracing.
 * Every one of those is named in §11.4 as forbidden. So the options are a value this test reads,
 * and `beforeSend` is run for real against events shaped the way the SDK actually shapes them.
 */
import { beforeSend, NullCrashGateway, REQUIRED_SENTRY_OPTIONS } from '../CrashGateway';

describe('the options every initialisation must use', () => {
  it('turns off everything §11.4 forbids, by name', () => {
    expect(REQUIRED_SENTRY_OPTIONS.sendDefaultPii).toBe(false);
    expect(REQUIRED_SENTRY_OPTIONS.replaysSessionSampleRate).toBe(0);
    expect(REQUIRED_SENTRY_OPTIONS.replaysOnErrorSampleRate).toBe(0);
    expect(REQUIRED_SENTRY_OPTIONS.tracesSampleRate).toBe(0);
    expect(REQUIRED_SENTRY_OPTIONS.enableAutoBreadcrumbTracking).toBe(false);
    expect(REQUIRED_SENTRY_OPTIONS.attachScreenshot).toBe(false);
    expect(REQUIRED_SENTRY_OPTIONS.attachViewHierarchy).toBe(false);
    expect(REQUIRED_SENTRY_OPTIONS.includeLocalVariables).toBe(false);
  });
});

describe('beforeSend — the last thing that runs before bytes leave', () => {
  it('keeps a real crash reportable', () => {
    const out = beforeSend({
      type: 'TypeError',
      level: 'fatal',
      stack: 'at doThing (src/x.ts:1:1)',
      release: '1.0.0',
      environment: 'production',
      platform: 'ios',
      event_id: 'abc',
      transaction: '/journey/xyz789',
    })!;
    expect(out.errorClass).toBe('TypeError');
    expect(out.fatal).toBe(true);
    expect(out.screen).toBe('/journey/:id');
    expect(out.appVersion).toBe('1.0.0');
  });

  it('drops every context the SDK adds that we never asked for', () => {
    const out = beforeSend({
      type: 'Error',
      stack: 'at f',
      // Exactly the shapes Sentry populates by default.
      user: { email: 'CANARY_EMAIL', username: 'CANARY_HANDLE', ip_address: '1.2.3.4' },
      contexts: { device: { name: 'CANARY_DEVICE_NAME' }, app: { app_name: 'x' } },
      breadcrumbs: [{ message: 'CANARY_BREADCRUMB_tapped_Save' }],
      request: { url: 'https://x/y?invite=CANARY_TOKEN', headers: { Authorization: 'CANARY_TOKEN' } },
      extra: { journeyTitle: 'CANARY_JOURNEY' },
      message: 'CANARY_MESSAGE_the_users_own_sentence',
    })!;
    const payload = JSON.stringify(out);
    for (const canary of ['CANARY_EMAIL', 'CANARY_HANDLE', '1.2.3.4', 'CANARY_DEVICE_NAME',
      'CANARY_BREADCRUMB', 'CANARY_TOKEN', 'CANARY_JOURNEY', 'CANARY_MESSAGE']) {
      expect(`${canary}:${payload.includes(canary)}`).toBe(`${canary}:false`);
    }
  });

  it('never sends the exception MESSAGE, which is where the user’s text ends up', () => {
    // `throw new Error(\`Could not plan "${journey.title}"\`)` is an ordinary thing to write, and it
    // puts a Journey title in the message. So the message is not among the fields read at all.
    const out = beforeSend({ type: 'Error', message: 'Could not plan "drink a protein shake"', stack: 'at f' })!;
    expect(JSON.stringify(out)).not.toContain('protein');
  });

  it('sends NOTHING when there is nothing worth sending', () => {
    expect(beforeSend({ timestamp: 1 })).toBeNull();
    expect(beforeSend({})).toBeNull();
  });

  it('strips the route parameters off the screen it reports', () => {
    expect(beforeSend({ type: 'E', stack: 's', transaction: '/coach?firstRun=1' })!.screen).toBe('/coach');
  });
});

describe('the null gateway', () => {
  it('is inert, which is the normal state without a DSN', () => {
    expect(NullCrashGateway.enabled).toBe(false);
    expect(() => {
      NullCrashGateway.setScreen('/x');
      NullCrashGateway.captureHandled(new Error('boom'));
    }).not.toThrow();
  });
});
