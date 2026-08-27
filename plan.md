# Fitness Trainer Management Platform — Development Prompt

Build a **premium, modern, responsive Fitness Trainer Management Platform** using:

* **React.js**
* **Tailwind CSS**
* **Ant Design**
* **Recharts** for analytics and charts
* **React Router** for routing and portal structure

The application has **three separate user roles**, and each role must have its own dedicated portal:

1. **Super Admin**
2. **Trainer**
3. **Client**

The main focus should be:

* Premium UI/UX
* Clean architecture
* Reusable components
* Responsive design
* Excellent mobile experience
* Consistent design system
* Scalable structure
* Professional SaaS-level appearance

---

# 1. Overall Design Direction

The application should feel like a **premium SaaS fitness management platform**, not a basic CRUD/admin dashboard.

## Design Style

Use:

* Navy as the primary brand color
* White as the primary surface/background color
* Soft neutral shades for secondary backgrounds
* Subtle borders
* Large but controlled border radiuses
* Elegant shadows
* Clean typography
* Generous spacing
* Minimal and meaningful animations
* Professional dashboard layouts
* Modern tables
* Premium forms
* Beautiful empty states
* Loading skeletons
* Toast notifications
* Confirmation dialogs

The overall visual language should feel similar to a **high-end SaaS dashboard combined with a premium fitness platform**.

## Avoid

* Excessive gradients
* Too many colors
* Cheap-looking UI
* Excessive shadows
* Huge typography
* Cluttered layouts
* Unnecessary animations
* Generic/default Ant Design appearance
* Inconsistent spacing
* Hardcoded colors throughout components

---

# 2. Global Design System

Create a proper design system before building the individual portals.

Recommended structure:

```text
src/
├── components/
├── layouts/
├── pages/
├── portals/
│   ├── admin/
│   ├── trainer/
│   └── client/
├── routes/
├── hooks/
├── utils/
├── constants/
├── services/
├── assets/
└── styles/
    └── global.css
```

---

# 3. Global CSS and Colors

Create a:

```text
src/styles/global.css
```

file containing the application's global design tokens.

## Important Rule

**Do NOT hardcode colors inside individual components.**

Do not do things like:

```css
color: #001f3f;
background: #ffffff;
```

Instead, define all colors centrally using CSS variables.

Example:

```css
:root {
  --color-primary: ...;
  --color-primary-dark: ...;
  --color-primary-light: ...;

  --color-background: ...;
  --color-surface: ...;
  --color-surface-secondary: ...;

  --color-text-primary: ...;
  --color-text-secondary: ...;
  --color-text-muted: ...;

  --color-border: ...;

  --color-success: ...;
  --color-warning: ...;
  --color-danger: ...;
  --color-info: ...;
}
```

Tailwind CSS and Ant Design should use these design tokens wherever practical.

The goal is to be able to change the entire application's visual theme from one place.

---

# 4. Theme / Color Picker

Add a **global theme color picker**.

The default theme should be:

> Premium Navy + White

Allow users to select a different primary/accent color.

The selected color must update the application globally through CSS variables.

Create a centralized theme system, for example:

```text
ThemeProvider
ThemeContext
useTheme()
```

The color picker can be placed inside:

* Settings
* User profile dropdown
* Application preferences

Allow users to:

* Select primary color
* Preview selected color
* Reset to default
* Persist the selected theme using `localStorage`

The theme should affect:

* Buttons
* Links
* Active navigation
* Selected states
* Focus states
* Progress indicators
* Tags
* Important UI accents
* Charts where appropriate

Maintain good contrast and accessibility regardless of the selected color.

---

# 5. Responsive Design

The entire application must be fully responsive.

Support:

* Desktop
* Laptop
* Tablet
* Mobile

Do not simply shrink the desktop UI for mobile.

The mobile experience should be intentionally designed.

## Desktop

Use:

* Sidebar navigation
* Top header
* Dashboard cards
* Tables
* Charts
* Multi-column layouts

## Tablet

Adapt:

* Sidebar
* Cards
* Tables
* Forms
* Charts
* Navigation

## Mobile

Use:

* Collapsible/drawer navigation
* Stacked cards
* Mobile-friendly forms
* Horizontally scrollable tables when necessary
* Touch-friendly buttons
* Proper spacing
* Mobile-friendly charts
* No horizontal page overflow

---

# 6. Shared Application Layout

Create reusable layouts instead of duplicating dashboard structures.

Example:

```text
AppLayout
├── Sidebar
├── Header
├── Breadcrumbs
├── PageContainer
└── Content
```

Create reusable components for:

