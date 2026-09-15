# Research — Product Name, Round 3: Replacement Candidates

Date: **2026-09-14**
Status: **Research only. Not legal advice and not a trademark clearance opinion.**
Author: product-manager agent, at the founder's request.
Category: **Open Question.** Nothing in this file is an approved name. The choice is the founder's.

> **Read the two prior naming documents first.** This file does not replace them and does not
> re-open names they already closed.
> - `05_Research/Product_Name_Collision_Screening_2026-08-12.md` — first-pass screen of ~28 names.
> - `05_Research/Product_Name_Deep_Clearance_MeMore_Meemor_2026-09-14.md` — today's deep clearance.
> - `05_Research/Product_Name_Candidate_Register.md` — the living register every candidate belongs in.

---

## 1. Why this document exists

On 2026-09-14 the deep clearance found that `MeMore` / `Memore` collides with an active US
cognitive-health brand, two live Google Play apps and a Microsoft Store app, and that on the Apple
App Store the string is absorbed whole by "memory" games. Separately, `meemor.com` was registered by
a third party on **2026-07-02** at IONOS. The founder has decided to drop the name from the approved
designs entirely.

This file proposes **twelve replacement candidates, each screened before it is presented**, and
ranks them.

### The finding from the deep clearance that shaped this list

> "MeMore" read literally says *more of me* — the self as the object of accumulation.

PushApp's mission is becoming who you choose to be, walked with Allies and a Support Circle beside
you. A purely self-referential name fights half the product. **Every candidate below was required to
be non-self-referential**, and candidates that actively encode *company on a path* were favoured.

---

## 2. Method, and its limits — read this before the table

| What I checked | How | Confidence |
|---|---|---|
| `.com` domains | Registry RDAP (`rdap.verisign.com`), the same registry record `whois` reads | **High.** Authoritative. |
| `.app` domains | **Could not verify.** See the warning below. | **None.** |
| `.app` delegation (proxy for "is it taken") | DNS `NS` lookup over Google DoH, with a control | **Medium.** A delegated domain is registered; an undelegated one *may* still be registered. |
| App Store | Public iTunes Search API, US storefront, `entity=software`, limit 25 | **High** for US iOS. |
| Google Play | Web search of store listings | **Medium.** Not an API. |
| Companies / products / meaning | Web search | **Medium.** Reports what is indexed. |
| Trademark registers | **Not queried.** Blocked, exactly as the 2026-09-14 clearance documented. | **None.** |
| Social handles | **Not checked.** Login walls defeat automated fetch. | **None.** |
| Hebrew reading | My own analysis, as a written argument the founder can check | Judgement, not measurement |

### 2a. A correction to the 2026-09-14 deep clearance — act on this

That document reported `meemore.app`, `meemor.app`, and other `.app` domains as **AVAILABLE**, based
on `www.registry.google/rdap/domain/<name>.app` returning HTTP 404.

**I ran a control test on that endpoint today and it failed.** `google.app` and `cash.app` — both
unquestionably registered — *also* returned HTTP 404 from that endpoint. The endpoint returns 404 for
everything reachable from this environment. `rdap.org` returns 403.

**Therefore every `.app` "AVAILABLE" line in the 2026-09-14 document is unverified, not false but not
established.** If the founder was about to register or budget for a `.app` domain on that basis, stop
and check it in a registrar's browser search first. This costs nothing to verify and would be an
avoidable spend.

For this document I substituted a DNS delegation check, and validated it with a control
(`cash.app` → `Status 0` with four NS records). Every `.app` domain I report as taken below returned
live NS records, which means it is registered.

### 2b. The structural finding: the semantic field is exhausted

This is the most useful thing in the document and it should shape expectations.

**Not one candidate in this set has an available `.com`.** Every ordinary English word in the
territory of *path, step, forward, together, beside, becoming* was registered between 1990 and 2003.
Worse, the richest metaphors are held by **funded companies in categories adjacent to ours**:

- **Waymark** — a Medicaid care company with $45M Series A whose own brand line is "pathways to
  better health", *plus* a separate AI video-ad company on `waymark.com` trading since 2010.
- **InStride** — a corporate-education company (485,000 employees served), *plus* **InStride Health**,
  a paediatric anxiety and OCD treatment provider.
