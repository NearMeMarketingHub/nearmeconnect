import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, decimal, real, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export * from "./models/auth";

export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  industry: text("industry"),
  logoUrl: text("logo_url"),
  clientType: text("client_type").notNull().default("marketing"), // 'government' or 'marketing'
  subscriptionTier: text("subscription_tier").notNull().default("essentials"),
  credits: real("credits").notNull().default(0),
  monthlyCredits: real("monthly_credits").notNull().default(20),
  renewalDate: text("renewal_date"),
  billingStartDay: integer("billing_start_day").notNull().default(1),
  creditsLastReset: text("credits_last_reset"),
  isPaused: boolean("is_paused").notNull().default(false),
  pausedAt: text("paused_at"),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  lastOnboardingReminderSent: text("last_onboarding_reminder_sent"),
  lastProjectedUsageWarningSent: text("last_projected_usage_warning_sent"),
  hubspotCompanyId: text("hubspot_company_id"),
  bonusCredits: real("bonus_credits").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  credits: true,
  monthlyCredits: true,
  renewalDate: true,
  onboardingComplete: true,
  isPaused: true,
  pausedAt: true,
  creditsLastReset: true,
});

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

export const companyMembers = pgTable("company_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: text("role").notNull().default("team_member"),
  customRoleId: varchar("custom_role_id"),
  createdAt: text("created_at").notNull(),
});

export const insertCompanyMemberSchema = createInsertSchema(companyMembers).omit({
  id: true,
  createdAt: true,
});

export type InsertCompanyMember = z.infer<typeof insertCompanyMemberSchema>;
export type CompanyMember = typeof companyMembers.$inferSelect;

export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  createdAt: text("created_at").notNull(),
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
});

export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;

export const adminInvitations = pgTable("admin_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  invitedBy: varchar("invited_by").notNull(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  usedBy: varchar("used_by"),
  createdAt: text("created_at").notNull(),
});

export const insertAdminInvitationSchema = createInsertSchema(adminInvitations).omit({
  id: true,
  createdAt: true,
  usedAt: true,
  usedBy: true,
});

export type InsertAdminInvitation = z.infer<typeof insertAdminInvitationSchema>;
export type AdminInvitation = typeof adminInvitations.$inferSelect;

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  createdAt: text("created_at").notNull(),
});

export const taskCategories = pgTable("task_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  name: text("name").notNull(),
  color: text("color"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  notes: text("notes"),
  status: text("status").notNull().default("pending"),
  priority: text("priority").notNull().default("medium"),
  creditCost: decimal("credit_cost", { precision: 10, scale: 2 }).notNull().default("1"),
  type: text("type").notNull().default("assigned"),
  deliverableType: text("deliverable_type"),
  dueDate: text("due_date"),
  startDate: text("start_date"),
  createdAt: text("created_at").notNull(),
  assignedBy: varchar("assigned_by"),
  assignedTo: varchar("assigned_to"),
  creditsDeducted: boolean("credits_deducted").notNull().default(false),
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurrencePattern: text("recurrence_pattern"), // 'day_of_month' | 'day_of_week' | 'biweekly'
  recurrenceDay: integer("recurrence_day"), // day of month (1-28) for day_of_month pattern
  recurrenceWeekday: integer("recurrence_weekday"), // 0-6 (Sun-Sat) for day_of_week and biweekly patterns
  recurrenceWeekOrdinal: integer("recurrence_week_ordinal"), // 1-4 for 1st-4th, -1 for last (day_of_week pattern)
  billingPeriodStart: text("billing_period_start"),
  billingPeriodEnd: text("billing_period_end"),
  parentTaskId: varchar("parent_task_id"),
  approvalStatus: text("approval_status").notNull().default("approved"),
  noCredit: boolean("no_credit").notNull().default(false),
  timerStartedAt: text("timer_started_at"),
  totalTimeTracked: integer("total_time_tracked").notNull().default(0),
  taskOwnership: text("task_ownership").notNull().default("agency"),
  bulkQuantity: integer("bulk_quantity"),
  bulkParentId: varchar("bulk_parent_id"),
  cadenceFrequency: text("cadence_frequency"),
  cadenceDays: text("cadence_days").array(),
  cadenceEndDate: text("cadence_end_date"),
  campaignRequestId: varchar("campaign_request_id"),
  creditsDeductedAt: text("credits_deducted_at"),
  creditCostAtDeduction: decimal("credit_cost_at_deduction", { precision: 10, scale: 2 }),
  revisionCount: integer("revision_count").notNull().default(0),
  completedAt: text("completed_at"),
  completedBy: varchar("completed_by"),
  completedByName: text("completed_by_name"),
  cadenceId: varchar("cadence_id"),
  categoryId: varchar("category_id").references(() => taskCategories.id, { onDelete: "set null" }),
});

export const taskChecklistItems = pgTable("task_checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull(),
  title: text("title").notNull(),
  isCompleted: boolean("is_completed").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const insertTaskChecklistItemSchema = createInsertSchema(taskChecklistItems).omit({
  id: true,
  createdAt: true,
});

export type InsertTaskChecklistItem = z.infer<typeof insertTaskChecklistItemSchema>;
export type TaskChecklistItem = typeof taskChecklistItems.$inferSelect;

export const taskComments = pgTable("task_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull(),
  userId: varchar("user_id").notNull(),
  userName: text("user_name").notNull(),
  userType: text("user_type").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at"),
});