* Sidebar
* Header
* User profile menu
* Notifications
* Breadcrumbs
* Search
* Page header
* Stat cards
* Tables
* Modal forms
* Confirmation dialogs
* Empty states
* Loading states
* Error states
* Pagination
* Filters
* Date pickers
* Status badges
* Progress bars
* Charts
* File/link cards
* Activity timeline

---

# 7. Role-Based Portal Architecture

Create three independent portal sections:

```text
/portal/admin
/portal/trainer
/portal/client
```

Each role should have:

* Its own navigation
* Its own dashboard
* Its own pages
* Its own permissions
* Its own workflows

Do not put every possible navigation item into one giant sidebar.

The architecture should make role-based access control easy to implement later.

---

# 8. SUPER ADMIN PORTAL

The Super Admin is responsible for managing the entire platform.

The admin dashboard should provide a high-level overview of:

* Users
* Trainers
* Clients
* Trainer capacity
* Client assignments
* Payments
* Libraries
* Platform activity

---

# 9. Super Admin Dashboard

Create a premium administrative dashboard.

## Overview Statistics

Display attractive statistic cards for:

* Total Clients
* Total Trainers
* Active Trainers
* Active Clients
* Available Trainer Capacity
* Total Revenue
* Pending Payments
* Completed Payments

Use:

* Icons
* Small trend indicators
* Supporting text
* Appropriate visual hierarchy

---

# 10. Admin Dashboard Charts

Use **Recharts**.

Include meaningful analytics such as:

### Client Growth

Use:

* Line chart
* Area chart

Show client growth over time.

### Trainer Growth

Use a line/bar chart.

### Revenue

Use:

* Area chart
* Bar chart

Show revenue over time.

### Payment Status

Use a pie/donut chart showing:

* Paid
* Pending
* Failed
* Refunded

### Client Distribution

Use a pie/donut chart showing clients assigned to different trainers.

Do not overload the dashboard with charts.

Charts should provide useful information, not exist purely for decoration.

---

# 11. Admin — User Management

Create a complete user management page.

Include:

* Search
* Filters
* Role filter
* Status filter
* Date filter
* Pagination
* Sorting

## User Table

Columns:

* User
* Email
* Role
* Status
* Assigned Trainer
* Join Date
* Last Activity
* Actions

## Actions

Allow the admin to:

* View
* Edit
* Activate/deactivate
* Delete
* Assign trainer
* View profile

Use Ant Design's table component where appropriate, but customize it heavily to match the application's premium design.

---

# 12. Admin — Trainer Management

Create a dedicated Trainer Management section.

Display:

* Trainer profile
* Specialization
* Assigned clients
* Maximum client capacity
* Available slots
* Status
* Join date
* Performance overview

Allow Super Admin to:

* Create trainer
* Edit trainer
* Activate/deactivate trainer
* Delete trainer
* Increase client capacity
* Decrease client capacity
* Assign clients
* Remove clients
* View trainer details

---

# 13. Trainer Capacity

Display trainer capacity visually.

Example:

```text
Clients

18 / 25

██████████████░░░░░░
```

Use a proper progress component rather than plain text.

Display:

* Current clients
* Maximum clients
* Available slots
* Capacity percentage

If the trainer reaches capacity:

* Prevent assigning additional clients
* Display a clear warning
* Provide an option for the Super Admin to increase capacity

---

# 14. Admin — Trainer / Client Assignment

Create a dedicated page for managing trainer-client relationships.

The admin should be able to see:

```text
Trainer
   ↓
Assigned Clients
```

Display:

* Trainer
* Current clients
* Maximum capacity
* Available slots
* Client list

Actions:

* Assign client
* Reassign client
* Remove client
* Increase trainer capacity

Make this workflow extremely clear and easy to use.

---

# 15. Admin — Library Management

Create a library management section.

The library will primarily contain **Google Drive links and other external resources**.

Allow admins to create:

* Library category
* Resource title
* Description
* External URL
* Thumbnail/icon
* Status

Possible categories:

* Workout Guides
* Nutrition Guides
* Exercise Videos
* Documents
* Educational Resources

Display resources using:

* Premium cards
* Table view
* Category filters
* Search

Actions:

* Add resource
* Edit
* Delete
* Open link
* Categorize
* Activate/deactivate

---

# 16. Admin — Payments

Create a complete payment management section.

## Payment Statistics

Include:

* Total revenue
* Paid payments
* Pending payments
* Failed payments
* Refunded payments

## Analytics

Use:

* Revenue chart
* Payment status pie/donut chart
* Payment trend chart

## Payment Table

Columns:

* Client
* Trainer
* Plan
* Amount
* Payment date
* Status
* Payment method
* Transaction ID
* Actions

