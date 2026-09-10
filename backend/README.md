# FitTrack Backend

Node.js + Express + MongoDB (Mongoose) API for the FitTrack trainer-management
platform. It backs the three existing front-end apps in this repo:

| App | Folder | Role |
| --- | --- | --- |
| Super Admin console | `../admin` | `admin` |
| Trainer portal | `../trainer` | `trainer` |
| Client portal | `../user` | `client` |

The `data/foods` and `data/exercises` master files at the repo root
(`../data/foodLibrary.json`, `../data/exerciseLibrary.json`, plus
`exerciseTechniques.json` and `dietPlans.json`) are the seed source for the
library collections. After seeding, MongoDB — not the JSON files — is the runtime
source of truth.

---

## 1. What was built and why

### Domain models (`src/models`)

| Model | Represents | Why it exists (source in the front-ends) |
| --- | --- | --- |
| `User` | Identity + auth for every person | The admin **Users** page unifies admins, trainers and clients into one list. Holds `role`, `status`, `email`, `passwordHash`, `avatarColor`. |
| `Trainer` | Trainer profile (1‑to‑1 `User`) | admin **Trainers** table + `mockData.trainers[]`: `specialization`, `capacity`, `clientCount`, `rating`, `revenue`, `referralCode` (issued once), `referredBy`. |
| `Client` | Client profile (1‑to‑1 `User`) | admin/trainer/user `mockData` clients + `currentClient`: `trainer` (assignment), `goal`, `plan`, `startWeight`/`weight`/`target`, `progress`, follow‑up dates. |
| `Food` | **Food master data** + trainer‑custom foods | `data/foodLibrary.json` (200 rows) + `LibraryContext`. Fields kept verbatim (`base`, `unit`, `gi`, `gl`, `cal/protein/carbs/fat/fiber`) so the calculations stay identical. `isMaster`/`owner` separate the shared library from a trainer's own foods. |
| `Exercise` | **Exercise master data** + trainer‑custom exercises | `data/exerciseLibrary.json` (240 rows). Descriptive only — `sets`, `reps`, `rest`, `technique`, `target`, `equipment`, `youtube`. **No MET/calorie fields exist in the source and none are invented.** |
| `ExerciseTechnique` | `standard` / `tut` / `superset` enum | `data/exerciseTechniques.json`; every `Exercise` references it via `technique`. |
| `NutritionConfig` | GI/GL classification thresholds (singleton) | `data/foodLibrary.json -> thresholds` (`glycemicThresholds` in the apps). Drives `low/medium/high` bands. |
| `LibraryCategory` | Food & exercise category lists | `categories` arrays in the two library JSON files. |
| `DietPlanTemplate` | Reusable "General Diet Plans" (max 4) | `data/dietPlans.json` + admin `LibraryContext`. Trainers **copy** a template into a client plan; the template is never mutated. |
| `DietPlan` | A client's diet plan built by a trainer | trainer **DietPlans** builder → client **MyDiet**. Meal items store only `{ food, foodCode, qty }` — macros are always derived. |
| `ExercisePlan` | A client's exercise plan by training day | trainer **ExercisePlans** → client **MyExercises**. `done` per exercise drives completion %. |
| `Payment` | Billing record | admin **Payments** + `mockData.payments[]`. `PLAN_PRICES` = Starter 49 / Standard 89 / Premium 149 / Elite 249. |
| `LibraryResource` | External link catalog (Drive/YouTube) | admin **Library Management**. Unrelated to the food/exercise libraries. |
| `FollowUp` | Trainer follow‑up pipeline | trainer **Follow‑ups** (`overdue/today/upcoming/completed`). |
| `CorrectionRequest` | Client → trainer change request | client "Request a correction" → trainer **Requests**. |
| `ProgressPhoto` | Client photo + trainer feedback note | client **ProgressPhotos** / trainer `ProgressPhotosContext`. |
| `ScheduleActivity` | Unified schedule entry | trainer `ScheduleContext` (`today` + `week` grid) and client `ScheduleContext` (`today` + `upcoming`). |
| `Conversation` / `Message` | Trainer ↔ client private chat | trainer/client **Messages** pages. |
| `Notification` | In‑app notifications | every portal's NotificationMenu. |
| `WeightEntry` | Weekly weigh‑ins | "Weight Journey" chart (`weightProgress[]`). |
| `DailyLog` | Client daily checklist | plan.md §27/§30 — the check‑off model. Source of adherence / completion %. |
| `Referral` | Trainer‑to‑trainer referral records | `data/referrals.json -> referrals[]` + admin **Referrals**. |

