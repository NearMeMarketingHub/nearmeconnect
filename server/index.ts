import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { storage } from "./storage";
import { setupWebSocket } from "./websocket";
import bcrypt from "bcryptjs";

// One-time migration: move plaintext loginCredentials from onboarding records
// into the encrypted company_credentials table, then clear the plaintext field.
async function migrateOnboardingCredentials() {
  const { db } = await import("./db");
  const { clientOnboarding } = await import("@shared/schema");
  const { isNotNull } = await import("drizzle-orm");

  const rows = await db.select().from(clientOnboarding).where(isNotNull(clientOnboarding.loginCredentials));
  if (rows.length === 0) return;

  log(`[onboarding-migration] Found ${rows.length} record(s) with plaintext loginCredentials — migrating…`, "onboarding-migration");

  for (const row of rows) {
    const companyId = row.companyId;
    try {
      const creds: Array<{ platform?: string; username?: string; password?: string; twoFactorMethod?: string; recoveryNotes?: string }> = JSON.parse(row.loginCredentials!);
      if (!Array.isArray(creds) || creds.length === 0) {
        // Nothing to migrate — just clear the field
        await storage.updateClientOnboarding(companyId, { loginCredentials: null });
        continue;
      }

      // Check ALL existing company credentials (any category) to avoid duplicates — a label
      // already present in any category is treated as already migrated.
      const existing = await storage.getCompanyCredentials(companyId);
      const existingLabels = new Set(existing.map(c => c.label));

      // Only migrate when encryption is configured — preserve plaintext if the key is missing
      if (!process.env.CREDENTIAL_ENCRYPTION_KEY) {
        log(`[onboarding-migration] CREDENTIAL_ENCRYPTION_KEY not set — skipping migration for company ${companyId} to avoid data loss`, "onboarding-migration");
        continue;
      }

      let allSucceeded = true;
      let migrated = 0;
      for (const c of creds) {
        const label = c.platform || "Unknown Platform";
        if (existingLabels.has(label)) { migrated++; continue; } // already migrated — counts as success
        try {
          await storage.createCompanyCredential({
            companyId,
            label,
            username: c.username || null,
            password: c.password || null,
            url: null,
            notes: [
              c.twoFactorMethod ? `2FA: ${c.twoFactorMethod}` : null,
              c.recoveryNotes || null,
            ].filter(Boolean).join("\n") || null,
            category: "onboarding-submitted",
          });
          migrated++;
        } catch (credErr) {
          allSucceeded = false;
          log(`[onboarding-migration] Could not migrate credential "${label}" for company ${companyId}: ${credErr}`, "onboarding-migration");
        }
      }

      // Only clear the plaintext field once ALL credentials are safely stored.
      // Also refresh loginCredentialsProvided so the checklist/PDF reflects reality
      // even if the legacy row had the flag as false (e.g. data inserted before the flag existed).
      if (allSucceeded) {
        await storage.updateClientOnboarding(companyId, {
          loginCredentials: null,
          ...(migrated > 0 ? { loginCredentialsProvided: true } : {}),
        });
        log(`[onboarding-migration] Migrated ${migrated} credential(s) for company ${companyId} — plaintext cleared`, "onboarding-migration");
      } else {
        log(`[onboarding-migration] Some credential writes failed for company ${companyId} — plaintext NOT cleared to prevent data loss`, "onboarding-migration");
      }
    } catch (err) {
      log(`[onboarding-migration] Failed to parse loginCredentials for company ${companyId}: ${err} — plaintext NOT cleared`, "onboarding-migration");
      // Do NOT clear plaintext when we cannot safely migrate it — preserving data is paramount
    }
  }

  log("[onboarding-migration] Migration complete", "onboarding-migration");
}