Filters:

* Date
* Status
* Trainer
* Client
* Payment method

---

# 17. TRAINER PORTAL

The Trainer portal should be much more action-oriented than the Super Admin portal.

The trainer should immediately understand:

* Who their clients are
* What they need to do today
* Which clients need attention
* Upcoming sessions
* Pending follow-ups
* Client progress

---

# 18. Trainer Dashboard

Include overview cards for:

* Total Clients
* Active Clients
* Pending Follow-ups
* Today's Sessions
* Completed Follow-ups
* Clients Needing Attention

---

# 19. Trainer — Today's Schedule

Create a timeline/calendar-style component.

Example:

```text
09:00   Client A
10:30   Client B
12:00   Break
14:00   Client C
16:00   Client D
```

Use clear visual distinctions between:

* Completed
* Upcoming
* In progress
* Cancelled

---

# 20. Trainer — Client Progress Overview

Create a dashboard section showing client progress.

Display:

* Client name
* Goal
* Progress percentage
* Activity completion
* Last check-in
* Follow-up status

Highlight clients that need attention.

---

# 21. Trainer — My Clients

Create a client management page.

Desktop:

* Use a premium table

Mobile:

* Use cards/list layouts

Information:

* Client profile
* Goal
* Current plan
* Progress
* Last follow-up
* Next follow-up
* Status

Actions:

* View client
* Create diet plan
* Create exercise plan
* Schedule activity
* Follow up
* Chat
* View progress

---

# 22. Trainer — Client Profile

Create a detailed client profile.

Use tabs:

```text
Overview
Diet Plan
Exercise Plan
Schedule
Progress
Follow-ups
Chat
Activity History
```

## Overview

Display:

* Profile information
* Fitness goal
* Current weight
* Target weight
* Progress
* Current plan
* Recent activity

## Progress

Use Recharts for:

* Weight progress
* Activity completion
* Water intake
* Meal compliance
* Exercise compliance

Keep charts clean and easy to understand.

---

# 23. Trainer — Diet Plans

Allow trainers to create customized diet plans.

A diet plan can contain:

* Meal
* Time
* Food
* Quantity
* Calories
* Protein
* Carbohydrates
* Fats
* Notes

Example:

```text
Breakfast
08:00

Eggs — 3
Oats — 50g
Milk — 250ml
```

Allow trainers to:

* Add meal
* Edit meal
* Delete meal
* Reorder meals
* Add notes
* Save plan
* Publish plan

Use a **diet-plan builder interface** rather than one massive form.

---

# 24. Trainer — Exercise Plans

Allow trainers to create exercise schedules.

Each exercise can include:

* Exercise name
* Sets
* Reps
* Duration
* Rest time
* Instructions
* YouTube URL
* Notes

Example:

```text
Monday — Chest

Bench Press
4 sets × 10 reps

Incline Dumbbell Press
3 sets × 12 reps

Push Ups
3 sets × 15 reps
```

Allow trainers to organize exercises by day:

```text
Monday — Chest
Tuesday — Back
Wednesday — Rest
Thursday — Legs
Friday — Shoulders
```

YouTube links should open safely in a new tab.

---

# 25. Trainer — Client Schedule

Create a calendar/schedule interface.

Allow trainers to schedule:

* Workout
* Meal
* Consultation
* Follow-up
* Rest day
* Other activities

Support:

* Daily view
* Weekly view
* Monthly view

Use clear visual indicators for different activity types.

---

# 26. Trainer — Follow-Ups

Create a dedicated follow-up management system.

Sections:

* Due Today
* Upcoming
* Overdue
* Completed

Allow trainers to:

* Create follow-up
* Add notes
* Mark complete
* Reschedule
* Contact client

Overdue follow-ups should be visually prominent without making the UI look aggressive or cluttered.

---

# 27. Trainer — Client Progress Tracking

The client tracking system should remain **very simple**.

Clients should primarily check off activities rather than fill complicated forms.

Examples:

```text
☐ Ate 100g chicken
☐ Drank 2L water
☐ Completed workout
☐ Followed breakfast plan
☐ Completed evening walk
☐ Followed dinner plan
```

The trainer should be able to see:

* Completed
* Not completed
* Partially completed
* Completion percentage

Use:

* Progress bars
* Donut charts
* Daily summaries
* Weekly completion charts
* Activity history

---

# 28. Trainer — Chat

Create a dedicated private chat room between trainer and each client.

Features:

* Conversation list
* Message list
* Message input
* Send button
* Timestamps
* Read/unread states
* Online indicator
* Empty conversation state

The interface should feel like a modern professional messaging application.