- **Tomoni** — `tomoni.ai` builds "vertical AI apps — companions designed for the everyday parts of
  life", which is our exact category, *and* `TOMONI®` is a registered trademark of Mitsubishi Heavy
  Industries.
- **Beside** — `Beside: Body Doubling Focus` and `Beside: ADHD Parenting` are both live on the App
  Store, in our behavioural-support neighbourhood.

So the trade is now explicit: **a name that says what we do will collide with a well-funded
neighbour; a name that is clean is clean because it is semantically empty.** Sections 3 and 4 are
built around that trade rather than pretending it away.

---

## 3. The three strongest candidates

### Rank 1 — **Kadam**

| | |
|---|---|
| **Meaning** | קֶדֶם / קָדִימָה in Hebrew is *forward, onward, let's go*; קדם is *before, eastward, the direction you face*. In Hindi, Urdu and Persian **कदम / قدم** means *step, footstep, stride*. One token that means "forward" to an Israeli and "step" across South and Central Asia. |
| **Why it fits the mission** | It names movement, not the self — it is the opposite of "more of me", and it is what one person says to another when they set out. |
| **Said aloud** | "kah-DAM". Two syllables, one stress, no silent letters, no ambiguous vowels. |
| **Can a listener spell it?** | **Yes.** The only realistic variant is `Qadam` (the Arabic/Persian transliteration). That is one fork, versus the six that `MeMore` produced. |
| **`.com`** | `kadam.com` **TAKEN**, created 1997-02-07, Network Solutions, on Cloudflare nameservers. |
| **`.app`** | `kadam.app` **TAKEN** (delegated to `dns1.registrar-servers.com`, i.e. Namecheap). |
| **`get…com`** | **`getkadam.com` IS NOT REGISTERED.** The only free domain found anywhere in this entire screen. |
| **Other** | `kadamapp.com` taken 2026-02-23 (Squarespace). |
| **App Store (US)** | 24 results, 7 containing "Kadam": *Kadam* (Hammad Khan), *Kadam* (Raj Patel), *Kadama – Find a Tutor*, *Green Kadam*, *Lancer Badhte Kadam*, *Mere Nanhe Kadam A Play School*, *Ram Kadam*. All Indian; none in personal growth or coaching. |
| **Google Play** | *Smart Kadam* (job search and referrals), *Kadam Classes* (student learning). Indian, adjacent to growth but not in it. |
| **Web / companies** | Kadam is a very common Maharashtrian surname, and a tree. Search noise in India is heavy. |
| **Hebrew** | **Its strongest asset.** An Israeli reads קדם instantly and hears קדימה — the everyday word for *forward, come on, let's go*. Warm, energetic, zero awkwardness. |
| **Honest weakness** | To an English speaker it means **nothing**. The brand must carry the meaning, as Duolingo and Noom do. And in India the string is crowded enough that that market would be noisy from day one. |

**Why rank 1:** it is the only candidate that is simultaneously (a) spellable on hearing,
(b) absent from our category everywhere that matters to us, (c) genuinely meaningful and warm in
Hebrew, and (d) attached to a free domain. No other name scored on all four.

---

### Rank 2 — **Instep**