export const insertTaskCommentSchema = createInsertSchema(taskComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTaskComment = z.infer<typeof insertTaskCommentSchema>;
export type TaskComment = typeof taskComments.$inferSelect;

export const taskAttachments = pgTable("task_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  contentType: text("content_type").notNull(),
  driveId: varchar("drive_id").notNull(),
  itemId: varchar("item_id").notNull(),
  webUrl: text("web_url"),
  uploadedBy: varchar("uploaded_by").notNull(),
  uploadedByName: text("uploaded_by_name").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertTaskAttachmentSchema = createInsertSchema(taskAttachments).omit({
  id: true,
  createdAt: true,
});

export type InsertTaskAttachment = z.infer<typeof insertTaskAttachmentSchema>;
export type TaskAttachment = typeof taskAttachments.$inferSelect;

export const taskLinks = pgTable("task_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull(),
  url: text("url").notNull(),
  label: text("label"),
  createdBy: varchar("created_by").notNull(),
  createdByName: text("created_by_name").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertTaskLinkSchema = createInsertSchema(taskLinks).omit({
  id: true,
  createdAt: true,
});

export type InsertTaskLink = z.infer<typeof insertTaskLinkSchema>;
export type TaskLink = typeof taskLinks.$inferSelect;

export const taskAssignees = pgTable("task_assignees", {
  id: serial("id").primaryKey(),
  taskId: varchar("task_id").notNull(),
  userId: varchar("user_id").notNull(),
  assignedAt: text("assigned_at").notNull().default(sql`now()`),
});

export const insertTaskAssigneeSchema = createInsertSchema(taskAssignees).omit({
  id: true,
});

export type InsertTaskAssignee = z.infer<typeof insertTaskAssigneeSchema>;
export type TaskAssignee = typeof taskAssignees.$inferSelect;

export const insertTaskCategorySchema = createInsertSchema(taskCategories).omit({
  id: true,
  createdAt: true,
});

export type InsertTaskCategory = z.infer<typeof insertTaskCategorySchema>;
export type TaskCategory = typeof taskCategories.$inferSelect;

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export const creditTransactions = pgTable("credit_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  taskId: varchar("task_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  createdAt: text("created_at").notNull(),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),
});

export const deliverableTypes = pgTable("deliverable_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  credits: decimal("credits", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const insertDeliverableTypeSchema = createInsertSchema(deliverableTypes).omit({
  id: true,
  createdAt: true,
});

export type InsertDeliverableType = z.infer<typeof insertDeliverableTypeSchema>;
export type DeliverableType = typeof deliverableTypes.$inferSelect;

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).omit({
  id: true,
  createdAt: true,
});

export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
export type CreditTransaction = typeof creditTransactions.$inferSelect;

export const taskStatuses = ["pending", "in_progress", "review", "approved", "completed", "cancelled"] as const;
export type TaskStatus = typeof taskStatuses[number];

export const taskPriorities = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = typeof taskPriorities[number];

