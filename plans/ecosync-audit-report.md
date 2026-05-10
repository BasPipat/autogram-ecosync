# EcoSync — Full Code & UI Audit Report
**Role: Senior Code Auditor + Lead Frontend Engineer**
**Date:** 2026-05-10
**Audited by:** Roo (Architect Mode)
**Scope:** `src/models/EcoSync.ts`, `src/lib/mongodb.ts`, `src/app/**`, `src/components/**`, `src/app/api/**`

---

## PART 1 — PREVIOUS PLAN STATUS (from prior AI)

| Item | Status | Notes |
|---|---|---|
| DELETE `src/models/EcoSync.ts` | ⚠️ BLOCKED | Still actively imported by `api/dashboard/route.ts` and `api/vault/upload-pod/route.ts` — deleting NOW will break production |
| MODIFY `src/lib/mongodb.ts` | ✅ Confirmed valid | Hardcoded fallback + `(global as any)` must be fixed |

> **Critical correction:** The prior AI stated "no other files are currently importing from EcoSync.ts" — this is **WRONG**.
> - `src/app/api/dashboard/route.ts` line 3: `import { Trip, CarbonLedger, IntegrityVault } from '@/models/EcoSync'`
> - `src/app/api/vault/upload-pod/route.ts` line 3: `import { IntegrityVault, Trip } from '@/models/EcoSync'`
> - `src/app/api/vault/verify-pod/route.ts` (likely same pattern — not yet confirmed)
>
> **Action required before deletion:** Migrate all imports in those files to use `src/models/Trip.ts`, `src/models/CarbonRecord.ts`, and a new `src/models/IntegrityVault.ts` (or equivalent). Only then delete `EcoSync.ts`.

---

## PART 2 — LOGIC & BUGS

### BUG-01 · Dashboard API: N+1 Query Problem (Critical Performance)
**File:** `src/app/api/dashboard/route.ts` lines 23–34

```ts
// WRONG: fires 2 DB queries per trip × 5 trips = 10 extra round-trips
const tripsWithDetails = await Promise.all(recentTrips.map(async (trip) => {
  const carbon = await CarbonLedger.findOne({ tripId: trip.tripId }).lean();
  const vault  = await IntegrityVault.findOne({ tripId: trip.tripId }).lean();
  ...
}));
```

**Fix:** Use a single `$in` query to batch-fetch all CarbonLedger and IntegrityVault records for the 5 trip IDs, then join in memory.

---

### BUG-02 · `upload-pod` API: Field Name Mismatch (Data Loss) — CRITICAL
**File:** `src/app/api/vault/upload-pod/route.ts`

- Client sends `{ tripId, podUrl }` (line 57 of `src/app/dashboard/page.tsx`)
- API destructures `{ tripId, podImageUrl }` (line 8 of `upload-pod/route.ts`)
- **Result:** `podImageUrl` is always `undefined` → the `if (!tripId || !podImageUrl)` guard returns HTTP 400 every time. POD upload is completely broken.

**Fix:** Align field name. Either change the API to accept `podUrl`, or change the client to send `podImageUrl`.

---

### BUG-03 · `verifiedPODs` Stat is Misleading
**File:** `src/app/api/dashboard/route.ts` line 17

```ts
const verifiedPODs = await IntegrityVault.countDocuments({ isVerified: true });
```

The dashboard displays this as `"% POD Compliance"` with a `%` suffix (line 136 of `src/app/dashboard/page.tsx`), but the value is a raw count, not a percentage. This will show `"3%"` when it means `"3 verified PODs"`.

**Fix:** Calculate `Math.round((verifiedPODs / totalTrips) * 100)` server-side, or remove the `%` suffix from the UI.

---

### BUG-04 · Carbon Activity Page: `useEffect` Missing Dependencies
**File:** `src/app/carbon-activity/page.tsx` lines 72–74

```ts
useEffect(() => {
  fetchData(filter, value);
}, []); // filter and value not in deps array — stale closure risk
```

This is a stale-closure bug. If `filter`/`value` change before mount completes, the initial fetch uses stale values. Use `useCallback` + proper deps, or move initial values to `useState` initializer.

---

### BUG-05 · Overview Page: `activeVehicles` is Hardcoded to 0
**File:** `src/app/overview/page.tsx` line 48

