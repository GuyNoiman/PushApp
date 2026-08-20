# PushApp — Central Journey Library: Career-linked section v0.6

**Status:** corrected architecture + expanded content

## Architecture correction

There is **one central Journey Library**. A Journey does not live inside an Expert.

> **Central Journey Library → Journey → linked relevant Expert(s)**

In this package, linkage is represented as authoring/library metadata: `libraryMeta.linkedExpertIds = ["career"]`. This is not asserted to be an existing persisted Journey field.

## What changed

- Migrated the previous 9 Career Direction Journeys into the central-library framing.
- Added 9 new Job Search Journeys.
- Current total: **18 Journeys across 6 goal families linked to Career**.

## New Job Search families

### CAR_G08 — unclear job-search target
- Criteria-first target
- Evidence-from-postings target
- Conversation-first target

### CAR_G09 — weak proof/presentation
- Existing-evidence extraction
- Targeted artifact/proof build
- Role-story translation

### CAR_G10 — weak opportunity/access
- Warm-network route
- Repeated-community route
- Targeted information-conversation route

## Current family index

### CAR_G01 — להבין מה הצעד הבא שלי בקריירה
- subtype: `FIND_DIRECTION`
- primary bottleneck: `DIRECTION_EVIDENCE_GAP`
- linked Expert: `career`
- variants:
  - **Clarity-first** — `career_direction_clarity_first`
  - **Action-first** — `career_direction_action_first`
  - **Hybrid** — `career_direction_hybrid`

### CAR_G02 — להחליט בין שתי אפשרויות קריירה קונקרטיות
- subtype: `FIND_DIRECTION`
- primary bottleneck: `DIRECTION_GAP`
- linked Expert: `career`
- variants:
  - **Criteria-first comparison** — `career_two_options_criteria_first`
  - **Real-world test-first comparison** — `career_two_options_test_first`
  - **Conversation/evidence-first comparison** — `career_two_options_conversation_first`

### CAR_G03 — לבדוק אם כיוון קריירה שמעניין אותי באמת מתאים לפני שאני מתחייב
- subtype: `FIND_DIRECTION`
- primary bottleneck: `DIRECTION_GAP`
- linked Expert: `career`
- variants:
  - **Work-sample test** — `career_fit_test_work_sample`
  - **Information-conversation test** — `career_fit_test_conversation`
  - **Mini-project / real-context exposure** — `career_fit_test_real_context`

### CAR_G08 — למצוא עבודה חדשה כשעדיין לא ברור לי בדיוק לאילו תפקידים לכוון
- subtype: `LAND_ROLE`
- primary bottleneck: `DIRECTION_GAP`
- linked Expert: `career`
- variants:
  - **Criteria-first target** — `job_target_criteria_first`
  - **Evidence-from-postings target** — `job_target_postings_first`
  - **Conversation-first target** — `job_target_conversation_first`

### CAR_G09 — לשפר את ההצגה של הניסיון שלי כדי לקבל יותר תגובות
- subtype: `LAND_ROLE`
- primary bottleneck: `PROOF_GAP`
- linked Expert: `career`
- variants:
  - **Existing-evidence extraction** — `proof_extract_existing`
  - **Targeted artifact/proof build** — `proof_build_artifact`
  - **Role-story translation** — `proof_role_story_translation`

### CAR_G10 — להגיע ליותר הזדמנויות ואנשים רלוונטיים בחיפוש עבודה
- subtype: `LAND_ROLE`
- primary bottleneck: `OPPORTUNITY_ACCESS_GAP`
- linked Expert: `career`
- variants:
  - **Warm-network route** — `access_warm_network`
  - **Repeated-community route** — `access_repeated_community`
  - **Targeted information-conversation route** — `access_targeted_conversations`

## How this moves the product forward

The architecture is now cleanly separated:

- **Expert** diagnoses subtype/bottleneck and professional appropriateness.
- **Central Journey Library** stores candidate Journeys and their Expert links.
- **Matching** ranks variants inside the appropriate family using the user profile and goal-specific signals.

Example: if a user says “I apply but nobody responds,” Career first decides whether the real problem is unclear target (`CAR_G08`), proof (`CAR_G09`), or access (`CAR_G10`). Only then does matching choose a variant.

## Validation

### CAR_G01
- Errors: **none**
- Note: career_direction_clarity_first: legacy variant lacks allocation metadata
- Note: career_direction_action_first: legacy variant lacks allocation metadata
- Note: career_direction_hybrid: legacy variant lacks allocation metadata

### CAR_G02
- Errors: **none**
- Notes: none

### CAR_G03
- Errors: **none**
- Notes: none

### CAR_G08
- Errors: **none**
- Notes: none

### CAR_G09
- Errors: **none**
- Notes: none

### CAR_G10
- Errors: **none**
- Notes: none

## Next recommended build

Continue Job Search with:
- `CAR_G11` — sustainable search process
- `CAR_G12` — interview progression
- `CAR_G13` — restart after repeated rejection

That would bring the Career-linked section of the central library to **27 Journeys**.

## Language from now on

Prefer: **“Journeys linked to the Career Expert”** or **“Career-linked section of the central Journey Library.”**

Avoid: **“the Journey library inside the Career Expert.”**