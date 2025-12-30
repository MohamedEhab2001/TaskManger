# TaskMaster - Premium Task Management SaaS

A professional, feature-rich task management application with deep insights, smart planning, and bilingual support (English/Arabic).

## Features

### Core Features
- **Full Authentication System** - Custom JWT-based auth with login-only flow
- **Task Management** - Complete CRUD with filters, sorting, bulk actions, and quick-add
- **Tags & Tag Groups** - Organize tasks with colored tag groups and tags
- **Bilingual UI** - Full English 🇺🇸 and Arabic 🇪🇬 support with RTL layout
- **Dark/Light Mode** - Beautiful themes for both light and dark preferences

### USP Features (What Makes This Special)

#### 🔥 Smart Weekly Planner (Auto-Scheduling)
- Automatically generates a 7-day task schedule
- Considers priority, due dates, and estimated time
- Respects daily capacity limits (configurable)
- Lock specific days to preserve manual scheduling
- One-click accept to apply the generated plan

#### 🔥 Task Health & Burnout Guard
- Real-time health monitoring: 🟢 Healthy | 🟡 Warning | 🔴 Burnout Risk
- Detects overload patterns:
  - Too many overdue tasks
  - Too many urgent tasks
  - Daily capacity exceeded repeatedly
- Smart recommendations:
  - Suggests moving tasks to next week
  - Recommends splitting urgent tasks
  - Warns when commitments are unsustainable

### Analytics & Insights
- **Dashboard Widgets** - Total tasks, completed, overdue, completion rate, due this week
- **Charts** - Tasks completed per day (14/30 days), status distribution, tasks per tag group
- **Per-Tag Insights** - Total tasks, completion rate, average completion time for each tag
- **Trend Analysis** - Visual representation of your productivity patterns

### Advanced Features
- **Filters & Sorting** - Filter by status, priority, tags, due date range, and search
- **Bulk Actions** - Mark as done, change priority, add/remove tags, archive, delete
- **Task Pinning** - Pin important tasks to the top
- **Time Tracking** - Estimated vs. actual minutes for tasks
- **Import/Export** - Export tasks as JSON or CSV, import JSON data

### Shareable Client Page (Read-only)

This feature lets freelancers generate a **public, read-only status report** for a specific client/project.

#### How it works

1. In the app, go to **Tags & Groups**.
2. On a specific tag (example: `Client: ACME`), click the **link icon** (Share with client).
3. Generate a share link (or manage an existing one):
   - Set a project title (example: “ACME Project Progress”)
   - Optionally set an expiration date
   - Copy the link to send to your client
   - Toggle Active/Inactive
   - Regenerate token (invalidates the old link)

The generated link looks like:

`/share/[token]`

#### What the client sees

The client page is a clean, printable report-style page that shows:

- Project title and status (Active / Completed)
- Last updated timestamp
- Progress summary:
  - Total tasks
  - Completed tasks
  - Progress %
  - Total time spent
- Task list (read-only):
  - Title
  - Status (Todo / Doing / Done)
  - Time spent
  - Simple estimation feedback: Underestimated / Overestimated / Accurate
- Simple insights:
  - Average estimation accuracy %
  - Positive trust-building explanation text

Notes:

- The client report **only includes tasks under that tag**.
- `archived` tasks are never shown.
- `hold` tasks are hidden from the client report (only Todo/Doing/Done are shown).

#### Security / privacy rules

- The share link is protected by a long random token (unguessable).
- The client route is **read-only** (no mutations).
- If a share is inactive → the page returns **404**.
- If the share is expired → an **expired** page is shown.
- SEO is disabled on the share page via `robots` metadata (`noindex`, `nofollow`).
- The UI does not show internal database IDs.

#### Language / RTL

- The client page supports **English and Arabic**.
- It defaults to the freelancer language at link creation time.
- The client can switch language manually, and RTL is applied when Arabic is selected.

## Tech Stack

- **Framework**: Next.js 13 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB + Mongoose
- **Styling**: TailwindCSS
- **Validation**: Zod
- **Charts**: Recharts
- **Authentication**: Custom JWT (httpOnly cookies)
- **State Management**: Server Actions + minimal client state

## Setup Instructions

