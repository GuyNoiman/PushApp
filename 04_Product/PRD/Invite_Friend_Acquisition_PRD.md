# PRD — Invite Friend Acquisition

Status: **Approved for staged implementation (founder, 2026-08-14). The interim manual-share stage may
ship first; full automatic redemption remains a required follow-up and is blocked by real authentication,
backend linking, a stable web destination, and store distribution.**  
Stage: **MVP foundation / Commercial completion.**  
Owner: founder + AI product team.  
Related: authentication (E1), friendship requests (D1), Circle, account onboarding, notifications, universal
links/App Links, abuse prevention, privacy, store publication, and
`../../05_Research/Invite_Friend_Competitive_Research_2026-08-13.md`.

---

## 1. Purpose

Turn the currently inactive **Invite** action in the Circle header and the Journey Support Circle's non-user
invite action into one reliable way to invite a person to PushApp and create the requested pending social
actions after registration.

The feature must support:

1. a recipient who already has PushApp;
2. a recipient who must install and register first;
3. an interim share flow before post-install attribution is available.

An invitation may request friendship, Journey support, or both. Each becomes a separate pending request and is
never accepted automatically. The recipient retains independent accept/decline control for every relationship.

## 2. Product decisions

### 2.1 Approved attribution strategy

PushApp will own the invitation identity and use a staged, platform-aware approach:

1. **Interim:** system share sheet sends a download/landing link, inviter display context, and a short manual
   invitation code. The recipient installs and adds the inviter manually or redeems the code.
2. **App already installed:** the same HTTPS link opens PushApp through Universal Links/App Links and redeems
   the invitation after authentication.
3. **Android post-install:** use Google Play Install Referrer to recover the opaque invitation token and redeem
   it after registration.
4. **iOS post-install:** use the same short invitation code as the reliable baseline. The landing page preserves
   and prominently presents the code and explains where to enter it after installation.
5. **Commercial optimization:** evaluate a deferred-deep-link provider only after measuring meaningful iOS
   conversion loss caused by manual redemption.

Do not adopt Branch or another metered attribution SDK in the initial implementation. It adds a third-party
data processor, SDK and lifecycle dependency, and future cost without being required for a correct baseline.
Adoption later requires founder approval, cost review, security/privacy review, updated consent/disclosure,
and a provider-exit plan.

Firebase Dynamic Links is not an option: Google shut the service down on 2025-08-25.

### 2.2 One-time link, one invitation identity

The invitation URL contains only a random, opaque, server-issued token, for example:

> `https://<PushApp-domain>/invite/<opaque-token>`

It must not contain a user ID, email address, phone number, username, Journey, Dream, friend list, or other
personal data. The server resolves the token to the inviter only after validation.

The same invitation has a human-readable short code for manual recovery. The code is not derived from the
inviter's username or account identifier.

Each Invite action creates an invitation for **one authenticated recipient**. Link and code are two ways to
redeem that same invitation. The first successful redemption consumes it. A forwarded link cannot create an
unbounded stream of requests. Permanent personal referral/profile links are a separate future feature.

### 2.3 Automatic pending requests, never automatic relationships

After the recipient is authenticated and a valid invitation is redeemed, the backend creates the invitation's
pending actions. No extra “search by username” action is required.

Supported initial invitation purposes:

- **Friendship invite** — creates one pending friendship request;
- **Support Circle invite** — creates one pending Support Circle request for the specified Journey and bundle;
- **Combined invite** — creates both requests in the same server transaction.

Friendship and Support Circle requests are independent and appear simultaneously. The recipient may accept
both, either one, or neither. Friendship is not a prerequisite for becoming or remaining an Ally.

The recipient is clearly told who invited them and which requests were created. Existing consent remains
unchanged: each relationship requires explicit acceptance before it exists or exposes Journey information.

Redemption must not interrupt required registration or onboarding steps. If the invite is recovered before an
account exists, it remains pending until authentication and the minimum account identity are complete.

## 3. User flows

### 3.1 Inviter

1. User A taps **Invite** in Circle.
2. PushApp obtains or creates a valid invitation token and short code.
3. The system share sheet opens with localized copy, the HTTPS invitation link, and the code.
4. User A chooses any installed sharing channel.
5. PushApp may show the invitation as sent only if it can truthfully confirm sharing; opening or dismissing the
   share sheet is not a successful invite.

