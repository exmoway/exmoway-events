# Exmoway events — instructions for the daily Claude task

This repository holds the "Events & ideas" lists shown on the homepage of **exmoway.com**, a
worldwide flight-comparison website. Every day the website downloads these files, checks them
with the same rules as `tools/validate.mjs`, and shows them to visitors. Visitors see the list for
their country (`trending-gb.json` for the UK, …) or the worldwide list (`trending-world.json`).

## Your job on each run

1. Read `manifest.json`, every `trending-*.json` file and `pages.json`.
2. **Remove** items whose `end` date is in the past.
3. **Find upcoming events** for roughly the next 1–5 months: well-known festivals, major sports
   events, national holidays and celebrations, big seasonal highlights that travellers plan trips
   around. Prefer events with fixed, announced dates.
4. **Verify every date on an official source** — the organiser, the official tourism board, a
   government site, or the venue. Put that page in `source` and a short name in `source_name`.
   If you cannot confirm the dates on an official or similarly authoritative page, **do not add the
   event**. Never guess or estimate dates. Skip anything marked "TBC".
5. Keep **6–10 items** per list, in date order (soonest first). One or two seasonal ideas without
   dates (e.g. "Winter sun in Tenerife") are fine; they need no `source`.
6. **Links**
   - `trending-world.json`: use `route` with a destination slug from `pages.json` → `destinations`.
   - Country lists: use either a `route` slug from `pages.json` (`routes` or `destinations`) or a
     `search` from that country's home airport (see `home_airports` in `pages.json`) to an airport in
     `pages.json` → `airports`. For `search`: `dep` 1–2 days before the event starts, `ret` the day
     after it ends (at most 60 days later).
7. **Writing rules**: short, neutral, factual English. No prices, no percentages, no currency
   amounts, no "cheapest", no "trending"/"popular" or search-volume claims, no unverifiable
   superlatives, no HTML. Title ≤ 80 characters, blurb ≤ 160, dates text ≤ 40 (e.g. `4–11 Feb 2027`).
8. Set `generated_at` to the current UTC time (`YYYY-MM-DDTHH:MM:SSZ`) in every file you change.
   If a file has not changed for 30 days, re-check its items and refresh `generated_at`.
9. Run `node tools/validate.mjs`. **Fix every problem** it prints and run it again until it says
   "All files OK."
10. If you changed anything, commit to the **main** branch with a message like
    `Events update 2026-11-21: add X, remove Y` and push. If nothing needed changing, do not commit.

## Do not

- Do not edit `tools/`, `pages.json`, `CLAUDE.md` or `README.md`.
- Do not add or remove countries in `manifest.json` unless the owner asks in this file's
  "Owner requests" section below.
- Do not add files other than `trending-*.json`.
- Do not include personal data, links to unofficial ticket resellers, or anything unrelated to travel.

## File format

```json
{
  "country_code": "TH",
  "generated_at": "2026-11-21T03:00:00Z",
  "_note": "…",
  "headline": "Events & ideas for your next trip",
  "sub": "Upcoming events from Thailand — dates checked on official sites. Tap one to see flights from Bangkok.",
  "items": [
    {
      "title": "Sapporo Snow Festival",
      "blurb": "Huge snow and ice sculptures in Odori Park and other sites in Sapporo, Japan",
      "dates": "4–11 Feb 2027",
      "end": "2027-02-11",
      "source": "https://www.sapporo.travel/en/event/event-list/sapporo_snow_festival/",
      "source_name": "Sapporo Tourism",
      "search": { "from": "BKK", "to": "CTS", "dep": "2027-02-03", "ret": "2027-02-09" }
    },
    { "title": "Winter in Japan", "blurb": "Snow, hot springs and winter illuminations", "route": "bangkok-to-tokyo" }
  ]
}
```

## Owner requests

(none)