| | |
|---|---|
| **Meaning** | *To be in step with someone* — walking at the same rhythm, neither ahead nor behind. It is also the arch of the foot that carries weight. |
| **Why it fits the mission** | Of every candidate screened, this is the one that encodes **both halves of the product at once**: forward motion *and* someone moving alongside you. It is the linguistic opposite of "more of me". |
| **Said aloud** | "IN-step". |
| **Can a listener spell it?** | **Yes, perfectly.** The only fork is `InStep` vs `In Step`, which is a styling choice, not a different word. |
| **`.com`** | `instep.com` **TAKEN**, created 1990-05-10 (one of the oldest domains in the screen), expires 2034, Network Solutions, Squarespace DNS — i.e. a live small site, not a parked asset. |
| **`.app`** | `instep.app` **TAKEN** (delegated to GoDaddy nameservers). |
| **`get…com`** | `getinstep.com` **TAKEN**, 2011, TurnCommerce/NameBright — the domain-investor signature. |
| **Other** | `instepapp.com` **TAKEN, created 2026-06-21 at IONOS** — three months ago. Someone may be building an InStep app right now. Treat as a live warning. |
| **App Store (US)** | Only **5 total results**, an unusually empty namespace: *Instep Credit Union*, *In Step Dance & Fitness*, *InStep Movement Analytics*, *In Step Dance Center*, *InStep оранжерея* (a houseplant app). None in our category. A new app named Instep would be the obvious first match. |
| **Google Play** | *Instep Credit Union*, *In Step Dance & Fitness*. Also a separate *InStep* on the Australian App Store by Simpl3r, described as step tracking with competitive elements. |
| **Web / companies** | **InStep Technologies**, a software development agency (`insteptechnologies.com`). Different category, but it owns a lot of the search results for the word. |
| **Hebrew** | "אינסטפ" — easy to pronounce, no awkward sounds, no unfortunate reading. But the English idiom *in step with* does not exist in Hebrew, so the meaning does not transfer; to an Israeli it is simply a pleasant foreign token. |
| **Honest weakness** | Two things. The domain picture is the worst of the top three, and a fresh `instepapp.com` registration suggests competition for the name. And "step" pulls the ear toward **step counting** — see §5, the biggest risk in this document. |

**Why rank 2:** the best meaning in the set, and a near-empty store namespace. It ranks below Kadam
only because there is no clean domain left and because someone registered `instepapp.com` this year.

---

### Rank 3 — **OnStep**

| | |
|---|---|
| **Meaning** | *On step* — already moving, one step at a time, on your way. |
| **Why it fits the mission** | It describes being in motion rather than being finished, which is the Progress Over Perfection principle stated as a name. |
| **Said aloud** | "ON-step". |
| **Can a listener spell it?** | **Yes, perfectly.** |
| **`.com`** | `onstep.com` **TAKEN**, created 2003-12-10, Dynadot, nameservers `ns1/ns2.abovedomains.com` — a parking service. This is a **parked domain, plausibly for sale**, though no listing was confirmed and no price is known. |
| **`.app`** | `onstep.app` **TAKEN** (delegated to Cloudflare). |
| **`get…com`** | `getonstep.com` **TAKEN**, 2020, GoDaddy. |
| **Other** | **`onstepapp.com` IS NOT REGISTERED.** |
| **App Store (US)** | Only **4 matching results**, and every one is an amateur-astronomy telescope controller: *OnStep Controller – GDA*, *TRITON GOTO – OnStep Control*, *MLAstro Hub*, *Gotomote*. The **consumer namespace is effectively empty** — the emptiest of any candidate here. |
| **Google Play** | *OnStep Controller2*, same open-source telescope project. |
| **Web / companies** | OnStep is an active open-source DIY telescope-mount controller with a `groups.io` community. Real brand presence, in a hobby niche with no overlap with us. |
| **Hebrew** | "אונסטפ" — easy to say, meaning opaque, nothing awkward. |
| **Honest weakness** | It is the thinnest name semantically — it says *moving* and nothing else, and nothing at all about Allies. It shares the step-counter drift in §5. It also collides with our own canonical term **Step** (Dream → Journey → Milestone → Step); naming the product after one of its own objects can flatten the hierarchy in users' heads, and every support article would have to work around "a Step in OnStep". |

**Why rank 3:** the cleanest namespace and a free `onstepapp.com`, bought at the price of meaning.

---

## 4. The remaining nine candidates, ranked

Screened to the same standard. Ranks 4 and 5 are real options. **Ranks 6 to 12 are included for
range and for the register — I am not recommending them, and I say why for each.**

### Rank 4 — **Underway**

- **Meaning / fit:** the journey has already begun. Forgiving rather than aspirational, which matches Progress Over Perfection and Reality Is Always Correct.
- **Sound / spelling:** "UN-der-way". Perfectly spellable.
- **Domains:** `underway.com` TAKEN (2002, GoDaddy, HostGator DNS). `underwayapp.com` TAKEN (2018). `.app` not checked.
- **App Store:** 23 results, only 2 named Underway — *Underway: NYC Subway Transit* and *Underway Boating Safety*.
- **Risk found:** the search behaves like `memore` did. Type "underway" and the store fills with MTA and transit apps. The string is absorbed by *subway*. This is the exact discoverability failure the deep clearance identified, in a different disguise.
- **Hebrew:** neutral, opaque, no awkwardness. The "w" is pronounced as a "v", which is fine.