export const subscriptionTierDefinitions = pgTable("subscription_tier_definitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  monthlyPrice: integer("monthly_price").notNull().default(0),
  monthlyCredits: integer("monthly_credits").notNull().default(0),
  features: text("features").array().notNull().default(sql`'{}'::text[]`),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const insertSubscriptionTierDefinitionSchema = createInsertSchema(subscriptionTierDefinitions).omit({
  id: true,
  createdAt: true,
});
export type InsertSubscriptionTierDefinition = z.infer<typeof insertSubscriptionTierDefinitionSchema>;
export type SubscriptionTierDefinition = typeof subscriptionTierDefinitions.$inferSelect;

export const subscriptionTiers = ["essentials", "growth", "accelerator"] as const;
export type SubscriptionTier = typeof subscriptionTiers[number];

export const tierCredits: Record<SubscriptionTier, number> = {
  essentials: 20,
  growth: 40,
  accelerator: 60,
};

export const tierPricing: Record<SubscriptionTier, number> = {
  essentials: 2500,
  growth: 5000,
  accelerator: 7000,
};

export const deliverableCredits: Record<string, number> = {
  "strategy_call": 3,
  "check_in_call": 2,
  "email_campaign": 4,
  "landing_page_update": 3,
  "full_landing_page": 5,
  "social_post": 0.25,
  "reel_video": 1,
  "social_listening": 0.25,
  "blog_post": 5,
  "crm_workflow_update": 4,
  "new_automation": 8,
  "technical_fix": 3,
  "paid_ad_creative": 4,
  "paid_ad_optimization": 1,
  "monthly_report": 4,
};

export const deliverableNames: Record<string, string> = {
  "strategy_call": "Strategy Call",
  "check_in_call": "Check-In Call",
  "email_campaign": "Email Campaign",
  "landing_page_update": "Landing Page Update",
  "full_landing_page": "Full Landing Page Build",
  "social_post": "Social Post (Graphic + Caption)",
  "reel_video": "Reel / Video Clip",
  "social_listening": "Social Listening (Weekly)",
  "blog_post": "Blog Post",
  "crm_workflow_update": "CRM Workflow Update",
  "new_automation": "New Automation",
  "technical_fix": "Technical Fix",
  "paid_ad_creative": "Paid Ad Creative",
  "paid_ad_optimization": "Paid Ad Optimization (Weekly)",
  "monthly_report": "Monthly Performance Report",
};

export const memberRoles = ["company_owner", "company_admin", "team_member"] as const;
export type MemberRole = typeof memberRoles[number];

// Helper to get display name for roles
export const memberRoleLabels: Record<MemberRole, string> = {
  company_owner: "Company Owner",
  company_admin: "Company Admin",
  team_member: "Team Member",
};

// Company invitations for signup links
export const companyInvitations = pgTable("company_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  email: text("email"),
  token: text("token").notNull().unique(),
  role: text("role").notNull().default("team_member"),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  usedBy: varchar("used_by"),
  createdBy: varchar("created_by").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertCompanyInvitationSchema = createInsertSchema(companyInvitations).omit({
  id: true,
  createdAt: true,
  usedAt: true,
  usedBy: true,
});

export type InsertCompanyInvitation = z.infer<typeof insertCompanyInvitationSchema>;
export type CompanyInvitation = typeof companyInvitations.$inferSelect;

// Social platform types for onboarding
export const socialPlatforms = ["facebook", "instagram", "youtube", "tiktok", "x_twitter", "linkedin", "pinterest"] as const;
export type SocialPlatform = typeof socialPlatforms[number];

// Client onboarding data
export const clientOnboarding = pgTable("client_onboarding", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().unique(),
  
  // Progress tracking
  currentStep: integer("current_step").default(1),
  
  // Client Information
  website: text("website"),
  primaryContactName: text("primary_contact_name"),
  primaryContactEmail: text("primary_contact_email"),
  primaryContactPhone: text("primary_contact_phone"),
  specialNotes: text("special_notes"),
  
  // Social platforms JSON - stores array of { platform, exists, handle, accountEmail, notes }
  socialPlatforms: text("social_platforms"),
  
  // Login credentials JSON - stores array of { platform, username, password, twoFactorMethod, recoveryNotes }
  loginCredentials: text("login_credentials"),
  
  // Account access checklist - stores completion dates
  youtubeInviteDate: text("youtube_invite_date"),
  metaBusinessInviteDate: text("meta_business_invite_date"),
  googleBusinessInviteDate: text("google_business_invite_date"),
  youtubeFeatureEligibilityDate: text("youtube_feature_eligibility_date"),
  
  // Account access N/A flags
  youtubeInviteNA: boolean("youtube_invite_na").default(false),
  youtubeFeatureNA: boolean("youtube_feature_na").default(false),
  metaBusinessNA: boolean("meta_business_na").default(false),
  googleBusinessNA: boolean("google_business_na").default(false),
  
  // GBP Recovery
  needsGbpRecovery: boolean("needs_gbp_recovery").default(false),
  gbpBusinessName: text("gbp_business_name"),
  gbpBusinessAddress: text("gbp_business_address"),
  gbpContactEmail: text("gbp_contact_email"),
  gbpContactPhone: text("gbp_contact_phone"),
  gbpAdditionalContext: text("gbp_additional_context"),
  
  // Brand Assets
  brandAssetLinks: text("brand_asset_links"),
  brandAssetFiles: text("brand_asset_files"), // JSON array of { name, objectPath, uploadedAt }
  
  // Seasonal/Holiday Preferences
  seasonalPreferences: text("seasonal_preferences"), // JSON array of seasons
  holidayPreferences: text("holiday_preferences"), // JSON array of holidays
  otherHolidays: text("other_holidays"),
  seasonalNotes: text("seasonal_notes"),
  
  // Final checklist
  socialProfilesListed: boolean("social_profiles_listed").default(false),
  accessInvitesSent: boolean("access_invites_sent").default(false),
  loginCredentialsProvided: boolean("login_credentials_provided").default(false),
  brandAssetsProvided: boolean("brand_assets_provided").default(false),
  seasonalPreferencesConfirmed: boolean("seasonal_preferences_confirmed").default(false),
  
  // Authorization
  authorizationName: text("authorization_name"),
  authorizationDate: text("authorization_date"),
  authorizationSignature: text("authorization_signature"),
  
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at"),
});

export const insertClientOnboardingSchema = createInsertSchema(clientOnboarding).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClientOnboarding = z.infer<typeof insertClientOnboardingSchema>;
export type ClientOnboarding = typeof clientOnboarding.$inferSelect;

export const mediaUploads = pgTable("media_uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  uploadedBy: varchar("uploaded_by").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  sharepointPath: text("sharepoint_path").notNull(),
  sharepointUrl: text("sharepoint_url"),
  status: text("status").notNull().default("uploaded"),
  createdAt: text("created_at").notNull(),
});

export const insertMediaUploadSchema = createInsertSchema(mediaUploads).omit({
  id: true,
  createdAt: true,
});

export type InsertMediaUpload = z.infer<typeof insertMediaUploadSchema>;
export type MediaUpload = typeof mediaUploads.$inferSelect;

// Chat threads - can be general company chats or task-specific chats
export const chatThreads = pgTable("chat_threads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  name: text("name"),
  type: text("type").notNull().default("general"), // 'general', 'group', 'task'
  taskId: varchar("task_id"), // If type is 'task', this links to the task
  isCompanyWide: boolean("is_company_wide").notNull().default(false), // True for the main company group chat
  createdBy: varchar("created_by").notNull(),
  createdAt: text("created_at").notNull(),
  closedAt: text("closed_at"),
  autoCloseAt: text("auto_close_at"),
});

export const insertChatThreadSchema = createInsertSchema(chatThreads).omit({
  id: true,
  createdAt: true,
});

export type InsertChatThread = z.infer<typeof insertChatThreadSchema>;
export type ChatThread = typeof chatThreads.$inferSelect;

// Chat thread members
export const chatThreadMembers = pgTable("chat_thread_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull(),
  userId: varchar("user_id").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false), // Can add/remove members
  joinedAt: text("joined_at").notNull(),
  leftAt: text("left_at"),
});