async function migrateCampaignWorkspaceColumns() {
  const { pool } = await import("./db");
  const alterations = [
    "ALTER TABLE campaign_requests ADD COLUMN IF NOT EXISTS purpose text",
    "ALTER TABLE campaign_requests ADD COLUMN IF NOT EXISTS offer text",
    "ALTER TABLE campaign_requests ADD COLUMN IF NOT EXISTS objective text",
    "ALTER TABLE campaign_requests ADD COLUMN IF NOT EXISTS target_services text",
    "ALTER TABLE campaign_requests ADD COLUMN IF NOT EXISTS owner_name text",
    "ALTER TABLE campaign_requests ADD COLUMN IF NOT EXISTS launch_date text",
    "ALTER TABLE campaign_requests ADD COLUMN IF NOT EXISTS client_visible boolean NOT NULL DEFAULT false",
    "ALTER TABLE campaign_requests ADD COLUMN IF NOT EXISTS sharepoint_folder_url text",
    "ALTER TABLE campaign_requests ADD COLUMN IF NOT EXISTS asset_links text",
    "ALTER TABLE campaign_requests ADD COLUMN IF NOT EXISTS approval_flow text",
    "ALTER TABLE campaign_requests ADD COLUMN IF NOT EXISTS campaign_notes text",
    "ALTER TABLE campaign_requests ADD COLUMN IF NOT EXISTS reporting_included boolean NOT NULL DEFAULT false",
    "ALTER TABLE campaign_requests ADD COLUMN IF NOT EXISTS published_urls text",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS campaign_request_id varchar",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS cadence_id varchar",
    "ALTER TABLE deliverable_types ADD COLUMN IF NOT EXISTS content_platform text",
    `CREATE TABLE IF NOT EXISTS client_resources (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id varchar NOT NULL,
      title text NOT NULL,
      resource_type text NOT NULL,
      url text,
      description text,
      visibility text NOT NULL DEFAULT 'internal_only',
      related_campaign_id varchar,
      related_task_id varchar,
      related_content_item_id varchar,
      owner text,
      status text NOT NULL DEFAULT 'active',
      last_checked_date text,
      notes text,
      created_by varchar NOT NULL,
      created_at text NOT NULL,
      updated_at text
    )`,
    // Notepad enrichment
    "ALTER TABLE notepads ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false",
    "ALTER TABLE notepads ADD COLUMN IF NOT EXISTS linked_campaign_id varchar",
    "ALTER TABLE notepads ADD COLUMN IF NOT EXISTS linked_task_id varchar",
    "ALTER TABLE notepads ADD COLUMN IF NOT EXISTS linked_content_item_id varchar",
    "ALTER TABLE notepads ADD COLUMN IF NOT EXISTS linked_meeting_id varchar",
    "ALTER TABLE notepads ADD COLUMN IF NOT EXISTS linked_resource_id varchar",
    // Meeting recap fields
    "ALTER TABLE meeting_requests ADD COLUMN IF NOT EXISTS decisions text",
    "ALTER TABLE meeting_requests ADD COLUMN IF NOT EXISTS blockers text",
    "ALTER TABLE meeting_requests ADD COLUMN IF NOT EXISTS next_steps text",
    "ALTER TABLE meeting_requests ADD COLUMN IF NOT EXISTS linked_campaign_id varchar",
    "ALTER TABLE meeting_requests ADD COLUMN IF NOT EXISTS linked_task_id varchar",
    // Message board enrichment
    "ALTER TABLE message_board_posts ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false",
    "ALTER TABLE message_board_posts ADD COLUMN IF NOT EXISTS linked_campaign_id varchar",
    "ALTER TABLE message_board_posts ADD COLUMN IF NOT EXISTS linked_task_id varchar",
    "ALTER TABLE message_board_posts ADD COLUMN IF NOT EXISTS linked_content_item_id varchar",
    // SEO / Directory Tracking
    `CREATE TABLE IF NOT EXISTS seo_directories (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id varchar NOT NULL,
      campaign_id varchar,
      name text NOT NULL,
      type text NOT NULL DEFAULT 'directory',
      url text,
      login_url text,
      target_keyword text,
      target_city text,
      status text NOT NULL DEFAULT 'not_started',
      owner text,
      due_date text,
      submitted_date text,
      live_date text,
      published_url text,
      notes text,
      evidence_url text,
      created_by varchar NOT NULL,
      created_by_name text,
      created_at text NOT NULL,
      updated_at text
    )`,
    `CREATE TABLE IF NOT EXISTS integration_statuses (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id varchar NOT NULL,
      integration_type text NOT NULL,
      status text NOT NULL DEFAULT 'not_configured',
      external_account_id text,
      external_object_id text,
      last_sync_time text,
      last_error text,
      setup_checklist_status text,
      notes text,
      updated_by varchar NOT NULL,
      updated_by_name text,
      created_at text NOT NULL,
      updated_at text
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS integration_statuses_company_type_idx ON integration_statuses (company_id, integration_type)`,
    `CREATE TABLE IF NOT EXISTS email_logs (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id varchar NOT NULL,
      related_task_id varchar,
      related_campaign_id varchar,
      related_meeting_id varchar,
      related_report_id varchar,
      recipients text[] NOT NULL,
      subject text NOT NULL,
      template_type text NOT NULL,
      html_body text NOT NULL,
      resend_email_id text,
      status text NOT NULL DEFAULT 'draft',
      sent_at text,
      error_message text,
      triggered_by text NOT NULL DEFAULT 'user',
      triggered_by_id varchar,
      idempotency_key text,
      created_at text NOT NULL,
      updated_at text
    )`,
    `CREATE INDEX IF NOT EXISTS email_logs_company_idx ON email_logs (company_id)`,
    `CREATE INDEX IF NOT EXISTS email_logs_idempotency_idx ON email_logs (idempotency_key) WHERE idempotency_key IS NOT NULL`,
    // Retainer Templates & Service Tracks
    `CREATE TABLE IF NOT EXISTS retainer_templates (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      slug text NOT NULL,
      description text,
      status text NOT NULL DEFAULT 'draft',
      suggested_monthly_price decimal(10,2),
      monthly_credit_allocation real,
      recommended_client_type text,
      included_scope_summary text,
      excluded_scope_summary text,
      overage_rules text,
      reporting_cadence text,
      meeting_cadence text,
      generation_window_days integer NOT NULL DEFAULT 60,
      created_at text NOT NULL,
      updated_at text
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS retainer_templates_slug_idx ON retainer_templates (slug)`,
    `CREATE TABLE IF NOT EXISTS service_tracks (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      slug text NOT NULL,
      description text,
      status text NOT NULL DEFAULT 'active',
      sort_order integer NOT NULL DEFAULT 0,
      created_at text NOT NULL,
      updated_at text
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS service_tracks_slug_idx ON service_tracks (slug)`,
    `CREATE TABLE IF NOT EXISTS retainer_template_service_tracks (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      retainer_template_id varchar NOT NULL,
      service_track_id varchar NOT NULL,
      included_by_default boolean NOT NULL DEFAULT true
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS rtst_unique_idx ON retainer_template_service_tracks (retainer_template_id, service_track_id)`,
    // Task Templates
    `CREATE TABLE IF NOT EXISTS task_templates (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      description text,
      default_instructions text,
      service_track_id varchar,
      deliverable_type_id varchar,
      default_credit_cost decimal(10,2),
      cadence text,
      default_due_offset_days integer,
      default_start_offset_days integer,
      default_role_owner text,
      default_priority text NOT NULL DEFAULT 'medium',
      requires_client_approval boolean NOT NULL DEFAULT false,
      creates_client_visible_task boolean NOT NULL DEFAULT true,
      is_active boolean NOT NULL DEFAULT true,
      sort_order integer NOT NULL DEFAULT 0,
      created_at text NOT NULL,
      updated_at text
    )`,
    `CREATE TABLE IF NOT EXISTS retainer_template_task_templates (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      retainer_template_id varchar NOT NULL,
      task_template_id varchar NOT NULL,
      included_by_default boolean NOT NULL DEFAULT true,
      monthly_quantity integer,
      quarterly_quantity integer,
      annual_quantity integer,
      credit_override decimal(10,2)
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS rttt_unique_idx ON retainer_template_task_templates (retainer_template_id, task_template_id)`,
    `CREATE TABLE IF NOT EXISTS client_retainer_assignments (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id varchar NOT NULL,
      retainer_template_id varchar NOT NULL,
      status text NOT NULL DEFAULT 'draft',
      start_date text NOT NULL,
      billing_day_of_month integer NOT NULL DEFAULT 1,
      monthly_credit_allocation_override real,
      monthly_price_override decimal(10,2),
      generation_window_days_override integer,
      notes text,
      created_at text NOT NULL,
      updated_at text
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS cra_company_unique_idx ON client_retainer_assignments (company_id) WHERE status IN ('draft','active','paused')`,
    `CREATE TABLE IF NOT EXISTS client_retainer_service_tracks (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      client_retainer_assignment_id varchar NOT NULL,
      service_track_id varchar NOT NULL,
      is_active boolean NOT NULL DEFAULT true,
      notes text
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS crst_unique_idx ON client_retainer_service_tracks (client_retainer_assignment_id, service_track_id)`,
    // GBP connection tracking columns on client_onboarding (schema has these, DB may not)
    "ALTER TABLE client_onboarding ADD COLUMN IF NOT EXISTS gbp_account_id text",
    "ALTER TABLE client_onboarding ADD COLUMN IF NOT EXISTS gbp_location_id text",
    "ALTER TABLE client_onboarding ADD COLUMN IF NOT EXISTS gbp_location_name text",
    "ALTER TABLE client_onboarding ADD COLUMN IF NOT EXISTS gbp_connected_status text",
    "ALTER TABLE client_onboarding ADD COLUMN IF NOT EXISTS gbp_permission_status text",
    "ALTER TABLE client_onboarding ADD COLUMN IF NOT EXISTS gbp_last_sync_time text",
    "ALTER TABLE client_onboarding ADD COLUMN IF NOT EXISTS gbp_last_publish_status text",
    "ALTER TABLE client_onboarding ADD COLUMN IF NOT EXISTS gbp_connection_notes text",
    // GBP connection tracking on companies
    "ALTER TABLE companies ADD COLUMN IF NOT EXISTS gbp_account_id text",
    "ALTER TABLE companies ADD COLUMN IF NOT EXISTS gbp_location_id text",
    "ALTER TABLE companies ADD COLUMN IF NOT EXISTS gbp_location_name text",
    "ALTER TABLE companies ADD COLUMN IF NOT EXISTS gbp_connected_status text",
    "ALTER TABLE companies ADD COLUMN IF NOT EXISTS gbp_permission_status text",
    "ALTER TABLE companies ADD COLUMN IF NOT EXISTS gbp_last_sync_time text",
    "ALTER TABLE companies ADD COLUMN IF NOT EXISTS gbp_last_publish_status text",
    "ALTER TABLE companies ADD COLUMN IF NOT EXISTS gbp_connection_notes text",
    // GBP publishing fields on content calendar items
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS gbp_cta_type text",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS gbp_published_url text",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS gbp_published_post_id text",
    // Content calendar rich-text + metadata columns (added to schema without migrations)
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS body_content text",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS hashtags text",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS cta_text text",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS cta_url text",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS scheduled_time text",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS approved_by varchar",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS approved_at text",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS published_at text",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS hubspot_post_id text",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS hubspot_campaign_id text",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS media_urls text",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS gbp_post_type text",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS gbp_event_title text",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS gbp_event_start text",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS gbp_event_end text",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS gbp_offer_title text",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS gbp_offer_start text",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS gbp_offer_end text",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS gbp_offer_coupon text",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS gbp_offer_terms text",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS gbp_redeem_url text",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS gbp_product_name text",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS gbp_product_price text",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS gbp_product_description text",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS linked_task_id varchar",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS pillar_id varchar",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS assigned_to varchar",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS assigned_to_name text",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'post'",
    "ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS updated_at text",
    // Retainer task-generation fields on tasks
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source text",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_template_id varchar",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS retainer_template_id varchar",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS client_retainer_assignment_id varchar",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS service_track_id varchar",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS client_visible boolean NOT NULL DEFAULT true",
    // Retainer generated task history (dedup)
    `CREATE TABLE IF NOT EXISTS retainer_generated_tasks (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id varchar NOT NULL,
      task_template_id varchar NOT NULL,
      retainer_template_id varchar NOT NULL,
      client_retainer_assignment_id varchar NOT NULL,
      generated_task_id varchar NOT NULL,
      period_start text NOT NULL,
      period_end text NOT NULL,
      created_at text NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS rgt_company_period_idx ON retainer_generated_tasks (company_id, period_start, period_end)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS rgt_dedup_idx ON retainer_generated_tasks (company_id, task_template_id, period_start)`,
    // Credit reservations (projected credit tracking)
    `CREATE TABLE IF NOT EXISTS credit_reservations (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id varchar NOT NULL,
      generated_task_id varchar NOT NULL,
      billing_period_start text NOT NULL,
      billing_period_end text NOT NULL,
      reserved_credits decimal(10,2) NOT NULL,
      status text NOT NULL DEFAULT 'reserved',
      created_at text NOT NULL,
      updated_at text
    )`,
    `CREATE INDEX IF NOT EXISTS cr_company_status_idx ON credit_reservations (company_id, status)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS cr_task_unique_idx ON credit_reservations (generated_task_id)`,
    // Onboarding / Implementation Templates
    `CREATE TABLE IF NOT EXISTS onboarding_templates (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      description text,
      suggested_price decimal(10,2),
      status text NOT NULL DEFAULT 'active',
      created_at text NOT NULL,
      updated_at text
    )`,
    `CREATE TABLE IF NOT EXISTS onboarding_task_templates (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      onboarding_template_id varchar NOT NULL,
      title text NOT NULL,
      description text,
      default_instructions text,
      default_credit_cost decimal(10,2) NOT NULL DEFAULT 0,
      default_due_offset_days integer,
      default_role_owner text,
      requires_client_approval boolean NOT NULL DEFAULT false,
      creates_client_visible_task boolean NOT NULL DEFAULT false,
      no_credit boolean NOT NULL DEFAULT true,
      sort_order integer NOT NULL DEFAULT 0,
      created_at text NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS ott_template_idx ON onboarding_task_templates (onboarding_template_id)`,
    // Auto-generation column on retainer assignments
    "ALTER TABLE client_retainer_assignments ADD COLUMN IF NOT EXISTS auto_generation_enabled BOOLEAN NOT NULL DEFAULT true",
    // System settings (global key-value)
    `CREATE TABLE IF NOT EXISTS system_settings (
      key text PRIMARY KEY,
      value text NOT NULL,
      updated_at text
    )`,
    // Retainer generation run logs
    `CREATE TABLE IF NOT EXISTS retainer_generation_logs (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      run_type text NOT NULL DEFAULT 'scheduled',
      status text NOT NULL DEFAULT 'success',
      companies_processed integer NOT NULL DEFAULT 0,
      tasks_created integer NOT NULL DEFAULT 0,
      tasks_skipped integer NOT NULL DEFAULT 0,
      dry_run boolean NOT NULL DEFAULT false,
      error_message text,
      details text,
      triggered_by varchar,
      created_at text NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS rgl_created_at_idx ON retainer_generation_logs (created_at DESC)`,
  ];
  for (const stmt of alterations) {
    await pool.query(stmt);
  }
  log("[campaign-workspace-migration] Campaign workspace columns ensured", "campaign-workspace-migration");
}

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

