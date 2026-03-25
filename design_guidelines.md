# Design Guidelines: Marketing Agency Client Portal

## Design Approach

**Selected Approach:** Reference-Based (Productivity Tools)
**Primary References:** Linear, Notion, Asana
**Rationale:** Utility-focused task management application requiring efficiency, clarity, and data-dense interfaces. Linear's clean aesthetics combined with Notion's flexibility provides the right balance for agency-client collaboration.

## Core Design Elements

### Typography Hierarchy
- **Primary Font:** Inter or SF Pro for UI elements (via Google Fonts CDN)
- **Secondary Font:** JetBrains Mono for credit counts and numerical data
- **Scale:**
  - Hero/Onboarding headings: text-4xl to text-5xl, font-bold
  - Section headers: text-2xl, font-semibold
  - Card titles: text-lg, font-medium
  - Body text: text-base
  - Metadata/labels: text-sm, text-xs for secondary info

### Layout System
**Spacing Primitives:** Use Tailwind units of 2, 4, 6, and 8 consistently
- Component padding: p-4, p-6, p-8
- Section spacing: space-y-6, space-y-8
- Grid gaps: gap-4, gap-6
- Container max-width: max-w-7xl for main content, max-w-2xl for onboarding flows

### Component Library

**Navigation:**
- Persistent sidebar (w-64) with collapsed mobile state
- Top bar with user profile, notifications, credit balance badge
- Breadcrumb navigation for deep hierarchies

**Onboarding Flow:**
- Multi-step wizard with progress indicator (4-5 steps)
- Full-screen centered cards (max-w-2xl) on minimal backdrop
- Step indicators using numbered circles connected by lines
- Large, friendly illustrations or abstract shapes
- Steps: Welcome → Company Info → Subscription Details → Team Setup → Dashboard Preview

**Dashboard Cards:**
- Elevated cards with subtle borders, rounded-xl
- Icon + Title + Metric pattern for stats
- Grid layout: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Quick stats: Active Tasks, Available Credits, Pending Requests, This Month's Usage

**Task Management:**
- List view with alternating row treatments
- Kanban board option with drag-drop zones
- Task cards include: Title, Description snippet, Assignee avatar, Due date, Credit cost badge, Status indicator
- Filters and sorting toolbar (sticky position)

**Credit Tracking:**
- Prominent credit balance display (large numerical emphasis)
- Usage history table with columns: Date, Task, Credits Used, Remaining Balance
- Visual credit meter (progress bar or circular indicator)
- Subscription tier badge with renewal date
- Monthly usage chart (line or bar graph)

**Forms:**
- Task Request Form: Title, Description (textarea), Priority dropdown, Estimated credits, File attachments
- Clean vertical spacing (space-y-4)
- Labels above inputs (text-sm font-medium)
- Helper text below fields (text-xs)
- Primary action buttons: full width on mobile, auto width on desktop

**Icons:** Heroicons (outline for navigation, solid for status indicators)

## Application Structure

**Onboarding:** Full-screen experience, minimal navigation, clear CTAs
**Main Portal:**
- Sidebar: Dashboard, Tasks (Assigned/Requested), Credits, Settings
- Main content area: Contextual header + scrollable content
- Right panel (optional): Activity feed, upcoming deadlines

**Interaction Patterns:**
- Hover states: Subtle elevation changes (shadow-md to shadow-lg)
- Loading states: Skeleton screens matching content structure
- Empty states: Centered illustration + message + CTA
- Notifications: Toast messages (top-right corner)
- Modals: Task details, credit transaction history, confirmation dialogs

## Images

**Onboarding Illustrations:**
- Abstract, friendly illustrations for each onboarding step (non-photographic)
- Placement: Center of each onboarding card, above content
- Style: Minimal, geometric shapes or line drawings
- Size: w-48 to w-64 height

**Dashboard:**
- No hero image (utility-focused interface)
- Avatar images for team members (rounded-full, w-8 h-8 to w-10 h-10)
- Optional: Small brand logo in sidebar header

**Empty States:**
- Simple SVG illustrations (max-w-sm) for "No tasks yet" scenarios

## Key Principles

1. **Information Density:** Maximize useful data visibility without clutter
2. **Scanability:** Clear visual hierarchy, consistent spacing, grouped related items
3. **Status Clarity:** Distinct visual treatment for task states (pending, in-progress, completed)
4. **Credit Transparency:** Always-visible credit balance, clear cost indicators on tasks
5. **Mobile Responsiveness:** Collapsible sidebar, stacked cards, simplified tables on small screens