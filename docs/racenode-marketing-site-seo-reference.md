# RaceNode — Marketing Site SEO & Keyword Reference

**Scope:** www.racenode.com (Astro marketing site) — page targeting, titles, metas, vocabulary.
**Audience:** the agent maintaining the marketing site.
**Status:** v1 — August 2026.
**Language note:** this document is written in English because every keyword, title and meta it specifies is English. The site is English-only and should stay that way for now (see §11).

---

## 1. How to use this document

This is the reference for **what each page targets and what words it uses**. Before writing or editing any page:

1. Check §4 (traps) — three of them will silently waste a page if ignored.
2. Check §3 (vocabulary) — use the paddock word, not the SaaS word.
3. Check §6 (page specs) — take the title, meta and required phrases from there.
4. Check §2 (tone rules) — these override any SEO consideration.

If a keyword opportunity conflicts with the tone rules, drop the keyword.

---

## 2. Tone rules (non-negotiable, override everything)

RaceNode is **sober B2B, professional, insider-credible**. Not a disruptive startup, not an influencer, not a miracle-cure vendor.

**Never:**
- Denigrate existing methods (Excel, WhatsApp, spreadsheets, paper). Describe the *situation*, never call the tool inadequate.
  - OK: "A new spreadsheet for every event, out of date the moment the official schedule shifts."
  - Not OK: "Stop wasting time with Excel." / "Your method is obsolete."
- Use: "revolutionary", "game-changer", "disruptive", "10x", "unlock", artificial urgency, "limited offer".
- Imply professionals don't know their job. They do. RaceNode improves the coordination around it.

**Always:**
- Position as **the missing complementary tool**, not a replacement for how teams work.
- Lead with paddock credibility: built by a Program Manager who has been tyre-man, mechanic, engineer and team manager, running a live GT3 programme.
- Early-adopter framing: "entry price kept for life", not "act now".

---

## 3. Vocabulary — what to write, what to avoid

### 3.1 Regional variants (all three must appear across the site)

| Concept | UK / Europe | US | Continental Europe |
|---|---|---|---|
| Weekend running order | timetable, running order | schedule | timetable / planning |
| The people | crew, staff, personnel | crew, pit crew | staff |
| Who works which race | rota, availability | roster, staffing | planning |
| Travel + hotels | travel & accommodation | travel arrangements | logistique |

**Rule:** the Timetable page must contain both *timetable* and *schedule*. The Planning page must contain *crew planning*, *rota* and *roster*.

### 3.2 Words the promoter uses (SRO / GT World Challenge)

These are the exact terms in official documents, and the words a team manager will recognise instantly:

- **Detailed Timetable** / **Official Timetable** (versioned: V1, V2, Draft 3…)
- **Noticeboard**, **Bulletin**, **Appendix**
- **Team Managers' Briefing**, **Drivers' Briefing**
- **Free Practice**, **Superpole**, **Pre-grid**, **Track Walk**, **Scrutineering**
- **Entry List** / "List of Competitors, Drivers and Cars"

Use these verbatim where relevant. They are strong credibility signals and match how teams search for their own documents.

### 3.3 Words to avoid on the English site

| Avoid | Why | Use instead |
|---|---|---|
| **roadbook** | In English this means rally-raid navigation (tulip diagrams, Dakar). It will attract the wrong audience and confuse GT teams. | event brief, race weekend brief, event pack, event info page |
| **motorsport logistics** as a page target | Owned entirely by freight forwarders (see §4.1) | crew travel, travel & accommodation, people logistics |
| **ERP** as the main hook | Fine as a secondary/technical descriptor, cold as a headline | operations platform, team management platform |
| **planning** alone | Meaningless to a search engine, generic PM territory | crew planning, season planning, crew scheduling |

`roadbook` stays acceptable as an internal product/module name and in French communication, where the term is used for the team's event pack. It must not be a public English page target.

---

## 4. The four traps (verified by SERP inspection, August 2026)