export const insertChatThreadMemberSchema = createInsertSchema(chatThreadMembers).omit({
  id: true,
});

export type InsertChatThreadMember = z.infer<typeof insertChatThreadMemberSchema>;
export type ChatThreadMember = typeof chatThreadMembers.$inferSelect;

// Chat messages
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  content: text("content").notNull(),
  isEdited: boolean("is_edited").notNull().default(false),
  editedAt: text("edited_at"),
  createdAt: text("created_at").notNull(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
  isEdited: true,
  editedAt: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// Read receipts for messages
export const chatReadReceipts = pgTable("chat_read_receipts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull(),
  userId: varchar("user_id").notNull(),
  lastReadMessageId: varchar("last_read_message_id"),
  lastReadAt: text("last_read_at").notNull(),
});

export const insertChatReadReceiptSchema = createInsertSchema(chatReadReceipts).omit({
  id: true,
});

export type InsertChatReadReceipt = z.infer<typeof insertChatReadReceiptSchema>;
export type ChatReadReceipt = typeof chatReadReceipts.$inferSelect;

export const chatThreadTypes = ["general", "group", "task"] as const;
export type ChatThreadType = typeof chatThreadTypes[number];

// Campaign types - templates for campaign requests
export const campaignTypes = pgTable("campaign_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  includedDeliverableIds: text("included_deliverable_ids").array().notNull().default([]),
  deliverableQuantities: text("deliverable_quantities"),
  estimatedCredits: decimal("estimated_credits", { precision: 10, scale: 2 }).notNull().default("0"),
  meetingTypeQuantities: text("meeting_type_quantities"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const insertCampaignTypeSchema = createInsertSchema(campaignTypes).omit({
  id: true,
  createdAt: true,
});

export type InsertCampaignType = z.infer<typeof insertCampaignTypeSchema>;
export type CampaignType = typeof campaignTypes.$inferSelect;

// Campaign requests - client requests for campaigns
export const campaignRequestStatuses = ["pending", "approved", "in_progress", "completed", "cancelled"] as const;
export type CampaignRequestStatus = typeof campaignRequestStatuses[number];

export const campaignRequests = pgTable("campaign_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  campaignTypeId: varchar("campaign_type_id").notNull(),
  requestedBy: varchar("requested_by").notNull(),
  name: text("name"),
  dueDate: text("due_date").notNull(),
  notes: text("notes"),
  targetAudience: text("target_audience"),
  goals: text("goals"),
  preferredTone: text("preferred_tone"),
  keyMessages: text("key_messages"),
  referenceLinks: text("reference_links"),
  budgetNotes: text("budget_notes"),
  additionalDetails: text("additional_details"),
  estimatedCredits: decimal("estimated_credits", { precision: 10, scale: 2 }).notNull(),
  deliverableQuantities: text("deliverable_quantities"),
  creditOverride: decimal("credit_override", { precision: 10, scale: 2 }),
  isRush: boolean("is_rush").notNull().default(false),
  rushDisabled: boolean("rush_disabled").notNull().default(false),
  status: text("status").notNull().default("pending"),
  meetingScheduled: boolean("meeting_scheduled").notNull().default(false),
  meetingUrl: text("meeting_url"),
  adminNotes: text("admin_notes"),
  campaignMemberIds: text("campaign_member_ids").array().notNull().default([]),
  campaignMeetingTypeIds: text("campaign_meeting_type_ids").array().notNull().default([]),
  requestDeliverableIds: text("request_deliverable_ids").array(),
  requestDeliverableQuantities: text("request_deliverable_quantities"),
  requestMeetingQuantities: text("request_meeting_quantities"),
  createdAt: text("created_at").notNull(),
});

export const insertCampaignRequestSchema = createInsertSchema(campaignRequests).omit({
  id: true,
  createdAt: true,
  status: true,
  meetingScheduled: true,
  meetingUrl: true,
});

export type InsertCampaignRequest = z.infer<typeof insertCampaignRequestSchema>;
export type CampaignRequest = typeof campaignRequests.$inferSelect;

// Meeting types - templates for meeting requests with credit costs
export const meetingTypes = pgTable("meeting_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  creditCost: decimal("credit_cost", { precision: 10, scale: 2 }).notNull().default("1"),
  defaultDuration: integer("default_duration").notNull().default(30), // in minutes
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const insertMeetingTypeSchema = createInsertSchema(meetingTypes).omit({
  id: true,
  createdAt: true,
});

export type InsertMeetingType = z.infer<typeof insertMeetingTypeSchema>;
export type MeetingType = typeof meetingTypes.$inferSelect;

// Meeting requests - requests for meetings with approval workflow
export const meetingRequestStatuses = ["pending", "approved", "completed", "cancelled", "rejected"] as const;
export type MeetingRequestStatus = typeof meetingRequestStatuses[number];

export const meetingRequests = pgTable("meeting_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  meetingTypeId: varchar("meeting_type_id").notNull(),
  requestedBy: varchar("requested_by").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  proposedDate: text("proposed_date").notNull(), // ISO date string
  proposedTime: text("proposed_time").notNull(), // HH:MM format
  duration: integer("duration").notNull().default(30), // in minutes
  attendeeIds: text("attendee_ids").array().notNull().default([]), // user IDs of attendees
  externalAttendeeEmails: text("external_attendee_emails").array().notNull().default([]), // emails of people not in the system
  creditCost: decimal("credit_cost", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  teamsLink: text("teams_link"), // Admin adds this when approving
  outlookMeetingLink: text("outlook_meeting_link"), // Admin adds the Outlook calendar invite link
  adminNotes: text("admin_notes"),
  notes: text("notes"),
  rejectionReason: text("rejection_reason"),
  rejectedAt: text("rejected_at"),
  completedAt: text("completed_at"),
  creditsDeducted: boolean("credits_deducted").notNull().default(false),
  approvedBy: varchar("approved_by"),
  approvedAt: text("approved_at"),
  createdAt: text("created_at").notNull(),
});

export const insertMeetingRequestSchema = createInsertSchema(meetingRequests).omit({
  id: true,
  createdAt: true,
  status: true,
  teamsLink: true,
  outlookMeetingLink: true,
  adminNotes: true,
  rejectionReason: true,
  rejectedAt: true,
  completedAt: true,
  creditsDeducted: true,
  approvedBy: true,
  approvedAt: true,
});

export type InsertMeetingRequest = z.infer<typeof insertMeetingRequestSchema>;
export type MeetingRequest = typeof meetingRequests.$inferSelect;

// Training modules - Admin-created training content
export const trainingModules = pgTable("training_modules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  contentType: text("content_type").notNull().default("video"), // video, document, link, quiz
  contentUrl: text("content_url"), // YouTube embed, document URL, or external link
  thumbnailUrl: text("thumbnail_url"),
  duration: integer("duration"), // estimated duration in minutes
  sortOrder: integer("sort_order").notNull().default(0),
  isRequired: boolean("is_required").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").notNull(),
  createdAt: text("created_at").notNull(),
  // SharePoint document fields (for contentType: 'document')
  documentDriveId: varchar("document_drive_id"),
  documentItemId: varchar("document_item_id"),
  documentFileName: text("document_file_name"),
  documentFileSize: integer("document_file_size"),
  documentWebUrl: text("document_web_url"),
});

export const insertTrainingModuleSchema = createInsertSchema(trainingModules).omit({
  id: true,
  createdAt: true,
});

export type InsertTrainingModule = z.infer<typeof insertTrainingModuleSchema>;
export type TrainingModule = typeof trainingModules.$inferSelect;

// Training assignments - Assign training to companies, groups, or individuals
export const trainingAssignmentTypes = ["company", "group", "individual"] as const;
export type TrainingAssignmentType = typeof trainingAssignmentTypes[number];

export const trainingAssignments = pgTable("training_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainingModuleId: varchar("training_module_id").notNull(),
  assignmentType: text("assignment_type").notNull().default("company"), // company, group, individual
  companyId: varchar("company_id"), // required if type is company
  userId: varchar("user_id"), // required if type is individual
  groupName: text("group_name"), // optional name for group assignments
  dueDate: text("due_date"), // optional due date
  isRequired: boolean("is_required").notNull().default(true),
  reminderSent: boolean("reminder_sent").notNull().default(false),
  reminderDate: text("reminder_date"),
  assignedBy: varchar("assigned_by").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertTrainingAssignmentSchema = createInsertSchema(trainingAssignments).omit({
  id: true,
  createdAt: true,
  reminderSent: true,
});

export type InsertTrainingAssignment = z.infer<typeof insertTrainingAssignmentSchema>;
export type TrainingAssignment = typeof trainingAssignments.$inferSelect;

// Training completions - Track who has completed what training
export const trainingCompletions = pgTable("training_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainingModuleId: varchar("training_module_id").notNull(),
  userId: varchar("user_id").notNull(),
  assignmentId: varchar("assignment_id"), // optional link to specific assignment
  completedAt: text("completed_at").notNull(),
  watchTime: integer("watch_time"), // actual watch time in seconds (for videos)
  score: integer("score"), // score percentage (for quizzes)
});

export const insertTrainingCompletionSchema = createInsertSchema(trainingCompletions).omit({
  id: true,
});

export type InsertTrainingCompletion = z.infer<typeof insertTrainingCompletionSchema>;
export type TrainingCompletion = typeof trainingCompletions.$inferSelect;

// Credit Store Settings - Global settings for credit pricing
export const creditStoreSettings = pgTable("credit_store_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  basePricePerCredit: decimal("base_price_per_credit", { precision: 10, scale: 2 }).notNull().default("125.00"),
  isStoreEnabled: boolean("is_store_enabled").notNull().default(true),
  updatedAt: text("updated_at").notNull(),
  updatedBy: varchar("updated_by"),
});

