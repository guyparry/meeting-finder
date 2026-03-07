# Meeting Finder

Next.js 15 app that aggregates 12-step meeting data from three Swedish sources (AA, ACA, CA) into a single filterable interface.

---

## Data sources

### AA — Anonyma Alkoholister
- **Endpoint:** `https://www.aa.se/wp-json/aa/v1/groups`
- **Custom WP REST namespace:** `aa/v1`
- **Pagination:** 10 groups per page, `?page=N`. First response contains `{ pages, total_results, groups[] }`. Currently ~474 groups across 48 pages.
- **Structure per group:** one group can have meetings on multiple days. Each day slot has a `time` (HH:MM) and a `type` object. Null slots mean no meeting that day.
- **All pages are fetched in parallel** in `src/lib/sources/aa.ts`.

```json
{
  "ID": 6782,
  "title": "AA Afterwork, Södermalm, Stockholm",
  "coordinates": { "lat": 59.316321, "lng": 18.073387 },
  "address": "Högbergsgatan 31, 116 20 Stockholm",
  "place": "Andreaskyrkan",
  "language": { "name": "Svenska", "id": "svenska" },
  "accessible": false,
  "online": false,
  "email": "", "phone": "", "meeting_link": "",
  "information": "<p>HTML string...</p>",
  "division": "Krets 5",
  "meetings": {
    "days": {
      "monday": [null],
      "wednesday": [{ "time": "17:00", "type": { "name": "Öppna AA-möten", "id": "oppna-aa-moten" } }],
      "sunday": [{ "time": "11:00", "type": { "name": "Öppna AA-möten", "id": "oppna-aa-moten" } }]
    }
  }
}
```

### CA — Cocaine Anonymous Sverige
- **Endpoint:** `https://caws-api.azurewebsites.net/api/v1/meetings-tsml?area=sweden`
- **Format:** flat JSON array, no pagination. TSML-compatible format.
- **Day numbering:** 0 = Sunday, 1 = Monday … 6 = Saturday (TSML standard).
- **Type codes:** `O` = Open, `C` = Closed, `B` = Big Book, `ST` = Step Study, `TR` = Traditions, `SV` = Swedish language, `OUT` = Outdoor, etc.

```json
{
  "day": 4,
  "slug": "348-213",
  "name": "CA Söder Om Söder (SOS), Tumba, Stockholm",
  "time": "18:00",
  "end_time": "19:00",
  "types": ["O", "ST"],
  "region": "Stockholms län",
  "address": "Gröndalsvägen 10",
  "formatted_address": "Gröndalsvägen 10, 147 30 Tumba, Sweden",
  "latitude": "59.1981019",
  "longitude": "17.8316907",
  "attendance_option": "in_person",
  "notes": "Öppet steg-/traditionsm\u00f6te.",
  "conference_url": "",
  "timezone": "Europe/Stockholm"
}
```

The CA site (`en.ca-sweden.se/moten`) is on **Squarespace** and uses TSML React (`tsml_react_config` + `window.caws_config = { area: "Sweden", ordering: "CITY" }`). The React component fetches from the Azure API above.

### ACA — Adult Children of Alcoholics Sverige
- **Site:** `https://aca-sverige.org` — WordPress + Elementor + ACF
- **List endpoint:** `https://aca-sverige.org/wp-json/wp/v2/mote?per_page=100&_fields=id,title,link,dag,motestyp`
  - Custom post type: `mote`
  - ACF fields are **not** exposed via REST API (empty `acf: []`)
- **Detail data** (time, address, location, email) is scraped from individual meeting pages: `https://aca-sverige.org/mote/{slug}/`
  - Time format on page: `"kl. 18:00 – 19:00"`
  - Pages are scraped concurrently (5 at a time) and cached 1 hour

**ACA taxonomy IDs:**

| Taxonomy | ID | Value |
|---|---|---|
| dag (day) | 34 | Måndag (Mon=1) |
| | 35 | Tisdag (Tue=2) |
| | 36 | Onsdag (Wed=3) |
| | 37 | Torsdag (Thu=4) |
| | 38 | Fredag (Fri=5) |
| | 39 | Lördag (Sat=6) |
| | 40 | Söndag (Sun=0) |
| motestyp (format) | 67 | Fysiskt möte (in_person) |
| | 68 | Online |
| | 69 | Telefon (phone) |

Other ACA taxonomies available but not yet used: `moteskategori` (open/closed/theme), `city`.

---

## Normalised Meeting type

All sources are mapped to this common interface (`src/types/meeting.ts`):

```typescript
interface Meeting {
  id: string               // "aa-{ID}-{day}-{time}" | "ca-{slug}" | "aca-{id}"
  source: 'AA' | 'ACA' | 'CA'
  name: string
  day: number              // 0=Sun, 1=Mon, ..., 6=Sat
  time: string             // "HH:MM" 24h
  endTime?: string
  address?: string
  formattedAddress?: string
  location?: string        // venue name
  latitude?: number
  longitude?: number
  types: string[]          // AA: type IDs, CA: TSML codes, ACA: empty for now
  attendanceOption: 'in_person' | 'online' | 'phone'
  language?: string
  region?: string
  email?: string
  phone?: string
  conferenceUrl?: string
  notes?: string           // AA: HTML string, CA: plain text
  accessible?: boolean     // AA only
  sourceUrl?: string       // ACA: link to detail page
}
```

---

## Architecture

```
src/
  app/
    page.tsx                  # Server component — fetches /api/meetings, passes to client
    layout.tsx
    globals.css
    api/
      meetings/
        route.ts              # GET /api/meetings — fetches all 3 sources in parallel
                              # export const revalidate = 3600 (1hr ISR cache)
  lib/
    sources/
      aa.ts                   # Paginates through all 48 pages, expands day slots
      ca.ts                   # Single fetch, maps TSML fields
      aca.ts                  # Fetches post list, scrapes detail pages concurrently
  types/
    meeting.ts
  components/
    MeetingsClient.tsx        # 'use client' — filter state, grouped/sorted list
    MeetingCard.tsx           # Individual meeting card
```

The page fetches from its own API route (`/api/meetings`) which in production benefits from Next.js ISR caching. In development set `NEXT_PUBLIC_BASE_URL=http://localhost:3000`.

---

## Known issues / next steps

- **ACA scraping is unverified** — the regex patterns for time, address, and location were written based on observed page text (`kl. 18:00 – 19:00`). Needs testing against real pages; some meetings may parse with missing fields.
- **ACA `types` is always `[]`** — the `moteskategori` taxonomy (open/closed/theme) is fetched but not mapped yet.
- **AA `notes` field is HTML** — the `information` field contains raw HTML (`<p>` tags). Consider stripping on display or at normalisation time.
- **No map view** — coordinates are normalised for AA and CA; a map view would be a natural addition.
- **No geolocation filtering** — the AA source originally supports proximity search; not yet wired up.
- **CA type codes not labelled in UI** — the TSML type codes (`O`, `C`, `ST`, etc.) are stored but only raw codes are shown.

---

## Running locally

```bash
npm install
npm run dev
# open http://localhost:3000
```