### Rank 5 — **Cairn**

- **Meaning / fit:** **the best metaphor in this document, by a distance.** A cairn is a stack of stones left on a trail by earlier walkers so that the next person can find the way — and you add a stone for whoever comes after you. That is the Support Circle rendered as an object, across time, with no self-reference anywhere in it.
- **Sound / spelling:** one syllable, "kern" / "kairn". **A listener cannot reliably spell it**: Cairn, Kern, Karn, Cairne, Carn. This is precisely the failure that killed the last name, so it cannot be ranked higher no matter how good the meaning is.
- **Domains:** `cairn.com` TAKEN (1995). `cairn.app` TAKEN (Google Domains NS). `getcairn.com` TAKEN (2013).
- **App Store:** 23 results, 7 named Cairn — *Cairn – Hiking Safety Tracker*, *Cairn University*, *Cairn - Values Sort*, *cairn — Immich sync*, *Cairn Stone Balancing*, *Cairn: Interactive Fiction*, *Cairn: Hiking Journal*. Google Play: *Cairn | The Hiking Safety App*, an established product.
- **Hebrew:** no currency at all. An Israeli would write קרן (*keren* — fund, ray, horn) or קיירן. The Hebrew word for a cairn is גלעד (*gal-ed*, "mound of witness", Genesis 31), which is a common man's first name in Israel and therefore unusable as a brand.
- **Verdict:** recorded so the reasoning survives. If spelling could be solved, this would be rank 1.

### Rank 6 — **Waymark**

- Meaning is excellent: a mark placed on a trail to show travellers the way. Spelling is unambiguous.
- **Rejected on collisions.** `waymark.com` is an AI video-advertising company trading since 2010 (Comcast/Spectrum Reach partnerships). `waymarkcare.com` is a Medicaid care company with $45M Series A, twice named to Business Insider's most promising healthcare startups, whose own brand language is "pathways to better health". Two funded incumbents, one in healthcare.
- Domains: `waymark.com` TAKEN 1995, `waymark.app` TAKEN, `getwaymark.com` TAKEN 2018. App Store: *Waymark: Hiking Journal*, *Waymarkly*.
- Hebrew: "w" becomes "v"; meaning does not transfer.

### Rank 7 — **Instride**

- Meaning is strong and specific: *to take something in stride* is to absorb a setback without losing rhythm — the Grace Token philosophy in a word.
- **Rejected on collisions.** **InStride** (`instride.com`, corporate education benefits, founded 2019, 485,000 employees served) and **InStride Health** (paediatric anxiety and OCD treatment, live on the App Store). Both are in the personal-development / mental-health neighbourhood. This is the worst kind of adjacency for us.
- Domains: `instride.com` TAKEN 2001, on AWS DNS.

### Rank 8 — **Yonder**

- Meaning: the place just over the horizon, where you are heading. Warm, folk, spellable.
- **Rejected on crowding.** App Store: *Blue Yonder Workforce* (a major supply-chain brand) ranks first, plus *Yonder Rewards Cards*, *Yonder Yoga*, *YonderHQ*, *Yonder: Long Range*, *Yonder Offline Reader*, *Yonder – Place Reminders*. Six separate companies.
- Domains: `yonder.com` TAKEN 1995 and held at **MarkMonitor**, the registrar large corporations use to defend brands. `yonder.app` TAKEN (Cloudflare). `getyonder.com` TAKEN 2016.

### Rank 9 — **Tomoni**

- In the register since 2026-08-25 as a **reconstructed candidate, not screened**. Screening it now closes that open item.
- Meaning: ともに, Japanese for *together*. On mission for the Allies half.
- **Rejected.** `tomoni.ai` builds "vertical AI apps — companions designed for the everyday parts of life", which is our category almost word for word. `TOMONI®` is a **registered trademark of Mitsubishi Heavy Industries** for its intelligent-solutions suite. `tomoni.com` TAKEN 2005 (NETIM). `tomoni.app` TAKEN and delegated to **CSC** nameservers — the corporate brand-protection registrar, consistent with defensive registration by a large company.
- One positive finding: the **App Store namespace is completely empty** — zero apps match. That is not enough to outweigh a live trademark and a same-category AI-companion product.
- Hebrew: "טומוני" is easy and pleasant to say; meaning opaque.
- **Register action:** move Tomoni from *Not screened* to *Rejected in preliminary screen*.

