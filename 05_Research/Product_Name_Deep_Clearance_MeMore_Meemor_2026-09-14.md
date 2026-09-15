# Research — Deep Name Clearance: MeMore / Meemore / Meemor

Date: **2026-09-14**
Status: **Research only. This is not legal advice and not a trademark clearance opinion.**
Author: product-manager agent, at the founder's request.

> **Read this first.** Everything below is open-source desk research: app-store search APIs,
> registry RDAP domain records, public web search, and company/press pages. It reports **what
> exists**. It deliberately does **not** state an opinion on likelihood of confusion, infringement,
> or registrability — those are lawyer questions. Before the name is put on a store listing, a
> business registration, or a logo, a trademark attorney must run a real clearance search in the
> intended territories and classes.

## Why this document exists

`05_Research/Product_Name_Collision_Screening_2026-08-12.md` was a first-pass screen across ~28
candidates. It ended with **MeMore** marked *Medium risk / worth deeper clearance* because of
existing `Memore` products, and recommended a second round before the brand accrued emotional or
design investment. That investment has since happened — the approved onboarding screens are already
branded — so the second round is now overdue.

This file **does not replace** the 2026-08-12 screening or the
`Product_Name_Candidate_Register.md`. It extends both, for two spellings only.

---

## 0. The ambiguity that has to be resolved first

Two spellings of the same intended name are live in the project **at the same time**:

| Where | Spelling used |
|---|---|
| Approved onboarding designs — `output/onboarding/meemore-onboarding-screens/` (28 PNGs, EN + HE, light + dark) | **meemore** / **MeMore** |
| Approved-screens bundle — `output/pdf/MeMore_Onboarding_Approved_Screens.pdf`, `output/onboarding/MeMore_Onboarding_Approved_Screens.zip` | **MeMore** |
| The new handoff spec the founder circulated (`Meemor_Onboarding_Journey_Matching_Handoff_Spec_v2.md`, not yet committed to this repo) | **Meemor** |
| `05_Research/Product_Name_Candidate_Register.md` (leading-candidate table) | **MeMore** |

Note that the design folder itself already mixes two things: the directory is `meemore-…` (double-e)
while the exported PDF/ZIP are `MeMore_…` (single-e). So there are effectively **three** written
forms in flight: `MeMore`, `meemore`, `Meemor`.

**This is itself the most immediate risk in this document,** and it is the only one that is entirely
within our control. Every day the ambiguity persists, more assets, filenames, copy strings, store
metadata and screenshots get created against a spelling that may not survive. It also makes every
collision check in this file twice as expensive, because each check has to be run per spelling.

**Recommendation: pick one spelling this week, before any further branded asset is produced.**
Categorize: **Open Question** — the founder decides. Nothing in this document should be read as the
decision already having been made.

---

## 1. App stores

### Method

- Apple: the public iTunes Search API (`itunes.apple.com/search`), US storefront, `entity=software`.
  This is the same index that powers App Store search, so what it returns is a fair proxy for what a
  user typing the name would see.
- Google: the Play Store search results page for the query term.
- Individual listings verified via the store page or a mirror where the store page would not render.

### 1a. `Memore` (single e) — **occupied, in multiple places**

| Product | What it is | Platform | Activity signal |
|---|---|---|---|
| **Memore** (`com.rupaak.memore`) | Private shared space for **couples** — shared notes, photos, albums, bucket lists, anniversaries/milestones | Google Play, Lifestyle | v1.0.1, released 2026-01-05, ~10+ installs. Live but tiny. |
| **Memore: AI Birthday Wishes** (`day.memore`) | AI relationship companion — remembers birthdays/anniversaries, generates personalised messages | Google Play | Live listing; also promoted on launch-directory sites. Owns the domain `memore.day`. |
| **Memore: Learn A Language** | Language-learning app | Microsoft Store | Live listing. |

Both Google Play apps return on the **first page** for the query `memore`, meaning the exact string
is already claimed in a store namespace we would have to share.

Adjacent-but-not-identical names crowding the same search: `Memora`, `Memorae`, `Memori`, `Memoro`,
`Memorease`, `Memoir`, `BeMore` (GN Hearing), `A-MORE`.

### 1b. Discoverability test — this is the finding that matters most