```ts
const activeVehicles = 0; // จำลองตัวเลขรถที่กำลังวิ่ง (จะเชื่อมกับ Database ในอนาคต)
```

The page renders a Google Map but shows no markers and no real data. The API `src/app/api/overview/active-trucks/route.ts` exists but is never called. This page is essentially a placeholder shipped to production.

---

### BUG-06 · `EcoSync.ts` Model Name Conflict Risk — CRITICAL
**File:** `src/models/EcoSync.ts` line 53

```ts
export const Trip = mongoose.models.Trip || mongoose.model<ITrip>('Trip', TripSchema);
```

`src/models/Trip.ts` also registers a model named `'Trip'` with a **different schema** (has `vehicleType`, `weight`, `distance`, `emissionKgCo2e`, etc.). In a hot-reload environment (Next.js dev), whichever file loads first wins. This causes silent data corruption — queries may return wrong field sets.

---

## PART 3 — SECURITY

### SEC-01 · `upload-pod` API: No Authentication Check — CRITICAL
**File:** `src/app/api/vault/upload-pod/route.ts`

The endpoint has zero auth guard. Any anonymous HTTP client can call `POST /api/vault/upload-pod` and overwrite POD evidence for any trip. Compare with `calculate-emission/route.ts` which correctly calls `getSessionToken(req)`.

**Fix:** Add `const token = await getSessionToken(req); if (!token) return 401;` at the top.

---

### SEC-02 · `mongodb.ts`: Hardcoded Fallback URI
**File:** `src/lib/mongodb.ts` line 3

```ts
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eco-sync';
```

The `if (!MONGODB_URI)` check on line 5 is **unreachable** — the `||` fallback ensures it is never falsy. In a misconfigured production deploy, the app silently connects to `localhost` (which fails or connects to a wrong DB) instead of throwing a clear error.

**Fix (confirmed from prior plan):**
```ts
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error('MONGODB_URI environment variable is not defined');
```

---

### SEC-03 · `(global as any)` Type Escape
**File:** `src/lib/mongodb.ts` lines 9–12

Using `(global as any)` bypasses TypeScript's type system. In a multi-tenant or edge environment this can cause unexpected shared state.

**Fix (confirmed from prior plan):** Add proper global type augmentation:
```ts
declare global {
  var mongoose: { conn: mongoose.Connection | null; promise: Promise<typeof mongoose> | null };
}
```

---

### SEC-04 · Google Maps API Key Exposed Client-Side Without Restriction Check
**File:** `src/app/overview/page.tsx` line 44

```ts
googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
```

`NEXT_PUBLIC_` variables are bundled into the client JS. If the key has no HTTP referrer restriction in Google Cloud Console, it can be scraped and abused. This is a deployment/ops concern but should be documented and enforced.

---

### SEC-05 · `error: any` in Catch Blocks
**Files:** `src/app/api/vault/upload-pod/route.ts` line 39, multiple other routes

```ts
} catch (error: any) {
```

Using `any` on caught errors disables type safety. Use `unknown` and narrow with `instanceof Error`.

---

## PART 4 — CLEAN CODE & REFACTOR

### CC-01 · Duplicated Modal Pattern in Dashboard
**File:** `src/app/dashboard/page.tsx`

Two modals (Upload POD + Verify POD) share identical structure: backdrop, card, title row, input, cancel/submit buttons. This is ~70 lines of duplicated JSX.

**Recommendation:** Extract a reusable `<ConfirmModal title onClose onSubmit loading>` component to `src/components/ConfirmModal.tsx`.

---

### CC-02 · Inline `style={{}}` Overuse in SidebarLayout
**File:** `src/components/SidebarLayout.tsx` lines 81–91

Mouse hover effects are implemented via `onMouseEnter`/`onMouseLeave` with direct DOM style manipulation — a React anti-pattern that bypasses the virtual DOM.

```ts
onMouseEnter={(e) => {
  (e.currentTarget as HTMLElement).style.background = 'var(--border-light)';
```

**Recommendation:** Use Tailwind's `hover:` variants or CSS custom property classes. This also makes the component easier to test.

---

### CC-03 · `any[]` Type for Trips State
**File:** `src/app/dashboard/page.tsx` line 9