Models are **only** created where the existing apps actually need them. There is
no model for unrelated `data/` files.

### How Admin, Trainer and Client connect

```
User(role: admin)      —— manages ——>  Food / Exercise / ExerciseTechnique / NutritionConfig
                                       DietPlanTemplate / LibraryResource / Payment
                                       Trainer (+capacity) / Client (+assignment)

User(role: trainer) 1—1 Trainer  ——<  Client (Client.trainer)          [assignment, capacity-guarded]
                                 ——<  DietPlan / ExercisePlan          [built for each client]
                                 ——<  FollowUp / CorrectionRequest / ProgressPhoto note / Conversation
                                 ——<  Trainer.referralCode / Referral  [trainer-to-trainer]
                                 reads Food/Exercise master + own custom rows

User(role: client)  1—1 Client   ——>  Trainer (assigned)
                                 sees published DietPlan / ExercisePlan
                                 owns DailyLog / WeightEntry / ProgressPhoto / CorrectionRequest
```

### Foods → calculations (all in `src/services/nutrition.service.js`)

A verbatim port of the identical `utils/nutrition.js` shipped in all three apps.

| Calculation | Formula | Used by |
| --- | --- | --- |
| Scale a food to a quantity | `factor = qty / food.base`; `cal = round(cal*factor)`; protein/carbs/fat scaled & rounded to 1dp | `POST /api/foods/:id/compute`, every diet-plan response, `POST /api/nutrition/compute` |
| Glycemic Load (per item) | `GL = round((gi * carbGrams) / 100, 1)` where `carbGrams = food.carbs * factor` | same |
| Meal totals | sum of item `cal/protein/carbs/fat/gl` | `GET /api/diet-plans/:id`, `GET /api/clients/:id/diet-plan`, templates |
| Day totals | sum of meal totals | same |
| GI / GL level | `value >= high ? 'high' : value >= medium ? 'medium' : 'low'` against `NutritionConfig` | same (`giLevel`, `glLevel`, `mealGLLevel`, `dayGLLevel`) |
| Diet adherence / today progress | `doneTasks / totalTasks * 100` | `GET /api/progress/daily`, `GET /api/stats/client/completion` |

The API returns diet plans **with** all derived numbers so the client and the
trainer always see the same figures, and a `Food` edit flows through
automatically (plan items never cache macros).

### Exercises → calculations

There are **none that consume exercise master-data fields.** Confirmed by tracing
every app: exercise rows carry no MET/calorie/metabolic values, and no screen
computes calorie expenditure. The only derived figure is **workout completion
percentage** = `doneExercises / totalExercises * 100`
(`src/services/exercisePlan.service.js`), returned by the exercise-plan
endpoints. Exercises are otherwise used as a **library to pick from** when a
trainer builds a plan (defaults for sets/reps/rest/technique/video prefill the
form).

---

## 2. Configure `.env`

```bash
cp .env.example .env
```

| Var | Meaning |
| --- | --- |
| `PORT` | API port (default `8000`). |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/fittrack` locally, or an Atlas `mongodb+srv://…` URI. |
| `JWT_SECRET` | Long random string — **required**, no insecure default in production. |
| `JWT_EXPIRES_IN` | Token lifetime (default `7d`). |
| `CORS_ORIGINS` | Comma-separated front-end origins (the three Vite dev servers). Empty = allow all (dev only). |
| `SEED_DEMO` | `true` → `npm run seed` also creates demo accounts. |
| `SEED_DEMO_PASSWORD` | Password for every demo account (default `demo1234`). |

`.env` is git-ignored; `.env.example` is committed.

---

## 3. Seed the database

The seeder is **idempotent** — safe to run repeatedly. Master rows are matched by
their stable `code` / `key` / `slug` and updated in place; nothing is duplicated
and user-generated data is never touched.

```bash
npm run seed             # master data (+ demo accounts when SEED_DEMO=true)
npm run seed:master      # ONLY foods / exercises / techniques / categories / thresholds / templates
npm run seed:demo        # ONLY demo admin + trainers + clients + assignments + sample plans
```

What `seed:master` loads (from `../data`):

