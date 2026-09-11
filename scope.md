# Fit360 OS — Project Scope, Gaps & Integration Plan

## 1. System Overview

Fit360 OS is a fitness management platform with three portals:

| Portal | Role | Runs on |
|--------|------|---------|
| **Admin** (`/admin`) | Super admin — manages trainers, clients, payments, libraries, referrals | Vite + React + Ant Design |
| **Trainer** (`/trainer`) | Trainer — manages assigned clients, builds diet/exercise plans, tracks progress, chats | Vite + React + Ant Design |
| **Client** (`/user`) | Client (end user) — follows assigned plans, logs progress, chats with trainer | Vite + React + Ant Design |
| **Backend** (`/backend`) | Express + MongoDB — auth, REST APIs, Socket.io realtime | Node.js |

---

## 2. Role Relationships

```
ADMIN
 ├── Creates Trainers
 ├── Creates Clients
 ├── Assigns Client → Trainer
 ├── Manages payments, libraries, referrals
 └── Sees all data across the system

TRAINER (assigned clients only)
 ├── Builds Diet Plans → assigns to Client → See if done or not
 ├── Builds Exercise Plans → assigns to Client → See if done or not
 ├── Sets follow-up schedule
 ├── Reviews client progress (weight, habits, photos)
 ├── Responds to correction requests
 ├── Chats with Client
 ├── Sets water/sleep goals per client
 └── Views client's daily adherence & cheat meals

CLIENT (sees only own data)
 ├── Views assigned Diet Plan → checks off meals, logs cheat meals
 ├── Views assigned Exercise Plan → marks exercises done
 ├── Logs weight, daily habits (water, sleep, workout)
 ├── Uploads progress photos
 ├── Submits correction requests to Trainer
 ├── Chats with assigned Trainer
 ├── Views own schedule & history
 └── Views own progress charts & consistency
```

---

## 3. What's Already Built & Connected (Backend ↔ UI)

### Backend APIs (fully implemented)
- **Auth**: register, login, me, updateMe
- **People**: CRUD trainers, clients, users; assign client to trainer
- **Diet Plans**: full CRUD, publish, create-from-template, client's current plan endpoint
- **Diet Plan Templates**: admin-managed general plans
- **Exercise Plans**: full CRUD, publish, mark exercise done, client's current plan endpoint
- **Follow-ups**: CRUD for trainer pipeline
- **Corrections**: client creates, trainer responds, client cancels
- **Progress Photos**: upload (client), add note (trainer), list, delete
- **Schedule**: CRUD activities for trainer and client
- **Progress**: weight log, daily checklist, cheat meals, daily history
- **Chat**: conversations, messages, send, mark read
- **Notifications**: list, mark read, mark all read
- **Payments**: CRUD (admin)
- **Resources / Library**: CRUD (admin manages, all read)
- **Referrals**: overview (admin), my referrals (trainer), redeem
- **Stats**: admin dashboard, revenue trend, trainer stats, client completion
- **Realtime**: Socket.io for presence, messaging

### Client Portal — API-connected
- ✅ Dashboard (daily tasks, weight chart, trainer info)
- ✅ My Diet (fetches assigned plan, meal completion, cheat logging)
- ✅ My Exercises (fetches assigned plan, toggle exercise done)
- ✅ My Progress (weight log, daily habits, habit history charts)
- ✅ Messages (real chat via API + socket)
- ✅ Corrections / Requests (create, view status)
- ✅ Progress Photos (upload, view trainer notes)
- ✅ Schedule (fetches from API)
- ✅ Notifications (fetches from API)

### Trainer Portal — API-connected
- ✅ Clients list (fetches from API)
- ✅ Client Profile (fetches client data, weight, plans, daily log, habit history, cheats, photos)
- ✅ Diet Plans builder (CRUD via API)
- ✅ Exercise Plans builder (CRUD via API)
- ✅ Messages (real chat via API + socket)
- ✅ Follow-ups (CRUD via API)
- ✅ Corrections / Requests (view, respond via API)
- ✅ Schedule (fetches from API)
- ✅ Notifications (fetches from API)

### Admin Portal — API-connected
- ✅ Trainers CRUD
- ✅ Clients CRUD + assignment
- ✅ Users list
- ✅ Payments CRUD
- ✅ Library resources CRUD
- ✅ Referrals overview
- ✅ Diet Plan Templates (general plans)
- ✅ Food & Exercise library management
- ✅ Dashboard stats
- ✅ Notifications