```ts
const [trips, setTrips] = useState<any[]>([]);
```

Define a proper `Trip` interface matching the API response shape and use it throughout.

---

### CC-04 · Duplicated `FilterType` and `getDefaultValue` Logic
**Files:** `src/app/carbon-activity/page.tsx` and `src/app/report-center/page.tsx`

Both files define identical `type FilterType = 'day' | 'month' | 'year'` and similar filter logic. Extract to `src/lib/carbon-filter.ts`.

---

### CC-05 · Magic Numbers / Hardcoded Colors in Dashboard
**File:** `src/app/dashboard/page.tsx` lines 121–143

Gradient strings like `'linear-gradient(135deg, #10B981, #059669)'` are hardcoded inline. These should reference the design token system already defined in `globals.css`.

---

### CC-06 · Overview Page: Dark Theme Inconsistency
**File:** `src/app/overview/page.tsx` line 52

```tsx
<div className="min-h-screen text-white bg-[#0a192f] font-sans p-8">
```

Every other page uses `var(--bg-base)` (light theme). The Overview page hardcodes a dark navy background, breaking visual consistency. This page was likely built in isolation and never integrated into the design system.

---

### CC-07 · PDF Export Function is 150+ Lines in a Page Component
**File:** `src/app/report-center/page.tsx` lines 35–200+

The `downloadPdf()` function is a massive inline async function inside the page file. It should be extracted to `src/lib/pdf-export.ts` for testability and reuse.

---

## PART 5 — MODERN STACK (Next.js + TailwindCSS)

### STACK-01 · Use Next.js Server Components for Static/Fetched Data
Most pages are `'use client'` and fetch data via `useEffect`. For pages like `report-center` and `carbon-activity`, the initial data load can be done in a **React Server Component (RSC)**, eliminating the loading spinner on first paint and improving Core Web Vitals.

**Pattern:**
```
src/app/report-center/
  page.tsx          ← Server Component: fetches initial data
  ReportClient.tsx  ← 'use client': handles filter interactions
```

---

### STACK-02 · Use Next.js `loading.tsx` Convention
No `loading.tsx` files exist in any route segment. Adding them enables React Suspense streaming and removes the need for manual `if (loading) return <Spinner>` patterns in every page.

---

### STACK-03 · Use Next.js Route Handlers with Proper Caching
Several API routes use `export const dynamic = 'force-dynamic'` correctly, but `src/app/api/dashboard/route.ts` has no cache directive. Add `export const revalidate = 30` to align with the 30-second polling interval already used on the client.

---

### STACK-04 · Tailwind v4 `@theme` — Migrate CSS Variables to Tailwind Tokens
**File:** `src/app/globals.css`

The project uses Tailwind v4 (`@import "tailwindcss"`) but defines design tokens as raw CSS variables (`--accent`, `--bg-base`, etc.) outside the `@theme` block. This means Tailwind's JIT cannot generate utility classes like `bg-accent` or `text-primary`.

**Fix:** Move all tokens into the `@theme inline { }` block:
```css
@theme inline {
  --color-accent: #10B981;
  --color-bg-base: #F7F8FA;
  --color-text-primary: #0F172A;
}
```
Then use `bg-accent`, `text-text-primary` as Tailwind classes instead of `style={{ color: 'var(--accent)' }}`.

---

### STACK-05 · Replace `@react-google-maps/api` with `next/script` + Maps JS API
The `@react-google-maps/api` package (v2.20.8) loads the entire Maps SDK synchronously. Use `next/script` with `strategy="lazyOnload"` to defer the Maps bundle and improve LCP.

---

## PART 6 — PROFESSIONAL UI (Shadcn/UI + Sustainable Green Palette)

### UI-01 · Adopt Shadcn/UI Component Library

**Recommended installation:**
```bash
npx shadcn@latest init
```

**Priority components to replace:**

| Current | Replace with Shadcn |
|---|---|
| Custom modal divs | `<Dialog>` |
| Raw `<select>` / `<input>` | `<Select>`, `<Input>` |
| Custom badge spans | `<Badge>` |
| Raw `<button>` | `<Button variant="...">` |
| Custom table in report-center | `<Table>` |