### Prerequisites
- Node.js 16+ installed
- MongoDB Atlas account (or local MongoDB instance)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   The `.env` file is already configured with your MongoDB URI:
   ```
   MONGODB_URI=mongodb+srv://mohamedehab567t_db_user:99059459Mm!@cluster0.sdqqebq.mongodb.net/taskmaster
   JWT_SECRET=your-super-secret-jwt-key-change-in-production-minimum-32-characters
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

4. **Build for production**
   ```bash
   npm run build
   npm start
   ```

### First Login

The application automatically seeds a default admin account:
- **Email**: `admin@local.dev`
- **Password**: `Admin12345!`

### Demo Data

On first run, the app seeds:
- 1 admin user
- 3 tag groups (Work, Personal, Learning)
- 10 tags across groups
- 15 sample tasks with varied statuses, priorities, and due dates

## Project Structure

```
├── app/
│   ├── app/              # Protected app routes
│   │   ├── dashboard/    # Dashboard with analytics
│   │   ├── tasks/        # Task management + planner
│   │   ├── tags/         # Tag & group management
│   │   ├── insights/     # Per-tag analytics
│   │   └── settings/     # App settings
│   ├── share/            # Public shareable client report
│   │   └── [token]/      # Token-based read-only status page
│   ├── login/            # Login page
│   └── layout.tsx        # Root layout with providers
├── lib/
│   ├── actions/          # Server actions
│   │   ├── auth.ts       # Authentication actions
│   │   ├── tasks.ts      # Task CRUD + bulk operations
│   │   ├── tags.ts       # Tag/group CRUD
│   │   ├── analytics.ts  # Dashboard & health analytics
│   │   ├── clientShare.ts # Shareable client page actions
│   │   └── planner.ts    # Smart weekly planner
│   ├── models/           # Mongoose models
│   │   ├── User.ts
│   │   ├── TagGroup.ts
│   │   ├── Tag.ts
│   │   ├── Task.ts
│   │   └── ClientShare.ts
│   ├── i18n/             # Internationalization
│   │   ├── messages.ts   # All translations
│   │   └── context.tsx   # Language context
│   ├── auth.ts           # JWT utilities
│   ├── db.ts             # MongoDB connection
│   └── seed.ts           # Database seeding
└── middleware.ts         # Route protection
```

## Key Features Implementation

### Smart Weekly Planner Algorithm
1. Fetches all pending tasks (todo/doing status)
2. Sorts by priority weight (urgent=4, high=3, medium=2, low=1)
3. Then sorts by due date (earliest first)
4. Distributes tasks across 7 days respecting:
   - Daily capacity limit (default 120 minutes)
   - Task estimated duration
   - Due date constraints
   - Locked days (manual overrides)

### Task Health Calculation
- **Healthy** 🟢: All metrics within normal range
- **Warning** 🟡:
  - 5+ overdue tasks
  - 3+ urgent tasks
  - Capacity exceeded 3+ days this week
- **Burnout Risk** 🔴:
  - 10+ overdue tasks
  - 5+ urgent tasks
  - Consistent capacity overload

### Bilingual Implementation
- Central `messages.ts` with EN/AR translations
- React Context for language state
- Automatic RTL layout for Arabic
- Language persisted in localStorage
- All UI strings translated (no hardcoded text)

## Database Schema

### User
- email (unique, indexed)
- passwordHash (bcrypt)
- name
- createdAt

### TagGroup
- userId (indexed)
- name: { en, ar }
- color
- icon
- Compound index: (userId, createdAt)

### Tag
- userId (indexed)
- groupId (indexed)
- name: { en, ar }
- color (optional)
- Compound index: (userId, groupId)

### Task
- userId (indexed)
- title
- description
- status: todo | doing | done | archived
- priority: low | medium | high | urgent
- dueDate
- startAt (set by planner)
- completedAt
- tags: [TagId]
- estimatedMinutes
- actualMinutes
- isPinned
- Multiple compound indexes for efficient queries

### ClientShare

Used for the public `/share/[token]` report pages.

- userId
- tagId
- token (unique, indexed)
- title
- isActive
- expiresAt (optional, nullable)
- defaultLanguage (en/ar)
- createdAt / updatedAt

## API Routes (Server Actions)

All operations use Next.js Server Actions for type-safe, authenticated API calls:

**Auth**
- `loginAction` - Login with email/password
- `logoutAction` - Clear auth cookie and redirect

**Tasks**
- `getTasks` - Fetch with filters (status, priority, tags, search, date range, sort)
- `getTask` - Fetch single task
- `createTask` - Create new task
- `updateTask` - Update existing task
- `deleteTask` - Delete task
- `bulkUpdateTasks` - Bulk status/priority/tag updates
- `bulkDeleteTasks` - Bulk delete

**Tags**
- `getTagGroups` - Fetch all user's tag groups
- `getTags` - Fetch tags (optionally filtered by group)
- `createTagGroup`, `updateTagGroup`, `deleteTagGroup`
- `createTag`, `updateTag`, `deleteTag`

**Analytics**
- `getDashboardStats` - Overview metrics
- `getTasksCompletedPerDay` - Time series data (14/30 days)
- `getStatusDistribution` - Task status breakdown
- `getTasksPerTagGroup` - Tasks per group count
- `getTaskHealth` - Health status + recommendations
- `getTagInsights` - Per-tag analytics

**Planner**
- `generateWeeklyPlan` - Generate smart 7-day schedule
- `acceptWeeklyPlan` - Apply plan by setting startAt dates

## Security

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens in httpOnly cookies
- Middleware protects all `/app/*` routes
- All server actions validate authentication
- MongoDB queries scoped to authenticated user
- Zod validation on all inputs

## Performance

- MongoDB compound indexes for efficient queries
- Aggregation pipelines for analytics
- Optimistic UI updates
- Client-side caching with React state
- Static page generation where possible

## Contributing

This is a complete, production-ready application built as a comprehensive task management solution.

## License

Proprietary - All rights reserved

---

**Built with ❤️ using Next.js, MongoDB, and TypeScript**
