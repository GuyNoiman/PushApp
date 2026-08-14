# PushApp Content Version Policy — v1.1 Content Candidate

## Decision

From this release forward, the **official content version is the package version**.

Current release:
**`v1.1 Content Candidate`**

The older numbers (`0.7`, `0.9`, `0.10`, `0.11`, `0.12`) are retained only as **source lineage / authorship history**. They no longer mean that one domain is "on an older current version" than another.

All content supplied in this package should be evaluated as one release.

## Why

The components were developed sequentially, so their historical document headers diverged even though they are now part of one coherent system.

A single release version makes it clear which combination of:
- meta-agent;
- Experts;
- Journeys;
- calibration suites;
- on-call logic;
- safety/referral rules;
- evals

belongs together.

## Going forward

- Product/content handoffs use one package version.
- Historical source-lineage metadata may remain for traceability.
- A domain can still have a maturity/safety **status** separate from version:
  - content-calibrated;
  - safety-gated;
  - clinical review required;
  - production-cleared.

Version and safety maturity are not the same thing.