Querying the Apple App Store index for **`memore`** returned **zero** products called Memore. It
returned, in order: *Memory Games with Animals*, *Memory • Classic Game*, *The Bible Memory App*,
*Memory Matches 2*, *memoryOS*, *Memorize By Heart*.

In other words, on iOS the string `memore` is **absorbed by "memory"**. A user who hears our name,
opens the App Store and types it gets a wall of memory games with 10k–32k ratings each. A brand-new
app with zero ratings does not outrank those. The single-`e` spelling has a structural
search-discovery problem independent of any legal question.

### 1c. `Meemore` and `Meemor` (double e) — **empty namespace**

Querying the Apple index for **`meemore`** returned only irrelevant fuzzy matches (`MeoTempo`,
`Meedox`, `meos`, a Korean web-novel app) — nothing close. Querying **`meemor`** likewise returned
only fuzzy noise (`Mezmur`, `Mizmor`, `Merav`, `NoteMe`). No app on either store uses either
spelling.

This cuts both ways:

- **Good:** nobody is sitting on it, and a `meemore`/`meemor` app would be the single exact match.
- **Bad:** the search engines themselves do not recognise the string. In every general web search
  run for this document, `Meemore` was silently fuzzed by the engine into `MeeraMore`, `Adore Me`,
  `ME+EM`; `Meemor` was fuzzed into `Meemo`, `Memoro`, `Meemori`. We would be launching a token that
  search engines currently treat as a typo — which is normal for a coined brand, and is fixed by
  usage over time, but costs money and months of SEO to fix.

Nearest live neighbours to `Meemor`: **Meemo** (AI social-finance app, San Francisco, founded 2019,
on Crunchbase), **meemo** on Google Play (`com.oss.meemo_app`), **Meemori** on the App Store
(family-storytelling / intergenerational conversation recording — note this is in a *warm personal
growth* adjacency), and **meemoo** (browser creative-apps project).

### 1d. `Mimore`

Checked because it is a plausible mishearing. Occupied by several unrelated entities: **Mimore**
(Italian smart-device startup, Reggio Emilia, since rebranded to SCEEON), **MIMORE, Inc.**
(Korean cosmetics company, Wonju, founded 2005), **MIMOR** on Google Play (`com.store.sccbv.mimor`),
**MiMOR** (Australian property-management communication app, mimor.com.au). Not a viable escape
spelling.

---

## 2. Trademarks

### What I could and could not do — read this before reading the table

**I was unable to query any official trademark register directly.** Every route was blocked:

| Register / source | Result |
|---|---|
| USPTO `tmsearch.uspto.gov` API endpoints | HTTP 404 on every documented path (the public search is a JS application, not a fetchable API) |
| USPTO assignment API | DNS not resolvable from this environment |
| Justia Trademarks (`trademarks.justia.com`) | HTTP 403 on both `/search` and individual mark pages — blocks automated fetch outright |
| Trademarkia | HTTP 403 |
| uspto.report | HTTP 403 |
| TrademarkElite | HTTP 404 |
| EUIPO / TMview | JavaScript-only search interfaces; no GET-addressable results |
| Israel Patent Office (`trademarks.justice.gov.il`) | Connection reset; the portal exists (confirmed) but is not fetchable |

So the trademark section below is assembled from **search-engine indexes of those registers**, plus
commercial evidence of marks in use. That is a materially weaker instrument. **Absence of a hit
below is not evidence that a mark does not exist.** This section is a prompt for a lawyer, not a
substitute for one.

### 2a. Marks and mark-like uses found

