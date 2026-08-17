# PRD — Accountability Ally

Status: **Future Vision** — product direction approved; not approved for implementation.
Stage: **Future**.
Owner: founder + AI product team.
Related: `../Journey_Support_Circle_PRD.md`, Decision Log D29, completion-report media, Direct Messaging, account deletion/export,
and security/privacy review.

---

## 1. Purpose

Some users may deliberately choose a stricter accountability contract: a specific Ally must confirm
completion before a Step is counted as Done. This is an explicit opt-in relationship, not the default
Support Circle behavior and not part of MVP.

## 2. Why it is separate

This capability adds blocking approval, proof media, recipient-held message history, failure recovery,
and sensitive-data retention. It therefore requires a separate design, data model, privacy review, and
security review rather than being treated as another viewing permission.

## 3. Approved Future direction

- A Journey may have at most **one** Accountability Ally.
- The Journey owner explicitly requests this role.
- The recipient sees the role, authority, and exact data exposure and must explicitly accept.
- Converting an existing Ally requires renewed acceptance.
- After acceptance, a Done report opens a submission flow in which the user may attach proof media and/or
  text.
- Submitting sends a private approval request to the Accountability Ally.
- The Step remains Pending Approval and is not Done until approved.
- The Accountability Ally can Approve or Decline.
- Only that Accountability Ally may see the proof image/text through the private approval message.
- No resubmission is supported in the currently approved direction.
- There is no automatic approval timeout.
- If the Accountability Ally is removed, every Step still Pending Approval automatically becomes Done.
- The product should recommend adding/replacing support when the Ally is inactive or repeatedly does not
  respond; it must not shame either user.

## 4. Lifecycle

Open invitations have no time expiry. They close when the Journey ends or is deleted. Requested members
can be cancelled from My Journey → Support Circle. Decline sends an informational notification only.

Before removing an Accountability Ally, the owner must be told how many Pending Approval Steps will become
Done. The conversion must be atomic and auditable.

## 5. Proof media and account deletion

Approved product rules:

- proof is visible only to the Journey owner/sender and the accepted Accountability Ally/recipient;
- the sent item is stored as part of the private approval-message history on both sides;
- deleting the sender's account deletes the sender-owned account/media copy;
- the recipient-held message copy may remain in the recipient's conversation history;
- retained history replaces the sender's identity with “Deleted user”;
- the user must be told before sending proof, and during account deletion, that a recipient-held copy may
  remain;
- deleting the sender's profile reference does not anonymize identifying content inside the proof itself;
- proof media must be included correctly in account export/deletion behavior and storage cleanup.

## 6. Required edge cases for future specification

- Ally never responds or becomes inactive;
- Ally is removed while multiple Steps await approval;
- Journey freezes, completes, is abandoned, or is deleted while approval is pending;
- request is approved/declined at the same moment the relationship changes;
- upload fails or is interrupted;
- recipient downloads or screenshots proof outside PushApp;
- proof contains sensitive, illegal, abusive, or unintended content;
- notification preview exposes private proof/text on a lock screen;
- account deletion, blocking, friendship removal, and data export;
- legacy clients that do not understand Pending Approval;
- several device sessions act on the same approval.

## 7. Open Questions — must close before implementation

- final user-facing role name and copy;
- whether text, image, or either is required for submission;
- what Decline does when resubmission is unavailable;
- whether Decline requires a reason and how abuse is prevented;
- notification privacy and whether previews contain any submitted text;
- supported input formats, capture/library sources, dimensions, compression, and file-size limits;
- metadata stripping, malware/content-safety handling, retention period, encryption, signed-URL lifetime,
  download rules, and storage region;
- inactive-Ally detection and recommendation thresholds;
- whether the owner can disable mandatory approval while Steps are pending;
- how Pending Approval affects streak, XP, Level, Achievements, Week Review, and Journey completion;
- reporting, blocking, moderation, and appeal paths;
- exact legal/store disclosures for recipient-retained proof after account deletion.
- logical ownership/reference model for the two visible copies, recipient deletion/export rights, backup
  and CDN deletion service levels, and signed-URL revocation;

The architect/implementer may propose technical defaults, but product, security/privacy, and store-compliance
must approve these items before implementation.

## 8. Philosophy guardrails

- Never call the role “Enforcer.” The relationship remains an Ally relationship.
- Both parties opt in with informed consent and can leave.
- Non-response must never shame or punish the Ally.
- Removing the Accountability Ally must provide a safe route back to ordinary user-owned progress.
- The feature must reinforce a voluntarily chosen real-life commitment, not external coercion.

## 9. Future acceptance gates

Implementation may begin only after:

1. every §7 Open Question is resolved or explicitly deferred with a safe default;
2. UX designs cover submission, pending, approval, decline, removal, and failure states;
3. security/privacy and store-compliance approve media handling and deletion semantics;
4. reward/planning engines define Pending Approval behavior;
5. the feature is re-staged from Future into an active roadmap stage by founder decision.
