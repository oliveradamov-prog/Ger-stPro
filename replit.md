# Daily Log Builder

## Overview

Daily Log Builder is a construction industry web application for documenting daily work logs on construction projects. It allows users to create projects, record daily logs (weather, crew, work descriptions, photos), and eventually export PDF reports. The app targets construction site managers and teams who need professional documentation of daily activities.

The application is currently in an early/scaffold stage — pages exist with static placeholder data and no backend logic, database, or authentication is wired up yet. All forms are non-functional (buttons use `type="button"` with no handlers). The app includes a freemium pricing model (Free vs Pro plan at $19/mo).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Framework
- **Next.js** (App Router) with TypeScript — uses the `app/` directory routing convention
- **Tailwind CSS v4** for styling, integrated via `@tailwindcss/postcss` plugin
- **Lucide React** for icons
- Utility libraries: `clsx` and `tailwind-merge` for conditional class name handling
- Dev server runs on **port 5000** (`next dev -p 5000`)
- Images are set to `unoptimized: true` for Replit compatibility

### Route Structure
| Route | Purpose |
|-------|---------|
| `/` | Landing page with hero CTA |
| `/login` | Login form (not functional) |
| `/projects` | Project list view |
| `/projects/new` | Create new project form |
| `/projects/[projectId]` | Project detail with daily log list |
| `/projects/[projectId]/new-log` | Create new daily log form |
| `/projects/[projectId]/logs/[logId]` | View a specific daily log with PDF export button |
| `/upgrade` | Pricing/upgrade page (Free vs Pro) |

### Component Structure
- `components/Navbar.tsx` — Shared navigation bar with links to Projects, Upgrade, Login
- `app/layout.tsx` — Root layout wrapping all pages with Navbar and consistent styling
- All pages are server components (no `"use client"` directives yet)

### Current State & What's Missing
- **No database** — All data is hardcoded/placeholder. A database (likely PostgreSQL with Drizzle ORM) needs to be added for projects, daily logs, and users.
- **No authentication** — Login page exists but has no auth logic. Will need an auth system (session-based or JWT).
- **No API routes** — No `app/api/` routes exist yet. Backend logic for CRUD operations needs to be built.
- **No state management** — No client-side state or form handling. Forms need `"use client"` components with proper handlers.
- **No PDF export** — The export button is a placeholder. Will need a PDF generation solution.
- **No file upload** — Photo upload area is a placeholder. Will need file storage integration.

### Data Model (Implied)
Based on the UI, the expected data entities are:
- **User**: email, password (for auth)
- **Project**: name, location, client, owner (user reference)
- **DailyLog**: date, weather, work description, crew/resources, photos, project reference
- **Photos**: file references associated with daily logs

## External Dependencies

### Current Dependencies
| Package | Purpose |
|---------|---------|
| `next` | React framework (App Router) |
| `react` / `react-dom` | UI library |
| `tailwindcss` / `@tailwindcss/postcss` | Utility-first CSS |
| `lucide-react` | Icon library |
| `clsx` / `tailwind-merge` | Class name utilities |
| `typescript` | Type safety |
| `eslint` / `eslint-config-next` | Linting |

### Not Yet Integrated (Will Be Needed)
- **Database**: No database configured yet. PostgreSQL with Drizzle ORM is a natural fit for this stack.
- **Authentication**: No auth provider. Could use NextAuth.js, custom JWT, or a third-party service.
- **PDF Generation**: No library chosen. Options include `jspdf`, `@react-pdf/renderer`, or server-side tools like `puppeteer`.
- **File Storage**: No file upload solution. Could use local storage, S3, Cloudflare R2, or similar.
- **Payment Processing**: Upgrade page suggests Stripe or similar for subscription billing.