This eliminates ~400 lines of custom styling and ensures accessibility (ARIA roles, keyboard navigation, focus traps in modals).

---

### UI-02 · Sustainable Green Premium Palette

The current accent `#10B981` (Tailwind `emerald-500`) is a good base. Elevate it to a premium "Sustainable Green" system:

```
Primary Green:    #059669  (emerald-600) — CTAs, active states
Surface Green:    #ECFDF5  (emerald-50)  — card backgrounds
Border Green:     #A7F3D0  (emerald-200) — subtle borders
Text on Green:    #064E3B  (emerald-900) — high-contrast labels
Accent Amber:     #D97706  (amber-600)   — warnings, fuel metrics
Carbon Neutral:   #6B7280  (gray-500)    — neutral/zero-emission states
```

Add a `carbon-intensity` semantic color scale (green → amber → red) for emission values:
- `< 50 kgCO₂e` → green
- `50–150 kgCO₂e` → amber
- `> 150 kgCO₂e` → red

---

### UI-03 · Typography Hierarchy is Inconsistent

Font sizes use arbitrary pixel values (`text-[9px]`, `text-[11px]`, `text-[12px]`, `text-[13px]`, `text-[14px]`, `text-[15px]`) instead of Tailwind's type scale. This makes global font changes impossible.

**Recommendation:** Define a 4-step type scale:
- `text-xs` (12px) — metadata, labels
- `text-sm` (14px) — body, table cells
- `text-base` (16px) — card values
- `text-lg/xl/2xl` — headings

---

### UI-04 · No Dark Mode Support

The design system defines only light-mode tokens. Given the Overview page already has a dark theme, and the sidebar uses `backdrop-filter`, adding `dark:` variants via Tailwind would be straightforward and expected by enterprise users.

---

## PART 7 — DATA VISUALIZATION (Carbon Dashboard)

### VIZ-01 · Current Chart: CSS Bar Chart (Not Scalable)

**File:** `src/app/carbon-activity/page.tsx`

The current chart is a hand-rolled CSS bar chart using `div` widths calculated from `maxEmission`. It has no axes, no tooltips, no animation, and breaks with many data points.

**Recommendation: Adopt Recharts** (lightest bundle, React-native, good TypeScript support)

```bash
npm install recharts
```

**Priority charts to implement:**

| Chart | Component | Data |
|---|---|---|
| Carbon over time | `<AreaChart>` with gradient fill | Monthly ledger data |
| Per-trip emission | `<BarChart>` with color scale | Trip-level data |
| Fuel vs Emission | `<ComposedChart>` | Dual-axis |
| Compliance rate | `<RadialBarChart>` | POD verified % |

---

### VIZ-02 · Dashboard: No Visual Carbon Trend

**File:** `src/app/dashboard/page.tsx`

The Executive Dashboard shows 3 stat cards and a trip list — no chart at all. A carbon trend sparkline (last 7 days) on the `totalCarbon` stat card would immediately communicate trajectory.

**Recommended addition:**
```tsx
// Use Recharts <LineChart> with minimal config inside the stat card
import { LineChart, Line, ResponsiveContainer } from 'recharts';
```

---

### VIZ-03 · PDF Chart is Manually Drawn (Fragile)

**File:** `src/app/report-center/page.tsx` lines 95–138

The PDF bar chart is drawn pixel-by-pixel using `jsPDF` primitives. It has no Y-axis labels, no value annotations, and clips at 15 data points.

**Recommendation:** Use `html2canvas` to capture a rendered Recharts component and embed it as an image in the PDF. This gives a pixel-perfect chart with zero manual drawing code.

---

### VIZ-04 · No Benchmark / Target Line

Carbon dashboards are most useful when they show a target. Add a configurable `targetKgCo2e` from Master Settings and render it as a reference line (`<ReferenceLine>` in Recharts) on all charts.

---

## PART 8 — USER EXPERIENCE

### UX-01 · No Error State UI on Dashboard

**File:** `src/app/dashboard/page.tsx` lines 22–36

When `fetchDashboardData()` fails, the error is only `console.error`'d. The user sees a blank trip list with no explanation. Add an error banner component.

---

### UX-02 · POD Upload Accepts Any URL (No Validation)

**File:** `src/app/dashboard/page.tsx` line 306

