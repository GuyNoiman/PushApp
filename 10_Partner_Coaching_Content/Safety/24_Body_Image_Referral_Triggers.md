> **Official release:** PushApp Content `v1.1 Content Candidate`  
> Any older version number below is retained as **source lineage only**, not the current release version.

# 24 — Body Image Referral & Safety Triggers

**Version:** 0.10-content  
**Status:** Operational content proposal; **requires formal clinical/safety review before shipping**.  
**Purpose:** convert high-level boundaries into observable triggers, routing category and user-facing intent.

> PushApp does not diagnose. These triggers mean “ordinary coaching is no longer the right response,” not “the user has condition X.”

---

# 1. Priority levels

## `CRISIS_NOW`
Normal coaching stops immediately.

## `PROMPT_PROFESSIONAL_ASSESSMENT`
Do not continue optimization. Encourage timely qualified assessment.

## `SPECIALIST_CONTENT_NEEDED`
The goal itself may be fine, but individualized professional judgment is required.

---

# 2. Suicide / self-harm — all Body Image branches

## Trigger: `SUICIDE_SELF_HARM`

Detect when the user explicitly reports or strongly indicates:
- wanting to die / kill themselves;
- current thoughts of suicide;
- making a plan or researching ways to die;
- current intent to self-harm;
- recent self-harm connected to current danger;
- saying there is no reason to live **in a context that raises immediate safety concern**.

### Priority
`CRISIS_NOW`

### Expert action
`STOP_NORMAL_COACHING`

### User-facing intent
> “I’m concerned about your safety. Let’s stop the body/food/exercise coaching and focus on getting human support now.”

The technical safety layer supplies localized crisis/emergency routing.

### Do not
- continue Body Image questions;
- discuss weight, food or workouts first;
- attempt therapy;
- argue the person out of suicidal thoughts.

**Evidence basis:** NIMH suicide warning signs and eating-disorder suicide risk.

---

# 3. Possible eating-disorder pattern

## Trigger: `RESTRICTIVE_PATTERN_CONCERN`

Examples:
- severe or escalating restriction/avoidance;
- progressively narrowing accepted foods;
- intense fear of weight gain driving food restriction;
- food/weight/shape control becoming dominant.

### Priority
`PROMPT_PROFESSIONAL_ASSESSMENT`

### Say
> “What you’re describing can overlap with patterns that deserve assessment from a qualified eating-disorder or health professional. I don’t want to optimize the routine around it.”

---

## Trigger: `LOSS_OF_CONTROL_EATING_CONCERN`

Examples:
- recurrent episodes described as loss of control;
- unusually large/rapid eating paired with distress, shame or secrecy;
- repeated pattern rather than one ordinary overeating event.

### Priority
`PROMPT_PROFESSIONAL_ASSESSMENT`

### Do not
Prescribe restriction, fasting or “reset” rules.

---

## Trigger: `PURGING_OR_COMPENSATION`

Examples:
- self-induced vomiting;
- laxative/diuretic misuse;
- fasting to compensate;
- excessive exercise intended to compensate for eating;
- repeated “earning/burning” food logic tied to distress.

### Priority
`PROMPT_PROFESSIONAL_ASSESSMENT`  
Escalate further if medical danger/immediate self-harm is present.

### Say
> “I don’t want to coach around compensating for food. This is something a qualified professional should assess, and we should pause normal Body Image optimization.”

---

## Trigger: `RAPID_WEIGHT_LOSS_OR_MEDICAL_ED_SIGNS`

Examples:
- rapid/unexplained weight loss;
- fainting;
- significant dizziness;
- palpitations;
- marked weakness or signs suggestive of malnutrition/dehydration.

### Priority
`PROMPT_PROFESSIONAL_ASSESSMENT`, with urgent medical routing where symptoms are acute/severe.

### Rationale
NICE lists rapid weight loss, excessive exercise and physical signs such as dizziness, palpitations and fainting as relevant risk/recognition information.

---

# 4. Movement medical triggers

## Trigger: `CHEST_OR_FAINTING_SYMPTOM`

Examples during/around activity:
- chest pain/tightness;
- fainting or near-fainting;
- severe/unusual shortness of breath;
- palpitations plus concerning symptoms.

### Priority
`CRISIS_NOW` or urgent medical pathway depending on local clinical logic.

### Expert action
Stop movement coaching. Do not tell the user to continue at lower intensity.

---

## Trigger: `INJURY_OR_WORSENING_PAIN`

Examples:
- acute injury;
- pain getting worse with activity;
- user asks how to “train through” pain;
- return-to-sport/rehab decisions.

### Priority
`SPECIALIST_CONTENT_NEEDED` or prompt medical/physio assessment depending on severity.

### Say
> “I can help you stay consistent around a professional plan, but I shouldn’t decide how to train through pain or rehabilitate an injury.”

---

# 5. Medical/dietetic personalization triggers

## Trigger: `MEDICAL_DIET_OR_ALLERGY`

Examples:
- diagnosed food allergy;
- therapeutic diet;
- diabetes/renal/GI/other condition where dietary content is clinically relevant;
- user asks which foods/amounts are medically appropriate.

### Priority
`SPECIALIST_CONTENT_NEEDED`

PushApp may support adherence to a qualified professional’s plan, but not invent the plan.

---

## Trigger: `PREGNANCY_OR_POSTPARTUM_INDIVIDUALIZATION`

If the user needs individualized eating/exercise decisions during pregnancy/postpartum or reports complications/symptoms:

### Priority
`SPECIALIST_CONTENT_NEEDED`

Do not improvise training or nutritional prescriptions.

---

# 6. Body-preoccupation / mental-health boundary

## Trigger: `BODY_PREOCCUPATION_IMPAIRMENT`

Examples:
- body/appearance thoughts take up large parts of the day;
- broad avoidance of normal life because of appearance;
- compulsive/rigid checking or concealment described as overwhelming;
- distress appears beyond low-intensity coaching;
- body concern co-occurs with depression/self-harm.

### Priority
`PROMPT_PROFESSIONAL_ASSESSMENT`

### Say
> “This sounds like it is taking up a lot of your life. I can help with small behavior frameworks, but this level of distress deserves support from a qualified mental-health professional.”

Do not diagnose body dysmorphic disorder or another condition.

---

# 7. Safety decision hierarchy

1. **Immediate safety/medical danger?** → crisis/urgent route.
2. **Possible eating disorder or clinically significant body preoccupation?** → stop optimization + professional assessment.
3. **Individualized medical/dietetic/exercise judgment needed?** → qualified specialist.
4. **No red flags?** → ordinary Body Image coaching.

---

# 8. Language rules

### Good
- “deserves assessment”
- “outside what PushApp should coach through”
- “I don’t want to optimize around something that may need professional care”
- “qualified eating-disorder / medical / dietetic / exercise professional”

### Avoid
- “you have an eating disorder”
- “this is anorexia/bulimia”
- “you are medically unstable”
- “you’re fine”
- “it’s just body image”
- weight-based assumptions.

---

# 9. Required review before shipping

This trigger set is an **authoring artifact, not clinical approval**.

Before broad real-user exposure:
- clinical review by an eating-disorder-informed professional;
- medical review of acute-symptom routing;
- localized crisis routing;
- age/minor policy;
- adversarial testing across body sizes and genders;
- privacy review for sensitive eating/body free text.
