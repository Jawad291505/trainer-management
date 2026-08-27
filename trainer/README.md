# FitTrack — Trainer Portal

Trainer-facing side of the fitness management platform (Phase 3 of the plan).
Built with **React + Vite**, **Tailwind CSS**, **Ant Design**, **Recharts** and **React Router**,
reusing the same design system and shared components as the admin portal.

## Run

```bash
cd trainer
npm install
npm run dev      # http://localhost:5174
npm run build
```

## Pages (`src/portals/trainer`)

- Dashboard — action-oriented: stat cards, today's schedule timeline, needs-attention
  list and client progress overview
- My Clients — switchable table/grid on desktop, cards on mobile
- Client Profile — tabs: Overview (weight chart), Diet Plan, Exercise Plan,
  Progress (weekly completion + checklist), Follow-ups
- Schedule — day timeline + week grid with activity-type legend
- Diet Plans — meal-by-meal builder with food items and live macro totals
- Exercise Plans — day-by-day builder with sets/reps/rest, YouTube links, notes
- Follow-ups — Due Today / Upcoming / Overdue / Completed buckets
- Messages — full chat UI: conversation list, thread, online/unread states,
  mobile-friendly back navigation
- Notifications & Settings (profile, appearance/theme, notifications)

Shared design system lives in `src/components`, `src/context`, `src/styles`, `src/utils`.
Mock data is centralized in `src/services/mockData.js` (logged-in trainer: Marcus Bennett).
```