It must work beautifully on mobile.

---

# 29. CLIENT PORTAL

The Client portal should be **simple, motivating, and action-oriented**.

The primary question the client should immediately understand is:

> **"What do I need to do today?"**

Avoid overwhelming the client with administrative information.

---

# 30. Client Dashboard

Display:

## Today's Progress

Example:

```text
Today's Progress

7 / 10 completed

70%
```

Use a visually appealing progress component.

## Today's Tasks

Examples:

* Breakfast
* Water
* Workout
* Lunch
* Walk
* Dinner

Each activity should have a simple completion interaction.

---

# 31. Client — Trainer Information

Display:

* Trainer name
* Trainer profile image
* Trainer specialization
* Next follow-up
* Message Trainer button

Make the trainer feel accessible from the dashboard.

---

# 32. Client — My Diet Plan

Show the diet plan created by the trainer.

Organize by:

* Breakfast
* Snack
* Lunch
* Snack
* Dinner

Each meal should show:

* Time
* Food
* Quantity
* Notes

Allow clients to mark relevant activities as completed.

---

# 33. Client — My Exercise Plan

Show exercises assigned by the trainer.

Each exercise should include:

* Exercise name
* Sets
* Reps
* Duration
* Instructions
* YouTube video

Provide a simple:

> **Completed**

interaction.

---

# 34. Client — My Schedule

Display:

* Today's activities
* Upcoming activities
* Workout schedule
* Follow-ups
* Appointments

Use a mobile-friendly timeline/calendar.

---

# 35. Client — My Progress

Create a visually motivating progress dashboard.

Include:

* Weight chart
* Activity completion
* Diet compliance
* Workout compliance
* Water intake
* Weekly completion percentage

Use Recharts where appropriate.

The UI should feel encouraging rather than judgmental.

---

# 36. Client — Chat With Trainer

Create the client-side chat interface.

Clients can:

* Send messages
* Read trainer messages
* See timestamps
* See unread messages
* Open trainer profile

Keep this interface extremely simple.

---

# 37. Notifications

Create a reusable notification system.

Notifications can include:

* New diet plan
* New exercise plan
* Follow-up reminder
* New message
* Schedule change
* Payment notification
* Plan update

Create reusable:

```text
Notification Center
Notification Badge
Notification Dropdown
Notification Item
```

---

# 38. Tables

Tables should feel premium rather than like spreadsheets.

Use:

* Rounded containers
* Subtle borders
* Comfortable row spacing
* Avatar + text combinations
* Status badges
* Action menus
* Pagination
* Search
* Filters
* Sort controls

Avoid overly dense tables.

On mobile, convert tables into:

* Cards
* Stacked information
* Horizontally scrollable tables only when necessary

---

# 39. Charts

Use **Recharts**.

Potential chart types:

* LineChart
* BarChart
* AreaChart
* PieChart
* Radial/donut-style charts

Charts should:

* Use `ResponsiveContainer`
* Have tooltips
* Have legends where useful
* Use theme colors
* Have appropriate labels
* Remain readable on mobile
* Avoid unnecessary visual noise

Do not add charts purely for decoration.

---

# 40. UX Requirements

Every important action should provide feedback.

Implement:

* Loading states
* Skeleton loaders
* Empty states
* Error states
* Success messages
* Confirmation modals
* Disabled states
* Hover states
* Focus states
* Form validation
* Toast notifications

Example:

```text
Delete Trainer?

This will remove the trainer from the platform.

[Cancel] [Delete Trainer]
```

Destructive actions should always require confirmation.

---

# 41. Forms

Forms should be:

* Clean
* Structured
* Easy to scan
* Responsive
* Logically grouped

Avoid huge forms with dozens of fields on a single screen.

Use:

* Sections
* Tabs
* Steps
* Accordions
* Collapsible areas

where appropriate.

Use Ant Design Form validation where useful.

---

# 42. Navigation

The sidebar should change based on the user's role.

## Super Admin

```text
Dashboard
Users
Trainers
Clients
Assignments
Libraries
Payments
Notifications
Settings
```

## Trainer

```text
Dashboard
My Clients
Schedule
Diet Plans
Exercise Plans
Follow-ups
Messages
Notifications
Settings
```

## Client

```text
Dashboard
My Diet
My Exercises
My Schedule
My Progress
Messages
Notifications
Profile
Settings
```

---

# 43. Reusable Components

Prioritize reusable components.

Examples:

```text
StatCard
PageHeader
DataTable
StatusBadge
UserAvatar
ProgressCard
ChartCard
EmptyState
LoadingSkeleton
ConfirmModal
SearchInput
FilterBar
DateRangePicker
NotificationItem
ClientCard
TrainerCard
MealCard
ExerciseCard
ScheduleCard
FollowUpCard
ChatWindow
ChatMessage
```