### Rank 10 — **Havruta**

- Meaning: the Jewish study pair — two people who learn a text together, each responsible for the other's progress. Conceptually it *is* the Ally, and an Israeli feels it instantly.
- **Rejected on two grounds.** First, *The Chavruta* is a live iOS "AI Jewish learning partner" — an AI companion app, our category. `CHAVRUTA LTD` is registered at UK Companies House. Second, and structurally fatal: Hebrew speakers say **ch**avruta (the guttural ח) and English speakers say **h**avruta. **The name splits into two different spoken words across our two launch markets.**
- App Store search for "havruta": zero matching apps, but the results returned are wall-to-wall Jewish study apps (Sefaria, TorahAnytime), which shows what the string signals.

### Rank 11 — **Hineni**

- Meaning: הנני, *"Here I am"* — the biblical answer of presence, given to another person who calls. Emotionally it is exactly the product: showing up for yourself and being present for someone else. An Israeli reads it instantly and warmly.
- **Rejected on religious coding.** App Store: *Torah Study & Faith: Hineni* (Hineni Now LLC), *Hineni* (Hineni Technologies Inc), *Hineni Network* (**Hineni Ministries International**). The string is owned by Jewish outreach and Christian ministry organisations. A secular global growth product cannot carry it.
- `hineni.com` TAKEN 1998, on Cloudflare.

### Rank 12 — **Beside**

- Meaning: the single most direct word for the Allies half of the product — someone beside you.
- **Rejected on same-category crowding.** Eight apps named Beside on the App Store, including **Beside: Body Doubling Focus** (a focus/productivity companion) and **Beside: ADHD Parenting** — both in behavioural support — plus *Beside (M1): AI Receptionist*, *Beside – find people you see*, *Beside – For lovers*, *Beside You – Family Reminders*, *Beside* (Beside Group).
- `besideapp.com` TAKEN 2019.

### Also screened and rejected before reaching the table

Recorded so nobody re-proposes them.

| Name | Idea | Why it was dropped |
|---|---|---|
| **Stepwell** | A stepwell is a descending communal water structure — steps built by a village for everyone | **Stepwell: Walking Step Counter** is live on the App Store. A step counter is the precise thing PushApp is not. `stepwell.com` taken 2002; `getstepwell.com` taken 2025. |
| **Ongo** | on + go | Four apps named Ongo (*Ongo Fast*, *Ongo*, *Ongo PayTrack*, *Ongo App*). `ongo.com` taken 1998 and **actively serving** on its own nameservers; `getongo.com` held by a domain investor. |
| **Vamos** | "let's go" — collective, warm, and known to Israelis | Seven apps: *Vamos app*, *Vamos Mobility*, *Vamoos*, *Vamos: Book, Play, Win*, *Vamos Outreach*, and others. `vamos.com` taken 1996 at IONOS. |
| **Ofek** | אופק, *horizon* — the direction you move toward | **Direct category collision in our home market.** The App Store returns *Coach Ofek*, *Coach Ofek Members*, *CoachOfek* — three Israeli coaching apps — plus many apps named after people, because Ofek is a common Israeli given name. |
| **Setout** | "to set out" is the moment intention becomes movement | No app named Setout, but *Setout Labs LLC* and *Setout srl* both publish on the App Store. `setout.com` taken 2003 and parked on Chinese nameservers; `setoutapp.com` taken 2026-02-18 (Amazon Registrar). |
| **Kadima**, **Masa**, **Gesher**, **Shvil**, **Aliya** | Hebrew options for *forward*, *journey*, *bridge*, *trail*, *ascent* | Each is taken in Israel by a political party, a large programme, or an organisation, or is unspellable for English speakers. Not screened further; noted so the ideas are not lost. |
| **Meemo**, **Memora / Memoria** | Adjacent to the old name | Already ruled out in the 2026-09-14 clearance §6. Do not re-screen. |