export const insertCreditStoreSettingsSchema = createInsertSchema(creditStoreSettings).omit({
  id: true,
});

export type InsertCreditStoreSettings = z.infer<typeof insertCreditStoreSettingsSchema>;
export type CreditStoreSettings = typeof creditStoreSettings.$inferSelect;

// Credit Packages - Bundles with optional discounts
export const creditPackages = pgTable("credit_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  creditAmount: integer("credit_amount").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
  createdBy: varchar("created_by"),
});

export const insertCreditPackageSchema = createInsertSchema(creditPackages).omit({
  id: true,
  createdAt: true,
});

export type InsertCreditPackage = z.infer<typeof insertCreditPackageSchema>;
export type CreditPackage = typeof creditPackages.$inferSelect;

// Credit Sales - Time-limited promotions
export const creditSales = pgTable("credit_sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }).notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  appliesTo: text("applies_to").notNull().default("all"), // "all" or specific package IDs (comma-separated)
  createdAt: text("created_at").notNull(),
  createdBy: varchar("created_by"),
});

export const insertCreditSaleSchema = createInsertSchema(creditSales).omit({
  id: true,
  createdAt: true,
});

export type InsertCreditSale = z.infer<typeof insertCreditSaleSchema>;
export type CreditSale = typeof creditSales.$inferSelect;