Before creating a new component, check whether an existing reusable component can be extended.

Do not duplicate nearly identical components between portals.

---

# 44. Component Architecture

Use a clean component hierarchy.

Prefer:

```text
components/
├── common/
├── layout/
├── charts/
├── forms/
├── tables/
├── feedback/
├── fitness/
└── messaging/
```

Keep role-specific components inside their respective portal when they are genuinely role-specific.

Example:

```text
portals/
├── admin/
│   ├── pages/
│   └── components/
├── trainer/
│   ├── pages/
│   └── components/
└── client/
    ├── pages/
    └── components/
```

---

# 45. Mock Data

For frontend development, use realistic mock data.

Create centralized mock data rather than scattering fake data across components.

Example:

```text
mockUsers
mockTrainers
mockClients
mockPayments
mockDietPlans
mockExercisePlans
mockSchedules
mockNotifications
mockMessages
```

The UI should look realistic even before the backend is connected.

Avoid generic placeholder content such as:

```text
User 1
User 2
Test User
Lorem ipsum
Example data
```

Use realistic names, plans, activities, dates, statuses, and values.

---

# 46. Important Architecture Rules

Follow these rules throughout development:

1. Inspect the existing project before making changes.
2. Reuse existing components whenever possible.
3. Do not break existing functionality.
4. Avoid unnecessary dependencies.
5. Keep components reasonably small.
6. Separate UI from business logic where practical.
7. Use data-driven rendering.
8. Avoid duplicating UI.
9. Keep role-specific logic isolated.
10. Keep global theme logic centralized.
11. Never scatter hardcoded colors across components.
12. Keep responsive behavior in mind while creating every component.
13. Use realistic mock data.
14. Maintain consistent spacing and typography.
15. Keep accessibility in mind.

---

# 47. UI Quality Standard

The final application should look like a **real commercial SaaS product that could be presented to a paying client**.

It should NOT look like:

* A default Ant Design dashboard
* A generic Tailwind template
* A basic CRUD application
* A student project
* A copied admin template

Customize Ant Design components enough that the application has its own visual identity.

Pay particular attention to:

* Alignment
* Spacing
* Typography
* Border radius
* Card hierarchy
* Navigation
* Information hierarchy
* Empty states
* Micro-interactions
* Responsive behavior
* Accessibility

---

# 48. Development Strategy

Build the application **portal by portal**.

Do NOT build all three portals simultaneously.

Follow this sequence:

## Phase 1 — Design System & Application Shell

First build:

* Global CSS
* CSS variables
* Theme system
* Color picker
* Typography
* Spacing
* Buttons
* Cards
* Inputs
* Tables
* Modals
* Forms
* Sidebar
* Header
* Notifications
* Responsive layout
* Shared components

Do not move forward until the foundation is consistent.

---

## Phase 2 — Super Admin Portal

Build the entire Super Admin portal:

* Dashboard
* User Management
* Trainer Management
* Client Management
* Trainer/Client Assignments
* Capacity Management
* Library Management
* Payments
* Notifications
* Settings

Make it fully responsive and polished.

---

## Phase 3 — Trainer Portal

After the Super Admin portal is complete, build:

* Trainer Dashboard
* My Clients
* Client Profile
* Diet Plans
* Exercise Plans
* Schedule
* Follow-ups
* Progress Tracking
* Chat
* Notifications
* Settings

Reuse the existing design system and shared components.

---

## Phase 4 — Client Portal

Finally build:

* Client Dashboard
* My Diet
* My Exercises
* My Schedule
* My Progress
* Messages
* Notifications
* Profile
* Settings

Keep this portal simpler and more mobile-focused than the admin and trainer portals.

---

# 49. Start With Portal #1

**For now, do NOT build all three portals.**

Start with the **Super Admin Portal**.

First:

1. Inspect the existing project structure.
2. Establish the global design system.
3. Create `global.css`.
4. Create the CSS variable/theme system.
5. Implement the color picker.
6. Build the application shell.
7. Build the responsive sidebar.
8. Build the responsive header.
9. Create the shared reusable components.
10. Build the Super Admin Dashboard.
11. Build the remaining Super Admin pages.
12. Ensure everything is responsive.
13. Polish the UI/UX.

Only after the Super Admin portal is complete should the Trainer portal be started.

The final product should feel like a **premium fitness management SaaS platform**, with a strong navy/white visual identity, excellent UX, responsive layouts, meaningful analytics, and a scalable component architecture.