### 4.1 "Motorsport logistics" = freight forwarding
The SERP is entirely freight companies (Seacon, JAS, DSV, Logistics Plus, Bespoke Handling, Russell's) plus job listings. Search intent is "who can ship my GT3 to Spa". A software page will never rank and, if it did, would convert at zero.
**→ The Logistics page must be retargeted to crew travel and accommodation.** Keep the `/logistics/` URL (module parity) but change the title, meta and H1 emphasis.

### 4.2 "Timetable" = fans
Head-term volume is "Spa 24h timetable", "F1 timetable" — spectators looking up session times. Zero commercial intent, impossible competition (promoters, motorsport media).
**→ Only compete on qualified long-tail: "timetable software for racing teams", "race weekend schedule software", "share race schedule with team".**

### 4.3 "Race weekend template / Excel template"
Dominated by generic template farms (template.net, Sourcetable, Gumroad) and fan content (F1 championship trackers). Not a real acquisition channel and it would push the copy toward Excel-bashing, which violates §2.
**→ Do not build template-bait content.**

### 4.4 Internal cannibalisation: Timetable vs Planning
Both pages will naturally use "schedule", "plan", "who's where". Without a hard line they will compete with each other and dilute both.

**The line, to be stated explicitly on both pages and reinforced with a cross-link:**
- **Timetable = inside an event.** Minute by minute across the race weekend, anchored to the official sessions.
- **Planning = between events.** Across the season: availability, who works which race, crew allocation per round.

---

## 5. Competitive landscape (for positioning, not for attack)

| Player | Positioning | Note |
|---|---|---|
| **RaceTeam.com** (UK) | "All-in-one UK motorsport team management app", Race Day Planner mapping logistics and staffing | Closest positioning to RaceNode. Founder-credibility play (Paul Rivett, 14 championship titles + software founder). Direct competitor on the insider angle. |
| **RaceOps** | "Vertical AI platform for motorsports operations": roster with availability, season calendars, race weekend planning, 6,600 venues | Directly claims the Planning territory. Heavy AI framing. |
| **RaceCloudAI** | AI plans loadouts, vehicles, equipment and schedules automatically | AI-first framing. |
| **RaceData** | Timing, data, setup, tyres, video — technical/performance side | Adjacent, not competing: they are performance data, RaceNode is operations. |
| **PitLogic** | Setups, shocks, tyres, gears, parts, checklists | Car-centric, amateur/club market. |
| **MotorsportMax (Vismagic)** | Job/quote/invoice ERP for race team *businesses* | Older, commercial-workflow angle. |
| **Racing Connected** | Enterprise platform for manufacturers, teams and organisers | Enterprise/served implementation. |

**Differentiation to write into the copy (factual, never comparative attack):**
1. **Event-centric architecture** — the product is organised the way a season is actually run, one race weekend at a time.
2. **Operations, not telemetry** — explicitly not a data/setup tool. This also prevents LLMs from filing RaceNode next to MoTeC/RaceData.
3. **The Personal module** — assignment pushed to the individual's phone. Competitors manage the back office; RaceNode closes the loop to the crew member.
4. **Built and used inside a live GT3 programme.**

---

## 6. Page-by-page specification

Titles are capped at ~60 characters, metas at ~155.

---

### 6.1 Home — `/`

**Current title:** `Racing Team Management Software & Motorsport ERP | RaceNode` — keep.

- **Primary:** racing team management software
- **Secondary:** race team management software · motorsport team management software · race team operations platform · all-in-one platform for racing teams
- **Owned term (no competition, high LLM value):** motorsport ERP · ERP for race teams
- **Missing, high intent:** `free racing team management software` — RaceNode *is* free for 2026 and this does not appear in the title or meta. This is the single most qualified query in the whole field.
- **Discipline modifiers to work in naturally:** GT3, GT4, endurance, sportscar, touring car, club racing

**Meta (proposed):**
> Racing team management software for staff, fleet, racecars, logistics and race weekends. Built by a GT3 team manager. Free for the 2026 season.

**Required phrases somewhere in the first screen:** "racing team management software", "race weekend", "free for the 2026 season".

---

### 6.2 Management — `/management/`

"Management" alone carries no search weight — it is already in the home title and in ten competitors' titles.

**Title:** `Race Weekend & Crew Management Software | RaceNode`

**Meta:**
> Plan every race weekend in one place: crew assignments and roles, racecar entries, team structure and meals. Event management built for racing teams.

- **Primary:** race weekend planning software
- **Secondary:** event management for racing teams · crew assignments per event · team roster per race · racecar entries management · crew composition
- **Long tail:** who is on which car this weekend · assign roles race team · paddock meal planning

**Required:** "race weekend" must appear in the first 100 words.
**Internal links:** → Logistics (travel for the crew you just assigned), → Personal (they see it instantly).

---

### 6.3 Timetable — `/timetable/`

Best-written page on the site. Two changes only.

**Title:** `Race Weekend Timetable & Schedule Software | RaceNode`
*(adds "schedule" — without it the page is invisible to the entire US/anglophone market, even though the body copy already uses the word heavily)*

**Meta:**
> Build your team's schedule around the official timetable, automate recurring briefings, and share a live countdown and iCal feed with the whole team.

- **Primary:** motorsport timetable software · race weekend schedule software
- **Secondary:** team schedule race weekend · race weekend running order · official timetable racing team
- **Long tail with genuine intent:** share race schedule with team · ical race schedule · session countdown display · automate briefing schedule

**Required:** both "timetable" and "schedule" in the title and in the first paragraph. Use SRO's own vocabulary (Free Practice, Superpole, Team Managers' Briefing, Track Walk) in examples.
**Internal link:** → Planning, with the explicit boundary sentence from §4.4.