---

## 5. The single biggest risk across this set

**The two cleanest namespaces are clean because the names mean almost nothing — and both of those
names contain "step", which drags the product toward step counting and habit tracking.**

`CLAUDE.md` opens by stating that PushApp is *not a habit tracker, task manager, or productivity
app*. Yet the safest available names, **Instep** and **OnStep**, both invite exactly that reading.
`Stepwell` was eliminated in this screen for precisely that reason — an App Store app literally named
*Stepwell: Walking Step Counter*. A user who hears "Instep" and opens the App Store has no way to
know whether they are about to download a pedometer.

That is the trade this document cannot dissolve, and the founder should decide it consciously:

1. **Take a semantically empty name** (Kadam) and let the brand supply the meaning. Safest on
   collisions, costs marketing effort, and the name will never argue against the mission.
2. **Take a meaningful name and accept a funded neighbour** (Waymark, Instride). Cheapest to
   explain, most expensive legally and in search, and two of the neighbours are in health.
3. **Take a step-word** (Instep, OnStep) and accept that the name leans toward the category the
   mission rejects, then spend positioning effort pushing back against it.

**My recommendation is option 1, and therefore Kadam** — because the mission is the thing that must
never be compromised, and options 2 and 3 both compromise it in some way, while option 1 only costs
money and time.

Secondary risk, smaller but concrete: **`instepapp.com` was registered 2026-06-21 and
`setoutapp.com` on 2026-02-18.** Names in this space are being taken continuously. Whichever name is
chosen, the domain should be registered the same week and **before** the name appears in public — the
deep clearance already made this point and `meemor.com` going in July is the proof.

---

## 6. What this document did **not** do

Stated plainly so nobody mistakes it for clearance.

- **No trademark register was queried.** USPTO, EUIPO, the Israel Patent Office and the commercial
  aggregators all block automated access, as documented in the 2026-09-14 clearance §2. Everything
  above is search-engine and commerce evidence. **Absence of a hit is not evidence of absence.**
  **Any finalist still requires an attorney clearance search** in IL, US and EU for classes 9, 41,
  42 and 44 before a store listing, a company registration or a logo.
- **Likelihood of confusion was not assessed.** That is a legal determination.
- **`whois` was not run.** The session had no shell. Registry RDAP over HTTPS reads the same registry
  record and is equally authoritative for creation date and registrar; `.app` could not be verified
  at all (§2a).
- **Non-US storefronts were not checked.** All Apple queries were US storefront. Israel, UK and EU
  must be checked separately.
- **Social handles were not checked.** For any finalist, a human must check, logged out, in a
  browser: Instagram, TikTok, X, YouTube, LinkedIn. Ten minutes, cannot be delegated to this tool.
- **Company registers were not searched** (Israeli Companies Registrar, Companies House, Delaware).
- **Pronunciation by real Hebrew speakers was not tested.** The Hebrew readings above are my written
  analysis, offered so the founder can check my reasoning rather than trust it.

## 7. Recommended next actions

1. **Founder decision:** pick a finalist, or reject the set and ask for a round 4 built on a
   different brief. — *Open Question.*
2. **Same week, before any public mention:** register the finalist's available domain. `getkadam.com`
   and `onstepapp.com` were free today, roughly **$15–20/year each**. Per `CLAUDE.md` §3.10 this needs
   founder approval even at that size; the downside of waiting is that announcing a name invites
   speculators.
3. **Verify the `.app` question in a browser** before budgeting anything for a `.app` domain, given
   §2a.
4. **Ten-minute human task:** social-handle checks for the finalist.
5. **Before any store listing:** commission an attorney trademark search. Budget conversation with
   the founder first — the 2026-09-14 clearance estimated **$1,500–$5,000 per territory**. — *Open Question.*
6. **Update `Product_Name_Candidate_Register.md`** with all twelve candidates plus the six
   also-screened names, and move **Tomoni** from *Not screened* to *Rejected in preliminary screen*.
7. **Once chosen:** log it in `06_Decisions/Decision_Log.md` and schedule re-export of the approved
   onboarding screens, which currently carry the dropped name.

## Related documents