async function seedDatabase() {
  try {
    const existingAdmins = await storage.getAllAdminUsers();
    if (existingAdmins.length === 0) {
      const hashedPassword = await bcrypt.hash("Marketing.123", 10);
      const user = await storage.createUserWithId(
        crypto.randomUUID(),
        {
          email: "cameron@nearmemarketinghub.com",
          password: hashedPassword,
          firstName: "Cameron",
          lastName: "Drake",
        }
      );
      await storage.createAdminUser({ userId: user.id });
      log("Seeded default admin account: cameron@nearmemarketinghub.com");
    }

    const deliverables = [
      { id: "ddb95141-e671-4068-8551-78856fce3fae", key: "strategy_call", name: "Strategy Call", credits: "3.00" },
      { id: "0f2ae209-1c39-4283-83d2-46c3f3a9eb64", key: "check_in_call", name: "Check-In Call", credits: "2.00" },
      { id: "3c9cc0e3-50f9-4334-9ab6-c455784ef1bf", key: "email_campaign", name: "Email Campaign", credits: "4.00" },
      { id: "e7581442-aa85-4ce0-b5fc-97c193502290", key: "landing_page_update", name: "Landing Page Update", credits: "3.00" },
      { id: "937cec55-46dc-4416-a37d-f8ac5998cc6e", key: "full_landing_page", name: "Full Landing Page Build", credits: "5.00" },
      { id: "0bce74eb-8d7d-4055-be78-4d0c4754ede7", key: "social_post", name: "Social Post (Graphic + Caption)", credits: "0.25" },
      { id: "8173520a-2e74-4c77-bd05-eda64ae6e129", key: "reel_video", name: "Reel / Video Clip", credits: "1.00" },
      { id: "6ecb81b0-7831-47ea-b17a-c9c947e0220b", key: "social_listening", name: "Social Listening (Weekly)", credits: "0.25" },
      { id: "2b957953-b47b-4c88-afff-1bfa675ed6c4", key: "new_automation", name: "New Automation", credits: "8.00" },
      { id: "875d19fe-eabd-4603-a8c6-53e059c71a21", key: "technical_fix", name: "Technical Fix", credits: "3.00" },
      { id: "9408c305-9920-42eb-ae53-91fed1a3ed7d", key: "paid_ad_creative", name: "Paid Ad Creative", credits: "4.00" },
      { id: "0a9b7af6-f08c-437e-9d6b-10358400fa85", key: "paid_ad_optimization", name: "Paid Ad Optimization (Weekly)", credits: "1.00" },
      { id: "8caa76b6-f864-4e68-82b1-b25c0ae97c57", key: "monthly_report", name: "Monthly Performance Report", credits: "4.00" },
      { id: "b5b5d66b-bcfc-4ae3-9bab-1716f2aed175", key: "blog_post", name: "Blog Post", credits: "5.00" },
      { id: "6afebe19-118e-4d82-81f5-3a5d7bd7693d", key: "crm_workflow_update", name: "CRM Workflow Update", credits: "4.00" },
    ];
    const existingDeliverables = await storage.getDeliverableTypes();
    const existingDeliverableIds = new Set(existingDeliverables.map((d: any) => d.id));
    let deliverableCount = 0;
    for (const d of deliverables) {
      if (!existingDeliverableIds.has(d.id)) {
        await storage.createDeliverableType(d as any);
        deliverableCount++;
      }
    }
    if (deliverableCount > 0) log(`Seeded ${deliverableCount} deliverable types`);

    const campaigns = [
      {
        id: "ct-social-burst",
        name: "Social Media Burst",
        description: "A week-long social media campaign with daily posts and engagement monitoring",
        includedDeliverableIds: ["0bce74eb-8d7d-4055-be78-4d0c4754ede7", "8173520a-2e74-4c77-bd05-eda64ae6e129", "6ecb81b0-7831-47ea-b17a-c9c947e0220b"],
        estimatedCredits: "8.50",
        isActive: true,
      },
      {
        id: "ct-content-launch",
        name: "Content Launch Package",
        description: "Blog post with social promotion and email campaign to announce new content",
        includedDeliverableIds: ["b5b5d66b-bcfc-4ae3-9bab-1716f2aed175", "3c9cc0e3-50f9-4334-9ab6-c455784ef1bf", "0bce74eb-8d7d-4055-be78-4d0c4754ede7"],
        estimatedCredits: "9.25",
        isActive: true,
      },
      {
        id: "ct-landing-page",
        name: "Landing Page Campaign",
        description: "Full landing page build with paid ad creative for conversion optimization",
        includedDeliverableIds: ["937cec55-46dc-4416-a37d-f8ac5998cc6e", "6afebe19-118e-4d82-81f5-3a5d7bd7693d"],
        estimatedCredits: "9.00",
        isActive: true,
      },
      {
        id: "ct-strategy-kickoff",
        name: "Strategy Kickoff",
        description: "Initial strategy call with follow-up check-in and CRM workflow setup",
        includedDeliverableIds: ["ddb95141-e671-4068-8551-78856fce3fae", "0f2ae209-1c39-4283-83d2-46c3f3a9eb64", "6afebe19-118e-4d82-81f5-3a5d7bd7693d"],
        estimatedCredits: "9.00",
        isActive: true,
      },
    ];
    const existingCampaigns = await storage.getCampaignTypes();
    const existingCampaignIds = new Set(existingCampaigns.map((c: any) => c.id));
    let campaignCount = 0;
    for (const c of campaigns) {
      if (!existingCampaignIds.has(c.id)) {
        await storage.createCampaignType(c as any);
        campaignCount++;
      }
    }
    if (campaignCount > 0) log(`Seeded ${campaignCount} campaign types`);

    const meetings = [
      { id: "19adbc90-bfa0-469b-a1c9-831bc5eaf44d", name: "Strategy Call", description: "Discuss overall marketing strategy, goals, and planning", creditCost: "3.00", defaultDuration: 60, isActive: true },
      { id: "cb5f9d8e-035c-490f-a460-cb65d2e58a3c", name: "Check-In Call", description: "Regular progress review and status updates", creditCost: "2.00", defaultDuration: 30, isActive: true },
      { id: "28b0e82d-49f2-4c62-b484-f0df501a07bc", name: "Campaign Planning", description: "Plan and scope upcoming marketing campaigns", creditCost: "3.00", defaultDuration: 45, isActive: true },
      { id: "b4d1613d-7aa2-4a56-8bdf-ad23e5f802df", name: "Creative Review", description: "Review creative assets, designs, and content", creditCost: "2.00", defaultDuration: 30, isActive: true },
      { id: "47ca70df-72f2-410d-9f11-2b4f476f304f", name: "Technical Support", description: "Discuss technical issues, integrations, or troubleshooting", creditCost: "3.00", defaultDuration: 30, isActive: true },
      { id: "db2a8075-97cb-4e8c-8af6-9acfb8b6365b", name: "Onboarding Call", description: "New client onboarding and account setup", creditCost: "0.00", defaultDuration: 60, isActive: true },
    ];
    const existingMeetings = await storage.getMeetingTypes();
    const existingMeetingIds = new Set(existingMeetings.map((m: any) => m.id));
    let meetingCount = 0;
    for (const m of meetings) {
      if (!existingMeetingIds.has(m.id)) {
        await storage.createMeetingType(m as any);
        meetingCount++;
      }
    }
    if (meetingCount > 0) log(`Seeded ${meetingCount} meeting types`);

    const tiers = [
      { key: "essentials", name: "Essentials", monthlyPrice: 250000, monthlyCredits: 20, features: ["Basic marketing support", "Monthly reporting", "Email campaigns"], isActive: true, sortOrder: 0 },
      { key: "growth", name: "Growth", monthlyPrice: 500000, monthlyCredits: 40, features: ["Everything in Essentials", "Social media management", "Advanced analytics", "Priority support"], isActive: true, sortOrder: 1 },
      { key: "accelerator", name: "Accelerator", monthlyPrice: 700000, monthlyCredits: 60, features: ["Everything in Growth", "Dedicated account manager", "Custom campaigns", "Full-service marketing"], isActive: true, sortOrder: 2 },
    ];
    const existingTiers = await storage.getSubscriptionTierDefinitions();
    const existingTierKeys = new Set(existingTiers.map((t: any) => t.key));
    let tierCount = 0;
    for (const t of tiers) {
      if (!existingTierKeys.has(t.key)) {
        await storage.createSubscriptionTierDefinition(t as any);
        tierCount++;
      }
    }
    if (tierCount > 0) log(`Seeded ${tierCount} subscription tiers`);

    await storage.seedGlobalTaskCategories();

    // Seed onboarding templates
    const existingOnboarding = await storage.getOnboardingTemplates();
    if (existingOnboarding.length === 0) {
      const ONBOARDING_SEEDS: Array<{ name: string; description: string; suggestedPrice: string; tasks: Array<{ title: string; description?: string; defaultDueOffsetDays?: number; defaultRoleOwner?: string; sortOrder: number }> }> = [
        {
          name: "Client Launch Setup",
          description: "Full onboarding package to get a new client set up in the portal and systems from day one.",
          suggestedPrice: "0",
          tasks: [
            { title: "Client Intake Form", description: "Collect business info, goals, and initial preferences", defaultDueOffsetDays: 1, defaultRoleOwner: "account_manager", sortOrder: 0 },
            { title: "Access Collection", description: "Gather logins and access to key platforms (website, social, ads, analytics)", defaultDueOffsetDays: 3, defaultRoleOwner: "account_manager", sortOrder: 1 },
            { title: "SharePoint Folder Setup", description: "Create client folder structure in SharePoint for file storage", defaultDueOffsetDays: 2, defaultRoleOwner: "account_manager", sortOrder: 2 },
            { title: "Brand Kit Collection", description: "Collect logos, fonts, color palette, and brand guidelines", defaultDueOffsetDays: 5, defaultRoleOwner: "designer", sortOrder: 3 },
            { title: "Client Profile Setup", description: "Populate client profile in the portal with company info and services", defaultDueOffsetDays: 3, defaultRoleOwner: "account_manager", sortOrder: 4 },
            { title: "Reporting Baseline", description: "Establish baseline metrics for tracking progress from month 1", defaultDueOffsetDays: 7, defaultRoleOwner: "strategist", sortOrder: 5 },
            { title: "Portal Setup", description: "Configure client portal access and preferences", defaultDueOffsetDays: 2, defaultRoleOwner: "account_manager", sortOrder: 6 },
            { title: "Add Users to Portal", description: "Invite client team members to the portal", defaultDueOffsetDays: 3, defaultRoleOwner: "account_manager", sortOrder: 7 },
            { title: "Social Links Collection", description: "Collect all social media profile URLs and page IDs", defaultDueOffsetDays: 5, defaultRoleOwner: "account_manager", sortOrder: 8 },
            { title: "Important Directories", description: "Document key directory listings (GMB, Yelp, BBB, etc.)", defaultDueOffsetDays: 7, defaultRoleOwner: "strategist", sortOrder: 9 },
          ],
        },
        {
          name: "HubSpot Quick Start",
          description: "Rapid HubSpot setup for clients who need essential CRM functionality up and running fast.",
          suggestedPrice: "0",
          tasks: [
            { title: "User Setup & Roles", description: "Create user accounts and assign appropriate permission sets", defaultDueOffsetDays: 2, defaultRoleOwner: "hubspot_specialist", sortOrder: 0 },
            { title: "Custom Properties", description: "Build out essential contact, company, and deal properties", defaultDueOffsetDays: 5, defaultRoleOwner: "hubspot_specialist", sortOrder: 1 },
            { title: "Lists Setup", description: "Create key active and static lists for segmentation", defaultDueOffsetDays: 7, defaultRoleOwner: "hubspot_specialist", sortOrder: 2 },
            { title: "Forms Setup", description: "Create core lead capture and contact forms", defaultDueOffsetDays: 7, defaultRoleOwner: "hubspot_specialist", sortOrder: 3 },
            { title: "Tracking Code Installation", description: "Install and verify HubSpot tracking on client website", defaultDueOffsetDays: 5, defaultRoleOwner: "developer", sortOrder: 4 },
            { title: "Basic Workflow Setup", description: "Build lead assignment and follow-up notification workflows", defaultDueOffsetDays: 10, defaultRoleOwner: "hubspot_specialist", sortOrder: 5 },
            { title: "Dashboard Setup", description: "Configure default sales and marketing dashboards", defaultDueOffsetDays: 10, defaultRoleOwner: "hubspot_specialist", sortOrder: 6 },
            { title: "Training Call", description: "Live walkthrough of the HubSpot portal with client team", defaultDueOffsetDays: 14, defaultRoleOwner: "hubspot_specialist", sortOrder: 7 },
          ],
        },
        {
          name: "HubSpot Comprehensive Setup",
          description: "Full-service HubSpot implementation including data modeling, pipelines, automations, integrations, and training.",
          suggestedPrice: "0",
          tasks: [
            { title: "Discovery Call", description: "Review business processes, sales pipeline, and automation goals", defaultDueOffsetDays: 2, defaultRoleOwner: "hubspot_specialist", sortOrder: 0 },
            { title: "Data Model Planning", description: "Map out object relationships, custom objects, and data architecture", defaultDueOffsetDays: 5, defaultRoleOwner: "hubspot_specialist", sortOrder: 1 },
            { title: "Custom Properties Build-Out", description: "Create all required properties across contacts, companies, deals, and tickets", defaultDueOffsetDays: 10, defaultRoleOwner: "hubspot_specialist", sortOrder: 2 },
            { title: "Pipeline Setup", description: "Build deal and ticket pipelines with custom stages and automations", defaultDueOffsetDays: 12, defaultRoleOwner: "hubspot_specialist", sortOrder: 3 },
            { title: "Workflow Build-Out", description: "Create full automation library including lead nurture, sales sequences, and notifications", defaultDueOffsetDays: 18, defaultRoleOwner: "hubspot_specialist", sortOrder: 4 },
            { title: "Integrations Setup", description: "Connect third-party tools (email, ads, calendar, etc.) and configure sync", defaultDueOffsetDays: 14, defaultRoleOwner: "developer", sortOrder: 5 },
            { title: "Dashboards & Reporting", description: "Build custom reporting dashboards for sales, marketing, and leadership", defaultDueOffsetDays: 20, defaultRoleOwner: "hubspot_specialist", sortOrder: 6 },
            { title: "QA & Testing", description: "Test all workflows, forms, pipelines, and integrations end-to-end", defaultDueOffsetDays: 22, defaultRoleOwner: "hubspot_specialist", sortOrder: 7 },
            { title: "Documentation", description: "Create internal documentation for workflows, naming conventions, and SOPs", defaultDueOffsetDays: 25, defaultRoleOwner: "hubspot_specialist", sortOrder: 8 },
            { title: "Training Call", description: "Comprehensive training session with client team and admin users", defaultDueOffsetDays: 28, defaultRoleOwner: "hubspot_specialist", sortOrder: 9 },
          ],
        },
        {
          name: "Local Visibility / GBP Setup",
          description: "Google Business Profile and local SEO foundation setup for service-area businesses.",
          suggestedPrice: "0",
          tasks: [
            { title: "GBP Audit", description: "Review existing Google Business Profile for completeness and accuracy", defaultDueOffsetDays: 3, defaultRoleOwner: "strategist", sortOrder: 0 },
            { title: "NAP Review", description: "Audit name, address, phone consistency across web and directories", defaultDueOffsetDays: 5, defaultRoleOwner: "strategist", sortOrder: 1 },
            { title: "Service / Category Review", description: "Optimize GBP categories and service list for local search visibility", defaultDueOffsetDays: 5, defaultRoleOwner: "strategist", sortOrder: 2 },
            { title: "Citation Tracker Setup", description: "Build initial citation tracking spreadsheet and identify top priority directories", defaultDueOffsetDays: 7, defaultRoleOwner: "strategist", sortOrder: 3 },
            { title: "Photo / Post Plan", description: "Create a 90-day plan for GBP photos and Google Posts", defaultDueOffsetDays: 10, defaultRoleOwner: "content_lead", sortOrder: 4 },
            { title: "Directory Priorities", description: "Submit to top-tier local directories (Yelp, BBB, Bing Places, Apple Maps)", defaultDueOffsetDays: 14, defaultRoleOwner: "strategist", sortOrder: 5 },
          ],
        },
        {
          name: "Campaign Launch Setup",
          description: "End-to-end setup for a new paid or organic campaign, from strategy through launch.",
          suggestedPrice: "0",
          tasks: [
            { title: "Offer Strategy", description: "Define campaign offer, value proposition, and target audience", defaultDueOffsetDays: 3, defaultRoleOwner: "strategist", sortOrder: 0 },
            { title: "Landing Page Plan", description: "Map out landing page structure, sections, CTAs, and conversion goals", defaultDueOffsetDays: 5, defaultRoleOwner: "strategist", sortOrder: 1 },
            { title: "Copy", description: "Write headline, body copy, and CTA text for the landing page", defaultDueOffsetDays: 8, defaultRoleOwner: "content_lead", sortOrder: 2 },
            { title: "Design", description: "Design landing page mockup and creative assets", defaultDueOffsetDays: 12, defaultRoleOwner: "designer", sortOrder: 3 },
            { title: "Build", description: "Build and publish the landing page on client website or funnel tool", defaultDueOffsetDays: 16, defaultRoleOwner: "developer", sortOrder: 4 },
            { title: "Email Sequence", description: "Write and configure 3-5 email follow-up sequence for leads", defaultDueOffsetDays: 14, defaultRoleOwner: "content_lead", sortOrder: 5 },
            { title: "CRM Workflow Setup", description: "Set up lead routing, tagging, and follow-up workflows in CRM", defaultDueOffsetDays: 16, defaultRoleOwner: "hubspot_specialist", sortOrder: 6 },
            { title: "Tracking Setup", description: "Install and verify conversion tracking (GA4, Meta Pixel, Google Ads)", defaultDueOffsetDays: 14, defaultRoleOwner: "developer", sortOrder: 7 },
            { title: "QA", description: "End-to-end QA of form, tracking, email sequence, and CRM workflow", defaultDueOffsetDays: 18, defaultRoleOwner: "account_manager", sortOrder: 8 },
            { title: "Launch", description: "Activate campaign and confirm all systems are live and tracking", defaultDueOffsetDays: 21, defaultRoleOwner: "account_manager", sortOrder: 9 },
          ],
        },
      ];
      for (const seed of ONBOARDING_SEEDS) {
        const tpl = await storage.createOnboardingTemplate({ name: seed.name, description: seed.description, suggestedPrice: seed.suggestedPrice, status: "active" });
        for (const task of seed.tasks) {
          await storage.createOnboardingTaskTemplate({ onboardingTemplateId: tpl.id, title: task.title, description: task.description ?? null, defaultInstructions: null, defaultCreditCost: "0", defaultDueOffsetDays: task.defaultDueOffsetDays ?? null, defaultRoleOwner: task.defaultRoleOwner ?? null, requiresClientApproval: false, createsClientVisibleTask: false, noCredit: true, sortOrder: task.sortOrder });
        }
      }
      log(`Seeded ${ONBOARDING_SEEDS.length} onboarding templates`);
    }

    // ── Service Tracks ────────────────────────────────────────────────────────
    const existingTracks = await storage.getServiceTracks();
    if (existingTracks.length === 0) {
      const trackSeeds = [
        { name: "Account Management and Strategy", slug: "account_management_and_strategy", description: "Strategic planning, account oversight, goal-setting, and ongoing client relationship management.", sortOrder: 1 },
        { name: "Content Engine",                  slug: "content_engine",                  description: "Blog posts, social content, email newsletters, video scripts, and content calendar management.", sortOrder: 2 },
        { name: "Local SEO and GBP",               slug: "local_seo_and_gbp",               description: "Google Business Profile management, local citations, directory listings, and local search optimization.", sortOrder: 3 },
        { name: "HubSpot / CRM",                   slug: "hubspot_crm",                     description: "CRM setup, workflow automation, list management, pipeline configuration, and HubSpot hygiene.", sortOrder: 4 },
        { name: "Campaigns and Funnels",            slug: "campaigns_and_funnels",           description: "Campaign strategy, landing page builds, email sequences, lead magnets, and conversion funnel management.", sortOrder: 5 },
        { name: "Paid Ads",                         slug: "paid_ads",                        description: "Google Ads, Meta Ads, and other paid channels — strategy, creative, optimization, and reporting.", sortOrder: 6 },
        { name: "Website and Technical",            slug: "website_and_technical",           description: "Website updates, landing pages, technical fixes, tracking setup, and CRO improvements.", sortOrder: 7 },
        { name: "Reporting and Insights",           slug: "reporting_and_insights",          description: "Monthly performance reports, KPI dashboards, analytics reviews, and data-driven recommendations.", sortOrder: 8 },
        { name: "RevOps and Enablement",            slug: "revops_and_enablement",           description: "Revenue operations, sales enablement, process documentation, and cross-team workflow optimization.", sortOrder: 9 },
      ];
      for (const t of trackSeeds) {
        await storage.createServiceTrack({ ...t, status: "active" });
      }
      log(`Seeded ${trackSeeds.length} service tracks`);
    }

    // ── Retainer Templates ────────────────────────────────────────────────────
    const existingRetainerTemplates = await storage.getRetainerTemplates();
    if (existingRetainerTemplates.length === 0) {
      const freshTracks = await storage.getServiceTracks();
      const findTrackId = (fragment: string) =>
        freshTracks.find(t => t.name.toLowerCase().includes(fragment.toLowerCase()))?.id ?? null;

      const retainerSeeds = [
        {
          name: "Launch / Support",
          slug: "launch_support",
          status: "active" as const,
          description: "Entry-level retainer for new clients getting started with foundational marketing support.",
          suggestedMonthlyPrice: "3000",
          monthlyCreditAllocation: 22,
          recommendedClientType: "New clients, small businesses, or clients needing foundational support",
          includedScopeSummary: "Monthly strategy call, performance reporting, basic content support, local SEO hygiene, and account management.",
          excludedScopeSummary: "Paid ads management, full website builds, HubSpot automation, or multi-channel campaigns.",
          overageRules: "Additional credits billed at standard rate. Overage discussed in advance with client.",
          reportingCadence: "Monthly",
          meetingCadence: "Monthly",
          generationWindowDays: 60,
          tracks: ["Account Management", "Reporting", "Local SEO"],
        },
        {
          name: "Growth",
          slug: "growth",
          status: "active" as const,
          description: "Mid-tier retainer for growing businesses scaling their marketing across multiple channels.",
          suggestedMonthlyPrice: "6000",
          monthlyCreditAllocation: 45,
          recommendedClientType: "Growing SMBs scaling content, SEO, and lead generation",
          includedScopeSummary: "Strategy, content engine, local SEO, GBP management, monthly reporting, email campaigns, and HubSpot support.",
          excludedScopeSummary: "Paid ads management, full website builds, advanced RevOps.",
          overageRules: "Overage at standard per-credit rate, pre-approved by account manager.",
          reportingCadence: "Monthly",
          meetingCadence: "Bi-weekly",
          generationWindowDays: 60,
          tracks: ["Account Management", "Content", "Local SEO", "HubSpot", "Reporting"],
        },
        {
          name: "Scale",
          slug: "scale",
          status: "active" as const,
          description: "High-output retainer for businesses running multi-channel campaigns and advanced automation.",
          suggestedMonthlyPrice: "10000",
          monthlyCreditAllocation: 67,
          recommendedClientType: "Established businesses running paid ads, campaigns, and CRM automation",
          includedScopeSummary: "Full strategy, content engine, local SEO, HubSpot automation, paid ads optimization, campaign management, and monthly deep-dive reporting.",
          excludedScopeSummary: "Full website rebuilds, annual brand overhauls.",
          overageRules: "Overage pre-approved in writing. Quarterly rollover available on annual contracts.",
          reportingCadence: "Monthly + Quarterly deep-dive",
          meetingCadence: "Weekly check-ins + monthly strategy",
          generationWindowDays: 60,
          tracks: ["Account Management", "Content", "Local SEO", "HubSpot", "Campaigns", "Paid Ads", "Reporting"],
        },
        {
          name: "Accelerator",
          slug: "accelerator",
          status: "active" as const,
          description: "Premium full-service retainer for high-growth clients requiring dedicated capacity across all channels.",
          suggestedMonthlyPrice: "15000",
          monthlyCreditAllocation: 105,
          recommendedClientType: "High-growth brands or multi-location businesses needing full-service marketing",
          includedScopeSummary: "All service tracks active. Dedicated account team, full content engine, paid ads, CRM, website support, RevOps, and executive-level reporting.",
          excludedScopeSummary: "Custom software development, TV/radio production.",
          overageRules: "Dedicated capacity model — overages handled via scoped add-ons, not per-credit billing.",
          reportingCadence: "Monthly + Quarterly + Annual",
          meetingCadence: "Weekly strategy + bi-weekly exec review",
          generationWindowDays: 60,
          tracks: ["Account Management", "Content", "Local SEO", "HubSpot", "Campaigns", "Paid Ads", "Website", "Reporting", "RevOps"],
        },
      ];

      for (const seed of retainerSeeds) {
        const { tracks, ...templateData } = seed;
        const template = await storage.createRetainerTemplate(templateData as any);
        const trackEntries = tracks
          .map(fragment => {
            const id = findTrackId(fragment);
            return id ? { serviceTrackId: id, includedByDefault: true } : null;
          })
          .filter((e): e is { serviceTrackId: string; includedByDefault: boolean } => e !== null);
        if (trackEntries.length > 0) {
          await storage.setRetainerTemplateServiceTracks(template.id, trackEntries);
        }
      }
      log(`Seeded ${retainerSeeds.length} retainer templates`);
    }

    // ── Task Templates ────────────────────────────────────────────────────────
    const existingTaskTemplates = await storage.getTaskTemplates();
    if (existingTaskTemplates.length === 0) {
      const allTracks = await storage.getServiceTracks();
      const findTrackId = (fragment: string) =>
        allTracks.find(t => t.name.toLowerCase().includes(fragment.toLowerCase()))?.id ?? null;

      const taskTemplateSeeds = [
        { title: "Monthly Strategy & Priority Call",          serviceTrack: "Account Management", cadence: "monthly",    role: "account_manager",     credits: "3.00",  clientVisible: true,  approval: false, dueOffset: 30, sortOrder: 1,  desc: "Monthly check-in to review priorities, align on goals, and plan the upcoming month.", instructions: "Prepare agenda: last month wins, current KPIs, priorities for next 30 days." },
        { title: "Monthly Performance Report",                serviceTrack: "Reporting",           cadence: "monthly",    role: "strategist",          credits: "4.00",  clientVisible: true,  approval: false, dueOffset: 5,  sortOrder: 2,  desc: "Comprehensive monthly report covering all active service tracks, KPIs, and recommendations.", instructions: "Include traffic, leads, campaign results, credit usage, and next-month recommendations." },
        { title: "Content Calendar Planning (30–60 days)",    serviceTrack: "Content",             cadence: "monthly",    role: "content_lead",        credits: "2.00",  clientVisible: true,  approval: true,  dueOffset: 14, sortOrder: 3,  desc: "Plan and schedule content calendar for the next 30–60 days across all active channels.", instructions: "Map content themes, platforms, posting cadence, and assign production tasks." },
        { title: "Blog / Content Piece",                      serviceTrack: "Content",             cadence: "monthly",    role: "content_lead",        credits: "5.00",  clientVisible: true,  approval: true,  dueOffset: 21, sortOrder: 4,  desc: "Research, write, and publish a long-form blog post or content piece.", instructions: "Include SEO keyword research, header structure, CTA, and meta description." },
        { title: "Social Post (Graphic + Caption + Posting)", serviceTrack: "Content",             cadence: "weekly",     role: "content_lead",        credits: "0.25",  clientVisible: true,  approval: true,  dueOffset: 7,  sortOrder: 5,  desc: "Design graphic, write caption with hashtags, and schedule or publish to active social channels.", instructions: "Follow brand guidelines, include CTA, review caption for tone and engagement." },
        { title: "Monthly Newsletter / Email Update",         serviceTrack: "Content",             cadence: "monthly",    role: "content_lead",        credits: "4.00",  clientVisible: true,  approval: true,  dueOffset: 20, sortOrder: 6,  desc: "Write, design, and send monthly email newsletter to subscriber list.", instructions: "Include key wins, promotions, content highlights, and upcoming news." },
        { title: "Local SEO / GBP Update",                   serviceTrack: "Local SEO",           cadence: "monthly",    role: "account_manager",     credits: "2.00",  clientVisible: false, approval: false, dueOffset: 15, sortOrder: 7,  desc: "Update Google Business Profile posts, photos, Q&A, and review responses.", instructions: "Post 2–4 GBP updates, respond to new reviews, check NAP consistency." },
        { title: "Directory / Link Tracker Update",           serviceTrack: "Local SEO",           cadence: "monthly",    role: "account_manager",     credits: "1.00",  clientVisible: false, approval: false, dueOffset: 20, sortOrder: 8,  desc: "Audit and update business directory listings and track backlink profile.", instructions: "Check top 20 directories for NAP accuracy, submit corrections as needed." },
        { title: "HubSpot CRM / Workflow Hygiene",            serviceTrack: "HubSpot",             cadence: "monthly",    role: "hubspot_specialist",  credits: "4.00",  clientVisible: false, approval: false, dueOffset: 25, sortOrder: 9,  desc: "Review and clean CRM data, update workflows, check automation health.", instructions: "Audit contact properties, fix broken workflows, review enrollment criteria." },
        { title: "Campaign Strategy & Asset Planning",        serviceTrack: "Campaigns",           cadence: "monthly",    role: "strategist",          credits: "3.00",  clientVisible: true,  approval: true,  dueOffset: 14, sortOrder: 10, desc: "Define campaign goals, audience, messaging, channel mix, and required assets.", instructions: "Create campaign brief including objective, offer, audience, timeline, and deliverables." },
        { title: "Landing Page Update",                       serviceTrack: "Website",             cadence: "monthly",    role: "developer",           credits: "3.00",  clientVisible: false, approval: false, dueOffset: 21, sortOrder: 11, desc: "Update existing landing page content, CTAs, or design elements.", instructions: "Follow brand guidelines, test form submission, verify tracking is intact." },
        { title: "Full Landing Page Build",                   serviceTrack: "Campaigns",           cadence: "once",       role: "developer",           credits: "5.00",  clientVisible: true,  approval: true,  dueOffset: 21, sortOrder: 12, desc: "Design and build a new conversion-focused landing page.", instructions: "Includes copy, design, build, form setup, CRM integration, and tracking." },
        { title: "Email Campaign",                            serviceTrack: "Campaigns",           cadence: "monthly",    role: "content_lead",        credits: "4.00",  clientVisible: true,  approval: true,  dueOffset: 18, sortOrder: 13, desc: "Build and send a promotional or nurture email campaign.", instructions: "Segment list, write copy, design template, test links, schedule send." },
        { title: "CRM Workflow Update",                       serviceTrack: "HubSpot",             cadence: "quarterly",  role: "hubspot_specialist",  credits: "4.00",  clientVisible: false, approval: false, dueOffset: 30, sortOrder: 14, desc: "Build or update an automation workflow in HubSpot or connected CRM.", instructions: "Document workflow logic, test branch conditions, confirm enrollment triggers." },
        { title: "Paid Ad Optimization (Weekly)",             serviceTrack: "Paid Ads",            cadence: "weekly",     role: "ads_manager",         credits: "1.00",  clientVisible: false, approval: false, dueOffset: 7,  sortOrder: 15, desc: "Weekly review and optimization of active paid ad campaigns.", instructions: "Review CTR, CPC, ROAS, adjust bids/budgets, pause underperformers, test new creatives." },
        { title: "Monthly Ads Report",                        serviceTrack: "Paid Ads",            cadence: "monthly",    role: "ads_manager",         credits: "2.00",  clientVisible: true,  approval: false, dueOffset: 5,  sortOrder: 16, desc: "Monthly paid ads performance summary with insights and recommendations.", instructions: "Cover spend, impressions, clicks, conversions, ROAS, and next-month recommendations." },
        { title: "Quarterly Deep Dive & Roadmap Refresh",     serviceTrack: "Account Management",  cadence: "quarterly",  role: "strategist",          credits: "5.00",  clientVisible: true,  approval: false, dueOffset: 7,  sortOrder: 17, desc: "In-depth quarterly review of all service tracks with updated 90-day roadmap.", instructions: "Review all channel performance, revise priorities, document roadmap for next quarter." },
        { title: "Year-End Report",                           serviceTrack: "Reporting",           cadence: "annual",     role: "strategist",          credits: "6.00",  clientVisible: true,  approval: false, dueOffset: 14, sortOrder: 18, desc: "Annual summary of all marketing activity, results, and strategic recommendations.", instructions: "Cover all service tracks, year-over-year metrics, key wins, and goals for next year." },
      ];

      for (const seed of taskTemplateSeeds) {
        await storage.createTaskTemplate({
          title: seed.title,
          description: seed.desc,
          defaultInstructions: seed.instructions,
          serviceTrackId: findTrackId(seed.serviceTrack),
          deliverableTypeId: null,
          defaultCreditCost: seed.credits,
          cadence: seed.cadence as any,
          defaultDueOffsetDays: seed.dueOffset,
          defaultStartOffsetDays: null,
          defaultRoleOwner: seed.role as any,
          defaultPriority: "medium",
          requiresClientApproval: seed.approval,
          createsClientVisibleTask: seed.clientVisible,
          isActive: true,
          sortOrder: seed.sortOrder,
        });
      }
      log(`Seeded ${taskTemplateSeeds.length} task templates`);
    }

  } catch (error) {
    console.error("Database seed error:", error);
  }
}