---

### 6.4 Logistics — `/logistics/`

**The most important correction on the site.** Keep the URL, abandon "motorsport logistics" as the target.

**Title:** `Race Team Travel & Accommodation Software | RaceNode`

**Meta:**
> Manage crew travel, flights, hotels and room allocation for every race weekend. People logistics for racing teams — not freight.

- **Primary:** race team travel management · crew travel and accommodation software
- **Secondary:** team travel planning motorsport · flight and hotel management race team · room allocation race weekend · personnel logistics racing team
- **Job-title echo (real role names at teams):** Travel & Logistics Coordinator, Travel Operations Manager — useful phrasing for the "who is this for" block

**Required sentence, once, verbatim in spirit:** *"People logistics, not freight."* This both differentiates from the transport companies dominating the term and stops LLMs from classifying RaceNode as a shipping provider.

**Do not** claim or imply freight, customs, carnets, or vehicle transport features. Adjacent SERP competitors here are travel agencies (M&C Travel Events, LSA Travel) — a legitimate mention as "not a booking agency, the system that keeps track of what you booked".

---

### 6.5 Planning — `/crew-planning/` (TO CREATE)

**URL:** `/crew-planning/` — not `/planning/`. The nav label stays **"Planning"** for parity with the app module; only the slug carries the keyword.

**Title:** `Crew Planning & Season Scheduling for Race Teams | RaceNode`

**Meta:**
> Plan who works which race across the season. Crew availability, rotas and staffing for motorsport teams, connected to every event on the calendar.

- **Primary:** crew scheduling software for racing teams
- **Secondary:** motorsport crew planning · race team season planner · staff availability racing team · crew rota motorsport · team roster motorsport
- **Long tail:** who is going to which race · plan the season race team · crew availability across the season

**Required:**
- All three regional variants: **crew planning**, **rota**, **roster**.
- The §4.4 boundary sentence, and a link to `/timetable/`.
- Explicit connection to Management: availability feeds event assignments, it is not a standalone calendar.

**Competitive note:** RaceOps claims this territory with roster + availability + season calendars. Do not out-feature them; differentiate on the chain **availability → event assignment → the crew member's phone**, which is the part they do not close.

---

