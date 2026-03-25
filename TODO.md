# Near Me Connect - Future Development Roadmap

> **PROTECTED DOCUMENT**: This file contains the project's future feature roadmap and should not be modified during routine development work. Only update when intentionally adding or completing roadmap items.

---

## Admin Side

### Completed
- [x] Create deliverable types table in database (replace hardcoded values)
- [x] Add admin UI to manage deliverable types (add/edit/remove)
- [x] Add assignee field to tasks with dropdown for company users + admins
- [x] Modify credit deduction to only happen on task completion
- [x] Add projected credit usage display (based on all non-cancelled tasks)
- [x] Client Type functionality (Government vs Marketing clients)
- [x] Comprehensive onboarding validation dialog
- [x] Social media platform selection validation (Step 1)
- [x] Onboarding PDF generation with SharePoint upload
- [x] Admin notification system with @mentions
- [x] Stripe credit purchasing with webhooks
- [x] HubSpot CRM integration
- [x] SharePoint file storage integration

### Future Features
- [x] **Recurring Tasks** - Allow admins to create tasks that automatically recur on a schedule (daily, weekly, monthly)
  - Configure recurrence pattern (frequency, end date, credit allocation)
  - Auto-create new task instances when previous completes
  - Track recurring task templates separately from task instances
- [x] Email notifications for task status changes
  - Task assignment emails to assignees
  - Status change notifications to clients/assignees
  - Due date reminder endpoint for scheduled reminders
- [x] Task due dates and deadline reminders
  - Date picker on task creation/edit forms
  - Color-coded visual indicators for overdue/upcoming tasks
  - Due reminder email endpoint supporting configurable days before due
- [x] Task comments/notes thread
  - Comments with user attribution (admin/client)
  - Edit and delete functionality for admins
  - Chronological display in task detail panel
- [x] File attachments on tasks
  - SharePoint-based file storage under "Task Attachments" folder
  - Upload/delete for admins, download for all authorized users
  - 100MB per attachment limit
- [x] Reporting and analytics dashboard
  - Stat cards for KPIs (tasks, credits, companies)
  - Bar charts for tasks completed and credits used over time
  - Configurable time range filter (7/30/90/365 days)

---

## Client Side

### Completed
- [x] View task progress updates and comments (clients can add/edit/delete own comments)
- [x] Download deliverables/attachments (attachment download available for all authorized users)
- [x] Credit usage analytics and charts (bar chart with 7/30/90 day range selector)
- [x] Notification preferences (toggleable email preferences for 7 notification categories)
- [x] Account settings (editable profile name, company info for owners/admins)
- [x] Custom company roles with page-level permissions (admin CRUD, client sidebar filtering)

---

## 1. Flesh Out Government Tab

The Government tab has been added as a placeholder for government client services. Features to implement:

- Government-specific compliance tracking
- Public records request management
- Accessibility compliance tools (ADA, Section 508)
- Government contract management
- FOIA request handling
- Government-specific reporting requirements

---

## 2. Extra Onboarding Customization

Enhance the onboarding experience:

- Custom onboarding fields per company/tier
- Conditional sections based on client needs
- Progress saving and partial submission

---

## 3. Onboarding Progress Notifications

Add notifications when clients:

- Complete onboarding steps
- Submit the full onboarding form
- Haven't completed onboarding after X days

---

## 4. Multiple Onboarding Forms Per Company

Current design is 1:1. Could expand to:

- Support multiple onboarding submissions (e.g., different locations/brands)
- Onboarding form versioning

---

## 5. Training System Enhancements

- Quiz/assessment functionality with scoring
- Certification badges for completed training paths
- Training progress analytics for admins
- Scheduled reminder emails for upcoming due dates

---

## 6. Mobile Companion App (iOS & Android)

Create a native mobile app using Replit's mobile app feature.

### Prerequisites

- Publish this web app first to get a live URL
- Apple Developer account ($99/year) for App Store publishing
- Google Play Developer account ($25 one-time) for Android publishing

### Step-by-Step Process

1. **Publish this web app** to get your live API URL (e.g., `https://your-app.replit.app`)
2. **Create a new Replit project** and select "Mobile app" as the app type
3. **Tell Agent**: *"I want a companion mobile app for my Agency Portal. Here's the published URL: [your-url]. I want it to look and work just like the web version - same design, same features, connecting to the same backend and database."*
4. Agent will build the React Native/Expo mobile app that connects to your existing API
5. **Install Expo Go** on your phone (iOS or Android)
6. **Scan the QR code** from your Replit Workspace to test the app on your device
7. **Iterate with Agent** to refine the design and features
8. When ready, **publish to TestFlight** (iOS) or **Google Play Store** (Android)

### What Gets Reused

- Entire backend (Express server, all API routes)
- PostgreSQL database and all data
- Business logic (credits, tasks, training, chat, etc.)
- Authentication system

### What Gets Built New

- Mobile UI screens (React Native instead of React web)
- Mobile-specific navigation patterns
- Native features (push notifications, etc.)

### Feature Documentation (To Be Created)

Before building the mobile app, create a comprehensive feature documentation file that includes:

- **All current features** with descriptions and requirements
- **API endpoints** used by each feature
- **Data models/schemas** for each feature
- **User flows** and interactions
- **Integration details** (Stripe, HubSpot, SharePoint, Resend)

This document will serve as the blueprint for recreating all functionality in the mobile app, ensuring feature parity between web and mobile versions.

**Key features to document:**
- Authentication and role-based access (admin vs client)
- Company management with multi-user support
- Credit-based task management system
- Government section with e-signature document management
- Media uploads with SharePoint integration
- Chat/messaging system
- Campaign requests and meeting scheduling
- Training modules and assignments
- Client onboarding workflow
- Notification system with @mentions
- Stripe credit purchasing