(async () => {
  await migrateCampaignWorkspaceColumns().catch(err => log(`[campaign-workspace-migration] Error: ${err}`, "campaign-workspace-migration"));
  await migrateOnboardingCredentials().catch(err => log(`[onboarding-migration] Error: ${err}`, "onboarding-migration"));
  await seedDatabase();
  setupWebSocket(httpServer);
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    async () => {
      log(`serving on port ${port}`);
      if (!process.env.CREDENTIAL_ENCRYPTION_KEY) {
        log("WARNING: CREDENTIAL_ENCRYPTION_KEY is not set — credential password writes will be rejected until the key is configured", "credential-encryption");
      }
      // One-time migration: move plaintext loginCredentials from onboarding records into encrypted company_credentials
      // Migrations already ran at startup above
    },
  );

  // Government documents cleanup job - runs every 24 hours
  // Marks local files as deleted when they're past 90-day expiration
  // SharePoint copies remain permanent
  const runDocumentCleanup = async () => {
    try {
      const expiredDocs = await storage.getExpiredGovernmentDocuments();
      for (const doc of expiredDocs) {
        // Mark the local file as deleted (SharePoint copy remains)
        await storage.updateGovernmentDocument(doc.id, {
          localFileDeletedAt: new Date().toISOString(),
        });
        log(`Cleaned up expired government document: ${doc.id} (${doc.title})`);
      }
      if (expiredDocs.length > 0) {
        log(`Document cleanup complete: ${expiredDocs.length} expired documents processed`);
      }
    } catch (error) {
      console.error("Document cleanup error:", error);
    }
  };

  // Run cleanup on startup and then every 24 hours
  runDocumentCleanup();
  setInterval(runDocumentCleanup, 24 * 60 * 60 * 1000);

  // Auto-close chats that have passed their autoCloseAt date
  const runChatAutoClose = async () => {
    try {
      const threadsToClose = await storage.getAutoCloseThreads();
      for (const thread of threadsToClose) {
        await storage.createChatMessage({
          threadId: thread.id,
          senderId: "system",
          content: "This chat has been automatically closed.",
        });
        await storage.updateChatThread(thread.id, {
          closedAt: new Date().toISOString(),
          autoCloseAt: null,
        });
        log(`Auto-closed chat thread ${thread.id}`);
      }
      if (threadsToClose.length > 0) {
        log(`Auto-close complete: ${threadsToClose.length} chats closed`);
      }
    } catch (error) {
      console.error("Chat auto-close error:", error);
    }
  };
  
  runChatAutoClose();
  setInterval(runChatAutoClose, 60 * 60 * 1000); // Check every hour

  // Monthly report scheduler - sends reports on 1st of each month at 8 AM ET
  const { setupMonthlyReportScheduler } = await import("./monthly-report");
  await setupMonthlyReportScheduler();

  // HubSpot OAuth scheduler - nightly sync + token refresh every 6 hours
  const { setupHubSpotScheduler } = await import("./hubspot-scheduler");
  await setupHubSpotScheduler();

  // Retainer auto-generation scheduler - daily at 7:00 AM ET
  const { setupRetainerScheduler } = await import("./retainer-scheduler");
  setupRetainerScheduler();
})();
