# Research — Communication Style Personalization

Status: Research foundation for `04_Product/PRD/Communication_Style_Profile_PRD.md`.
Date: 2026-08-12.
Scope: supportive behavior-change communication and individual differences relevant to PushApp notifications
and eligible Coach phrasing. PushApp is not a therapist or medical provider.

---

## 1. Research question

Is there evidence that different people benefit from or prefer different communication styles, and which
dimensions are defensible for a short preference questionnaire in PushApp?

## 2. Executive conclusion

Yes, there is evidence that matching communication to individual processing and motivational preferences can
improve perceived relevance, persuasiveness, intentions, and in some studies behavior. The strongest useful
dimensions for PushApp are:

1. **concise/action-first versus explanatory/rationale-rich communication**;
2. **promotion/momentum emphasis versus vigilance/responsibility emphasis**;
3. **relational warmth and empathy**;
4. **autonomy support versus controlling language**.

However, the evidence does **not** validate a universal four-personality taxonomy or prove that a six-item
preference quiz will improve long-term behavior. Effects vary by context and are often modest. PushApp should
therefore treat the result as an editable communication preference, not a personality, diagnosis, or hidden
persuasion profile. Product analytics must test whether the feature improves comprehension and user-rated fit
without optimizing pressure or exploiting vulnerability.

Autonomy support is a safety baseline across all variants, not one selectable style. Even users who prefer
direct communication should receive choice-respecting, non-shaming language.

## 3. Evidence by dimension

### 3.1 Autonomy-supportive versus controlling language

