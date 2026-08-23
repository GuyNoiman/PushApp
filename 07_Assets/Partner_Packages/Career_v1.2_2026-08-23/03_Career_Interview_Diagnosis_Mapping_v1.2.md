# Career Expert — Interview → Signal Mapping v1.2
**Source language:** English. The coach translates at runtime.
The coach should not ask all eleven questions. It listens to the opening message first and asks only the probes whose signal is still unresolved and can change routing.

## C1 — `careerDirectionClarity`
**Question:** How clear are you about the direction or kind of role you are aiming for right now?
**Ask when:** The opening message does not already make direction clarity obvious.

**Answer kinds**
- **unclear → `unclear`**: The person cannot name one coherent direction or role family, names several materially different possibilities, or says the main task is figuring out what they want next.
- **partial → `partial`**: The person has one or two plausible directions but is still comparing, testing, or unable to choose between them.
- **clear → `clear`**: The person can name one reasonably coherent direction or role family and describe the kind of work they are trying to move toward.

## C2 — `activeJobSearch`
**Question:** Are you already actively looking or applying for work, or are you still deciding and preparing?
**Ask when:** The opening message does not already show whether an active search is underway.

**Answer kinds**
- **active → `yes`**: The person is currently applying, reaching out, interviewing, or otherwise pursuing external roles now.
- **not_active → `no`**: The person is still choosing a direction, preparing, building readiness, or thinking about a future move without an active search yet.

## C3 — `targetClarity`
**Question:** What kinds of roles are you applying for right now?
**Ask when:** activeJobSearch=yes.

**Answer kinds**
- **broad → `broad`**: Applications span materially different role families, the target changes from posting to posting, or the person cannot describe one reasonably coherent target.
- **clear → `clear`**: Most current applications belong to one reasonably defined role family and the person can explain what that target is.

## C4 — `existingRelevantExperience`
**Question:** Looking at the work you want to do next, what have you already done that is genuinely similar?
**Ask when:** A target direction or role is clear enough to compare against.

**Answer kinds**
- **yes → `yes`**: The person can point to at least one concrete example from work, a project, volunteering, study, or an adjacent role where they performed a meaningful part of the target work.
- **no → `no`**: The person cannot point to a real example of doing the core target work yet; the gap is likely capability or first exposure rather than presentation alone.
- **unknown → `unknown`**: The answer is too vague to tell whether the experience is actually relevant, or the person is unsure what the target work requires.

## C5 — `visibleProofMissing`
**Question:** When you do have relevant experience, how easy is it to show that with a concrete example someone else could understand?
**Ask when:** existingRelevantExperience=yes.

**Answer kinds**
- **missing → `yes`**: The person says they can do the work but their CV/profile only lists responsibilities, their strongest examples are hard to explain or inaccessible, or they struggle to make the evidence credible to someone who was not there.
- **available → `no`**: The person already has concrete, understandable examples or artifacts that make the relevant ability visible to an outsider.
- **unknown → `unknown`**: There is not enough detail yet to judge whether the problem is missing proof or something else.

## C6 — `peopleAccess`
**Question:** How much access do you have to people in the field or to real conversations around the opportunities you want?
**Ask when:** The route may depend on opportunity/access rather than target or proof.

**Answer kinds**
- **yes → `yes`**: The person can name relevant people, communities, former colleagues, warm connections, or realistic channels through which a real conversation or introduction can happen.
- **no → `no`**: The search depends almost entirely on anonymous applications or passive browsing, and the person cannot currently name realistic people or channels they can reach.
- **unknown → `unknown`**: The person has not tried to use people/channels yet or cannot tell what access is realistically available.

## C7 — `recentInterviewEvidence`
**Question:** Have you had a recent interview for the kind of role you are trying to get?
**Ask when:** The user reports interview difficulty or the coach needs evidence about the interview stage.

**Answer kinds**
- **yes → `yes`**: There is a recent, target-relevant interview the person can still reconstruct well enough to learn from.
- **no → `no`**: There has not been a recent interview for the current target, or the available interview is too old or too different to be useful evidence.
- **unknown → `unknown`**: It is unclear whether the interview was recent or relevant enough to the current target.

## C8 — `searchHistorySufficient`
**Question:** Have you done enough focused searching with the same target to see a real pattern yet?
**Ask when:** The coach is tempted to diagnose a search failure from a small or mixed sample.

**Answer kinds**
- **yes → `yes`**: There have been several comparable attempts with a reasonably stable target and process, enough that the same failure point has repeated and is not just one isolated outcome.
- **no → `no`**: There are too few attempts, the target has changed too much, or the search actions are too different to support a reliable diagnosis yet.
- **unknown → `unknown`**: The person cannot reconstruct enough of the recent search to tell whether a stable pattern exists.

## C9 — `targetStillMeaningful`
**Question:** After what you have tried, does this still feel like something you genuinely want to pursue?
**Ask when:** Persistence, repeated rejection, or a stalled transition is becoming the main issue.