| String | What was found | Classes implicated (inferred from goods, not verified) | Status |
|---|---|---|---|
| **MEMORE** | No exact `MEMORE` registration surfaced in indexed USPTO/Justia results. Indexed neighbours only: `MEMORPH`, `MEMORTEA` (Cognitive Clarity Inc., Reg. 5476974), `MEMORYOS` (Encoder Inc., Ser. 90684248), `MEMORI` (Ser. 86623559), `MEMOFI`, `MEMOTHIS`, `MEMEMI`. | — | **Unverified.** The register itself was not searched. |
| **MEMORE** (in commerce, US) | **Active consumer brand.** Memore, a direct-to-consumer whole-food cognitive-health supplement (greens/brain-gut nutrition), founded 2021 by Erika and Brad Lepczyk. PR Newswire launch release, trade press in Nosh, FoodNavigator-USA, NutritionInsight, Nutraceuticals World; CB Insights company profile; retail at yourmemore.com and memoregreens.com; Instagram `@yourmemore`; reviews on Thingtesting and SuppCo. | Likely 5 and/or 29/30 (supplements/food). **Not 9 or 44.** | Live and trading. Common-law rights at minimum; a registration is highly likely but was **not verified**. |
| **MEMORe** (in commerce, US) | `memorebrand.com` — brand-marketing agency (brand strategy, social media, training & development). | Likely 35. | Live site. |
| **Memoré** (in commerce) | `memoreweb.com` — "glam & memories". | — | Live site. |
| **MEEMORE** | Nothing found in any indexed register. Only non-commercial hit: a World of Warcraft character name. | — | **Unverified; appears clear.** |
| **MEEMOR** | Nothing found in any indexed register. Only hit: an Urban Dictionary entry (see §5c). | — | **Unverified; appears clear.** |

### 2b. The honest read

The `Memore` supplement brand is the single most substantive real-world finding in this document.
It is a funded-looking, press-covered US consumer brand, founded by people with a personal mission
story, selling into **brain health and cognitive wellbeing**. That is *not* our class — we are
software (9) and arguably coaching/wellbeing services (41/44) — but it is close enough in the
**consumer wellness aisle** that a shared name creates ongoing brand-confusion friction even where
there is no legal conflict. Note also the shape of the collision: their story is memory and
cognitive decline; ours is becoming who you choose to be. Sharing a name with a dementia-adjacent
nutrition brand is an unhelpful association for a product about future selves.

The fact that this brand had to launch on **`yourmemore.com`** and **`@yourmemore`** rather than
`memore.com` / `@memore` is itself a data point: the clean `memore` assets were already gone by 2021.

---

## 3. Domains

Checked via registry RDAP (authoritative registry records, not a reseller's "is it available"
widget), on 2026-09-14.

| Domain | Status | Detail |
|---|---|---|
| **memore.com** | **TAKEN** | Registered 2001-09-05, expiry 2027-09-05, registrar PDR Ltd (PublicDomainRegistry). Page serves an "Under construction" placeholder naming **Prakash Chand Kothari**. Nameservers include `vp1.nextwaveindia.com`. A 25-year-old parked domain — expensive or unobtainable. |
| **meemore.com** | **TAKEN** | Registered 2022-06-11, expiry 2027-06-11, registrar **TurnCommerce / NameBright**, nameservers `nsg1/nsg2.namebrightdns.com`. No site served. This registrar + nameserver combination is the classic signature of a **domain investor holding for resale**, not an operating business. Probably buyable, at an aftermarket (four- to five-figure) price. Not confirmed — no public sale listing was found. |
| **meemor.com** | **TAKEN** | Registered **2026-07-02** (about ten weeks ago), expiry 2027-07-02, registrar **IONOS SE**, `clientTransferProhibited`. A one-year registration at a retail registrar. **Open question for the founder: did we register this?** If yes, that partly explains the `Meemor` spelling appearing in the new spec and should be recorded. If not, someone else took the exact string two months ago and the `.com` is gone. |
| **meemore.app** | **AVAILABLE** | Not registered (Google Registry RDAP, 404). |
| **meemor.app** | **AVAILABLE** | Not registered (Google Registry RDAP, 404). |
| **getmeemore.com** | **AVAILABLE** | Not registered. |
| **getmeemor.com** | **AVAILABLE** | Not registered. |
| **meemoreapp.com** | **AVAILABLE** | Not registered. |
| **memore.day** | **TAKEN** | In use by the *Memore: AI Birthday Wishes* Play Store app. |
| **yourmemore.com / memoregreens.com** | **TAKEN** | The Memore supplement brand. |
| **memore.us, memorebrand.com, memoreweb.com** | **TAKEN** | Assorted small businesses. |

