# Marketing Agency Client Portal (Near Me Connect)

## Overview

The Near Me Connect client portal aims to create a transparent and interactive platform for marketing agency clients. It allows clients to manage tasks, track service credits, request campaigns, schedule meetings, and communicate with the agency. The platform includes role-based access control, comprehensive company management with multi-user support, a credit-based system for services, and an e-signature system. This project seeks to streamline operations, enhance client satisfaction, and establish Near Me Connect as a leader in client relationship management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript.
- **Routing**: Wouter.
- **State Management**: TanStack React Query for server state; local React state for UI.
- **Styling**: Tailwind CSS with shadcn/ui components (Radix UI) for a Linear/Notion-inspired design, supporting light/dark modes.
- **Form Handling**: React Hook Form with Zod validation.
- **Build Tool**: Vite.

### Backend
- **Framework**: Express 5 on Node.js.
- **API Design**: RESTful JSON API.
- **Authentication**: Custom email/password authentication with bcrypt and session-based management.
- **Access Control**: Role-based (admin/client) with company-specific permissions.
- **Core Features**: Company and user management, task tracking with timer, credit management, real-time chat, campaign requests, meeting scheduling, client onboarding, training management, and an e-signature system. Admin functionalities include media upload profiles, user management, custom company roles, and a reporting & analytics dashboard. Automated cron jobs handle data maintenance and report generation.

### Data Layer
- **Database**: PostgreSQL.
- **ORM**: Drizzle ORM.
- **Schema**: Defined in `shared/schema.ts`, shared between frontend and backend, with Zod validation.

### UI/UX Decisions
- **Design System**: Consistent Linear/Notion-inspired aesthetic with light/dark mode support and orange accents.
- **Client Access**: Differentiated views for `marketing` and `government` company types.
- **Subscription Tiers**: Managed tiers (Essentials, Growth, Accelerator) with associated costs and credit allocations.
- **E-Signature**: Admin-managed PDF uploads, recipient assignment, signature field placement, and token-based public access.
- **Notifications**: Branded email templates for various events and in-app notifications.
- **Reporting & Analytics**: Admin dashboard with task and credit statistics, company stats, and visualizations. Automated and manual monthly reports with per-company admin notes ("Notes from Your Team" section). Report notes reminder cron notifies admins 7 and 2 days before month-end if notes are missing. Global reporting page shows notes status overview across all companies. Company dashboard has a Reporting tab with stats and notes editor.
- **User Management**: Comprehensive admin tools for user and role management, including custom company roles with granular permissions.
- **Task Workflow**: Supports multi-stage task approval processes, review workflows, and self-service completion for clients. Auto-generation of tasks from approved campaigns and recurring cadences. Tasks have revision tracking with credit charges after free revisions. Task creator/requester name (`assignedByName`) is enriched server-side on both `GET /api/tasks` and `GET /api/tasks/:id` and displayed on task cards and in the task detail sidebar. Tasks support per-company categories/folders (`taskCategories` table) for organization — managed from the company dashboard tasks tab via CRUD dialog, selectable in task creation and task detail panel, shown as badges on task cards.
- **Chat System**: Real-time communication with read receipts, thread editing/deletion, company-wide sync, and admin-specific features.
- **Time Management**: Implemented timezone fixes and reactive timestamps.
- **Dynamic Content**: Auto-generated campaign task names and descriptions.
- **Campaign Views**: All campaign pages (client, admin, company dashboard) have month-to-month navigation filtering by `dueDate` and inline tab counts matching the tasks page pattern.
- **Credit System**: Credits deducted when a task moves to "In Progress" OR directly to "Completed" (skipping in-progress), refunded if reverted. Client-managed tasks bypass credit checks. Bonus credits from purchases reset monthly. Server-side automatic credit reset runs on the 1st of each month (midnight ET cron + startup catch-up). Admin can add or subtract credits manually via the company dashboard. Auto-recalculation removed from task status changes (only available as manual admin endpoint). Monthly reports count all credit-consuming transaction types (deductions, adjustments, revision charges). Cadence-generated tasks use the deliverable type's credit cost from the DB rather than the cadence's own creditCost field.
- **Real-Time Updates**: WebSocket server for broadcasting invalidations on data changes, providing real-time updates across the application.
- **Mobile Navigation**: `MobileTabMenu` component (`client/src/components/mobile-tab-menu.tsx`) replaces horizontal tab bars with a Sheet-based slide-out menu on mobile (<768px). `MobileBackButton` (`client/src/components/mobile-back-button.tsx`) available for drill-down pages. Desktop tab bars hidden via `hidden md:inline-flex`. Applied to all admin and client tab-based pages.

## External Dependencies

### Database
- **PostgreSQL**
- **Drizzle ORM**

### Integrations
- **SharePoint**: Primary file storage with Object Storage fallback and sync capabilities.
- **Microsoft Teams**: Meeting links.
- **Resend**: Email notifications.
- **Stripe**: Credit purchases.
- **HubSpot**: Automated company and contact data synchronization.
- **Replit Object Storage**: Used for task attachments and as a fallback for SharePoint uploads.