// Credit Purchases - History of credit purchases
export const creditPurchases = pgTable("credit_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  userId: varchar("user_id").notNull(),
  packageId: varchar("package_id"),
  creditAmount: integer("credit_amount").notNull(),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).notNull(),
  discountApplied: decimal("discount_applied", { precision: 10, scale: 2 }),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeSessionId: text("stripe_session_id"),
  status: text("status").notNull().default("pending"), // "pending", "completed", "failed", "refunded"
  createdAt: text("created_at").notNull(),
  completedAt: text("completed_at"),
});

export const insertCreditPurchaseSchema = createInsertSchema(creditPurchases).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertCreditPurchase = z.infer<typeof insertCreditPurchaseSchema>;
export type CreditPurchase = typeof creditPurchases.$inferSelect;

// User Tags - Preset and custom tags for categorizing users
export const userTags = pgTable("user_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"), // hex color for visual display
  isPreset: boolean("is_preset").notNull().default(false), // true for admin-created presets
  createdAt: text("created_at").notNull(),
  createdBy: varchar("created_by"),
});

export const insertUserTagSchema = createInsertSchema(userTags).omit({
  id: true,
  createdAt: true,
});

export type InsertUserTag = z.infer<typeof insertUserTagSchema>;
export type UserTag = typeof userTags.$inferSelect;

// User Tag Assignments - Links users to tags
export const userTagAssignments = pgTable("user_tag_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  tagId: varchar("tag_id").notNull(),
  assignedBy: varchar("assigned_by"),
  createdAt: text("created_at").notNull(),
});

export const insertUserTagAssignmentSchema = createInsertSchema(userTagAssignments).omit({
  id: true,
  createdAt: true,
});

export type InsertUserTagAssignment = z.infer<typeof insertUserTagAssignmentSchema>;
export type UserTagAssignment = typeof userTagAssignments.$inferSelect;

// Notifications - for mentions, task assignments, etc.
export const notificationTypes = ["mention", "task_assigned", "task_due_soon", "task_completed", "meeting_scheduled", "training_assigned"] as const;
export type NotificationType = typeof notificationTypes[number];

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // Who receives the notification
  type: text("type").notNull(), // NotificationType
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"), // URL to navigate to when clicked
  isRead: boolean("is_read").notNull().default(false),
  // Related entity IDs for context
  relatedMessageId: varchar("related_message_id"),
  relatedTaskId: varchar("related_task_id"),
  relatedThreadId: varchar("related_thread_id"),
  createdBy: varchar("created_by"), // Who triggered the notification
  createdAt: text("created_at").notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Chat mentions - tracks @mentions in chat messages
export const chatMentions = pgTable("chat_mentions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull(),
  threadId: varchar("thread_id").notNull(),
  mentionedUserId: varchar("mentioned_user_id").notNull(), // User who was @mentioned
  mentionedByUserId: varchar("mentioned_by_user_id").notNull(), // User who made the mention
  createdAt: text("created_at").notNull(),
});

export const insertChatMentionSchema = createInsertSchema(chatMentions).omit({
  id: true,
  createdAt: true,
});

export type InsertChatMention = z.infer<typeof insertChatMentionSchema>;
export type ChatMention = typeof chatMentions.$inferSelect;

// Government Documents - Documents that need signatures for government clients
export const governmentDocuments = pgTable("government_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  documentType: text("document_type").notNull().default("contract"), // contract, agreement, authorization, compliance
  status: text("status").notNull().default("pending"), // pending, signed, expired
  // Original document (PDF, etc.) - stored locally
  originalFileUrl: text("original_file_url"),
  originalFileName: text("original_file_name"),
  originalFileMimeType: text("original_file_mime_type"),
  // Signed document with signature embedded
  signedFileUrl: text("signed_file_url"),
  signedFileName: text("signed_file_name"),
  // SharePoint backup URL (permanent storage)
  sharepointUrl: text("sharepoint_url"),
  sharepointFolderId: text("sharepoint_folder_id"),
  // Assignment - who needs to sign
  assignedToUserId: varchar("assigned_to_user_id"), // User ID of the person assigned to sign
  assignedToName: text("assigned_to_name"), // Name of the person assigned
  assignedToEmail: text("assigned_to_email"), // Email of the person assigned
  notificationSentAt: text("notification_sent_at"), // When notification was sent
  reminderSentAt: text("reminder_sent_at"), // When reminder was sent
  // Signature data
  signatureData: text("signature_data"), // Base64 signature image
  signatureType: text("signature_type"), // 'drawn' or 'typed'
  signedByUserId: varchar("signed_by_user_id"),
  signedByName: text("signed_by_name"),
  signedByEmail: text("signed_by_email"),
  signedAt: text("signed_at"),
  signerIp: text("signer_ip"),
  signerAgent: text("signer_agent"),
  // Document lifecycle
  dueDate: text("due_date"), // When signature is due
  expiresAt: text("expires_at"), // When local file will be deleted (90 days after signing)
  localFileDeletedAt: text("local_file_deleted_at"), // When local file was deleted
  // Metadata
  createdByUserId: varchar("created_by_user_id"),
  createdByName: text("created_by_name"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at"),
});