> **Cost note (CLAUDE.md §3.10).** Nothing in this document spends money. But acting on it might:
> acquiring **meemore.com** from a domain investor is an aftermarket purchase, typically **$1,000 –
> $10,000+**, and a trademark clearance search plus attorney opinion is typically **$1,500 – $5,000
> per territory**. Both need explicit founder approval first. The cheap path — registering
> `meemore.app` or `getmeemore.com` at roughly **$15–20/year** — is available today and should be
> done *before* the name is announced anywhere, because public announcement is what makes
> speculators register the variants.

---

## 4. Social handles

**Not verified — treat as unknown.** Instagram, TikTok and X all serve login walls or
JavaScript-only shells to automated fetches. I ran a control test (a deliberately nonsense handle
returned the same empty shell as the real handles), which means **any conclusion I drew from those
fetches would be fabricated**. I am therefore reporting nothing rather than guessing.

One indirect signal stands: the Memore supplement brand uses **`@yourmemore`** on Instagram, which
implies `@memore` was unavailable to them in 2021.

**Action required:** a human must check, logged out, in a browser:
`@meemore`, `@meemor`, `@meemoreapp`, `@getmeemore` on Instagram, TikTok, X, YouTube and LinkedIn.
This takes ten minutes and cannot be delegated to this tool.

---

## 5. Pronunciation, spelling and meaning risk

### 5a. Hear-it → spell-it

Say the name aloud. A listener has to choose between at least six plausible spellings:
`MeMore`, `Memore`, `Meemore`, `Meemor`, `MeMor`, `Mimore` — and `Me More` as two words.

Today, **`memore` wins the search**, decisively and unhelpfully. On the App Store it returns memory
games. On Google Play it returns two live apps literally named Memore. On the open web it returns a
supplement brand with press coverage. `Meemore` and `Meemor` return nothing — the engines fuzz them
into other words.

So the choice is between a spelling that loses the search to incumbents (`MeMore`) and a spelling
that has no search presence at all yet (`Meemore` / `Meemor`). The second is the better problem to
have: an empty namespace can be filled; a crowded one cannot be cleared.

### 5b. The double-`e` does not survive speech

`Meemore` and `MeMore` are **phonetically identical**. Choosing `Meemore` protects the *store and
domain* namespace but gives **zero** protection in word of mouth: every person who hears it and
types what they heard lands on the couples app or the greens brand. Word-of-mouth referral is a
core growth channel for a product built on Allies and a Support Circle — so this is a
product-growth cost, not just a marketing one.

`Meemor` is slightly better here, because dropping the final `e` changes the ending sound
("mee-MOR" vs "mee-MORE"), giving the ear something to hold on to. It is also shorter and the `.app`
and `get-` domains are free. Its weakness is that it reads as an unfinished word, and it collides
acoustically with the existing **Meemo** and **Meemori** apps.

### 5c. Meaning

- **"Me More" is a real positioning problem, not just a naming one.** Read literally, `MeMore` says
  *more of me* — the self as the object of accumulation. PushApp's mission is becoming who you choose
  to be, supported by Allies and a Support Circle. A name that foregrounds *me, more* sits awkwardly
  against the mutual-support half of the product, and in English "me more" is also toddler grammar
  for *give me more*. Flagging this as a **tension**, per the mandate to protect the mission: this
  is not a collision finding, it is a philosophy finding, and the founder should weigh it.
- **Hebrew.** `מימור` / `מי-מור` is not a standard Hebrew word; the string will read as a foreign
  brand name, which is neutral. A native-speaker check is still advisable, as is a check that the
  Hebrew rendering chosen for the onboarding screens is consistent with whichever Latin spelling wins.
- **Urban Dictionary** has an entry for "Meemor" ("the urge to want more hugglebuggle and kuss").
  Obscure, affectionate, non-vulgar. No reputational risk found. Recorded only for completeness.
- **Italian.** `memore` is an ordinary Italian adjective meaning *mindful of / remembering*. Relevant
  only if Italy becomes a market; it would make the name weakly distinctive there.

---

## 6. Ranked recommendation

