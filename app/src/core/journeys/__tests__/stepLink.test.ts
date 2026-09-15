/**
 * stepLink — the shared reading of a Step's in-app destination.
 *
 * This is the rule that decides whether a tap GOES somewhere or asks how the Step went, and it is
 * now read by every surface that shows a Step. The cases below are the ones that matter: the real
 * intro-Journey links must all pass, and anything that is not an in-app path must fall back to "no
 * link" rather than be handed to the router.
 */
import { stepLinkOf, stepOpensScreen } from '../stepLink';
import { INTRO_JOURNEY_LINKS } from '../../onboarding/introJourney';

describe('stepLinkOf', () => {
  it('accepts every link the intro Journey actually ships', () => {
    for (const link of INTRO_JOURNEY_LINKS) {
      expect(stepLinkOf({ appLink: link })).toBe(link);
    }
  });

  it('reads a Step with no appLink as no destination — the ordinary case, not an error', () => {
    expect(stepLinkOf({})).toBeUndefined();
    expect(stepLinkOf(undefined)).toBeUndefined();
    expect(stepOpensScreen({})).toBe(false);
  });

  it('treats an empty or blank appLink as absent', () => {
    expect(stepLinkOf({ appLink: '' })).toBeUndefined();
    expect(stepLinkOf({ appLink: '   ' })).toBeUndefined();
  });

  it('refuses anything that is not an in-app path, so it is never handed to the router', () => {
    expect(stepLinkOf({ appLink: 'https://example.com' })).toBeUndefined();
    expect(stepLinkOf({ appLink: 'mailto:someone@example.com' })).toBeUndefined();
    expect(stepLinkOf({ appLink: 'javascript:alert(1)' })).toBeUndefined();
    expect(stepLinkOf({ appLink: '//example.com/settings' })).toBeUndefined();
    expect(stepLinkOf({ appLink: 'settings/profile' })).toBeUndefined();
    expect(stepLinkOf({ appLink: '/settings\\profile' })).toBeUndefined();
  });

  it('passes an unknown-but-in-app path through — a dead route is answered by the router, not here', () => {
    // Deliberate: this file must not hold a second copy of the route tree, which would go stale the
    // first time a screen is renamed. `useStepLink` is where a route that goes nowhere fails quietly.
    expect(stepLinkOf({ appLink: '/settings/a-screen-we-removed' })).toBe('/settings/a-screen-we-removed');
  });
});
