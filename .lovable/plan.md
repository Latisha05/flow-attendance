# Attendance & Leave Management PWA — Build Plan

## What we're building
A mobile-first PWA where employees punch in/out in one tap, request paid leave, and admins approve them — all under one dynamic URL with spring-physics transitions so it feels like a native app, not a website.

## Roles
- **Employee** — punch in/out, view today's elapsed time, weekly hours, request leave, see history.
- **Admin** — everything above + live operations view (present/leave/absent counts), approve/decline leave, manage employees.
- (No middle "manager" tier — keeps it simple per your answer.)

## Working-day rule (per your spec)
- Standard day = **9 hours including 1 hour break** → 8h net working time goal.
- **1 Paid Leave (PL)** balance to start (admin can adjust per employee later).
- Working days: Mon–Sat default (admin-configurable on/off per weekday).

## Attendance flow (fastest possible punch)
- Single giant button on Home. Tap → records timestamp.
- Silent geolocation: grabs lat/lng in the background after the punch is saved; never blocks the tap. Coordinates stored as a note on the record; no "office vs home" gating, no QR, no selfie (per your "just note location" answer).
- Live elapsed timer ticking with tabular monospace digits.
- Progress ring fills as net hours approach 8.0h.

## Screens (single URL with morphing transitions)
1. **Home** — greeting, big punch button inside the progress ring, arrived/goal stats, "Punching In/Out" state.
2. **Leave** — PL balance card, "Request Leave" sheet (date range + reason), history list with Approved/Pending/Declined chips.
3. **Operations** (admin only) — live present/leave/absent counts, pending approvals with one-tap Approve/Decline, today's roster.
4. **Profile** — name, role, sign out.
5. **Auth** — email + password sign-in/sign-up.

Bottom tab bar with 3–4 tabs. Tabs swap via spring transitions (Framer Motion `AnimatePresence` with shared layout) — no page reloads, no white flashes.

## Design (locked from "Mechanical Precision" direction)
- Background `hsl(40 12% 95%)` warm off-white, foreground near-black, primary blue `hsl(217 91% 54%)`, accent orange `hsl(15 90% 55%)`.
- Inter + Inter Tight + JetBrains Mono (tabular numerals for clocks).
- Rounded-3xl cards, soft inset shadow on the punch button, ring progress around it.
- Signature "thunk" entrance animation (scale + blur settle) on every screen mount.
- Tab transitions use spring easing `cubic-bezier(0.32, 0.72, 0, 1.1)`.

## PWA shell (installable, NOT offline)
- Manifest with name, short name, theme color, icons, `display: standalone`.
- Apple touch icon + theme-color meta in `__root.tsx`.
- **No service worker** — keeps it bulletproof in preview and avoids stale-cache headaches. Add later only if you ask for true offline.
- Result: installable on Android (install banner) and iPhone (Add to Home Screen) and launches as a fullscreen app.

## Backend (Lovable Cloud)
Tables:
- `profiles` — id (= auth.users.id), full_name, role (`employee` | `admin`), pl_balance (default 1).
- `attendance` — id, user_id, punch_in_at, punch_out_at, lat, lng, net_seconds (computed on punch out).
- `leave_requests` — id, user_id, start_date, end_date, days, reason, status (`pending` | `approved` | `declined`), decided_by, decided_at.

RLS:
- Employees: read/insert their own attendance, read/insert their own leave, read their own profile.
- Admins (via `has_role` security-definer fn on a separate `user_roles` table): read all attendance, read/update all leave requests, read all profiles.
- Trigger: auto-create profile + assign `employee` role on signup. First user is auto-promoted to `admin`.

Server functions:
- `punchIn`, `punchOut` (writes attendance, returns updated record).
- `requestLeave`, `decideLeave` (admin-only via middleware).
- `getTodayStats` (admin operations counters).

## Technical notes
- TanStack Start + TanStack Query, single SPA feel via client-side routing on `/`, `/leave`, `/team`, `/profile`, `/auth`.
- Routes wrapped in a shared `<AppShell>` with `AnimatePresence` so navigation never unmounts the shell — eliminating flashes.
- All clocks use `requestAnimationFrame`-driven tick for buttery updates.
- Framer Motion for spring transitions, tab indicator slide, button press rebound, list item stagger.
- `lucide-react` icons.

## Out of scope (ask if you want them later)
- Offline mode / service worker
- Push notifications
- Multiple leave types beyond PL
- Reports/CSV export
- Geofencing / "must be at office to punch"