- `foodLibrary.json` → `Food` (200), `LibraryCategory` (food), `NutritionConfig`
- `exerciseLibrary.json` → `Exercise` (240), `LibraryCategory` (exercise)
- `exerciseTechniques.json` → `ExerciseTechnique` (3)
- `dietPlans.json` → `DietPlanTemplate` (≤4), each item linked to its `Food`

What `seed:demo` adds (from front-end mock data + `referrals.json`):

- 1 admin (`alexandra.reed@fittrack.io`)
- 6 trainers with their **verbatim referral codes** + referral records
- 12 clients assigned round-robin to active trainers (capacity kept in sync)
- a **published** diet plan + exercise plan + weight history for the first client
- one follow-up per client and ~3 payments per client

All demo accounts use `SEED_DEMO_PASSWORD`. Examples:

```
admin    alexandra.reed@fittrack.io   / demo1234
trainer  marcus.bennett@fittrack.io   / demo1234
client   emma.thompson@gmail.com      / demo1234
```

---

## 4. Run the backend

```bash
npm install
npm run seed        # first time (needs MongoDB reachable)
npm run dev         # auto-restart on change  (or: npm start)
```

Health check: `GET http://localhost:8000/api/health`

---

## 5. API surface

All routes are under `/api`. All except `/auth/register`, `/auth/login` and
`/health` require `Authorization: Bearer <token>`.

### Auth
| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| POST | `/auth/register` | public | `role` = `trainer` or `client`; first `admin` only if none exists. Trainers can pass `referralCode`. |
| POST | `/auth/login` | public | → `{ token, user }` (user includes the trainer/client profile). |
| GET | `/auth/me` | any | current profile. |
| PATCH | `/auth/me` | any | name / phone / avatarColor / password. |

### Library / master data
| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| GET | `/foods` | any | `?category=&search=&source=`. Trainers also see their own custom foods. |
| GET | `/foods/categories` · `/foods/thresholds` | any | category list · GI/GL bands. |
| GET | `/foods/:id` | any | by `_id` or `code`. |
| POST/PATCH/DELETE | `/foods` · `/foods/:id` | admin (master) / trainer (own custom) | |
| POST | `/foods/:id/compute` | any | `{ qty }` → scaled macros + GI/GL + level. |
| GET | `/exercises` (+ `/categories`, `/techniques`, `/:id`) | any | mirrors foods. |
| POST/PATCH/DELETE | `/exercises` · `/exercises/:id` | admin / trainer (own) | |
| GET | `/nutrition/config` | any | thresholds. |
| PUT | `/nutrition/config` | admin | tune bands. |
| POST | `/nutrition/compute` · `/nutrition/meal-gl` | any | ad-hoc calculators (custom-food path). |

### Diet & exercise plans
| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| GET/POST/PATCH/DELETE | `/diet-plan-templates` | read: any · write: admin | max 4. |
| GET | `/diet-plans?client=` | scoped | trainer→their clients, client→own. |
| POST | `/diet-plans` | trainer | `{ clientId, title, meals:[{name,time,notes,taskKey,items:[{foodCode,qty}]}] }`. |
| POST | `/diet-plans/from-template` | trainer | `{ clientId, templateId, title? }` — copies meals. |
| GET | `/diet-plans/:id` | scoped | **returns computed macros / GL / levels**. |
| PATCH · POST `/publish` · DELETE | `/diet-plans/:id` | trainer | |
| GET | `/clients/:clientId/diet-plan` | scoped | current **published** plan (`:clientId` may be `me`). |
| GET/POST/PATCH/DELETE | `/exercise-plans` … | trainer builds | `GET /:id` returns completion %. |
| PATCH | `/exercise-plans/:id/exercises/:exId` | client or trainer | toggle `done`. |
| GET | `/clients/:clientId/exercise-plan` | scoped | current published plan. |

### People (admin)
| Method | Path | Role |
| --- | --- | --- |
| GET | `/users` · PATCH `/users/:id/status` | admin |
| GET/POST/PATCH/DELETE | `/trainers` · `/trainers/:id` | admin (`/trainers/me` for the trainer) |
| PATCH | `/trainers/:id/capacity` | admin — `{ delta }` or `{ capacity }` |
| GET/POST/PATCH/DELETE | `/clients` · `/clients/:id` | admin/trainer (scoped); client `PATCH /clients/me` |
| PATCH | `/clients/:id/assign` | admin — `{ trainerId | null }`, capacity-guarded |