The inviter may open an Invite management surface later to copy again, revoke the current link, or create a
new one. Share recipients and external channel contents are not known to PushApp.

### 3.2 Recipient already has PushApp

1. User B taps the HTTPS invitation link.
2. Universal Link/App Link opens PushApp with the opaque token.
3. If B is signed out, the token is held locally until authentication finishes.
4. The backend validates and redeems it atomically.
5. The invitation's pending friendship and/or Support Circle requests are created.
6. B sees both applicable requests together and can decide on each independently.

### 3.3 Android recipient installs PushApp

1. The landing link routes B to Google Play with an opaque referrer value.
2. After installation and registration, PushApp retrieves the Install Referrer value.
3. The backend validates and redeems it once.
4. The invitation's pending request or requests from A appear for B.
5. If recovery fails, B can enter the short code manually.

### 3.4 iOS recipient installs PushApp

1. The link opens a PushApp landing page with App Store download action and the short code.
2. The page makes the code easy to copy and explains that it restores the invitation after registration.
3. After installation and registration, B enters or pastes the code in the invitation-recovery field.
4. The backend validates and redeems it once.
5. The invitation's pending request or requests from A appear for B.

An iOS deferred-deep-link provider may replace the manual step later, but the code remains an account-owned
recovery fallback even if a provider is adopted.

### 3.5 Interim before store-ready linking

The inactive Invite button may first open the system share sheet with:

- localized invitation copy;
- the best available landing/download URL;
- User A's `@username` for manual friendship search;
- later, the server-issued short code once its backend exists.

No attribution success is claimed in this phase. The recipient adds A through the existing username flow.

## 4. Invitation lifecycle

Recommended initial lifecycle:

- one new single-recipient invitation per Invite action;
- a maximum of one successful authenticated redemption per invitation;
- at most one pending friendship request may exist for the same inviter/recipient pair;
- successful redemption is idempotent per inviter/recipient pair;
- the inviter may revoke the link, immediately invalidating future redemption;
- unused links expire after **30 days** and may be regenerated;
- redemption after expiry/revocation shows a safe recovery action: enter another code or search by username;
- deleting or suspending the inviter invalidates the link;
- signing up through a link does not guarantee that the inviter still exists or can become a friend.

The 30-day expiry is an approved safe initial default and may be tuned from real invite-completion data.

## 5. Duplicate and relationship rules

When B redeems A's invitation:

- if A and B are already friends, open or confirm the existing relationship; create nothing;
- if A already sent B a pending request, show that request; create nothing;
- if B already sent A a pending request, surface the existing inbound request to A rather than create crossing
  duplicate requests;
- if either user blocked the other, reveal no relationship detail and reject safely;
- self-redemption is rejected;
- a declined request is not silently recreated by reopening the same token; a new explicit invite action is
  required under the friendship reinvite policy;
- account deletion permanently invalidates associated invitations.

For a combined invitation, duplicate or ineligible actions are evaluated independently. An existing friendship
does not prevent creation of a valid Support Circle request; an existing Ally relationship does not prevent a
valid friendship request. The server returns the resolved state of every requested action.

## 6. Security and anti-abuse

- Tokens use cryptographically secure randomness and are stored in a non-reversible or safely encrypted form.
- Redemption is server-authoritative and atomic.
- Apply rate limits per inviter, recipient account, device/app installation where lawful, IP risk signal, and
  time window without turning risk data into user profiling.
- Limit pending outbound friendship requests and repeated requests to recipients who decline or ignore them.
- Do not allow a link to bypass blocking, privacy, account-state, or friendship-policy checks.
- Validate all link parameters; malformed or unknown links perform no social action.
- Link previews and landing pages disclose only the inviter information approved for public invitation display.
- Avoid confirming whether an email, phone number, username, or account exists.
- Detect token enumeration, automated redemption, account farms, and repeated invite/revoke cycles.
- Provide report/block controls on the normal request surface.
- Invites do not award future XP, Achievements, or rewards merely for link clicks or installs; any reward system
  requires verified, abuse-resistant criteria in its own PRD.

## 7. Privacy and attribution

Store only what is necessary to operate and protect invitations:

- invitation ID/token digest;
- inviter account ID;
- created, expiry, revoked, and last-used timestamps;
- aggregate redemption count;
- recipient account ID only after authenticated redemption;
- platform and attribution method at coarse level;
- security/rate-limit state with bounded retention.

Do not place personal data in the URL or share text without the inviter seeing it first. Do not store who the
inviter selected in an external share sheet. Do not use address-book access for this feature.

Install attribution exists only to restore the requested social action. It is not permission for advertising,
cross-app tracking, contact discovery, or behavioral profiling. Provider adoption would require documenting
all data leaving PushApp and honoring deletion/export obligations.

## 8. Link and landing-page behavior

- Use one branded HTTPS domain controlled by PushApp.
- When installed, the URL opens the invitation route in the app.
- When not installed, it opens a localized mobile landing page with correct store destination and manual code.
- Desktop shows QR code, copyable link/code, and store choices rather than a broken app route.
- The page must handle country/store availability, unsupported devices, expired links, and app-not-yet-published
  state honestly.
- The link remains stable if the product display name changes; avoid embedding the current brand in database
  identity or token semantics.
- Never create a friendship request from a web preview crawler. Redemption requires an authenticated app or
  explicit code redemption.

## 9. Notifications and copy

- User B receives the existing friendship-request notification only after authenticated redemption.
- User A is not told that B installed PushApp; A receives only friendship lifecycle information already
  permitted, such as acceptance or decline.
- Failed, expired, or blocked redemption does not reveal sensitive reasons.
- Copy must say “friendship request,” not imply that friendship or Support Circle access already exists.
- An invitation to PushApp is not an invitation to a Journey or Support Circle.

## 10. Dependencies and release gates

### Interim share

- working Circle Invite entry point;
- system share sheet;
- stable public landing or download destination;
- existing username-based add-friend flow.

### Installed-app deep link

- real authentication and account identity;
- production social backend and friendship authorization;
- branded HTTPS domain and hosted association files;
- iOS Associated Domains/Universal Links and Android App Links;
- signed production builds and device tests.

### Post-install attribution

- published App Store and Google Play listings;
- Android Play Install Referrer implementation;
- invitation token/code backend;
- onboarding handoff that preserves pending redemption;
- privacy, security, abuse, data-deletion, and store-compliance review;
- iOS provider decision only if later evidence justifies one.

E1/real authentication remains blocked in part by Apple readiness. A true store-download flow cannot ship until
the application has live store listings.

## 11. Technical direction

Suggested server objects:

- `invitations`: invitation owner, token digest, short-code digest, lifecycle, expiry, usage aggregate;
- `invitation_actions`: typed friendship and/or Support Circle actions, including Journey and permission bundle
  only for the Support Circle action;
- `invite_redemptions`: invitation, authenticated redeemer, method, result, timestamps, idempotency key;
- existing friendship and Journey-Ally tables remain the sources of truth for the resulting requests after the
  current friendship prerequisite is removed from the Journey-Ally authorization model.

Use one server transaction/function to validate the invitation, enforce blocks/rate limits/duplicates, record
redemption, and create or resolve every requested action independently. The client never supplies a trusted
inviter ID, Journey ID, or permission bundle during redemption; all are read from the server-side invitation.

The app maintains a single pending invitation token/code through sign-in and onboarding. It must not persist
indefinitely, cross into another signed-in account without confirmation, or create a request before the final
authenticated account is known.

## 12. Edge cases

- link opened on a device signed into the wrong account;
- inviter and recipient are the same user;
- inviter changes username or display name after sharing;
- invite forwarded to several people or posted publicly;
- expired/revoked link opened after installation;
- app installed from a different source than the intended store;
- Android referrer missing, duplicated, delayed, or malformed;
- recipient reinstalls, changes devices, or registers weeks later;
- recipient starts registration from one invite and later opens another;
- onboarding abandoned and resumed;
- app opens offline;
- request created server-side but confirmation response is lost;
- existing, pending, crossing, declined, removed, or blocked friendship;
- inviter deletes/freezes account before redemption;
- recipient is not eligible to register or the app is unavailable in their country;
- link clicked by crawlers, security scanners, or store-preview services;
- RTL/localization, screen-reader access, copy/code selection, and QR scanning;
- token or code appears in logs, analytics, screenshots, clipboard history, or crash reports.

