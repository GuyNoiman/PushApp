# Competitive Research — Creator Journey Authoring Platforms

Date: **2026-08-13**  
Status: **Research complete for initial PRD direction; hands-on product trials still recommended before UX design.**  
Related PRD: `../04_Product/PRD/Future/Creator_Journey_Authoring_Platform_PRD.md`

---

## 1. Research question

What should PushApp learn from platforms that let professionals create courses, coaching programs, and
community-led experiences—and which conventions should it deliberately avoid when building a professional
Journey authoring website?

This study focuses on authoring structure, content and input types, scheduling, prerequisites, participant
preview, professional oversight, community/accountability, publishing, analytics, and business model.

The comparison is directional, based primarily on current official product and help-center documentation.
Features and prices can change. Before implementation, the team should run hands-on trials of the finalists
and verify commercial terms again.

## 2. Competitor groups

### Course-first authoring

- LearnWorlds
- Thinkific
- Kajabi
- Teachable

### Coaching and behavior-change delivery

- Quenza
- CoachAccountable

### Community and cohort-led learning

- Circle
- Mighty Networks

These are adjacent competitors rather than exact substitutes. The absence of an exact PushApp equivalent is
itself important: most products optimize either for delivering content, managing a coaching practice, or
running a paid community. PushApp's intended center is sustained real-world transformation.

## 3. Summary comparison

| Product | Primary model | Strongest authoring ideas | Main gap relative to PushApp's vision |
|---|---|---|---|
| LearnWorlds | Learning-management system | Broad activity catalog, interactive video, assessments, forms, certificates, bulk upload, drip | Content and assessment first; limited modeling of recurring real-life action and adaptive personal support |
| Thinkific | Creator course platform | Simple chapter/lesson builder, inline preview, autosave, prerequisites, drip, assignments requiring approval | Mostly linear course completion; rules describe access to content more than behavioral execution |
| Kajabi | Creator business suite | Clear module hierarchy, draft/publish/drip states, locked progression, marketing and sales integration | Strong commerce stack but comparatively coarse transformation and accountability model |
| Teachable | Simple course commerce | Drip, completion compliance, quizzes, assignments, certificates, progress reporting | Efficient course delivery; weak fit for adaptive, multi-week real-world Journeys |
| Quenza | Practitioner-to-client programs | Reusable activities, mixed interactive elements, private practitioner instructions, scheduled pathways, client demo mode | Close to coaching delivery, but centered on practitioner-assigned exercises rather than a participant-owned Journey ecosystem |
| CoachAccountable | Coaching-practice operating system | Actions, Metrics, Worksheets, notes, reminders, courses, group accountability | Strong professional oversight; authoring is tied to coaching operations rather than a creator marketplace and personal Coach |
| Circle | Community plus courses | Courses beside discussions/events, drag-and-drop content, cohorts, messaging, workflows, monetization | Community is the organizing object; behavioral rules and individual adaptation are secondary |
| Mighty Networks | Community-led courses | Cohorts, challenges, habit trackers, progress, drip/unlock, quizzes, automations, celebrations | Social accountability is strong, but the program model remains lesson/challenge based rather than a full Journey engine |

## 4. Findings by competitor

### 4.1 LearnWorlds

LearnWorlds provides one of the broadest content catalogs in the set. A course can contain video, interactive
video, PDF, SCORM/HTML5, audio, external embeds, exams, self-assessments, forms, certificates, journals, and
file/video/audio assignments. Content can be released by calendar date or by elapsed days from enrollment.
It also supports bulk content upload and reusable learning programs composed of courses.

What PushApp should learn:

- rich media and participant-input types must share a consistent authoring grammar;
- captions, transcripts, file handling, assessment feedback, and accessibility are core authoring concerns,
  not later decoration;
- bulk import becomes important once professional creators migrate existing material;
- a creator needs reusable libraries, not only one-off Journey editing.

What PushApp should not copy blindly:

- the LMS assumption that consuming content or passing a test is the main measure of progress;
- a large activity catalog exposed all at once;
- “programs of courses” as another hierarchy competing with Dream → Journey → Milestone → Step.