| Rank | Candidate | Concrete risks found | Verdict |
|---|---|---|---|
| **1** | **Meemor** | `.com` taken 2026-07-02 at IONOS (**must confirm whether that is us**). Acoustically close to existing **Meemo** (SF fintech) and **Meemori** (family-storytelling app). Reads as an unfinished word. No register hits. `.app`, `getmeemor.com` free. | **Proceed with care** — best available of the three, conditional on (a) confirming who owns meemor.com, (b) a real trademark search, (c) manual handle checks. |
| **2** | **Meemore** | Phonetically identical to `MeMore`, so it inherits *all* of the word-of-mouth misspelling risk into the Memore incumbents while only escaping the store/domain crowding. `.com` held by a domain investor since 2022 (aftermarket purchase, likely four to five figures). `.app` and `getmeemore.com` free. No register hits. Carries the "me, more" positioning tension. | **Proceed with care** — viable, but you pay for the `.com` and still lose the spoken name. |
| **3** | **MeMore / Memore** | Two live Google Play apps named exactly *Memore*; one Microsoft Store app named *Memore*; an active, press-covered US **cognitive-health supplement brand** named Memore; a brand agency `MEMORe`; `memore.com` held since 2001; on the App Store the string is swallowed whole by "memory" games with tens of thousands of ratings; plus the "me, more" positioning tension. | **Avoid** — this is the spelling on the currently approved onboarding screens, and it is the worst of the three. |

### Consequence for the approved designs

The approved onboarding screens and the exported PDF/ZIP are branded `MeMore` / `meemore`. If the
verdict above is accepted, **those assets carry a name we are recommending against**. They do not
need to be discarded — the wordmark is a text layer — but re-export must be scheduled before any of
them is used in a store listing, pitch deck or public post. Flagging this now, while the cost is one
afternoon of re-export rather than a filed store listing.

### If both spellings are judged too risky — three adjacent candidates worth screening next

Offered as **Open Questions**, not proposals. Each keeps the intended meaning (becoming more of
who you choose to be) while being a genuinely coined token that a search engine can learn.

1. **Meemo** — *rejected before it starts.* Listed here only so nobody re-proposes it: an existing
   SF fintech and a Google Play app already hold it. Do not screen.
2. **Memora / Memoria family** — also crowded (Memora Health raised $30M; Memora learning app;
   Memorae). Do not screen.
3. **Actually worth screening:** a coined compound that drops the memory-root entirely, because the
   `mem-` stem is what is dragging every variant into the memory/dementia/nutrition neighbourhood.
   Suggested for the next screening pass:
   - **Moretome** / **MoreToMe** — same idea, different stem, and the phrase "there's more to me"
     is emotionally exact for the product. Unscreened.
   - **Becomore** — becoming + more, one coined token, no `mem-` stem. Unscreened.
   - **Meanwhile** the register already holds **MeantTo** at *worth deeper clearance* from the
     2026-08-12 pass; if the `mem-` family is abandoned, MeantTo is the existing fallback and
     deserves the same deep treatment this document gave MeMore.

None of these three has been screened. Do not treat them as candidates until they have been.

---

## 7. What this document did not do

Stated plainly so that nobody mistakes this for clearance:

- No trademark register was queried directly. All five registers and four commercial aggregators
  blocked automated access. The trademark section is search-engine-derived only.
- Likelihood of confusion was **not** assessed, by instruction and by competence. That is a legal
  determination.
- Non-US app storefronts were not checked (the Apple queries were US-storefront only). Israel, UK
  and EU storefronts should be checked separately before launch.
- Social handles were **not** verified. See §4.
- Company registers (Israeli Companies Registrar, UK Companies House, Delaware) were not searched.

## 8. Recommended next actions

1. **Founder decision (this week):** one spelling. Until it is made, freeze production of new
   branded assets. — *Open Question.*
2. **Founder answer:** who registered `meemor.com` on 2026-07-02? — *Open Question.*
3. **Ten-minute human task:** manual handle checks per §4.
4. **Cheap and reversible, do it now:** register `meemore.app` / `meemor.app` and the `get…` variants
   (~$15–20/year each) once step 1 is decided. Requires founder approval per CLAUDE.md §3.10, but the
   sum is small and the downside of waiting is that announcing the name invites speculators.
5. **Before any store listing or public launch:** commission an attorney trademark search in IL, US
   and EU for classes 9, 41, 42 and 44. Budget conversation required first. — *Open Question.*
6. **Once decided:** log the outcome in `06_Decisions/Decision_Log.md`, update the
   `Product_Name_Candidate_Register.md` row for MeMore, and add `Meemore` and `Meemor` to that
   register as first-class candidates with their own provenance.

