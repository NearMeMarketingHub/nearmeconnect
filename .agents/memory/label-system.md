---
name: Task label system architecture
description: How the color label system works for the project board (task_labels + task_label_assignments)
---

## Rule
Labels are per-company resources. The ProjectBoard component fetches its own label data internally. When companyId === "all", label queries are disabled.

## Why
Labels belong to a company (task_labels.company_id). The "all companies" board view shows tasks from multiple companies and can't meaningfully display per-company labels. Keeping data fetching inside ProjectBoard keeps the component self-contained.

## How to apply
- `task_labels` table: id, company_id, name, color (hex), sort_order, created_at
- `task_label_assignments` table: id, task_id, label_id
- API routes: GET/POST `/api/companies/:companyId/task-labels`, PATCH/DELETE `/api/task-labels/:id`, GET/POST/DELETE `/api/tasks/:taskId/labels[/:labelId]`, GET `/api/companies/:companyId/task-label-assignments`
- Inside ProjectBoard: two useQuery hooks (labels + assignments), built into `taskLabelsMap: Map<taskId, TaskLabel[]>` via useMemo, passed to BoardCard/GridRow/CalendarView
- ManageLabelsDialog lives in company-dashboard.tsx Tasks tab header (admin-only)
- Label assignment UI lives in TaskDetailPanel (admin can add/remove via hover dropdown)
- Tables were created via executeSql (not db:push) due to interactive rename prompt issue