**Answer kinds**
- **yes → `yes`**: The person still wants the outcome for reasons that matter to them, even if the current tactic or pace needs to change.
- **no → `no`**: The person is mainly continuing because of sunk cost, external pressure, identity, or fear of stopping, and would not clearly choose the target again now.
- **unknown → `unknown`**: The answer is genuinely ambivalent or the person cannot separate desire for the goal from pressure around it.

## C10 — `realisticCapacity`
**Question:** How much time and energy can you realistically protect for this in a normal week?
**Ask when:** The opening message and onboarding do not already answer it.

**Answer kinds**
- **very_light → `very_light`**: The person can reliably offer only very short bursts and cannot protect a full hour most weeks.
- **light → `light`**: The person can usually protect up to about one hour per week.
- **moderate → `moderate`**: The person can usually protect about one to three hours per week.
- **substantial → `substantial`**: The person can usually protect more than three hours per week.
- **variable → `variable`**: Capacity swings enough from week to week that one stable weekly number would be misleading.

## C11 — `socialSupportFit`
**Question:** For this goal, would involving other people make it easier to move, or would it mostly add friction?
**Ask when:** A Journey may rely on conversations, feedback, community, accountability, or another person's involvement.

**Answer kinds**
- **helpful → `helpful`**: The person generally finds that the right other person makes action easier, clearer, or more likely to happen.
- **neutral → `neutral`**: Other people are acceptable but are not an important source of momentum or friction.
- **friction → `friction`**: Coordination, exposure, asking for help, or being observed tends to make the person delay, avoid, or disengage from this goal.
- **depends → `depends`**: Whether people help depends strongly on who is involved or on the type of interaction.

# Conditional routing probes

## T1 — `transitionType`
**Question:** What kind of transition are you actually making: a new field or function, a new industry in the same kind of work, a new function in the same industry, returning after a break, or planning an exit?
- **new_field_or_function → `new_field_or_function`**: The target changes the core professional field or function.
- **new_industry_same_function → `new_industry_same_function`**: The person wants essentially the same kind of work in a different industry.
- **new_function_same_industry → `new_function_same_industry`**: The industry stays roughly the same but the function/role changes.
- **reentry → `reentry`**: The person is returning to the labor market after a meaningful break.
- **planned_exit → `planned_exit`**: The immediate goal is to leave the current role in a staged, non-panic way before or while deciding the next move.

## T2 — `transitionPrimaryGap`
**Question:** What is the main bridge missing right now: ability to do the work, proof that you can do it, access to the right people or opportunities, clarity about the direction, or a life constraint that has to be respected first?
- **capability → `capability`**: The person genuinely cannot yet perform enough of the target work at a usable baseline.
- **proof → `proof`**: The person can do relevant work but cannot yet make that ability visible or credible to the target market.
- **access → `access`**: The target and ability are plausible, but the person lacks realistic channels to people, opportunities, or exposure.
- **direction → `direction`**: The person is not yet clear enough on which transition target to build toward.
- **context_constraint → `context_constraint`**: Time, money, caregiving, health, geography, legal/work status, or another real-world constraint currently determines feasibility more than content does.

## G1 — `concretePromotionTarget`
**Question:** Is there a specific next level, role, or promotion you are aiming for, or do you mainly want more growth in your current role?
- **yes → `yes`**: The person can name a concrete next level/role/promotion target that exists in their context.
- **no → `no`**: The person wants growth, learning, or more responsibility but is not pursuing one specific next level.
- **unknown → `unknown`**: The person suspects a next step exists but cannot yet define it clearly enough to route as a concrete promotion target.

## G2 — `growthSubBottleneck`
**Question:** What is actually blocking growth where you are now: not enough responsibility, a capability you still need, not enough visibility or access, or a limit in the role or workplace itself?
- **responsibility_scope → `responsibility_scope`**: The person is capable of more but their current scope does not give them enough ownership or stretch.
- **capability → `capability`**: A real skill/capability gap prevents the next level of work.
- **access_visibility → `access_visibility`**: The ability may exist, but the person lacks visibility, sponsorship, stakeholder access, or an opportunity to demonstrate it.
- **context_constraint → `context_constraint`**: The workplace or role itself does not offer a realistic path for the desired growth.

## G3 — `currentRoleFitLever`
**Question:** If the main problem is fit in your current role, what would most improve it: the mix of work you do, how you work with people, or how much learning and growth the role gives you?
- **task_mix → `task_mix`**: The main mismatch is the type or proportion of tasks and responsibilities.
- **collaboration → `collaboration`**: The main mismatch is how the person works with colleagues, manager, stakeholders, or team interfaces.
- **learning_growth → `learning_growth`**: The work is tolerable but feels stagnant because there is too little learning, stretch, or development.
- **context_constraint → `context_constraint`**: The problem is not realistically changeable through task, collaboration, or growth redesign inside the current context.