### 6.6 Personal — `/crew-app/` (TO CREATE)

Nobody searches "personal module". Nav label stays **"Personal"**; the slug carries the keyword.

This page has two jobs: convince the team manager ("my crew will finally have it all"), and — later — become the entry point for **individuals without an organisation** (freelancers, contract mechanics), which is the market-expansion play.

**Title:** `The Race Weekend App for Your Crew | RaceNode`

**Meta:**
> Every crew member sees their own role, flight, hotel, meals and next session on their phone. The Personal app is free with any RaceNode subscription.

- **Primary:** race team app for crew
- **Secondary:** motorsport crew app · race weekend app · app for race mechanics · team briefing app
- **Strategic long tail (individual market):** freelance race mechanic schedule · motorsport freelancer app · my race calendar

**Required:** "free with any subscription" — it is a genuine differentiator and a conversion argument for the whole platform. Mention iOS and Android availability once the stores are live.

---

## 7. Missing pages (structural gaps)

### 7.1 `/pricing/` — highest priority of the three
Queries `racenode pricing`, `racing team software cost`, `free racing team management software` are bottom-of-funnel, and pricing is the first thing an LLM looks for before recommending a product. Even while free, the page must exist:
- Free for the whole 2026 season, all teams, all modules
- Paid plans from 2027
- Early adopters keep their entry price for life
- Personal module free for every team member, always
- Per-module pricing regardless of team size

**Title:** `Pricing — Free for the 2026 Season | RaceNode`

### 7.2 `/about/`
The founder story is the only inimitable asset and it is currently buried in one section of the home page. It is also the passage an LLM quotes when asked "who is behind RaceNode". The closest competitor (RaceTeam.com) leads with full founder credentials.
Cover: 10+ years in the paddock, the role progression (tyre-man → mechanic → engineer → team manager → Program Manager), CSA Racing and GT World Challenge Europe, why the product exists, WBLT Engineering SAS.

**Title:** `Built in the Paddock, by a Race Team Manager | RaceNode`

### 7.3 `/legal-notice/` (mentions légales)
Legally required for a French SAS: editor name, SIREN, registered address, legal representative, host. Also a trust signal for professional buyers and a requirement for some platform verifications.

---

## 8. AEO — being the answer, not the tenth blue link

Given the real search volume in this niche (see §10), being cited by ChatGPT / Claude / Perplexity when someone asks *"what software do race teams use to manage crew, travel and schedules?"* is likely worth more than classic ranking. Concretely:

1. **Self-contained sentences.** LLMs extract sentences, not pages. Each page needs at least one standalone, pronoun-free definition:
   > "RaceNode is a racing team management platform for crew assignments, travel and race weekend schedules, organised around individual events."
2. **An FAQ block per page**, phrased as real questions:
   *Can my crew see their own assignments? Does it import the official timetable? Is there a free plan? Does it handle freight? Do I need the whole team on it?*
3. **Schema.org `SoftwareApplication`** on home + each module page, with `featureList`, `applicationCategory`, `offers`.
4. **Off-site presence:** AlternativeTo, Capterra, G2. Free, and these are the aggregate sources models lean on for "alternatives to X" answers.
5. **Explicit category boundaries.** State once per relevant page what RaceNode is *not* (not telemetry, not a freight forwarder, not a booking agency). Negative definitions prevent misclassification.

---

## 9. Technical checklist

- [ ] Unique title + meta per page (no reuse of the home meta — currently reused on the OG tags)
- [ ] One `<h1>` per page containing the primary keyword or a close variant
- [ ] Internal linking between all module pages, in both directions
- [ ] `sitemap.xml` + `robots.txt` submitted to Google Search Console and Bing Webmaster Tools
- [ ] Per-page OG image (currently a single global `og-image.png`)
- [ ] `SoftwareApplication` + `FAQPage` structured data
- [ ] Canonical URLs consistent with trailing slashes (site currently uses `/page/`)
- [ ] Alt text on module screenshots using the target phrasing (already good on `/timetable/`)