## 13. Acceptance criteria

1. Invite opens a localized system share sheet with a stable link and recovery identity.
2. No URL contains direct personal identifiers.
3. Installed recipients redeem through verified HTTPS app links after authentication.
4. Android post-install redemption uses Play Install Referrer with manual-code fallback.
5. iOS post-install redemption uses the manual code until a separately approved provider exists.
6. Exactly one pending request per requested relationship can result for an inviter/recipient/Journey tuple;
   friendship and Ally status are never auto-accepted and neither depends on acceptance of the other.
7. Existing relationships, crossing requests, blocks, self-invites, expiry, revocation, deletion, and offline
   cases behave safely and idempotently.
8. The recipient can identify the inviter before accepting; the inviter receives no installation surveillance.
9. Rate limits and spam protections prevent repeated unsolicited requests.
10. Registration/onboarding preserves a pending invite without applying it to the wrong account.
11. The interim share flow remains usable before store publication and makes no deferred-attribution claim.

## 14. Approved founder decisions (2026-08-14)

1. An invitation is single-use and is consumed when its pending request or requests are created, even if the
   recipient later declines.
2. Code entry appears contextually after an invite visit and remains available in Circle. It is not added as a
   question to every user's onboarding.
3. An unused invitation initially expires after 30 days. The period may later be tuned from real completion
   data.
4. The public landing page does not expose the inviter's display name. Identity appears in the inviter-reviewed
   share message and in the authenticated app.
5. Inviter-visible status is limited to **Active**, **Redeemed**, and **Expired**. PushApp never reveals install
   state, registration progress, or recipient identity before authenticated redemption.
6. The interim `@username` share may activate as soon as a truthful stable landing/download URL exists, before
   the invitation-code backend is ready.

### Required continuation after the interim release

The interim share is not completion of this feature. A tracked follow-up must implement the full connection:

- verified Universal Links/App Links for an installed recipient;
- server-issued opaque invitation token and recovery code;
- preservation through authentication and onboarding;
- Android post-install recovery through Play Install Referrer;
- contextual manual-code recovery on iOS;
- atomic creation of the invitation's pending friendship and/or Support Circle requests;
- lifecycle status, expiry, revocation, idempotency, rate limits, block checks and safe failure handling.

The feature may be marked fully complete only when these flows pass the acceptance criteria in §13. Shipping
the interim share must therefore leave the full-attribution work visible in the implementation backlog rather
than silently treating the dead Circle button as resolved.

## 15. Deferred commercial decisions

- whether measured iOS conversion loss justifies Branch or another provider;
- provider selection, price ceiling, data-processing terms, and exit/migration plan;
- exact public landing-page design and final branded domain;
- final invitation quotas and abuse thresholds based on live behavior;
- whether reusable personal links later coexist with recipient-specific, single-use invitations;
- whether App Clips add enough value to justify their own future scope;
- invite analytics beyond the minimum operational funnel;
- any reward for successful invitations.

## 16. Competitive conclusions and source notes

Finch validates the combined link-plus-code pattern and post-registration recovery. Fitbit validates explicit
friendship acceptance and limited pre-relationship identity. Discord validates expiry, maximum use, and
revocation. Strava validates channel-neutral sharing and separation between the shared invitation purpose and
the social relationship. Full comparison:
`../../05_Research/Invite_Friend_Competitive_Research_2026-08-13.md`.

- Apple Universal Links securely associate an HTTPS domain and installed app; without the app, the same URL
  opens on the web. Apple also requires all incoming parameters to be treated as untrusted:
  [Apple Universal Links](https://developer.apple.com/documentation/xcode/allowing-apps-and-websites-to-link-to-your-content)
  and [link handling security](https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app).
- Google Play Install Referrer can retrieve the referrer URL and relevant click/install timestamps after an
  Android install: [Android Developers](https://developer.android.com/google/play/installreferrer).
- Google confirms that Firebase Dynamic Links shut down on 2025-08-25:
  [Firebase deprecation FAQ](https://firebase.google.com/support/dynamic-links-faq).
- Branch currently offers tiered attribution/linking plans and a free trial, with scaling and advanced terms
  varying by plan rather than a permanent free infrastructure guarantee:
  [Branch pricing](https://www.branch.io/pricing/).
