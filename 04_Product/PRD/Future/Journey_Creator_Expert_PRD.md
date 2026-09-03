# Journey Creator Expert

Stage: **Future Vision — near-term architecture task; release stage still Open Question**  
Status: **Open task; not implemented**

## Problem

A Domain Expert may correctly determine that the approved Journey Library contains no sufficiently
relevant Journey. The current temporary behavior is for the Coach to say so without forcing a poor
match. PushApp needs a separate internal Expert that can draft a new Journey for this situation.

## Approved boundary

- The Coach remains the only actor that speaks with the user.
- A Domain Expert diagnoses and recommends existing Journeys; it does not author new ones.
- The Journey Creator Expert receives a minimal, de-identified requirements brief only after a
  separate consent decision is specified. It must not receive the transcript, identity, raw free
  text, unrelated Dreams/Journeys, or social graph.
- Its output is a draft Journey requiring the normal Coach explanation and user approval. It never
  starts a Journey silently.

## Required integration cleanup

When this Expert is connected:

1. Replace the temporary Career `no_match` conversation branch with the Creator handoff.
2. Remove the temporary “no relevant Journey was found” copy where a safe handoff is available.
3. Add a regression test proving there is no stale fallback and no automatic transfer of old/raw
   consultation data.
4. Preserve a truthful no-match outcome when creation is unsafe, declined, or unavailable.

## Open questions

- Exact roadmap stage and release gate.
- The consent surface and the closed schema of the de-identified requirements brief.
- Draft validation, safety review, provenance, versioning, and publication rules.
- Whether personal drafts ever enter the shared Journey Library; default is **no**.