## Related documents

- `05_Research/Product_Name_Collision_Screening_2026-08-12.md` — the first-pass screen this file deepens.
- `05_Research/Product_Name_Candidate_Register.md` — the living register of every candidate; needs
  the two new spellings added.

## Sources

App stores and products:
[Memore (couples app, Google Play)](https://play.google.com/store/apps/details?id=com.rupaak.memore) ·
[Memore: AI Birthday Wishes (Google Play)](https://play.google.com/store/apps/details?id=day.memore) ·
[Memore: Learn A Language (Microsoft Store)](https://apps.microsoft.com/detail/9nv43vfplrtr) ·
[Memore on UIComet Launches](https://launches.uicomet.com/products/memore-android-app-uVX6hwD) ·
[meemo (Google Play)](https://play.google.com/store/apps/details?id=com.oss.meemo_app) ·
[Meemo (Crunchbase)](https://www.crunchbase.com/organization/fingo-5365) ·
[Meemori (App Store)](https://apps.apple.com/us/app/meemori/id6468885156) ·
[MIMOR (Google Play)](https://play.google.com/store/apps/details?id=com.store.sccbv.mimor) ·
[MiMOR (Australia)](https://mimor.com.au/) ·
[Mimore (LinkedIn)](https://www.linkedin.com/company/mimore/) ·
[MIMORE, Inc. (Dun & Bradstreet)](https://www.dnb.com/business-directory/company-profiles.mimore_inc.eb7a6c0723c3081533fb3118835276e5.html) ·
Apple iTunes Search API queries for `memore`, `meemore`, `meemor` (US storefront, 2026-09-14).

The Memore supplement brand:
[yourmemore.com](https://yourmemore.com/) ·
[memoregreens.com](https://memoregreens.com/products/greens-blend-packets-10-count) ·
[PR Newswire launch release](https://www.prnewswire.com/news-releases/memore-launches-functional-whole-food-blends-for-sustainable-cognitive-health-301282958.html) ·
[FoodNavigator-USA interview](https://www.foodnavigator-usa.com/Article/2021/05/20/Brain-food-startup-Memore-The-cognitive-health-market-is-around-7b-and-growing-8-annually/) ·
[Nosh brand launch](https://www.nosh.com/food-wire/2021/brand-launch-memore-whole-food-cognitive-health-supplement/) ·
[NutritionInsight](https://www.nutritioninsight.com/news/memore-launches-whole-food-powder-for-long-term-brain-health-inspired-by-mind-diet.html) ·
[Nutraceuticals World interview with Erika Lepczyk](https://www.nutraceuticalsworld.com/an-interview-with-erika-lepczyk-ceo-co-founder-memore/) ·
[CB Insights profile](https://www.cbinsights.com/company/memore/people) ·
[Thingtesting reviews](https://thingtesting.com/brands/memore/reviews) ·
[Instagram @yourmemore](https://www.instagram.com/yourmemore/)

Other Memore-named businesses:
[MEMORe brand marketing](https://www.memorebrand.com/) ·
[Memoré](https://memoreweb.com/) ·
[memore.us](https://memore.us/) ·
[Memores Software Inc. (Crunchbase)](https://www.crunchbase.com/organization/memores-software-inc)

Domains — registry RDAP records queried 2026-09-14:
`rdap.verisign.com/com/v1/domain/{memore,meemore,meemor,getmeemore,getmeemor,meemoreapp}.com` ·
`www.registry.google/rdap/domain/{meemore,meemor}.app` ·
[memore.com](https://memore.com) (placeholder page inspected)

Trademark register entry points (access blocked to automated fetch; listed for the human/attorney follow-up):
[USPTO trademark search](https://tmsearch.uspto.gov/) ·
[USPTO TSDR](https://tsdr.uspto.gov/) ·
[EUIPO availability search](https://www.euipo.europa.eu/en/trade-marks/before-applying/availability) ·
[Israel trademark database](https://trademarks.justice.gov.il/) ·
[Israel trademark e-filing portal](https://trademarksonline.justice.gov.il/) ·
indexed neighbouring marks via [Justia Trademarks](https://trademarks.justia.com/)

Other:
[Urban Dictionary — Meemor](https://www.urbandictionary.com/define.php?term=Meemor)
