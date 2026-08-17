# Competitive Research — Friend Invitation and Post-Install Recovery

Date: **2026-08-13**  
Status: **Initial competitive and platform research complete; founder decisions still required before PRD approval.**  
Related draft: `../04_Product/PRD/Invite_Friend_Acquisition_PRD.md`

---

## 1. Research question

How do social, wellbeing, and activity products invite a person who may not yet have the app, preserve the
inviter relationship through registration, obtain recipient consent, and reduce spam or broken attribution?

This study distinguishes four different actions that products often blur:

1. sharing an app-download link;
2. attributing a new registration to an inviter;
3. creating a pending social request;
4. accepting a relationship or joining a group.

PushApp needs the first three. It must never perform the fourth without the recipient's existing friendship
consent.

## 2. Competitors and adjacent patterns

### 2.1 Finch — closest product reference

Finch exposes both **Invite someone new** through a shareable link and **Find a friend** through a Friend Code.
Its reward flow explicitly supports either the referral link or manual entry of the Friend Code in a “Did
someone invite you?” field. Referral information must be supplied within 48 hours of account creation for the
reward, and rewards are capped at three successful invites.

What is relevant to PushApp:

- a link and a visible manual code should coexist rather than compete;
- onboarding is a natural recovery point for an invite that was not attributed automatically;
- the manual path remains valuable even when links usually work;
- invite attribution and friendship are related but separable concepts;
- caps and eligibility windows reduce reward abuse.

What PushApp should do differently:

- no game reward is required for the initial feature;
- the invitation must create a pending request, not an unexplained mutual relationship;
- manual-code entry should remain available after onboarding through Circle, not only during a short reward
  window;
- an expired reward/attribution window must not prevent legitimate manual friendship search.

