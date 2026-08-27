# FitTrack — Super Admin Portal

Premium fitness trainer management SaaS platform (Phase 1 + Phase 2 of the plan).
Built with **React + Vite**, **Tailwind CSS**, **Ant Design**, **Recharts** and **React Router**.

## Run

```bash
cd admin
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
```

## What's included

Design system & shell
- Centralized design tokens in `src/styles/global.css` (no hardcoded colors in components)
- Global theme color picker with 8 presets + custom color, persisted to `localStorage`
  (`ThemeProvider` / `useTheme`), wired into Tailwind, custom CSS and Ant Design
- Responsive `AppLayout` — fixed sidebar on desktop, drawer on mobile, sticky header,
  breadcrumbs, notification center
- Reusable components: `StatCard`, `PageHeader`, `DataTable`, `StatusBadge`, `UserAvatar`,
  `ChartCard`, `EmptyState`, `LoadingSkeleton`, `CapacityBar`, `FilterBar`, `SearchInput`,
  `ThemePicker`, chart set (Growth / Revenue / Donut)

Super Admin portal (`src/portals/admin`)
- Dashboard — 8 stat cards + client growth, revenue, payment status, client distribution
  charts and live trainer capacity
- Users — search / role / status filters, sortable premium table, row actions
- Trainers — capacity cards with visual bars, at-capacity warnings, capacity +/- controls
- Clients — filterable table with progress, trainer and status
- Assignments — trainer→client management with assign / reassign / remove + capacity guard
- Libraries — grid & table views, category filters, add/edit modal, external links
- Payments — payment stats, revenue + status charts, filterable transactions table
- Notifications — filterable activity feed
- Settings — profile, appearance (theme picker) and notification preferences

## Structure

```
src/
├── components/    common, layout, charts, tables, feedback
├── constants/     navigation + theme presets
├── context/       ThemeContext (global theming)
├── layouts/       AppLayout (shell)
├── pages/         shared pages (404)
├── portals/admin/ admin pages + admin-specific components
├── routes/        AppRoutes
├── services/      centralized mock data
├── utils/         color + confirm helpers
└── styles/        global.css (design tokens)
```

Mock data lives in `src/services/mockData.js`. The `trainer/` and `user/` folders are
reserved for the Trainer and Client portals (Phase 3 & 4).