### Workflow
| Method | Path | Role |
| --- | --- | --- |
| GET/POST/PATCH/DELETE | `/followups` | trainer (client can GET own) |
| GET/POST/PATCH/DELETE | `/corrections` | client creates, trainer responds (`action: resolve\|decline\|reopen`) |
| GET/POST/PATCH/DELETE | `/progress-photos` | client uploads, trainer notes |
| GET/POST/PATCH/DELETE | `/schedule` | trainer & client (own) |
| GET/POST | `/progress/weight` | weight journey + summary (`weightLost`, `toGoal`) |
| GET/PATCH | `/progress/daily` | client checklist + `completionPct` |

### Comms & stats
| Method | Path | Role |
| --- | --- | --- |
| GET | `/conversations` · `/conversations/:id/messages` · `/conversations/messages?client=` | trainer/client |
| POST | `/conversations/messages` | trainer/client — also broadcasts over Socket.IO |
| PATCH | `/conversations/:id/read` | trainer/client — mark the other side's messages read |
| GET/PATCH | `/notifications` … | any |
| GET | `/payments` · POST · PATCH `/payments/:id` | admin |
| GET/POST/PATCH/DELETE | `/resources` | read: any (active) · write: admin |
| GET | `/referrals/overview` | admin |
| GET `/referrals/me` · POST `/referrals/redeem` | trainer |
| GET | `/stats/admin` · `/stats/admin/revenue-trend` | admin |
| GET | `/stats/trainer` | trainer |
| GET | `/stats/client/completion` | client (or trainer/admin `?client=`) |

---

## 5.5 Realtime messaging (Socket.IO)

Socket.IO is attached to the **same HTTP server / port** (`initRealtime()` in
`src/server.js`), default path `/socket.io`. It powers the trainer ↔ client chat
in the Messages portals: live delivery, read/unread, presence and typing.

The REST message endpoints and the socket events share one service
(`src/services/message.service.js`) — a message sent via `POST
/api/conversations/messages` is still broadcast to connected sockets, and vice
versa, so the two transports stay consistent.

### Connect

```js
import { io } from 'socket.io-client'
const socket = io(import.meta.env.VITE_API_URL.replace('/api', ''), {
  auth: { token: jwt },          // same JWT as the REST calls
  transports: ['websocket'],
})
```

A bad/expired token fails the handshake with `connect_error`
(`unauthorized: …`). On connect the socket auto-joins a personal room and starts
tracking presence.

### Client → server (all take an ack callback `(res) => …`, `res = { ok, ... }`)

| Event | Payload | Effect |
| --- | --- | --- |
| `conversation:open` | `{ conversationId }` or (trainer) `{ clientId }` or (client) `{}` | Joins the conversation room, returns `{ conversationId, messages, readReceipt }`, and marks the other side's messages **read**. |
| `conversation:leave` | `{ conversationId }` | Leaves the room. |
| `message:send` | `{ conversationId \| clientId, text, tempId? }` | Persists + broadcasts. Ack: `{ message, tempId }` for optimistic reconciliation. |
| `message:read` | `{ conversationId \| clientId }` | Marks the other side's messages read, zeroes your unread counter, emits a receipt. Ack: `{ messageIds, readAt, count }`. |
| `typing` | `{ conversationId, isTyping }` | Relayed to the other participant only (not persisted). |
| `presence:get` | `{ userIds? }` (defaults to your counterparts) | Ack: `{ online: [userId…] }`. |

### Server → client

| Event | Payload | When |
| --- | --- | --- |
| `message:new` | `{ conversationId, message: { id, from, text, createdAt, readAt } }` | A message is sent (to everyone in the conversation room, sender included — dedupe on `id`/`tempId`). |
| `message:read` | `{ conversationId, by: 'trainer'\|'client', readAt, messageIds }` | The other participant read your messages → render ✓✓. |
| `conversation:updated` | `{ conversationId, lastMessage, lastMessageAt, unread }` | Pushed to **both** participants' personal rooms after every send/read so the conversation list re-sorts and re-badges. `unread` is scoped to the recipient. |
| `presence:snapshot` | `{ online: [userId…] }` | On connect — which of your counterparts are currently online. |
| `presence:update` | `{ userId, online }` | A counterpart connected / fully disconnected. |
| `typing` | `{ conversationId, userId, from, name, isTyping }` | The other participant is typing. |

### Read / unread model