[Ng et al., Self-Determination Theory applied to health contexts](https://selfdeterminationtheory.org/SDT/documents/2012-NgNtoumanis_PPS.pdf)
meta-analyzed health-context evidence around autonomy, competence, and relatedness. The model links
autonomy-supportive environments with need satisfaction, autonomous self-regulation, adherence, and health
outcomes.

[Gillison et al., meta-analysis of SDT techniques](https://pubmed.ncbi.nlm.nih.gov/30295176/) included 74
studies, most randomized or cluster-randomized. Need-supportive interventions improved perceived autonomy
support, autonomy, competence, relatedness, and motivation. The authors found that a combination of techniques
creates the supportive environment; isolated techniques had limited independent effects.

[Resnicow and McMaster, Motivational Interviewing overview](https://pmc.ncbi.nlm.nih.gov/articles/PMC3330017/)
describes Motivational Interviewing as collaborative and empathic, respecting autonomy and using reflective
listening/shared decision-making rather than imposing motivation.

[Smit et al., autonomy-supportive digital message experiment](https://www.jmir.org/2019/10/e14074) examined
autonomy-supportive language and choice in computer-tailored communication. It supports studying message-frame
preferences in digital contexts, but also reports that participants generally rated all tested messages
positively; results do not justify a coercive style.

**PushApp implication:** every style must preserve choice, rationale where needed, factual urgency, and respect.
“Controlling” is not a valid user option. Direct must mean concise, not commanding.

### 3.2 Need for cognition: concise versus detailed

[Hawkins et al., Targeting or Tailoring?](https://pmc.ncbi.nlm.nih.gov/articles/PMC2728473/) summarizes field
experiments matching messages to information-processing styles. People high in need for cognition tend to
prefer detailed information and explanation; people low in need for cognition tend to prefer simpler,
lower-complexity messages. Matched messages were generally more persuasive than mismatched messages in the
reviewed programs.

[Nikoloudakis et al., need for cognition in computer-tailored interventions](https://cris.maastrichtuniversity.nl/en/publications/can-you-elaborate-on-that-addressing-participants-need-for-cognit)
argues that digital interventions may improve relevance by adapting detail/complexity, while noting practical
measurement challenges.

**PushApp implication:** a concise Direct style and a context/rationale-rich Explanatory style have a more
defensible research distinction than “direct versus calm.” Notification length remains bounded; Explanatory
means one useful reason or context, not a paragraph on the lock screen.

### 3.3 Regulatory focus: promotion versus prevention/vigilance

[Ludolph and Schulz, systematic review of regulatory fit](https://www.sciencedirect.com/science/article/pii/S0277953615000295)
reviewed 30 studies and found that matching the strategy/frame to promotion or prevention orientation often
increased communication effectiveness across domains/outcomes. Limitations include heavy reliance on US
student samples and behavioral intentions rather than observed long-term behavior.

[Latimer et al., tailored fruit-and-vegetable messages](https://pmc.ncbi.nlm.nih.gov/articles/PMC2739374/)
randomized 518 participants to promotion- or prevention-oriented messages and found some evidence at four
months that regulatory-fit messages were more effective.

[A meta-analysis of regulatory fit](https://www.sciencedirect.com/science/article/pii/S1057740813000971)
synthesized more than 120 articles and found effects on evaluation, intention, and behavior, moderated by how
fit and orientation were created and by context.

[Cochrane review of positive/negative framing](https://pmc.ncbi.nlm.nih.gov/articles/PMC12926860/) found little
consistent behavioral benefit for simple positive-versus-negative framing. Regulatory fit should not be
reduced to frightening some users with loss messages.

**PushApp implication:** Energizing may emphasize forward movement, capability, and attainment. Factual
vigilance can appear where the event genuinely requires it, but PushApp should not offer a fear/loss style.
The event itself (for example an honestly at-risk Streak) carries the necessary vigilance; wording remains
supportive.

### 3.4 Empathy, warmth, and relatedness

Motivational Interviewing and Self-Determination Theory both treat empathy, collaboration, and relatedness as
important components of supportive communication. The SDT meta-analysis above found a smaller average effect
for relatedness than autonomy/competence, but still a positive association.

[Murray et al., randomized communication-skills trial](https://selfdeterminationtheory.org/wp-content/uploads/2015/04/2015_MurraryEtAl.pdf)
showed that clinicians trained in need-supportive communication were rated substantially more supportive than
controls in assessed sessions. It does not isolate warmth as a standalone causal message style.

**PushApp implication:** Warm is a valid preference dimension because some people value felt support and
human acknowledgement. It must not imply sentience, dependency, therapy, or an intimate relationship with the
app.

### 3.5 Tailoring helps, but matching is not automatically beneficial

[Hawkins et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC2728473/) provides evidence for tailoring to stable
processing preferences, but its examples often use longer interventions and validated constructs rather than
six notification choices.

[Physician communication-style and decision quality study](https://pmc.ncbi.nlm.nih.gov/articles/PMC5121061/)
found that patients who preferred directive communication did not necessarily report better decision quality
when they received it; autonomy-supportive communication could still perform better. Preference matching must
therefore not override safe communication principles.

[Experimental recommendation algorithms for tailored health communication](https://bubble.labs.vu.nl/ccr/article/view/22)
notes that, despite broad evidence for tailored communication, research on algorithms predicting the best
message for an individual remains limited.

**PushApp implication:** asking users which wording they prefer is appropriate for comfort and agency, but the
product must not claim the selected style is clinically optimal. Style should remain editable, manual, and
transparent. PushApp should not automatically experiment on the user in MVP.

## 4. Recommended product synthesis

The research does not supply four ready-made notification “types.” The following are product profiles derived
from research dimensions:

| Product style | Primary research dimension | What varies | What never varies |
|---|---|---|---|
| Direct | lower desired complexity / action orientation | brevity, action-first order | autonomy, truth, respect |
| Explanatory | higher desired context / need for cognition | rationale and useful context | bounded length, same action |
| Warm | empathy / relatedness preference | human acknowledgement and care | no dependency or therapy claim |
| Energizing | promotion focus / competence | momentum, attainment, capability | no hype, shame, or fabricated urgency |

These profiles intentionally do not include a controlling, punitive, fear-based, or loss-focused style.
Autonomy support is mandatory across all four.

## 5. Questionnaire validity limitations

The proposed six forced-choice notification comparisons measure **stated wording preference in context**. They
do not directly measure need for cognition, regulatory focus, attachment, personality, or treatment response.

Risks:

- preference may change by event (a user may want Direct reminders and Warm recovery messages);
- fictional notification previews may not predict response during real stress;
- answer order, length, and stronger copy quality can bias results toward one style;
- a plurality winner can hide a mixed profile;
- culture and language change how warmth, directness, and energy are perceived;
- choosing a message does not prove it will improve behavior.

MVP mitigations:

- semantic parity and comparable length within each event;
- random answer order;
- six varied real events;
- conditional tie-break rather than hidden weights;
- native localization and cultural review;
- editable result and Calm/neutral fallback;
- no automated behavioral optimization.

## 6. Recommended validation after MVP

Before claiming effectiveness, evaluate:

1. whether users recognize and prefer their selected style in blinded examples;
2. questionnaire test-retest stability over several weeks;
3. user-rated clarity, pressure, warmth, and fit;
4. notification opens and subsequent relevant action, without optimizing raw engagement;
5. Step/Journey continuation and opt-out rates;
6. differences by language/culture and accessibility needs;
7. adverse signals: guilt, pressure, annoyance, dependency, or misunderstanding.

Any future automatic adaptation requires a separate PRD, consent/privacy review, and evidence that it improves
real-life transformation rather than time-in-app.

## 7. Research-backed decision

For MVP, use four product styles — **Direct, Explanatory, Warm, Energizing** — while describing them as editable
communication preferences, not scientific personality categories. Keep autonomy-supportive, competence-safe,
truthful language as a non-negotiable baseline across every style.