---

## 4. What's MISSING or INCOMPLETE

### 4.1 Client Portal Gaps

| Page / Feature | Status | Issue |
|---------------|--------|-------|
| **History / Activity Log** | ❌ MISSING | Client has no page to view past daily logs, past weeks' adherence, or a history timeline. They can only see "today" and the last N days in chart form. No dedicated "My History" page. |
| **Past Diet Plans** | ❌ MISSING | Client can only see their current active plan. No way to view previous assigned plans (e.g., "Week 4 plan"). |
| **Past Exercise Plans** | ❌ MISSING | Same — only current plan visible. No archive/history. |
| **Profile — view own data** | ⚠️ SHALLOW | Profile page exists but unclear if it lets the client edit their own info (phone, email, avatar). Currently reads from auth context. |
| **Follow-up visibility** | ❌ MISSING | Client cannot see their upcoming or past follow-ups with the trainer. Only the trainer sees the follow-up pipeline. |
| **Notification actions** | ⚠️ INCOMPLETE | Notifications render but clicking them doesn't navigate to the relevant page/item. |
| **Settings** | ⚠️ STUB | Settings page exists but it's unclear what a client can configure beyond theme. No password change, no notification preferences. |

### 4.2 Trainer Portal Gaps

| Page / Feature | Status | Issue |
|---------------|--------|-------|
| **Client history tab** | ⚠️ PARTIAL | Trainer sees last 14 days of habits, but no full historical log. No way to scroll back through all daily logs or compare week-over-week. |
| **Plan version history** | ❌ MISSING | When a trainer updates a diet/exercise plan, the old version is overwritten. No versioning or "plan history" for a client. |
| **Dashboard** | ⚠️ PARTIAL | Dashboard page exists but some data comes from `mockData.js` (schedule, charts). Needs to use real API calls for `weeklySessions`, `clientProgressTrend`. |
| **Referrals** | ❌ MISSING PAGE | Backend has `/referrals/me` and `/referrals/redeem` but there's no Referrals page in the trainer portal. |
| **Settings** | ⚠️ STUB | Page exists but minimal — no profile edit, no notification preferences, no working hours config. |

### 4.3 Admin Portal Gaps

| Page / Feature | Status | Issue |
|---------------|--------|-------|
| **Client Detail** | ⚠️ PARTIAL | Page exists but may rely on mock data for the progress series and activity timeline (`clientProgressSeries`, `clientActivity` in mockData). |
| **Trainer Detail** | ⚠️ PARTIAL | Same concern — check if it fetches real data or renders mock. |
| **Assignments page** | ⚠️ CHECK | Page exists — verify it calls the real `/clients/:id/assign` endpoint. |
| **Revenue analytics** | ⚠️ PARTIAL | `revenueTrend` API exists; verify the admin Dashboard page calls it instead of using mockData's `revenueTrend` array. |

### 4.4 Backend Gaps

| Feature | Status | Issue |
|---------|--------|-------|
| **Daily log history per client (trainer view)** | ⚠️ CHECK | `/progress/daily/history?client=X` exists — verify it returns enough data for a full history page. |
| **Plan versioning** | ❌ MISSING | No model for plan history. When diet/exercise plan is updated, old data is lost. |
| **Password change** | ❌ MISSING | `PATCH /auth/me` exists but unclear if it handles password. No dedicated password change route. |
| **Client self-registration** | ❌ MISSING | Clients are created by admin. No self-signup flow. (May be intentional.) |
| **File uploads for progress photos** | ⚠️ CHECK | Currently photos seem to be base64 data URLs. No S3/file storage integration. Will not scale. |
| **Pagination** | ⚠️ PARTIAL | Some list endpoints may not implement pagination. Fine for small data, breaks at scale. |

---

## 5. Hardcoded / Mock Data Still in Use

### `user/src/services/mockData.js`
- **Still exists** with full mock clients, diet plans, exercise plans, schedules, messages, notifications, corrections, progress photos.
- **Currently NOT used** by the main pages (Dashboard, MyDiet, MyExercises, MyProgress all call the real API).
- **Used by**: Possibly `MySchedule.jsx`, `Profile.jsx`, `Settings.jsx` — need to verify.
- **Action**: Audit each page import. Remove mockData once all pages are confirmed API-driven.