export const insertGovernmentDocumentSchema = createInsertSchema(governmentDocuments).omit({
  id: true,
  createdAt: true,
  status: true,
  notificationSentAt: true,
  reminderSentAt: true,
  signatureData: true,
  signatureType: true,
  signedByUserId: true,
  signedByName: true,
  signedByEmail: true,
  signedAt: true,
  signerIp: true,
  signerAgent: true,
  signedFileUrl: true,
  signedFileName: true,
  sharepointUrl: true,
  sharepointFolderId: true,
  expiresAt: true,
  localFileDeletedAt: true,
  updatedAt: true,
});

export type InsertGovernmentDocument = z.infer<typeof insertGovernmentDocumentSchema>;
export type GovernmentDocument = typeof governmentDocuments.$inferSelect;

// ============= Document Signing System (DocuSign-style) =============

// Signing Packets - The document signing request
export const signingPackets = pgTable("signing_packets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  documentId: varchar("document_id"), // Optional: reference to governmentDocuments
  title: text("title").notNull(),
  message: text("message"), // Optional message to recipients
  status: text("status").notNull().default("draft"), // draft, pending, completed, cancelled, expired
  // Original document (PDF)
  originalFileUrl: text("original_file_url"),
  originalFileName: text("original_file_name"),
  originalFileMimeType: text("original_file_mime_type"),
  // Created by
  createdById: varchar("created_by_id").notNull(),
  createdByName: text("created_by_name").notNull(),
  dueDate: text("due_date"),
  completedAt: text("completed_at"),
  signedDocumentUrl: text("signed_document_url"), // Final signed document
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const insertSigningPacketSchema = createInsertSchema(signingPackets).omit({ 
  id: true, 
  createdAt: true,
  status: true,
  completedAt: true,
  signedDocumentUrl: true,
});
export type InsertSigningPacket = z.infer<typeof insertSigningPacketSchema>;
export type SigningPacket = typeof signingPackets.$inferSelect;

// Signing Participants - Who needs to sign
export const signingParticipants = pgTable("signing_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  packetId: varchar("packet_id").notNull(), // Reference to signingPackets
  userId: varchar("user_id"), // Can be null for external signers
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("signer"), // signer, viewer, approver
  signingOrder: integer("signing_order").notNull().default(1), // Order in which they sign
  status: text("status").notNull().default("pending"), // pending, viewed, signed, declined
  signatureData: text("signature_data"), // Base64 signature image
  signatureType: text("signature_type"), // 'drawn' or 'typed'
  signedAt: text("signed_at"),
  signerIp: text("signer_ip"),
  signerAgent: text("signer_agent"),
  accessToken: varchar("access_token").default(sql`gen_random_uuid()`), // Unique token for signing link (hashed)
  viewedAt: text("viewed_at"),
  declinedReason: text("declined_reason"),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const insertSigningParticipantSchema = createInsertSchema(signingParticipants).omit({ 
  id: true, 
  createdAt: true,
  status: true,
  signatureData: true,
  signatureType: true,
  signedAt: true,
  signerIp: true,
  signerAgent: true,
  viewedAt: true,
  declinedReason: true,
});
export type InsertSigningParticipant = z.infer<typeof insertSigningParticipantSchema>;
export type SigningParticipant = typeof signingParticipants.$inferSelect;

// Signing Events - Audit trail
export const signingEvents = pgTable("signing_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  packetId: varchar("packet_id").notNull(), // Reference to signingPackets
  participantId: varchar("participant_id"), // Reference to signingParticipants
  eventType: text("event_type").notNull(), // created, sent, viewed, signed, declined, completed, cancelled, reminder_sent
  actorName: text("actor_name"),
  actorEmail: text("actor_email"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: text("metadata"), // JSON string for additional data
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const insertSigningEventSchema = createInsertSchema(signingEvents).omit({ id: true, createdAt: true });
export type InsertSigningEvent = z.infer<typeof insertSigningEventSchema>;
export type SigningEvent = typeof signingEvents.$inferSelect;

// Signing Fields - Placed signature/date/initials fields on documents
export const signingFields = pgTable("signing_fields", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  packetId: varchar("packet_id").notNull(), // Reference to signingPackets
  participantId: varchar("participant_id"), // Which signer this field is for
  fieldType: text("field_type").notNull(), // 'signature', 'initials', 'date', 'text', 'checkbox'
  pageNumber: integer("page_number").notNull().default(1),
  xPosition: real("x_position").notNull(), // Percentage from left (0-100)
  yPosition: real("y_position").notNull(), // Percentage from top (0-100)
  width: real("width").notNull(), // Percentage of page width
  height: real("height").notNull(), // Percentage of page height
  isRequired: boolean("is_required").default(true),
  label: text("label"), // Optional label for text fields
  value: text("value"), // Filled value after signing
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const insertSigningFieldSchema = createInsertSchema(signingFields).omit({ id: true, createdAt: true, value: true });
export type InsertSigningField = z.infer<typeof insertSigningFieldSchema>;
export type SigningField = typeof signingFields.$inferSelect;

// Media Profiles - Reusable form templates for media uploads
export const mediaProfiles = pgTable("media_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`now()`),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
});

export const insertMediaProfileSchema = createInsertSchema(mediaProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMediaProfile = z.infer<typeof insertMediaProfileSchema>;
export type MediaProfile = typeof mediaProfiles.$inferSelect;

// Media Profile Fields - Form fields for each profile
export const mediaProfileFields = pgTable("media_profile_fields", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull(),
  fieldType: text("field_type").notNull(), // 'text', 'textarea', 'select', 'checkbox', 'date'
  label: text("label").notNull(),
  placeholder: text("placeholder"),
  helpText: text("help_text"),
  isRequired: boolean("is_required").notNull().default(false),
  options: text("options"), // JSON array for select options
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const insertMediaProfileFieldSchema = createInsertSchema(mediaProfileFields).omit({ id: true, createdAt: true });
export type InsertMediaProfileField = z.infer<typeof insertMediaProfileFieldSchema>;
export type MediaProfileField = typeof mediaProfileFields.$inferSelect;

// Company Media Profiles - Links profiles to companies (many-to-many)
export const companyMediaProfiles = pgTable("company_media_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  profileId: varchar("profile_id").notNull(),
  assignedBy: varchar("assigned_by").notNull(),
  assignedAt: text("assigned_at").notNull().default(sql`now()`),
});

export const insertCompanyMediaProfileSchema = createInsertSchema(companyMediaProfiles).omit({ id: true, assignedAt: true });
export type InsertCompanyMediaProfile = z.infer<typeof insertCompanyMediaProfileSchema>;
export type CompanyMediaProfile = typeof companyMediaProfiles.$inferSelect;

// Media Submissions - Completed form submissions with uploaded files
export const mediaSubmissions = pgTable("media_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  profileId: varchar("profile_id").notNull(),
  submittedBy: varchar("submitted_by").notNull(),
  title: text("title").notNull(), // The folder name in SharePoint
  formData: text("form_data").notNull(), // JSON object of field values
  sharepointFolderPath: text("sharepoint_folder_path"),
  sharepointFolderUrl: text("sharepoint_folder_url"),
  pdfDriveId: text("pdf_drive_id"),
  pdfItemId: text("pdf_item_id"),
  pdfUrl: text("pdf_url"),
  status: text("status").notNull().default("pending"), // 'pending', 'uploaded', 'failed'
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const insertMediaSubmissionSchema = createInsertSchema(mediaSubmissions).omit({ id: true, createdAt: true }).extend({
  status: z.string().optional(),
  sharepointFolderPath: z.string().optional(),
  sharepointFolderUrl: z.string().optional(),
});
export type InsertMediaSubmission = z.infer<typeof insertMediaSubmissionSchema>;
export type MediaSubmission = typeof mediaSubmissions.$inferSelect;

// Media Submission Files - Individual files in a submission
export const mediaSubmissionFiles = pgTable("media_submission_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  tempFilePath: text("temp_file_path"),
  sharepointPath: text("sharepoint_path"),
  sharepointDriveId: text("sharepoint_drive_id"),
  sharepointItemId: text("sharepoint_item_id"),
  sharepointUrl: text("sharepoint_url"),
  status: text("status").notNull().default("pending"), // 'pending', 'uploading', 'uploaded', 'failed'
  retryCount: integer("retry_count").notNull().default(0),
  lastRetryAt: text("last_retry_at"),
  lastError: text("last_error"),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const insertMediaSubmissionFileSchema = createInsertSchema(mediaSubmissionFiles).omit({ id: true, createdAt: true }).extend({
  status: z.string().optional(),
  sharepointPath: z.string().optional(),
  sharepointUrl: z.string().optional(),
});
export type InsertMediaSubmissionFile = z.infer<typeof insertMediaSubmissionFileSchema>;
export type MediaSubmissionFile = typeof mediaSubmissionFiles.$inferSelect;

// Custom Company Roles
export const customRoles = pgTable("custom_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  allowedViews: text("allowed_views").array().notNull().default(sql`'{}'::text[]`),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const insertCustomRoleSchema = createInsertSchema(customRoles).omit({ id: true, createdAt: true });
export type InsertCustomRole = z.infer<typeof insertCustomRoleSchema>;
export type CustomRole = typeof customRoles.$inferSelect;

// Notification Preferences
export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  taskUpdates: boolean("task_updates").notNull().default(true),
  chatMentions: boolean("chat_mentions").notNull().default(true),
  campaignUpdates: boolean("campaign_updates").notNull().default(true),
  creditAlerts: boolean("credit_alerts").notNull().default(true),
  trainingReminders: boolean("training_reminders").notNull().default(true),
  meetingReminders: boolean("meeting_reminders").notNull().default(true),
  emailDigest: boolean("email_digest").notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences).omit({ id: true, createdAt: true });
export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;

export const cadences = pgTable("cadences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  title: text("title").notNull(),
  deliverableTypeId: varchar("deliverable_type_id"),
  frequency: text("frequency").notNull(),
  scheduledDays: text("scheduled_days").array(),
  monthDays: integer("month_days").array(),
  assignedTo: varchar("assigned_to"),
  assignedToName: text("assigned_to_name"),
  creditCost: decimal("credit_cost", { precision: 10, scale: 2 }).notNull().default("1"),
  noCredit: boolean("no_credit").notNull().default(false),
  taskOwnership: text("task_ownership").notNull().default("agency"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").notNull(),
  createdAt: text("created_at").notNull(),
  cancelledAt: text("cancelled_at"),
  lastGeneratedAt: text("last_generated_at"),
});

export const insertCadenceSchema = createInsertSchema(cadences).omit({
  id: true,
  createdAt: true,
  cancelledAt: true,
  lastGeneratedAt: true,
});
export type InsertCadence = z.infer<typeof insertCadenceSchema>;
export type Cadence = typeof cadences.$inferSelect;

export const monthlyReportNotes = pgTable("monthly_report_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  notes: text("notes").notNull(),
  createdBy: varchar("created_by").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const insertMonthlyReportNoteSchema = createInsertSchema(monthlyReportNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMonthlyReportNote = z.infer<typeof insertMonthlyReportNoteSchema>;
export type MonthlyReportNote = typeof monthlyReportNotes.$inferSelect;
