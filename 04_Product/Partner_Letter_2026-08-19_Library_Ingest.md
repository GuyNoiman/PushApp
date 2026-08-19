# Letter to the coaching partner — your v0.6 library is in, and one thing changed shape on the way

Status: **Draft for the founder's review and sending. NOT SENT.** Prepared 2026-08-19 after ingesting
`07_Assets/01_Central_Journey_Library_Career_Linked_v0.6.md` and its JSON companion.
Follows `04_Product/Partner_Letter_2026-08-18.md` (architecture) — this one is about the content itself.

The founder's instruction, in his words: this is *"something to share and agree on together with the
partner."* Nothing below is presented as settled; the one structural change is explained with its
reasoning so it can be argued with.

---

# Letter begins

Hello,

The v0.6 package is in the app. All eighteen Career Journeys, all six goal families, in both Hebrew and
English, validated by tests that fail the build if a Step points at a stage that does not exist. Thank
you — the arcs are genuinely good, and the difference between the three routes in each family is a real
difference, which is the thing that is hard to write and the thing everything else depends on.

Three things to tell you: one structural change, two small ones, and then what we need next.

## 1. The three "variants" in each family became three JOURNEYS, not three versions of one

This is the only change of substance, and it is worth a minute.

In our model there are two different objects, and the line between them is a rule the founder set:

- **Same Milestones, different pace or path** ⇒ the same Journey in another **version**.
- **Different Milestones** ⇒ a **different Journey** for the same goal.

Look at CAR_G01. Clarity-first reaches "I have two plausible directions worth testing" as its second
Milestone; Action-first's second Milestone is "I have turned what I learned into two plausible
directions", and its first is an experiment that Clarity-first does not run until its fourth stage.
Those are not the same arc at two speeds. They are two arcs.

So the three of them live in the app as three Journeys, grouped in a **goal family** that holds:

- the goal, in the user's own words;
- the diagnosis that lands someone there — your `subtype` and `primaryBottleneck`, kept exactly as you
  wrote them, as opaque strings the engine matches and never interprets;
- **the axis they differ along** — your `variantAxis`, which is the single most useful field in the
  package — and the question that places a user on it;
- the three member Journeys and where each sits on that axis.

**Nothing of yours was lost.** The family IS your family, the axis IS your axis, and the ranking in your
`matchingHypothesis` became "which position on the axis each Journey covers", plus a weaker secondary
pull from the user's onboarding answers. What changed is only which object holds what.

Why it matters to you as an author: **a Journey is now the unit that gets rated.** Persistence, the stage
someone reached before dropping, completion and the end-of-Journey verdict all accumulate per Journey. If
three arcs had been three "versions of one Journey", the evidence would have pooled and we could never
have learned that your conversation-first route works for a particular kind of person and your
criteria-first route does not. Splitting them is what makes your three routes comparable.

If you disagree, the place to push is exactly this: is there a family where you meant the three to be one
arc walked differently? That would be a version, and we would hold it as one.

## 2. The personas did not come across, and one line of their content had to be generalised

Your package is built around Dana, with a persona, a capacity, and a Dream. We kept none of that, for one
reason: in this product **a Dream belongs to the person living it.** A library Journey that arrived
holding somebody else's Dream would be the app telling a user what to want.

The same applies one level down, and here it touched your Step text. In CAR_G02 the Steps name Dana's own
two options ("Product Operations", "Customer Success Operations"), and in CAR_G03 they name her target
role ("Data Analyst"). Those now read "the first option", "the second option", "the direction you are
testing". The instruction is unchanged; the specifics are the user's to fill.

Worth saying because it affects how you write the next batch: **write the Steps for anyone with that
bottleneck, not for the persona.** The persona is a brilliant tool for checking that an arc is realistic.
It should not survive into the Step.

## 3. Two small things

**The English words.** Your Hebrew carries `proof`, `artifact`, `evidence`, `skill gap`, `insight`,
`follow-up`, `patterns`, `ownership`, `intro`, `familiarity`. In the app they are Hebrew: הוכחה, תוצר,
ראיות, פער יכולת, תובנה, פנייה חוזרת, דפוסים, אחריות מקצה לקצה. Not a matter of taste — a user reading
their own language should not have to translate half a sentence, and mixed-language copy reads as a
draft.

**Form of address.** Your Steps are written to a woman ("בחרי", "הפכי"), which was right for Dana. Our app
asks the user how to address them, so each Step now exists in both forms. Your feminine wording is the one
the app uses for a woman — we did not throw it away, we made it the feminine variant. **Please keep writing
in whichever form is natural to you; we will do this conversion.**

## 4. Where it stands, honestly

The content is in, valid and translated. It is **not yet reachable**: choosing a family requires the
Career expert to work out which of the six a person's goal actually is — is the problem the target
(CAR_G08), the proof (CAR_G09), or the access (CAR_G10)? — and today the expert asks four questions and
returns one fixed arc for everybody. That diagnosis is the next piece of work, and it is ours, not yours.

## 5. What would help most next

1. **A confirmation or an argument about §1** — three Journeys per family, or did you mean one arc walked
   three ways somewhere?
2. **The diagnosis itself**, which is the piece we are missing and you are best placed to write: for a
   person who says "I apply and nobody answers", what does one ask, in what order, to tell an unclear
   target from missing proof from no access? Your document says the expert decides this; it does not say
   how, and how is what we have to build.
3. Then CAR_G11–G13 as you proposed, which brings the Career section to 27.

Thank you again. This was a package that could be ingested in a day precisely because it was structured,
consistent and honest about what it was asserting — including the note that `libraryMeta.linkedExpertIds`
was authoring metadata and not a claim about our model. That saved us a wrong guess.

# Letter ends

---

## Notes for the founder (not part of the letter)

- **§1 is the only place the partner might reasonably push back**, and if he does, the model can hold his
  answer either way: one arc with several versions is exactly what `JourneyDefinition.variants` is for.
- **§5.2 is the real ask.** Without a diagnosis, eighteen Journeys are eighteen good documents. It is also
  work only a domain expert can do, which is what he is for.
- Nothing in this letter commits us to a date.
