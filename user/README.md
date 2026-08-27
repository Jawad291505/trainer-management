# FitTrack — Client Portal

Client-facing side of the fitness management platform (Phase 4 of the plan).
Simple, motivating and mobile-first. Built with **React + Vite**, **Tailwind CSS**,
**Ant Design**, **Recharts** and **React Router**, reusing the shared design system.

## Run

```bash
cd user
npm install
npm run dev      # http://localhost:5175
npm run build
```

## Pages (`src/portals/client`)

- Dashboard — today's progress ring, trainer card, and tap-to-complete task list
- My Diet — meals by time with items, notes and "mark done" per meal
- My Exercises — today's exercises with sets/reps, YouTube demos and completion
- My Schedule — today's timeline + upcoming activities
- My Progress — weight journey, weekly consistency ring, daily completion and compliance bars
- Messages — 1:1 chat with the trainer
- Notifications, Profile, Settings (appearance/theme, notifications, account)

## Mobile-first extras

- Bottom navigation bar (`components/layout/BottomNav.jsx`) on phones/tablets
- Large touch targets, stacked cards, no horizontal overflow
- Drawer sidebar on mobile, fixed navy sidebar on desktop

Mock data is centralized in `src/services/mockData.js` (logged-in client: Emma Thompson).
```