Sources: [supported learning activities](https://support.learnworlds.com/support/solutions/articles/5000652836-learning-activities-supported-in-learnworlds),
[drip-fed courses](https://support.learnworlds.com/support/solutions/articles/12000041912),
[bulk upload](https://support.learnworlds.com/support/solutions/articles/12000101758-how-to-bulk-upload-course-content), and
[learning programs](https://support.learnworlds.com/support/solutions/articles/12000104343-how-to-create-learning-programs-in-learnworlds).

### 4.2 Thinkific

Thinkific's 2026 course builder uses chapters and lessons, with mixed content blocks inside a lesson. It
shows the learner experience during editing, autosaves changes, and supports prerequisite lessons, drip
schedules, video-completion thresholds, quizzes, and assignments that may require administrator approval.
Thinkific separately recommends a true test-student account because normal preview can ignore prerequisites
and completion rules.

What PushApp should learn:

- inline participant preview reduces context switching;
- autosave status should always be visible;
- authoring preview and actual rule simulation are different tools—PushApp needs both;
- an input requiring professional approval is a distinct completion rule, not merely a file-upload Step;
- draft, preview, publish, and participant-test states should remain explicit.

What PushApp should improve:

- dependency rules should explain exactly which occurrences unlock and why;
- testing should simulate time, recurrence, misses, pauses, and completion without requiring days of waiting;
- participant adaptations must not be reduced to course-access locks.

Sources: [new course builder](https://support.thinkific.com/hc/en-us/articles/37783573725463-How-to-Add-Content-and-Configure-Your-Course-in-the-New-Course-Builder),
[test student](https://support.thinkific.com/hc/en-us/articles/360055164753-How-to-Create-a-Test-Student-Account), and
[assignments](https://support.thinkific.com/hc/en-us/articles/360030373594-Create-an-Assignments-Lesson).

### 4.3 Kajabi

Kajabi organizes content into modules, submodules, lessons, quizzes, and assessments. Modules can be Draft,
Published, or Dripped, and can be locked until a prior lesson, quiz, or assessment is completed or passed.
Kajabi's larger strength is the surrounding creator-business system: landing pages, email, offers, and sales.

What PushApp should learn:

- state labels must be understandable without reading documentation;
- a small set of progression rules can cover many common creator needs;
- authoring and commercial publication are connected, but should remain separate concerns in the product;
- creators will eventually expect a path from building to distributing and monetizing.

What PushApp should not prioritize in the first release:

- a general marketing website builder;
- funnel and email-automation breadth before the Journey itself is safe and effective;
- importing course terminology into the participant experience.

Sources: [course modules](https://help.kajabi.com/articles/products/courses/course-modules) and
[locked course content](https://help.kajabi.com/articles/products/courses/lock-content-in-your-course-product).

### 4.4 Teachable

Teachable emphasizes accessible course creation and selling. Current plans include course drip, enforced
lesson completion/compliance, certificates, comments, quizzes, short-answer assessments, student progress,
and engagement reporting.

What PushApp should learn:

- creators value a low-friction path from outline to publish;
- compliance rules and assessment rules should be clearly separated;
- completion communication and certificates are part of the authored experience;
- advanced controls should not obscure the basic outline.

What PushApp should improve:

- success should reflect meaningful real-world action, not only content completion;
- Journeys need recurrence, daily reporting, support, recovery, and user-approved adaptation;
- commercial simplicity must not override privacy or behavioral safety.

Source: [Teachable plan feature comparison](https://support.teachable.com/en/articles/11682410-new-teachable-plans-in-june-2025).

### 4.5 Quenza

Quenza is the closest authoring reference for practitioner-led transformation. Professionals create reusable
Activities such as assessments, worksheets, journals, meditations, lessons, checklists, and habit trackers.
Its builder combines text, questions, sliders, images, video, and audio, and lets the professional mark
elements mandatory. Programs arrange Activities into Sections and sequences. Delivery may be immediate,
after completion, after completion plus delay, at a fixed interval, or manually triggered. Creators can show
or hide upcoming Activities. Quenza also provides a built-in demo client for experiencing the client side.

What PushApp should learn:

- creators need a reusable Step/activity library and the ability to customize a copy;
- private creator instructions are useful for intent, references, appropriate use, and adaptation notes;
- “after completion,” “after completion plus delay,” “fixed interval,” and “manual release” are understandable
  progression primitives;
- hiding future content can reduce overwhelm, while showing it can build preparation and trust;
- a permanent demo participant is a better testing experience than an ordinary preview;
- the participant home should emphasize what requires action now.

What PushApp should differentiate:

- the participant owns the transformation together with the Coach; the creator is not automatically the
  participant's practitioner or entitled to private answers;
- authored Journeys must integrate Dreams, real-world Steps, weekly adaptation, Allies, celebrations, and
  the broader Journey lifecycle;
- user approval remains required for Coach-proposed structural changes;
- a creator's program cannot silently become a surveillance channel.

Sources: [Activity Builder](https://help.quenza.com/article/51-how-to-use-the-activity-builder),
[Programs](https://help.quenza.com/article/74-getting-started-with-programs),
[delivery rules](https://help.quenza.com/article/82-how-activity-delivery-works-in-a-program),
[demo client](https://help.quenza.com/article/49-experience-quenza-like-your-clients-do), and
[My Day](https://help.quenza.com/article/86-understanding-the-my-day-page).

### 4.6 CoachAccountable

CoachAccountable combines Actions, Metrics, Worksheets, session notes, reminders, courses, and group
programs. Its value proposition is professional accountability between coaching sessions and visible evidence
of client progress. Pricing is based primarily on the number of active clients rather than on selling an
individual course.

What PushApp should learn:

- action commitments, measurable progress, reflection content, and professional conversation are different
  primitives and should not be forced into one Step type;
- the creator may need private author notes and aggregate follow-through information;
- group delivery and one-to-one delivery require different permissions and analytics;
- creator pricing may eventually align with active participants or delivered value, not only storage or
  number of published Journeys.

What PushApp should differentiate:

- a Journey persists beyond appointments and is not owned by a professional's client-management workspace;
- Support Circle roles are consented participant relationships, not generic staff oversight;
- the personal Coach should preserve continuity across Journeys from different creators.

Sources: [CoachAccountable overview](https://www.coachaccountable.com/),
[enterprise and course authoring](https://www.coachaccountable.com/enterprise), and
[pricing model](https://dev.coachaccountable.com/pricing).

### 4.7 Circle

Circle places courses inside a community architecture. It combines sections and lessons with video, audio,
text, files, discussions, direct messages, events, cohorts, gamification, workflows, memberships, and sales.
Courses may be self-paced, structured, or scheduled. Current public pricing starts at a materially higher
business-software price point than consumer apps, with more automation and customization on upper plans.

What PushApp should learn:

- creator content becomes more powerful when participants can receive contextual social support;
- live sessions, discussion, content, and cohort scheduling can be adjacent surfaces without becoming Step
  types themselves;
- workflows should respond to meaningful events such as stalled progress or Milestone completion;
- private link, cohort, and paid access are distinct publishing modes.

What PushApp should not copy early:

- making community spaces the core hierarchy;
- generic engagement metrics, leaderboards, or posts that optimize time in the platform;
- building a broad community-management suite before validating creator-authored Journeys.

Sources: [Circle courses](https://circle.so/platform/courses),
[course overview](https://help.circle.so/p/courses/course-setup/courses-overview), and
[workflows](https://help.circle.so/p/workflows/workflow-setup/workflows-overview).

### 4.8 Mighty Networks

Mighty Networks combines community-led courses with cohorts, challenges, habit trackers, progress tracking,
drip and sequential access, quizzes, certifications, badges, celebrations, re-engagement automations, direct
messaging, and paid memberships. It explicitly presents community and accountability as the completion engine.

What PushApp should learn:

- creators need several delivery modes: self-paced, cohort, scheduled, and challenge-like;
- Milestone celebration and stalled-participant support can be authored as bounded triggers;
- peers in the same cohort can provide motivation, but participation and visibility must be intentional;
- an authored template can support multiple formats without changing the core content model.

What PushApp should differentiate:

- support is personal and consent-based through Buddies, Allies, and Support Circles—not a default public
  cohort feed;
- progress should optimize the user's real-life transformation, not community activity;
- habit tracking is one possible Journey behavior, not the definition of the product.

Sources: [Mighty courses](https://www.mightynetworks.com/online-courses),
[feature and pricing comparison](https://www.mightynetworks.com/pricing/), and
[Launch plan](https://docs.mightynetworks.com/for-hosts/meet-mighty/whats-included-in-the-mighty-networks-courses-plan).

## 5. Cross-market patterns

### 5.1 Established conventions worth adopting

1. **Outline first.** Sections/modules and ordered activities are the common, learnable mental model.
2. **Progressive disclosure.** Basic structure comes first; drip, locks, assessments, and automation are
   optional advanced controls.
3. **Reusable libraries.** Professionals expect to reuse an activity, template, media item, or complete
   program rather than rebuild it.
4. **Autosave plus explicit publication.** Drafting should feel safe, while publication remains intentional.
5. **Participant preview and test identity.** Visual preview alone cannot validate time and progression rules.
6. **Multiple release modes.** Immediate, scheduled, after prior completion, after a delay, and manually
   released cover most understandable needs.
7. **Rich blocks, few containers.** Text, media, questions, and uploads work best as composable content
   inside a small hierarchy.
8. **Private author guidance.** Professionals need internal intent and facilitation notes that participants
   do not see.
9. **Completion rules are visible.** Creators need plain-language confirmation of what counts as complete.
10. **Distribution is a lifecycle.** Private test, assigned, cohort, link, public, paid, paused, and retired
    are meaningfully different states.

### 5.2 Common gaps PushApp can own

- real-world actions are usually secondary to watching, reading, or submitting content;
- recurrence is often treated as drip or a habit tracker rather than a first-class Step schedule;
- prerequisites are generally linear locks, not explainable relationships between recurring actions;
- completion is usually content consumption or assessment, not an explicit Journey success policy;
- personal support is either practitioner oversight or a community feed, not a consented Support Circle;
- programs rarely adapt through a personal Coach while requiring participant approval;
- a creator commonly owns the client relationship and data, which conflicts with PushApp's participant-first
  privacy model;
- few platforms connect multiple creator experiences to one persistent Dream and personal growth context.

## 6. Recommended PushApp direction

### 6.1 Positioning

Do not describe the future product internally as an LMS or course builder. The clearer category is:

> A Journey Studio for turning professional guidance into sustained real-world action.

Its defining promise is not “upload your course.” It is:

> Define what a participant should do, when and why; how progress is recognized; what happens when life gets
> in the way; and how the participant receives support without losing ownership of the Journey.

### 6.1.1 Approved strategic sequence

PushApp should not begin by recruiting creators and then discover what an effective persistence platform
requires. It should first prove the Journey, recovery, Coach, adaptation, and Support Circle experience with
its own users. The later creator product packages those proven mechanisms for professionals and their
audiences. This sequence reduces the risk of becoming a feature-rich but behaviorally ordinary course tool.

An additional differentiator follows from this strategy: creators may supply structured private guidance for
the PushApp Coach at the Journey and Step level. When a participant requests real-time support, the Coach can
respond using the professional intent and safe adaptations relevant to the current Step. The platform retains
control of safety, privacy, and Coach identity, and the creator does not gain access to the private
conversation merely because their guidance informed it.

### 6.2 Recommended first creator-platform release

Start with PushApp's internal content team and a small set of invited professionals. Support private testing
and private assignment/link distribution before an open Marketplace or payments.

Minimum authoring primitives:

- Journey metadata and Dream-fit description;
- ordered Milestones and Steps;
- action, text, audio, video, reflection, single choice, multiple choice, numeric/scale input, and photo input;
- mandatory versus optional;
- selected-day and times-per-week recurrence;
- immediate, scheduled, after-prior-completion, delayed-after-completion, and manual release;
- simple linear dependencies supported by the Journey Engine;
- a readable completion policy;
- reminders and active-time recommendations;
- creator-private notes;
- autosave, draft, participant preview, simulated test participant, validation, version snapshot, private
  publish, pause, and retire.

Explicitly defer from the first release:

- open creator signup and public Marketplace;
- payments, revenue sharing, refunds, and affiliate tools;
- cohorts, public communities, live streaming, and broad marketing automation;
- arbitrary branching graphs;
- multiple simultaneous editors;
- creator access to private participant journals, photos, Coach conversations, or reasons for misses;
- AI content generation beyond bounded experimental assistance.

### 6.3 UX recommendation

Use a three-level authoring experience:

1. **Journey outline:** the always-visible list of Milestones and Steps;
2. **Step editor:** content and participant interaction;
3. **Journey rules:** schedule, progression, support, success, and publication.

Advanced rules should appear in a side panel or dedicated rules view, not inside every basic Step form. The
creator should always have access to:

- participant preview;
- test Journey;
- validation status;
- save/version status;
- a plain-language “How this Journey works” summary.

### 6.4 A differentiating validation system

PushApp should provide a Journey Health Check before publication. It should flag:

- impossible or circular progression;
- overloaded days and unrealistic weekly effort;
- an unclear or trivial completion policy;
- mandatory Steps with no accessible alternative;
- repeated Steps that cannot occur enough times before the Journey ends;
- missing captions, transcript, alternative text, or localization;
- collection of unnecessary or sensitive participant data;
- dependencies whose participant consequence is unclear;
- content promise that is not represented by any meaningful action.

This goes beyond technical correctness and helps protect the participant experience. Safety or structural
errors block publication; quality suggestions remain recommendations.

### 6.5 Template adoption and versioning

The market evidence reinforces the need to separate:

- the creator's versioned Journey template;
- the participant's adopted Journey instance;
- the participant's historical Step occurrences and reports.

Publishing creates an immutable version. A participant starts from a snapshot. Copy corrections may be
eligible for a controlled update; schedule, dependencies, mandatory Steps, success rules, or data collection
create a new version. Active participants are never silently moved to it.

### 6.6 Privacy as product differentiation

The creator should define what an input is for, but must not automatically receive it. Every participant-input
type needs an explicit visibility contract. The safe default is participant-only or participant-and-Coach,
with aggregate creator analytics above a privacy threshold. Creator review of individual work is a separate,
consented mode surfaced before adoption.

## 7. Business-model observations

Adjacent platforms commonly charge creators a recurring business subscription, sometimes combined with
transaction fees, active-client limits, advanced automation, branded apps, or enterprise pricing. Current
examples include Quenza's active-client tiers, Circle's higher-priced community/business tiers, Mighty
Networks' plan and transaction-fee ladder, and CoachAccountable's active-client-based pricing.

This suggests several future PushApp options, which should remain hypotheses until Marketplace strategy:

- professional subscription based on active participants and authoring capabilities;
- platform revenue share for Marketplace sales;
- organization tier for teams, roles, branding, API, and private catalogues;
- storage/media quotas as cost controls rather than the core value metric;
- free internal/private drafting with paid distribution or advanced analytics.

Recommendation: do not choose pricing before measuring how invited creators use the authoring system. Avoid a
model that rewards collecting unnecessary participant data or publishing excessive low-quality Journeys.

## 8. Decisions supported by this research

The research supports the following PRD direction:

- outline/timeline authoring rather than a free-form workflow canvas;
- reusable Step and Journey templates;
- explicit creator-private instructions;
- both visual preview and simulated participant testing;
- a small release-rule vocabulary instead of arbitrary logic;
- versioned templates and immutable active-participant history;
- private/invited launch before Marketplace;
- participant-controlled data visibility;
- cohort/community and commerce as later layers;
- a Journey Health Check as a differentiating authoring feature.
- structured Step-level guidance that helps one consistent PushApp Coach provide method-aware real-time
  support without impersonating the creator;
- proving the consumer persistence engine before exposing it as creator infrastructure.

## 9. Remaining research before development

1. Run hands-on trials in Quenza, Thinkific, and Mighty Networks using the same sample Journey.
2. Observe five professionals authoring that Journey and identify where they need terminology help.
3. Test whether “Milestone” and “Step” are sufficient for creators accustomed to modules and lessons.
4. Validate the five proposed release rules with non-technical coaches.
5. Research creator liability, health/wellness claims, moderation, copyright, and marketplace payments by
   launch country.
6. Estimate video/audio storage, transcoding, delivery, malware scanning, and moderation costs before selecting
   quotas or pricing.
7. Define whether an invited creator acts only as author, or may also be the participant's professional with
   separately consented data access.
