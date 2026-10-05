# Store Listing (App Store & Play Store)
_Last updated: 2026-10-05_

## Overview

Everything to paste into the two store consoles: listing texts, privacy
questionnaire answers, the review account, and what is still missing before
submission. Build and signing procedures live in the mobile release runbook.

## Review account

Both stores review a login-gated app with credentials we provide. An empty
organization reads as a "minimum functionality" rejection, so the reviewer
lands in a seeded team.

| | |
|---|---|
| Email | `reviewer@racenode.com` |
| Password | `RaceNode-Review-2026!` |
| Organization | Falcon GT Racing — 6 staff, 2 trucks, 2 GT3 cars, 2 upcoming events, timetable, hotel, meals, crew, budget |
| Seed | `scripts/seed-demo-org.sql` — run in the dashboard SQL editor; destructive and idempotent on its own fixed ids; event dates are relative to run day, so **re-run it before each submission** to keep the data looking current |

Enter the credentials in App Store Connect → App Review Information, and in
Play Console → App content → App access.

## Listing texts

One shared set; both consoles accept the same copy.

_Copy is owned by the marketing side and kept in concordance with
www.racenode.com — tone rules and vocabulary follow
`docs/racenode-marketing-site-seo-reference.md` (describe the situation, never
denigrate existing methods; always pair "timetable" with "schedule"; never
promise unreleased modules)._

**Positioning**: the stores reach individuals, not teams — organizations are
recruited in the paddock, not through search. The listing sells the app to
the freelance engineer or mechanic managing their own season (the Personal
module, which works without any organization); the team side appears last,
as the upgrade path. Screenshots follow the same order.

The texts themselves live in [`store/listing.json`](../store/listing.json),
which the app repo's mobile release workflow reads to publish them on both
stores — edit them there, not here. One entry per locale (`en-US` today):
name, Apple subtitle, Play short description, the shared long description
(one array entry per paragraph, joined with a blank line), Apple keywords
(joined with commas), support and privacy policy URLs.

The stores show the text exactly as typed: no Markdown, section leads are
written in capitals. `node scripts/store/check.mjs` checks every locale
against the store limits (name and subtitle 30, short description 80, long
description 4000 characters, keywords 100 bytes) and rejects Markdown; it
also runs before every site build, so a listing over the limits fails the
Cloudflare check.

Set by hand in the consoles, not in the file: category — Sports (primary),
Business (secondary).

## Privacy questionnaires

Answers reflect what the code actually does. Re-check them whenever data
collection changes (analytics, push tokens, payments in-app).

### Apple — App Privacy

Everything is purpose "App Functionality"; nothing is used for tracking.

| Category | Answer | Linked to identity |
|---|---|---|
| Contact info: name, email, phone | Collected (accounts + staff profiles) | Yes |
| User content: photos, other content | Collected (profile/car photos, documents, team data) | Yes |
| Identifiers: user ID | Collected (Supabase account) | Yes |
| Diagnostics: crash + performance data | Collected (Sentry; no `setUser` in the code) | No |
| Everything else (location, financial, browsing, advertising…) | Not collected — Places is typed addresses, not device location; Stripe is web-only | — |

### Google — Data Safety

- **Collected**: personal info (name, email, phone), photos, files and
  documents, crash logs + diagnostics. Purpose "App functionality"; photos and
  documents are user-provided, the rest required.
- **Shared with third parties**: **No** — Supabase and Sentry are service
  providers processing on our behalf, which Play exempts from "sharing".
- **Encrypted in transit**: Yes.
- **Deletion request**: `https://www.racenode.com/account-deletion` — the page
  documents the in-app flow (Profile → Delete account, owners transfer
  ownership first), what is deleted vs retained, and the email fallback.

## Visual assets

| Asset | Requirement |
|---|---|
| iPhone screenshots | 3–10, format 6.9″ (1320×2868). Capture on a device from TestFlight. iPad screenshots are **not** needed — the 1.0 is iPhone-only (`TARGETED_DEVICE_FAMILY = 1`) |
| Play phone screenshots | ≥ 2, captured on a device |

**Shot order** (same on both stores, personal-first like the copy — all taken
on the review account): 1. Personal season timeline — six rounds and the
reviewer's own days on one view · 2. My race weekend (Spa event detail: my
role, my room, my meals) · 3. Event timetable · 4. Accommodation with the
rooming list · 5. Crew view — both cars fully crewed ("when your team runs
RaceNode") · 6. Events season list (the six rounds) — optional.
| Play app icon | 512×512 PNG |
| Play feature graphic | 1024×500 — **mandatory**; produced (horizontal logo + tagline on the gray-950 background), regenerate via the sharp snippet if the branding changes |

## Blocking before submission

1. Screenshots (above) — the feature graphic is produced.
2. Run the demo seed in **production** (dashboard SQL editor) so the review
   account exists there, and re-run it before each submission so the data is
   fresh.
3. **Cut a fresh release build after the last compliance feature merges.**
   Reviewers judge the JS bundled at build time, not what OTA delivers later —
   in-app account deletion (merged, Profile → Delete account, documented at
   `https://www.racenode.com/account-deletion`) must be in the submitted
   binary.

Resolved: in-app account deletion (App Store 5.1.1(v)) shipped; the real Play
app-signing fingerprints are in `assetlinks.json`.

## Related Documents

- [Mobile release](./mobile-release.md) — builds, signing, CI, OTA, release procedure
- [Secrets reference](./secrets-reference.md) — the store signing secrets