### `trainer/src/services/mockData.js`
- **Still exists** with full mock clients, schedules, follow-ups, diet/exercise plans, messages, corrections, photos, notifications.
- **Partially used**: Dashboard page likely still references `todaySchedule`, `weeklySessions`, `clientProgressTrend`, etc.
- **Action**: Same — audit each page and migrate remaining references to API calls.

### `admin/src/services/mockData.js`
- **Still exists** with mock trainers, clients (96), users, payments (120), library resources, notifications, dashboard charts.
- **Likely used by**: Dashboard charts (`clientGrowth`, `revenueTrend`), ClientDetail (`clientProgressSeries`, `clientActivity`), TrainerDetail.
- **Action**: Replace with real API calls. The backend already has `/stats/admin`, `/stats/admin/revenue-trend`.

---

## 6. API Integration Plan

### Phase 1 — Clean Up Mock Data Usage
1. **Audit every page** in all three portals for `import ... from '...mockData'`.
2. Replace each mock import with the corresponding API call.
3. Delete `mockData.js` from each portal once fully migrated.

### Phase 2 — Fill Missing Client Features
4. **My History page** — new page showing past daily logs in a calendar/list view. Backend: `/progress/daily/history?days=90` or paginated.
5. **Past Plans** — add "Plan History" tab on MyDiet and MyExercises. Backend: need a new endpoint `GET /clients/:id/diet-plans?status=all` to return past plans, not just the active one. Same for exercise plans.
6. **Follow-up visibility** — client should see their follow-ups. Backend already returns follow-ups; add a client-facing `GET /followups?client=me` filter.
7. **Notification click-through** — make each notification type navigate to the relevant page.
8. **Settings** — add password change, notification preferences, profile edit.

### Phase 3 — Fill Missing Trainer Features
9. **Full client history** — extend Client Profile with a scrollable history view, not just 14 days.
10. **Referrals page** — add `Referrals.jsx` to trainer portal, wire to `/referrals/me` and `/referrals/redeem`.
11. **Dashboard real data** — replace mock chart data with real API calls.
12. **Plan versioning** (stretch) — save a snapshot when a plan is republished. New model `PlanVersion`.

### Phase 4 — Admin Cleanup
13. **ClientDetail & TrainerDetail** — ensure they fetch real data for progress series and activity.
14. **Assignments page** — confirm real API integration.
15. **Revenue dashboard** — confirm it uses `/stats/admin/revenue-trend`.

### Phase 5 — Backend Hardening
16. **Password change endpoint** — `PATCH /auth/password`.
17. **Pagination** — ensure all list endpoints support `?page=&limit=`.
18. **File storage** — migrate progress photos from base64 to S3/cloud storage.
19. **Plan versioning model** — if needed.

---

## 7. UI Adjustments Needed

| Area | What to Change |
|------|---------------|
| Client nav | Add "My History" menu item |
| Client MyDiet | Add "Past Plans" tab or link |
| Client MyExercises | Add "Past Plans" tab or link |
| Client Profile | Make fields editable (name, phone, avatar color) |
| Client Settings | Add password change form, notification toggle |
| Trainer nav | Add "Referrals" menu item |
| Trainer Dashboard | Replace mock chart imports with API calls |
| Trainer Client Profile | Add "Full History" expansion or page link |
| Admin ClientDetail | Wire progress series to real API |
| Admin TrainerDetail | Wire data to real API |
| All portals | Notification click handlers → navigate to source |
| All portals | Remove `mockData.js` imports once replaced |

---

## 8. Data Flow Summary

```
ADMIN creates Trainer → Trainer appears in trainer portal
ADMIN creates Client → assigns to Trainer
TRAINER builds Diet Plan → publishes → Client sees in "My Diet"
TRAINER builds Exercise Plan → publishes → Client sees in "My Exercises"
CLIENT checks off meals → daily log updates → Trainer sees adherence in Client Profile
CLIENT marks exercise done → Trainer sees completion
CLIENT logs weight → appears in both Client and Trainer charts
CLIENT logs cheat meal → Trainer sees it highlighted in Client Profile diet tab
CLIENT uploads progress photo → Trainer adds notes
CLIENT submits correction request → Trainer responds
CLIENT ↔ TRAINER chat in real time (Socket.io)
ADMIN sees everything: all clients, all trainers, payments, stats
```