Sources: [Adding Friends](https://help.finchcare.com/hc/en-us/articles/37780316582413-Adding-Friends) and
[Invite Rewards](https://help.finchcare.com/hc/en-us/articles/37780423805069-Invite-Rewards).

### 2.2 Fitbit / Google Health — explicit friendship consent and privacy

Fitbit's documented model lets a user select a method for finding people and send a friend request. The
recipient opens the request and chooses Accept or Ignore. Its privacy documentation also distinguishes the
limited profile information shown when establishing a friend connection from more sensitive account fields.
For children, guardian approval adds another consent layer.

What is relevant to PushApp:

- a recovered invitation should become the normal friendship-request object;
- the recipient must accept or decline through the same trusted social surface as any other request;
- identity shown before acceptance should be intentionally limited;
- blocking and privacy rules must apply before a request is created;
- any later minimum-age or child-account policy may require additional approval rather than reusing the adult
  flow unchanged.

What PushApp should avoid:

- contact-list upload as a dependency for invitation;
- revealing that a contact already has an account without an approved discovery policy;
- combining invite attribution with broad social or activity-data sharing.

Sources: [Fitbit privacy FAQ](https://support.google.com/product-documentation/answer/13532616) and
[connecting with friends](https://support.google.com/fitbit/answer/14237026).

### 2.3 Discord — link lifecycle controls

Discord invitation links may be configured with expiry and maximum-use limits, and authorized users can revoke
them. The relationship is different—Discord links join a server rather than send a personal friendship
request—but its lifecycle controls are highly relevant.

What is relevant to PushApp:

- an invitation should expire;
- the issuer should be able to revoke it;
- a maximum-use count materially reduces forwarding and abuse;
- invalid, expired, exhausted, and revoked must be separate internal outcomes but can share privacy-safe user
  recovery copy;
- link creation and redemption need server authority.

PushApp recommendation:

- use one redemption per invitation rather than Discord-style unlimited personal links;
- generate a new invitation for each Invite action;
- do not expose advanced lifetime/use controls in the initial UI.

Source: [Discord Invites 101](https://support.discord.com/hc/en-us/articles/208866998-Invites-101).

### 2.4 Strava — invite non-users through the system share channel

Strava lets a user invite someone who may not use Strava through another installed app, while existing Strava
connections can be selected internally. Its documented activity invitation is not the same as friendship, but
it demonstrates a valuable separation: the shared link carries the intended object/action, while the system
share sheet remains the transport.

What is relevant to PushApp:

- the operating-system share sheet is the correct channel-neutral first surface;
- PushApp should not ask which external person or channel was selected;
- opening the share sheet is not proof that an invite was sent or accepted;
- a future Journey/Support Circle share must use a different invitation purpose from a general friendship
  invite.

Source: [Inviting a Friend to Your Activity](https://support.strava.com/en-us/articles/15401797-inviting-a-friend-to-your-activity).

## 3. Platform findings

### 3.1 Existing app

Apple Universal Links and Android App Links allow one verified HTTPS URL to open the installed app in context.
Without the app, the URL opens on the web. Incoming parameters remain untrusted and must be validated before
any social action.

This supports a straightforward installed-user flow on both platforms.

Sources: [Apple Universal Links](https://developer.apple.com/documentation/xcode/allowing-apps-and-websites-to-link-to-your-content)
and [supporting links securely](https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app).

### 3.2 Android after installation

Google Play Install Referrer can recover referral content after installation, including the referrer URL and
click/install timestamps. This gives Android a platform-native path for recovering an opaque invite token.

Source: [Google Play Install Referrer](https://developer.android.com/google/play/installreferrer).

### 3.3 iOS after installation

Apple's public Universal Link documentation covers installed-app opening and web fallback, but does not provide
a Google Play Install Referrer equivalent that reliably returns an arbitrary invite token after an App Store
installation. Therefore a manual code or a third-party provider remains necessary for a dependable iOS
post-install flow.

This is an inference from the documented platform capabilities, not a claim by Apple that every custom method
is impossible.

### 3.4 Third-party deferred linking

Branch currently markets tiered linking and attribution plans with a free trial; advanced/scaled pricing varies
by plan. A provider can reduce iOS friction but adds an SDK, external processing, vendor dependency, security
surface, and future cost.

Source: [Branch pricing](https://www.branch.io/pricing/).

### 3.5 Firebase Dynamic Links

Firebase Dynamic Links cannot be selected. Google shut it down on **2025-08-25** and states that served links
and creation APIs no longer work.

Source: [Firebase Dynamic Links deprecation FAQ](https://firebase.google.com/support/dynamic-links-faq).

## 4. What is common in the market

- system share sheet or copyable link;
- a fallback code or username;
- a landing/download page for non-users;
- an explicit request or join surface after account identity exists;
- expiry, revocation, or eligibility windows;
- deduplication of an already-completed relationship;
- rewards only under constrained eligibility, when rewards exist.

These are expected foundations, not differentiation.

## 5. What is less common or poorly solved

- reliable, provider-independent iOS attribution after App Store installation;
- preserving an invite without accidentally applying it to the wrong signed-in account;
- clearly separating “this person invited you” from “you are already friends”;
- privacy-safe attribution without identifiers in the URL;
- a recovery path that survives failed attribution without making the user search manually from scratch;
- consistent blocking, duplicate-request, decline, and forwarding behavior across both link and code paths.

PushApp can provide a better experience by treating the code as a first-class recovery mechanism and by
redeeming every path through the same friendship-request transaction.

## 6. Recommended product decisions

### 6.1 One-time invite, not a permanent personal referral link

Each tap on Invite creates a random invitation that can be redeemed by one authenticated recipient within 30
days. The link and short code represent the same invitation. Once redeemed, it cannot create a request for a
second account.

Why:

- fits the intent “invite a friend,” not “publish my profile”;
- limits damage from forwarding, screenshots, public posts, and leaked codes;
- makes revocation and abuse analysis understandable;
- prevents one link from generating an unbounded request stream.

A separate permanent profile/referral link may be considered later, but it is a different feature and abuse
model.

### 6.2 One redemption mechanism, independent social outcomes

All valid recovery methods call the same backend redemption operation. The invitation may produce:

- one pending friendship request;
- one pending Journey Support Circle request;
- both requests in parallel.

No method auto-accepts friendship or Ally status or exposes Journey information. Friendship and Support Circle
are independent: accepting, declining, or removing one does not automatically change the other.

### 6.3 Account-safe redemption

If an invite opens while a user is already signed in, show the inviter's permitted identity and the signed-in
recipient identity before redemption, with **Continue** and **Not me** actions. This is not approval of the
friendship; it prevents a shared device or wrong account from receiving the request.

For a new registration, retain the invitation through authentication/onboarding and create the pending request
only after the final account identity exists.

### 6.4 Privacy-safe preview

The public web landing page and unfurled link preview should say only that someone invited the recipient to
PushApp. The inviter's identity is already visible in the share message chosen by the inviter and may be shown
inside the authenticated app, but should not be embedded in the public URL or crawler-readable metadata.

### 6.5 Provider decision

Launch without a third-party deferred-link provider:

- installed app: verified HTTPS link;
- Android install: Install Referrer;
- iOS install: short code;
- both platforms: code fallback.

Measure link open → registration → redemption separately by platform using minimal first-party events. Consider
a provider only if iOS manual recovery produces a material, sustained loss and the expected recovered value
exceeds monetary, privacy, engineering, and vendor-exit costs.

## 7. UX recommendations

### Inviter

- one visible **Invite** action in Circle;
- immediately open the system share sheet after creating the invitation;
- share message includes the link and short code;
- do not claim “Invite sent” merely because the sheet opened;
- initially avoid a full invitation-management screen; allow regeneration/revocation through a lightweight
  pending-invite surface only if user testing demonstrates need.

### Recipient

- landing page: concise benefit, store action, visible copyable code;
- onboarding: optional “Were you invited?” code recovery, prefilled where technically available;
- installed app: show inviter identity and current account before redemption;
- after redemption: open the ordinary friendship-request card with Accept and Decline;
- invalid invite: offer code retry or username search without exposing the failure reason.

## 8. Abuse and edge-case conclusions

The PRD must cover:

- forwarded invite redeemed by the unintended first recipient;
- link preview crawlers and security scanners;
- wrong signed-in account or shared device;
- self-invite, blocks, existing friendship, crossing requests, prior decline, and removal;
- invite expiry, revocation, duplicate delivery, and lost server response;
- registration abandoned and resumed;
- Android referrer missing or delayed;
- iOS code copied incorrectly or clipboard unavailable;
- offline opening and later redemption;
- inviter deletion/suspension or username change;
- repeated generation, account farms, request spam, and future reward farming;
- identifiers leaking through URLs, logs, analytics, crash reports, or link previews;
- unsupported store/country/device and app not yet published.

## 9. Remaining founder decisions

1. Should a single-use invitation be considered consumed when the friendship request is created, even if B
   later declines? **Recommendation: yes.** A must deliberately generate a new invitation to ask again.
2. Should the code-entry prompt be a skippable onboarding step or appear only when an invite landing page was
   visited? **Recommendation: show it contextually when evidence exists; otherwise expose “Enter invite code”
   in Circle to avoid lengthening onboarding for everyone.**
3. Is 30 days the correct expiry? **Recommendation: approve as the initial default and tune later.**
4. May the public landing page show A's display name? **Recommendation: no; show it only in the authored share
   message and authenticated app.**
5. Should A be able to view invite status? **Recommendation: only Active, Redeemed, or Expired—never install,
   landing-page visit, registration progress, or B's identity before redemption.**
6. Should the interim release include only `@username`, or should the invitation-code backend be built before
   activating Invite? **Recommendation: ship username sharing first only if a real stable download/landing URL
   exists; otherwise keep the button inactive until the destination is honest.**