```tsx
<input type="url" ... placeholder="Paste image link here..." />
```

The input accepts any URL string. There is no check that it points to an image (`.jpg`, `.png`, etc.) or a trusted domain. Users can accidentally paste a Google Docs link and the system will accept it silently.

**Fix:** Add client-side URL pattern validation + server-side content-type check.

---

### UX-03 · Mobile Bottom Nav is Incomplete

**File:** `src/components/SidebarLayout.tsx` lines 260–281

The mobile bottom nav has 4 items (Dashboard, Trips, Carbon, Settings) but the desktop sidebar has 5 (adds "User Access"). The `Users` page is inaccessible on mobile.

---

### UX-04 · No Empty State for Carbon Activity Chart

**File:** `src/app/carbon-activity/page.tsx`

When there are no trips for the selected period, the chart area renders an empty `div` with no message. Add an illustrated empty state: "No emissions recorded for this period."

---

### UX-05 · "System Live" Badge is Always Green

**File:** `src/app/dashboard/page.tsx` line 159

```tsx
<div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
<span>System Live</span>
```

This badge is hardcoded — it shows "System Live" even when the API is failing. Connect it to actual API health (e.g., check if `fetchDashboardData` succeeded).

---

### UX-06 · Report Center: Filter UX is Confusing

**File:** `src/app/report-center/page.tsx`

The page has two separate filter systems (a tab bar for view type + a date filter) that interact in non-obvious ways. Users must click "Apply" after changing the date — there is no auto-apply. Consider debounced auto-fetch on date change.

---

### UX-07 · No Loading Skeleton — Only Spinner

All pages use a full-screen spinner (`<Loader2 className="animate-spin">`) during data load. This causes layout shift when content appears. Replace with **skeleton screens** that match the final layout shape, especially for the stat cards and trip list.

---

### UX-08 · Overview Page: Completely Non-Functional

**File:** `src/app/overview/page.tsx`

- `activeVehicles` is hardcoded to `0`
- No markers on the map
- The existing API (`/api/overview/active-trucks`) is never called
- The page uses a completely different dark theme from the rest of the app

This page should either be completed or hidden from the navigation until ready.

---

## SUMMARY — PRIORITY ACTION LIST

| Priority | ID | Category | Action |
|---|---|---|---|
| P0 CRITICAL | BUG-02 | Bug | Fix `podUrl` vs `podImageUrl` field name mismatch — POD upload is broken |
| P0 CRITICAL | SEC-01 | Security | Add auth guard to `upload-pod` API |
| P0 CRITICAL | BUG-06 | Bug | Resolve `Trip` model name conflict between EcoSync.ts and Trip.ts |
| P0 CRITICAL | SEC-02 | Security | Remove hardcoded MongoDB fallback URI |
| P1 HIGH | BUG-01 | Performance | Fix N+1 query in dashboard API |
| P1 HIGH | BUG-03 | Bug | Fix `verifiedPODs` displayed as `%` when it is a raw count |
| P1 HIGH | CC-01 | Refactor | Extract reusable `<ConfirmModal>` component |
| P1 HIGH | STACK-04 | Stack | Migrate CSS vars to Tailwind v4 `@theme` tokens |
| P2 MEDIUM | VIZ-01 | Visualization | Replace CSS bar chart with Recharts `<BarChart>` |
| P2 MEDIUM | VIZ-02 | Visualization | Add carbon trend sparkline to Dashboard stat cards |
| P2 MEDIUM | UI-01 | UI | Install Shadcn/UI; replace modals and form inputs |
| P2 MEDIUM | UX-07 | UX | Replace full-screen spinner with skeleton screens |
| P2 MEDIUM | UX-03 | UX | Add "User Access" to mobile bottom nav |
| P3 LOW | STACK-01 | Stack | Convert data-fetch pages to RSC + Client split |
| P3 LOW | CC-07 | Refactor | Extract PDF export to `src/lib/pdf-export.ts` |
| P3 LOW | UI-04 | UI | Add dark mode support via Tailwind `dark:` variants |
| P3 LOW | VIZ-04 | Visualization | Add target/benchmark reference line to charts |
| P3 LOW | UX-08 | UX | Complete or hide Overview page |

---

*End of Audit Report — Ready for implementation handoff.*