- `Conversation.unreadForTrainer` / `unreadForClient` — incremented for the
  recipient on every `message:send`; zeroed when that side opens the thread or
  emits `message:read`. Exposed as `unread` in `GET /api/conversations` and in
  `conversation:updated`.
- `Message.readAt` — set when the other side reads; drives the ✓✓ receipt via
  `message:read` (`messageIds`).
- **Offline fallback** — if the recipient has no live socket, a `type: 'message'`
  row is written to `Notification` so it still surfaces in their bell.

Presence is process-local (a `userId → sockets` map). For multi-instance
deploys, swap `src/realtime/presence.js` for a Redis set + the
`@socket.io/redis-adapter`; the event contract is unchanged.

---

## 6. Connecting the front-ends

Each Vite app already reads `VITE_API_URL` (see `trainer/.env`:
`VITE_API_URL=http://localhost:8000/api`). Point all three at this server and add
their dev origins to `CORS_ORIGINS`.

Migration path per app (nothing about the UI needs to change):

1. **Auth** — replace the `localStorage`-flag `AuthContext` with a real call to
   `POST /api/auth/login`; store the returned JWT and send it as
   `Authorization: Bearer`. `GET /api/auth/me` rehydrates on refresh.
2. **Master libraries** — `services/foodLibrary.js` / `exerciseLibrary.js`
   currently `import … from '@data/*.json'`. Swap the import for
   `GET /api/foods` / `GET /api/exercises`; `foodCategories` →
   `GET /api/foods/categories`; `glycemicThresholds` →
   `GET /api/foods/thresholds`; techniques → `GET /api/exercises/techniques`.
3. **Trainer custom foods/exercises** — `LibraryContext` `addFood`/`addExercise`
   call `POST /api/foods` / `POST /api/exercises` (server sets
   `source:'trainer'`, `owner`, `isMaster:false`).
4. **Diet-plan builder** — send meals as `{ items: [{ foodCode, qty }] }`; render
   straight from the response's `meals[].items` (already carry `cal`, `protein`,
   `carbs`, `fat`, `gi`, `gl`, `giLevel`, `glLevel`) and `meals[].totals` /
   `dayTotals` / `mealGLLevel`. Drop the client-side `computeNutrition` call — or
   keep it; it produces the same numbers.
5. **Client MyDiet / MyExercises** — `GET /api/clients/me/diet-plan` and
   `GET /api/clients/me/exercise-plan`.
6. **Admin dashboards** — `getStats()` → `GET /api/stats/admin`; trainer
   `getStats()` → `GET /api/stats/trainer`.
7. **Referrals** — `services/referrals.js` → `GET /api/referrals/me`,
   `POST /api/referrals/redeem`; admin → `GET /api/referrals/overview`.
8. **Messages portals** — load the thread list from `GET /api/conversations`
   (each row already has `name`, `avatarColor`, `online`, `unread`,
   `lastMessage`). Open a `socket.io-client` connection with the JWT, then:
   `conversation:open` when a thread is selected (seeds `messages`, clears
   unread), render incoming `message:new`, flip the sidebar badge/sort on
   `conversation:updated`, show ✓✓ from `message:read`, drive the online dot from
   `presence:snapshot` + `presence:update`, and emit `typing`. Replace the mock
   `conversations` / `messagesByClient` / `send()` in
   `trainer/…/pages/Messages.jsx` and `user/…/pages/Messages.jsx` with these.
   Everything also works over plain REST (`POST /api/conversations/messages`,
   `PATCH /api/conversations/:id/read`) if you skip the socket.

---

## 7. Project layout

```
backend/
├── src/
│   ├── config/        env, db connection, domain constants (enums lifted from the apps)
│   ├── models/        Mongoose schemas (one per domain concept)
│   ├── services/      calculations & aggregation (nutrition, diet plan, exercise plan, stats, referral)
│   ├── controllers/   HTTP handlers (no business logic beyond request shaping)
│   ├── routes/        Express routers, grouped by area
│   ├── middlewares/   auth (JWT + role guard), error handling
│   ├── realtime/      Socket.IO: bootstrap, handshake auth, presence, chat handlers
│   ├── utils/         jwt, password hashing, slugify, ApiError, asyncHandler
│   ├── seeders/       seed.js orchestrator + seedMaster.js + seedDemo.js
│   ├── app.js         express app factory
│   └── server.js      connect DB + attach Socket.IO + listen
├── .env.example
└── package.json
```