- `05_Research/Product_Name_Deep_Clearance_MeMore_Meemor_2026-09-14.md` — why the previous name was dropped; this file's baseline and, per §2a, the source of one correction.
- `05_Research/Product_Name_Collision_Screening_2026-08-12.md` — the ~28-name first pass; none of its rejected names is re-proposed here.
- `05_Research/Product_Name_Candidate_Register.md` — the living register; needs updating per §7.6.
- `09_Product_Philosophy/Product_Philosophy.md` — the mission every candidate was tested against.
- `09_Product_Philosophy/Product_Terminology.md` — the source of the **Step** collision noted under OnStep.

## Sources

**Domains — registry RDAP records queried 2026-09-14** via
`rdap.verisign.com/com/v1/domain/<name>.com` for: kadam, getkadam, kadamapp, instep, getinstep,
instepapp, onstep, getonstep, onstepapp, cairn, getcairn, waymark, getwaymark, yonder, getyonder,
instride, tomoni, gettomoni, stepwell, getstepwell, ongo, getongo, vamos, hineni, havruta, beside app,
underway, underwayapp, setout, setoutapp.
`.app` delegation via Google DoH `dns.google/resolve?name=<name>.app&type=NS`, control `cash.app`.
Failed endpoints recorded in §2a: `www.registry.google/rdap/domain/` (404 on all, including
`google.app` and `cash.app`), `rdap.org` (403).

**App Store** — Apple iTunes Search API, US storefront, `entity=software&limit=25`, queried
2026-09-14 for: cairn, instep, kadam, instride, waymark, yonder, tomoni, stepwell, ongo, vamos,
hineni, havruta, beside, onstep, underway, setout, ofek.

**Companies, products and Google Play listings:**
[Waymark (Medicaid care)](https://www.waymarkcare.com/) ·
[Forbes — Waymark $45M Series A](https://www.forbes.com/sites/katiejennings/2022/01/04/this-startup-raised-45-million-to-build-a-community-health-worker-brigade-for-medicaid/) ·
[Waymark (AI video ads)](https://waymark.com/) ·
[InStride (education benefits)](https://www.instride.com/) ·
[InStride Health](https://builtin.com/company/instride/benefits) ·
[Tomoni AI](https://www.tomoni.ai/) ·
[TOMONI® — Mitsubishi Power](https://www.changeinpower.com/tomoni/) ·
[InStep Technologies](https://insteptechnologies.com/) ·
[Instep Credit Union (Google Play)](https://play.google.com/store/apps/details?id=com.homecu.nasjrbcu) ·
[In Step Dance & Fitness (Google Play)](https://play.google.com/store/apps/details?id=com.mobileinventor.instepdanceandfitness) ·
[InStep (App Store AU)](https://apps.apple.com/au/app/instep/id6736640906) ·
[Cairn — The Hiking Safety App (Google Play)](https://play.google.com/store/apps/details?id=com.cairnapp.cairn) ·
[OnStep Controller2 (Google Play)](https://play.google.com/store/apps/details?id=com.onstepcontroller2) ·
[OnStep community wiki](https://onstep.groups.io/g/main/wiki/3860) ·
[Smart Kadam (Google Play)](https://play.google.com/store/apps/details?id=com.kadam.app) ·
[Kadam Classes (Google Play)](https://play.google.com/store/apps/details?id=co.amy.cfvie) ·
[कदम — Collins Hindi-English Dictionary](https://www.collinsdictionary.com/dictionary/hindi-english/%E0%A4%95%E0%A4%A6%E0%A4%AE) ·
[The Chavruta — AI Jewish learning partner](https://thechavruta.com/) ·
[CHAVRUTA LTD — UK Companies House](https://find-and-update.company-information.service.gov.uk/company/12952299) ·
[Havruta (organization) — Wikipedia](https://en.wikipedia.org/wiki/Havruta_(organization))

**Trademark register entry points (blocked to automated fetch; listed for the attorney follow-up):**
[USPTO trademark search](https://tmsearch.uspto.gov/) ·
[EUIPO availability search](https://www.euipo.europa.eu/en/trade-marks/before-applying/availability) ·
[Israel trademark database](https://trademarks.justice.gov.il/)