---

## 10. Reality check — what this can and cannot deliver

Total commercial search volume across this entire keyword set, all languages, is in the **low hundreds of queries per month worldwide**. No keyword-volume tool was used for this document; the assessment comes from SERP composition (who ranks, what content types exist, how thin the commercial layer is). Treat all volume statements as qualitative.

**SEO will not be the acquisition channel.** The pages have three jobs, in order of value:
1. Convert traffic arriving from direct outreach, LinkedIn and word of mouth in the paddock.
2. Be the source LLMs quote (§8).
3. Capture the handful of team managers per year actively searching.

Nothing in this document justifies investing in volume content, link building, or a blog cadence.

---

## 11. Languages

**Do not build a French version yet.** The GT market operates in English: SRO publishes in English, and Dutch, German, Italian and Belgian team managers search in English. A French version would split effort to capture the one market where RaceNode does not need SEO — France, where the relationships already exist.

Revisit only if a non-English market shows organic signup traction.

---

## 12. Execution order

1. **Retitle `/logistics/`** — five minutes, fixes the single biggest targeting error on the site
2. **Add "schedule" to the `/timetable/` title**; add "free" to the home title or meta
3. **Create `/crew-planning/`** (slug as specified, nav label "Planning")
4. **Create `/crew-app/`** (slug as specified, nav label "Personal")
5. **Create `/pricing/`**
6. **Retitle `/management/`**
7. **Create `/about/` and `/legal-notice/`**
8. Schema.org + FAQ blocks + per-page OG images
9. Directory listings (AlternativeTo, Capterra, G2)

---

## Appendix — Master keyword list

| Keyword | Page | Intent | Priority |
|---|---|---|---|
| racing team management software | `/` | commercial | high |
| free racing team management software | `/` + `/pricing/` | commercial | high |
| motorsport team management software | `/` | commercial | high |
| race team operations platform | `/` | commercial | medium |
| motorsport ERP | `/` | commercial | low volume / high LLM |
| race weekend planning software | `/management/` | commercial | high |
| event management for racing teams | `/management/` | commercial | medium |
| crew assignments race team | `/management/` | commercial | medium |
| motorsport timetable software | `/timetable/` | commercial | high |
| race weekend schedule software | `/timetable/` | commercial | high |
| share race schedule with team | `/timetable/` | commercial | medium |
| ical race schedule team | `/timetable/` | commercial | low |
| race team travel management | `/logistics/` | commercial | high |
| crew travel and accommodation software | `/logistics/` | commercial | high |
| flight and hotel management race team | `/logistics/` | commercial | medium |
| room allocation race weekend | `/logistics/` | commercial | low |
| crew scheduling software racing teams | `/crew-planning/` | commercial | high |
| motorsport crew planning | `/crew-planning/` | commercial | high |
| race team season planner | `/crew-planning/` | commercial | medium |
| staff availability racing team | `/crew-planning/` | commercial | medium |
| crew rota motorsport | `/crew-planning/` | commercial | low |
| race team app for crew | `/crew-app/` | commercial | high |
| motorsport crew app | `/crew-app/` | commercial | medium |
| app for race mechanics | `/crew-app/` | commercial | medium |
| freelance race mechanic schedule | `/crew-app/` | commercial | low / strategic |
| racenode pricing | `/pricing/` | navigational | high |
| ~~motorsport logistics~~ | — | **freight intent — do not target** | — |
| ~~roadbook~~ | — | **rally-raid intent — do not target in English** | — |
| ~~race weekend excel template~~ | — | **template farms + fan content — do not target** | — |

---

*Sources: SERP inspection of racenode.com, raceteam.com, raceops.app, racecloud.ai, racedata.app, pitlogic.com, vismagic.com, racingconnected.global; SRO / GT World Challenge Europe official timetables and noticeboards; motorsport freight and travel provider SERPs; motorsport job boards (racestaff.com, fluidjobs.com) for role terminology. August 2026.*
