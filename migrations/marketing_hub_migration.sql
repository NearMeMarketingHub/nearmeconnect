-- =============================================================================
-- Near Me Connect — Marketing Hub Client Portal
-- Full Schema Migration
-- Generated: 2026-05-23 from live database (PostgreSQL 16.10)
-- 
-- Usage:
--   psql $DATABASE_URL -f migrations/marketing_hub_migration.sql
--
-- This migration is idempotent: all CREATE TABLE / INDEX statements use
-- IF NOT EXISTS so it is safe to run on a fresh database or re-run on
-- an existing one. ALTER TABLE ... ADD CONSTRAINT statements will still
-- error if the constraint already exists — comment those out if needed.
--
-- Tables covered (66 total):
--   admin_invitations, admin_users, ai_prompt_templates, brand_profiles,
--   cadences, campaign_requests, campaign_types, chat_mentions,
--   chat_messages, chat_read_receipts, chat_thread_members, chat_threads,
--   client_onboarding, companies, company_credentials, company_invitations,
--   company_knowledge_items, company_media_profiles, company_members,
--   company_workflows, content_assets, content_calendar_activity,
--   content_calendar_items, content_pillars, credit_packages,
--   credit_purchases, credit_sales, credit_store_settings,
--   credit_transactions, custom_roles, deliverable_types,
--   government_documents, hubspot_connections, hubspot_onboarding_checklist,
--   hubspot_sync_log, hubspot_workflow_templates, media_profile_fields,
--   media_profiles, media_submission_files, media_submissions, media_uploads,
--   meeting_requests, meeting_types, monthly_report_notes,
--   monthly_report_tracker, notification_preferences, notifications,
--   password_reset_tokens, report_presets, sessions, signing_events,
--   signing_fields, signing_packets, signing_participants,
--   subscription_tier_definitions, task_assignees, task_attachments,
--   task_categories, task_checklist_items, task_comments, task_links,
--   tasks, training_assignments, training_completions, training_modules,
--   user_tag_assignments, user_tags, users
-- =============================================================================





--
-- Name: admin_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.admin_invitations (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    token text NOT NULL,
    invited_by character varying NOT NULL,
    expires_at text NOT NULL,
    used_at text,
    used_by character varying,
    created_at text NOT NULL
);


--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.admin_users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    created_at text NOT NULL
);


--
-- Name: ai_prompt_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.ai_prompt_templates (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    content_goal text NOT NULL,
    platform text,
    name text NOT NULL,
    image_prompt_template text,
    caption_prompt_template text,
    post_text_template text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_by character varying NOT NULL,
    created_at text NOT NULL,
    updated_at text
);


--
-- Name: brand_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.brand_profiles (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying NOT NULL,
    primary_color text,
    secondary_color text,
    accent_color text,
    primary_font text,
    secondary_font text,
    tagline text,
    brand_voice_summary text,
    target_audience_description text,
    geographic_focus text,
    unique_value_proposition text,
    do_not_use_phrases text,
    logo_primary_url text,
    logo_secondary_url text,
    logo_white_url text,
    brand_guidelines_url text,
    competitor_notes text,
    created_at text NOT NULL,
    updated_at text
);


--
-- Name: cadences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.cadences (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying NOT NULL,
    title text NOT NULL,
    deliverable_type_id character varying,
    frequency text NOT NULL,
    assigned_to character varying,
    assigned_to_name text,
    credit_cost numeric(10,2) DEFAULT '1'::numeric NOT NULL,
    no_credit boolean DEFAULT false NOT NULL,
    task_ownership text DEFAULT 'agency'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at text NOT NULL,
    cancelled_at text,
    last_generated_at text,
    scheduled_days text[],
    month_days integer[]
);


--
-- Name: campaign_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.campaign_requests (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying NOT NULL,
    campaign_type_id character varying NOT NULL,
    requested_by character varying NOT NULL,
    due_date text NOT NULL,
    notes text,
    estimated_credits numeric(10,2) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    meeting_scheduled boolean DEFAULT false NOT NULL,
    meeting_url text,
    created_at text NOT NULL,
    target_audience text,
    goals text,
    preferred_tone text,
    key_messages text,
    reference_links text,
    budget_notes text,
    additional_details text,
    admin_notes text,
    deliverable_quantities text,
    credit_override numeric(10,2),
    is_rush boolean DEFAULT false NOT NULL,
    campaign_member_ids text[] DEFAULT '{}'::text[] NOT NULL,
    campaign_meeting_type_ids text[] DEFAULT '{}'::text[] NOT NULL,
    request_deliverable_ids text[],
    request_deliverable_quantities text,
    request_meeting_quantities text,
    rush_disabled boolean DEFAULT false NOT NULL,
    name text
);


--
-- Name: campaign_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.campaign_types (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    included_deliverable_ids text[] DEFAULT '{}'::text[] NOT NULL,
    estimated_credits numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at text NOT NULL,
    deliverable_quantities text,
    meeting_type_quantities text
);


--
-- Name: chat_mentions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.chat_mentions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    message_id character varying NOT NULL,
    thread_id character varying NOT NULL,
    mentioned_user_id character varying NOT NULL,
    mentioned_by_user_id character varying NOT NULL,
    created_at text NOT NULL
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    thread_id character varying NOT NULL,
    sender_id character varying NOT NULL,
    content text NOT NULL,
    is_edited boolean DEFAULT false NOT NULL,
    edited_at text,
    created_at text NOT NULL
);


--
-- Name: chat_read_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.chat_read_receipts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    thread_id character varying NOT NULL,
    user_id character varying NOT NULL,
    last_read_message_id character varying,
    last_read_at text NOT NULL
);


--
-- Name: chat_thread_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.chat_thread_members (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    thread_id character varying NOT NULL,
    user_id character varying NOT NULL,
    is_admin boolean DEFAULT false NOT NULL,
    joined_at text NOT NULL,
    left_at text
);


--
-- Name: chat_threads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.chat_threads (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying NOT NULL,
    name text,
    type text DEFAULT 'general'::text NOT NULL,
    task_id character varying,
    is_company_wide boolean DEFAULT false NOT NULL,
    created_by character varying NOT NULL,
    created_at text NOT NULL,
    closed_at text,
    auto_close_at text
);


--
-- Name: client_onboarding; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.client_onboarding (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying NOT NULL,
    website text,
    primary_contact_name text,
    primary_contact_email text,
    primary_contact_phone text,
    special_notes text,
    social_platforms text,
    login_credentials text,
    youtube_invite_date text,
    meta_business_invite_date text,
    google_business_invite_date text,
    youtube_feature_eligibility_date text,
    needs_gbp_recovery boolean DEFAULT false,
    gbp_business_name text,
    gbp_business_address text,
    gbp_contact_email text,
    gbp_contact_phone text,
    gbp_additional_context text,
    brand_asset_links text,
    seasonal_preferences text,
    holiday_preferences text,
    other_holidays text,
    seasonal_notes text,
    social_profiles_listed boolean DEFAULT false,
    access_invites_sent boolean DEFAULT false,
    login_credentials_provided boolean DEFAULT false,
    brand_assets_provided boolean DEFAULT false,
    seasonal_preferences_confirmed boolean DEFAULT false,
    authorization_name text,
    authorization_date text,
    authorization_signature text,
    created_at text NOT NULL,
    updated_at text,
    brand_asset_files text,
    current_step integer DEFAULT 1,
    youtube_invite_na boolean DEFAULT false,
    youtube_feature_na boolean DEFAULT false,
    meta_business_na boolean DEFAULT false,
    google_business_na boolean DEFAULT false,
    is_completed boolean DEFAULT false NOT NULL,
    completed_at text,
    hubspot_onboarding_started boolean DEFAULT false,
    hubspot_onboarding_completed_at text
);


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.companies (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    industry text,
    subscription_tier text DEFAULT 'essentials'::text NOT NULL,
    credits real DEFAULT 0 NOT NULL,
    monthly_credits real DEFAULT 20 NOT NULL,
    renewal_date text,
    onboarding_complete boolean DEFAULT false NOT NULL,
    created_at text NOT NULL,
    logo_url text,
    billing_start_day integer DEFAULT 1 NOT NULL,
    credits_last_reset text,
    is_paused boolean DEFAULT false NOT NULL,
    paused_at text,
    hubspot_company_id text,
    client_type text DEFAULT 'marketing'::text NOT NULL,
    last_onboarding_reminder_sent text,
    last_projected_usage_warning_sent text,
    bonus_credits real DEFAULT 0 NOT NULL,
    hubspot_portal_id text
);


--
-- Name: company_credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.company_credentials (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying NOT NULL,
    label text NOT NULL,
    username text,
    password text,
    url text,
    notes text,
    category text,
    created_at text NOT NULL,
    updated_at text,
    last_verified_at text
);


--
-- Name: company_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.company_invitations (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying NOT NULL,
    email text,
    token text NOT NULL,
    role text DEFAULT 'team_member'::text NOT NULL,
    expires_at text NOT NULL,
    used_at text,
    used_by character varying,
    created_by character varying NOT NULL,
    created_at text NOT NULL
);


--
-- Name: company_knowledge_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.company_knowledge_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying NOT NULL,
    section text NOT NULL,
    title text NOT NULL,
    content text,
    url text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at text NOT NULL,
    updated_at text
);


--
-- Name: company_media_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.company_media_profiles (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying NOT NULL,
    profile_id character varying NOT NULL,
    assigned_by character varying NOT NULL,
    assigned_at text DEFAULT now() NOT NULL
);


--
-- Name: company_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.company_members (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying NOT NULL,
    user_id character varying NOT NULL,
    role text DEFAULT 'team_member'::text NOT NULL,
    created_at text NOT NULL,
    custom_role_id character varying
);


--
-- Name: company_workflows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.company_workflows (
    id character varying DEFAULT (gen_random_uuid())::text NOT NULL,
    company_id character varying NOT NULL,
    template_id character varying NOT NULL,
    status text DEFAULT 'planned'::text NOT NULL,
    hubspot_workflow_id text,
    notes text,
    assigned_by character varying,
    created_at text DEFAULT (now())::text NOT NULL,
    updated_at text
);


--
-- Name: content_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.content_assets (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying NOT NULL,
    media_upload_id character varying,
    pillar_id character varying,
    calendar_item_id character varying,
    file_name text NOT NULL,
    file_url text NOT NULL,
    file_type text NOT NULL,
    file_size integer,
    tags text,
    alt_text text,
    asset_caption text,
    month_label text,
    notes text,
    uploaded_by character varying NOT NULL,
    created_at text NOT NULL
);


--
-- Name: content_calendar_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.content_calendar_activity (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    calendar_item_id character varying NOT NULL,
    user_id character varying,
    action text NOT NULL,
    from_value text,
    to_value text,
    created_at text NOT NULL
);


--
-- Name: content_calendar_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.content_calendar_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying NOT NULL,
    pillar_id character varying,
    task_id character varying,
    assigned_to character varying,
    assigned_to_name text,
    platform text DEFAULT 'other'::text NOT NULL,
    content_type text DEFAULT 'post'::text NOT NULL,
    title text NOT NULL,
    body_copy text,
    hashtags text,
    call_to_action text,
    cta_url text,
    scheduled_date text,
    scheduled_time text,
    status text DEFAULT 'draft'::text NOT NULL,
    media_urls text,
    ai_prompt_used text,
    notes text,
    internal_notes text,
    gbp_post_type text,
    gbp_event_title text,
    gbp_event_start text,
    gbp_event_end text,
    gbp_offer_title text,
    gbp_offer_start text,
    gbp_offer_end text,
    gbp_offer_coupon text,
    gbp_offer_terms text,
    gbp_offer_redeem_url text,
    gbp_product_name text,
    gbp_product_price text,
    hubspot_post_id text,
    hubspot_campaign_id text,
    created_by character varying NOT NULL,
    approved_by character varying,
    approved_at text,
    published_at text,
    created_at text NOT NULL,
    updated_at text
);


--
-- Name: content_pillars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.content_pillars (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying NOT NULL,
    name text NOT NULL,
    description text,
    example_topics text,
    tone_notes text,
    color text DEFAULT '#6366f1'::text,
    icon text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at text NOT NULL,
    updated_at text
);


--
-- Name: credit_packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.credit_packages (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    credit_amount integer NOT NULL,
    price numeric(10,2) NOT NULL,
    discount_percentage numeric(5,2),
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at text NOT NULL,
    created_by character varying
);


--
-- Name: credit_purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.credit_purchases (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying NOT NULL,
    user_id character varying NOT NULL,
    package_id character varying,
    credit_amount integer NOT NULL,
    amount_paid numeric(10,2) NOT NULL,
    discount_applied numeric(10,2),
    stripe_payment_intent_id text,
    stripe_session_id text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at text NOT NULL,
    completed_at text
);


--
-- Name: credit_sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.credit_sales (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    discount_percentage numeric(5,2) NOT NULL,
    start_date text NOT NULL,
    end_date text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    applies_to text DEFAULT 'all'::text NOT NULL,
    created_at text NOT NULL,
    created_by character varying
);


--
-- Name: credit_store_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.credit_store_settings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    base_price_per_credit numeric(10,2) DEFAULT 125.00 NOT NULL,
    is_store_enabled boolean DEFAULT true NOT NULL,
    updated_at text NOT NULL,
    updated_by character varying
);


--
-- Name: credit_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying NOT NULL,
    task_id character varying,
    amount numeric(10,2) NOT NULL,
    type text NOT NULL,
    description text NOT NULL,
    created_at text NOT NULL,
    balance_after numeric(10,2) NOT NULL
);


--
-- Name: custom_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.custom_roles (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    allowed_views text[] DEFAULT '{}'::text[] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at text DEFAULT now() NOT NULL
);


--
-- Name: deliverable_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.deliverable_types (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    credits numeric(10,2) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at text NOT NULL
);


--
-- Name: government_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.government_documents (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying NOT NULL,
    title text NOT NULL,
    description text,
    document_type text DEFAULT 'contract'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    original_file_url text,
    original_file_name text,
    original_file_mime_type text,
    signed_file_url text,
    signed_file_name text,
    sharepoint_url text,
    sharepoint_folder_id text,
    signature_data text,
    signature_type text,
    signed_by_user_id character varying,
    signed_by_name text,
    signed_by_email text,
    signed_at text,
    signer_ip text,
    signer_agent text,
    due_date text,
    expires_at text,
    local_file_deleted_at text,
    created_by_user_id character varying,
    created_by_name text,
    created_at text NOT NULL,
    updated_at text,
    assigned_to_user_id character varying,
    assigned_to_name text,
    assigned_to_email text,
    notification_sent_at text,
    reminder_sent_at text
);


--
-- Name: hubspot_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.hubspot_connections (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying NOT NULL,
    portal_id text,
    access_token text,
    refresh_token text,
    token_expires_at text,
    hub_domain text,
    hubspot_company_id text,
    scopes_granted text,
    connected_by character varying NOT NULL,
    connected_at text NOT NULL,
    last_synced_at text,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: hubspot_onboarding_checklist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.hubspot_onboarding_checklist (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying NOT NULL,
    section text NOT NULL,
    item_key text NOT NULL,
    label text NOT NULL,
    description text,
    is_completed boolean DEFAULT false NOT NULL,
    completed_by character varying,
    completed_by_name text,
    completed_at text,
    notes text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at text NOT NULL
);


--
-- Name: hubspot_sync_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.hubspot_sync_log (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying NOT NULL,
    action text NOT NULL,
    status text DEFAULT 'success'::text NOT NULL,
    details text,
    created_at text NOT NULL
);


--
-- Name: hubspot_workflow_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.hubspot_workflow_templates (
    id character varying DEFAULT (gen_random_uuid())::text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    trigger_event text NOT NULL,
    hub text NOT NULL,
    business_impact text,
    complexity text DEFAULT 'medium'::text NOT NULL,
    is_quick_win boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at text DEFAULT (now())::text NOT NULL
);


--
-- Name: media_profile_fields; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.media_profile_fields (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    profile_id character varying NOT NULL,
    field_type text NOT NULL,
    label text NOT NULL,
    placeholder text,
    help_text text,
    is_required boolean DEFAULT false NOT NULL,
    options text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at text DEFAULT now() NOT NULL
);


--
-- Name: media_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.media_profiles (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at text DEFAULT now() NOT NULL,
    updated_at text DEFAULT now() NOT NULL
);


--
-- Name: media_submission_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.media_submission_files (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    submission_id character varying NOT NULL,
    file_name text NOT NULL,
    file_type text NOT NULL,
    file_size integer NOT NULL,
    sharepoint_drive_id text,
    sharepoint_item_id text,
    sharepoint_url text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at text DEFAULT now() NOT NULL,
    sharepoint_path text,
    temp_file_path text,
    retry_count integer DEFAULT 0 NOT NULL,
    last_retry_at text,
    last_error text
);


--
-- Name: media_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.media_submissions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying NOT NULL,
    profile_id character varying NOT NULL,
    submitted_by character varying NOT NULL,
    title text NOT NULL,
    form_data text NOT NULL,
    sharepoint_folder_path text,
    sharepoint_folder_url text,
    pdf_drive_id text,
    pdf_item_id text,
    pdf_url text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at text DEFAULT now() NOT NULL
);


--
-- Name: media_uploads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.media_uploads (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying NOT NULL,
    uploaded_by character varying NOT NULL,
    file_name text NOT NULL,
    file_type text NOT NULL,
    file_size integer NOT NULL,
    sharepoint_path text NOT NULL,
    sharepoint_url text,
    status text DEFAULT 'uploaded'::text NOT NULL,
    created_at text NOT NULL
);


--
-- Name: meeting_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.meeting_requests (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying NOT NULL,
    meeting_type_id character varying NOT NULL,
    requested_by character varying NOT NULL,
    title text NOT NULL,
    description text,
    proposed_date text NOT NULL,
    proposed_time text NOT NULL,
    duration integer DEFAULT 30 NOT NULL,
    attendee_ids text[] DEFAULT '{}'::text[] NOT NULL,
    credit_cost numeric(10,2) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    teams_link text,
    admin_notes text,
    credits_deducted boolean DEFAULT false NOT NULL,
    approved_by character varying,
    approved_at text,
    created_at text NOT NULL,
    external_attendee_emails text[] DEFAULT '{}'::text[] NOT NULL,
    notes text,
    outlook_meeting_link text,
    rejection_reason text,
    rejected_at text,
    completed_at text
);


--
-- Name: meeting_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.meeting_types (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    credit_cost numeric(10,2) DEFAULT '1'::numeric NOT NULL,
    default_duration integer DEFAULT 30 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at text NOT NULL
);


--
-- Name: monthly_report_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.monthly_report_notes (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    notes text NOT NULL,
    created_by character varying NOT NULL,
    created_at text NOT NULL,
    updated_at text NOT NULL
);


--
-- Name: monthly_report_tracker; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.monthly_report_tracker (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    month_year text NOT NULL,
    sent_at text NOT NULL,
    status text DEFAULT 'sent'::text NOT NULL
);


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    task_updates boolean DEFAULT true NOT NULL,
    chat_mentions boolean DEFAULT true NOT NULL,
    campaign_updates boolean DEFAULT true NOT NULL,
    credit_alerts boolean DEFAULT true NOT NULL,
    training_reminders boolean DEFAULT true NOT NULL,
    meeting_reminders boolean DEFAULT true NOT NULL,
    email_digest boolean DEFAULT true NOT NULL,
    created_at text DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.notifications (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    link text,
    is_read boolean DEFAULT false NOT NULL,
    related_message_id character varying,
    related_task_id character varying,
    related_thread_id character varying,
    created_by character varying,
    created_at text NOT NULL
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    token text NOT NULL,
    expires_at text NOT NULL,
    used_at text,
    created_at text NOT NULL
);


--
-- Name: report_presets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.report_presets (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    report_type text NOT NULL,
    filters text NOT NULL,
    created_by character varying NOT NULL,
    created_at text NOT NULL,
    scheduled_frequency text,
    scheduled_emails text,
    scheduled_next_run text
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


--
-- Name: signing_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.signing_events (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    packet_id character varying NOT NULL,
    participant_id character varying,
    event_type text NOT NULL,
    actor_name text,
    actor_email text,
    ip_address text,
    user_agent text,
    metadata text,
    created_at text DEFAULT now() NOT NULL
);


--
-- Name: signing_fields; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.signing_fields (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    packet_id character varying NOT NULL,
    participant_id character varying,
    field_type text NOT NULL,
    page_number integer DEFAULT 1 NOT NULL,
    x_position real NOT NULL,
    y_position real NOT NULL,
    width real NOT NULL,
    height real NOT NULL,
    is_required boolean DEFAULT true,
    label text,
    value text,
    created_at text DEFAULT now() NOT NULL
);


--
-- Name: signing_packets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.signing_packets (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying NOT NULL,
    document_id character varying,
    title text NOT NULL,
    message text,
    status text DEFAULT 'draft'::text NOT NULL,
    original_file_url text,
    original_file_name text,
    original_file_mime_type text,
    created_by_id character varying NOT NULL,
    created_by_name text NOT NULL,
    due_date text,
    completed_at text,
    signed_document_url text,
    created_at text DEFAULT now() NOT NULL
);


--
-- Name: signing_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.signing_participants (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    packet_id character varying NOT NULL,
    user_id character varying,
    email text NOT NULL,
    name text NOT NULL,
    role text DEFAULT 'signer'::text NOT NULL,
    signing_order integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    signature_data text,
    signature_type text,
    signed_at text,
    signer_ip text,
    signer_agent text,
    access_token character varying DEFAULT gen_random_uuid(),
    viewed_at text,
    declined_reason text,
    created_at text DEFAULT now() NOT NULL
);


--
-- Name: subscription_tier_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.subscription_tier_definitions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    monthly_price integer DEFAULT 0 NOT NULL,
    monthly_credits integer DEFAULT 0 NOT NULL,
    features text[] DEFAULT '{}'::text[] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at text NOT NULL
);


--
-- Name: task_assignees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.task_assignees (
    id integer NOT NULL,
    task_id character varying NOT NULL,
    user_id character varying NOT NULL,
    assigned_at text DEFAULT now() NOT NULL
);


--
-- Name: task_assignees_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.task_assignees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_assignees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_assignees_id_seq OWNED BY public.task_assignees.id;


--
-- Name: task_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.task_attachments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    task_id character varying NOT NULL,
    file_name text NOT NULL,
    file_size integer NOT NULL,
    content_type text NOT NULL,
    drive_id character varying NOT NULL,
    item_id character varying NOT NULL,
    web_url text,
    uploaded_by character varying NOT NULL,
    uploaded_by_name text NOT NULL,
    created_at text NOT NULL
);


--
-- Name: task_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.task_categories (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying NOT NULL,
    name text NOT NULL,
    color text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at text NOT NULL,
    icon text,
    description text
);


--
-- Name: task_checklist_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.task_checklist_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    task_id character varying NOT NULL,
    title text NOT NULL,
    is_completed boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at text NOT NULL
);


--
-- Name: task_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.task_comments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    task_id character varying NOT NULL,
    user_id character varying NOT NULL,
    user_name text NOT NULL,
    user_type text NOT NULL,
    content text NOT NULL,
    created_at text NOT NULL,
    updated_at text
);


--
-- Name: task_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.task_links (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    task_id character varying NOT NULL,
    url text NOT NULL,
    label text,
    created_by character varying NOT NULL,
    created_by_name text NOT NULL,
    created_at text NOT NULL
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.tasks (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'pending'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    credit_cost numeric(10,2) DEFAULT '1'::numeric NOT NULL,
    type text DEFAULT 'assigned'::text NOT NULL,
    deliverable_type text,
    due_date text,
    created_at text NOT NULL,
    assigned_by character varying,
    assigned_to character varying,
    credits_deducted boolean DEFAULT false NOT NULL,
    notes text,
    start_date text,
    is_recurring boolean DEFAULT false NOT NULL,
    recurrence_day integer,
    billing_period_start text,
    billing_period_end text,
    parent_task_id character varying,
    approval_status text DEFAULT 'approved'::text NOT NULL,
    no_credit boolean DEFAULT false NOT NULL,
    recurrence_pattern text,
    recurrence_weekday integer,
    recurrence_week_ordinal integer,
    timer_started_at text,
    total_time_tracked integer DEFAULT 0 NOT NULL,
    task_ownership text DEFAULT 'agency'::text NOT NULL,
    bulk_quantity integer,
    bulk_parent_id character varying,
    cadence_frequency text,
    cadence_days text[],
    cadence_end_date text,
    campaign_request_id character varying,
    completed_at text,
    cadence_id character varying,
    completed_by character varying,
    completed_by_name text,
    credits_deducted_at text,
    credit_cost_at_deduction numeric(10,2),
    revision_count integer DEFAULT 0 NOT NULL,
    category_id character varying,
    pillar_id character varying,
    content_calendar_item_id character varying,
    assigned_to_name text,
    hubspot_task_id text
);


--
-- Name: training_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.training_assignments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    training_module_id character varying NOT NULL,
    assignment_type text DEFAULT 'company'::text NOT NULL,
    company_id character varying,
    user_id character varying,
    group_name text,
    due_date text,
    is_required boolean DEFAULT true NOT NULL,
    reminder_sent boolean DEFAULT false NOT NULL,
    reminder_date text,
    assigned_by character varying NOT NULL,
    created_at text NOT NULL
);


--
-- Name: training_completions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.training_completions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    training_module_id character varying NOT NULL,
    user_id character varying NOT NULL,
    assignment_id character varying,
    completed_at text NOT NULL,
    watch_time integer,
    score integer
);


--
-- Name: training_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.training_modules (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    content_type text DEFAULT 'video'::text NOT NULL,
    content_url text,
    thumbnail_url text,
    duration integer,
    sort_order integer DEFAULT 0 NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying NOT NULL,
    created_at text NOT NULL,
    document_drive_id character varying,
    document_item_id character varying,
    document_file_name text,
    document_file_size integer,
    document_web_url text
);


--
-- Name: user_tag_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.user_tag_assignments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    tag_id character varying NOT NULL,
    assigned_by character varying,
    created_at text NOT NULL
);


--
-- Name: user_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.user_tags (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    color text DEFAULT '#6366f1'::text NOT NULL,
    is_preset boolean DEFAULT false NOT NULL,
    created_at text NOT NULL,
    created_by character varying
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email character varying NOT NULL,
    first_name character varying,
    last_name character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    password character varying NOT NULL
);


--
-- Name: task_assignees id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignees ALTER COLUMN id SET DEFAULT nextval('public.task_assignees_id_seq'::regclass);


--
-- Name: admin_invitations admin_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_invitations
    ADD CONSTRAINT admin_invitations_pkey PRIMARY KEY (id);


--
-- Name: admin_invitations admin_invitations_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_invitations
    ADD CONSTRAINT admin_invitations_token_unique UNIQUE (token);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: admin_users admin_users_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_user_id_unique UNIQUE (user_id);


--
-- Name: ai_prompt_templates ai_prompt_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_prompt_templates
    ADD CONSTRAINT ai_prompt_templates_pkey PRIMARY KEY (id);


--
-- Name: brand_profiles brand_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_profiles
    ADD CONSTRAINT brand_profiles_pkey PRIMARY KEY (id);


--
-- Name: cadences cadences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cadences
    ADD CONSTRAINT cadences_pkey PRIMARY KEY (id);


--
-- Name: campaign_requests campaign_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_requests
    ADD CONSTRAINT campaign_requests_pkey PRIMARY KEY (id);


--
-- Name: campaign_types campaign_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_types
    ADD CONSTRAINT campaign_types_pkey PRIMARY KEY (id);


--
-- Name: chat_mentions chat_mentions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_mentions
    ADD CONSTRAINT chat_mentions_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_read_receipts chat_read_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_read_receipts
    ADD CONSTRAINT chat_read_receipts_pkey PRIMARY KEY (id);


--
-- Name: chat_thread_members chat_thread_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_thread_members
    ADD CONSTRAINT chat_thread_members_pkey PRIMARY KEY (id);


--
-- Name: chat_threads chat_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_threads
    ADD CONSTRAINT chat_threads_pkey PRIMARY KEY (id);


--
-- Name: client_onboarding client_onboarding_company_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_onboarding
    ADD CONSTRAINT client_onboarding_company_id_unique UNIQUE (company_id);


--
-- Name: client_onboarding client_onboarding_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_onboarding
    ADD CONSTRAINT client_onboarding_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: company_credentials company_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_credentials
    ADD CONSTRAINT company_credentials_pkey PRIMARY KEY (id);


--
-- Name: company_invitations company_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_invitations
    ADD CONSTRAINT company_invitations_pkey PRIMARY KEY (id);


--
-- Name: company_invitations company_invitations_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_invitations
    ADD CONSTRAINT company_invitations_token_unique UNIQUE (token);


--
-- Name: company_knowledge_items company_knowledge_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_knowledge_items
    ADD CONSTRAINT company_knowledge_items_pkey PRIMARY KEY (id);


--
-- Name: company_media_profiles company_media_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_media_profiles
    ADD CONSTRAINT company_media_profiles_pkey PRIMARY KEY (id);


--
-- Name: company_members company_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_members
    ADD CONSTRAINT company_members_pkey PRIMARY KEY (id);


--
-- Name: company_workflows company_workflows_company_id_template_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_workflows
    ADD CONSTRAINT company_workflows_company_id_template_id_key UNIQUE (company_id, template_id);


--
-- Name: company_workflows company_workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_workflows
    ADD CONSTRAINT company_workflows_pkey PRIMARY KEY (id);


--
-- Name: content_assets content_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_assets
    ADD CONSTRAINT content_assets_pkey PRIMARY KEY (id);


--
-- Name: content_calendar_activity content_calendar_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_calendar_activity
    ADD CONSTRAINT content_calendar_activity_pkey PRIMARY KEY (id);


--
-- Name: content_calendar_items content_calendar_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_calendar_items
    ADD CONSTRAINT content_calendar_items_pkey PRIMARY KEY (id);


--
-- Name: content_pillars content_pillars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_pillars
    ADD CONSTRAINT content_pillars_pkey PRIMARY KEY (id);


--
-- Name: credit_packages credit_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_packages
    ADD CONSTRAINT credit_packages_pkey PRIMARY KEY (id);


--
-- Name: credit_purchases credit_purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_purchases
    ADD CONSTRAINT credit_purchases_pkey PRIMARY KEY (id);


--
-- Name: credit_sales credit_sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_sales
    ADD CONSTRAINT credit_sales_pkey PRIMARY KEY (id);


--
-- Name: credit_store_settings credit_store_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_store_settings
    ADD CONSTRAINT credit_store_settings_pkey PRIMARY KEY (id);


--
-- Name: credit_transactions credit_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_transactions
    ADD CONSTRAINT credit_transactions_pkey PRIMARY KEY (id);


--
-- Name: custom_roles custom_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_roles
    ADD CONSTRAINT custom_roles_pkey PRIMARY KEY (id);


--
-- Name: deliverable_types deliverable_types_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliverable_types
    ADD CONSTRAINT deliverable_types_key_unique UNIQUE (key);


--
-- Name: deliverable_types deliverable_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliverable_types
    ADD CONSTRAINT deliverable_types_pkey PRIMARY KEY (id);


--
-- Name: government_documents government_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.government_documents
    ADD CONSTRAINT government_documents_pkey PRIMARY KEY (id);


--
-- Name: hubspot_connections hubspot_connections_company_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hubspot_connections
    ADD CONSTRAINT hubspot_connections_company_id_key UNIQUE (company_id);


--
-- Name: hubspot_connections hubspot_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hubspot_connections
    ADD CONSTRAINT hubspot_connections_pkey PRIMARY KEY (id);


--
-- Name: hubspot_onboarding_checklist hubspot_onboarding_checklist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hubspot_onboarding_checklist
    ADD CONSTRAINT hubspot_onboarding_checklist_pkey PRIMARY KEY (id);


--
-- Name: hubspot_sync_log hubspot_sync_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hubspot_sync_log
    ADD CONSTRAINT hubspot_sync_log_pkey PRIMARY KEY (id);


--
-- Name: hubspot_workflow_templates hubspot_workflow_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hubspot_workflow_templates
    ADD CONSTRAINT hubspot_workflow_templates_pkey PRIMARY KEY (id);


--
-- Name: media_profile_fields media_profile_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_profile_fields
    ADD CONSTRAINT media_profile_fields_pkey PRIMARY KEY (id);


--
-- Name: media_profiles media_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_profiles
    ADD CONSTRAINT media_profiles_pkey PRIMARY KEY (id);


--
-- Name: media_submission_files media_submission_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_submission_files
    ADD CONSTRAINT media_submission_files_pkey PRIMARY KEY (id);


--
-- Name: media_submissions media_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_submissions
    ADD CONSTRAINT media_submissions_pkey PRIMARY KEY (id);


--
-- Name: media_uploads media_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_uploads
    ADD CONSTRAINT media_uploads_pkey PRIMARY KEY (id);


--
-- Name: meeting_requests meeting_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_requests
    ADD CONSTRAINT meeting_requests_pkey PRIMARY KEY (id);


--
-- Name: meeting_types meeting_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_types
    ADD CONSTRAINT meeting_types_pkey PRIMARY KEY (id);


--
-- Name: monthly_report_notes monthly_report_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_report_notes
    ADD CONSTRAINT monthly_report_notes_pkey PRIMARY KEY (id);


--
-- Name: monthly_report_tracker monthly_report_tracker_month_year_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_report_tracker
    ADD CONSTRAINT monthly_report_tracker_month_year_unique UNIQUE (month_year);


--
-- Name: monthly_report_tracker monthly_report_tracker_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_report_tracker
    ADD CONSTRAINT monthly_report_tracker_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_unique UNIQUE (token);


--
-- Name: report_presets report_presets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_presets
    ADD CONSTRAINT report_presets_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: signing_events signing_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signing_events
    ADD CONSTRAINT signing_events_pkey PRIMARY KEY (id);


--
-- Name: signing_fields signing_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signing_fields
    ADD CONSTRAINT signing_fields_pkey PRIMARY KEY (id);


--
-- Name: signing_packets signing_packets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signing_packets
    ADD CONSTRAINT signing_packets_pkey PRIMARY KEY (id);


--
-- Name: signing_participants signing_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signing_participants
    ADD CONSTRAINT signing_participants_pkey PRIMARY KEY (id);


--
-- Name: subscription_tier_definitions subscription_tier_definitions_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_tier_definitions
    ADD CONSTRAINT subscription_tier_definitions_key_unique UNIQUE (key);


--
-- Name: subscription_tier_definitions subscription_tier_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_tier_definitions
    ADD CONSTRAINT subscription_tier_definitions_pkey PRIMARY KEY (id);


--
-- Name: task_assignees task_assignees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignees
    ADD CONSTRAINT task_assignees_pkey PRIMARY KEY (id);


--
-- Name: task_attachments task_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_pkey PRIMARY KEY (id);


--
-- Name: task_categories task_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_categories
    ADD CONSTRAINT task_categories_pkey PRIMARY KEY (id);


--
-- Name: task_checklist_items task_checklist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_checklist_items
    ADD CONSTRAINT task_checklist_items_pkey PRIMARY KEY (id);


--
-- Name: task_comments task_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_pkey PRIMARY KEY (id);


--
-- Name: task_links task_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_links
    ADD CONSTRAINT task_links_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: training_assignments training_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_assignments
    ADD CONSTRAINT training_assignments_pkey PRIMARY KEY (id);


--
-- Name: training_completions training_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_completions
    ADD CONSTRAINT training_completions_pkey PRIMARY KEY (id);


--
-- Name: training_modules training_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_modules
    ADD CONSTRAINT training_modules_pkey PRIMARY KEY (id);


--
-- Name: user_tag_assignments user_tag_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_tag_assignments
    ADD CONSTRAINT user_tag_assignments_pkey PRIMARY KEY (id);


--
-- Name: user_tags user_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_tags
    ADD CONSTRAINT user_tags_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: company_credentials company_credentials_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_credentials
    ADD CONSTRAINT company_credentials_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_knowledge_items company_knowledge_items_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_knowledge_items
    ADD CONSTRAINT company_knowledge_items_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_workflows company_workflows_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_workflows
    ADD CONSTRAINT company_workflows_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_workflows company_workflows_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_workflows
    ADD CONSTRAINT company_workflows_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.hubspot_workflow_templates(id) ON DELETE CASCADE;


--
-- Name: content_calendar_activity content_calendar_activity_calendar_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_calendar_activity
    ADD CONSTRAINT content_calendar_activity_calendar_item_id_fkey FOREIGN KEY (calendar_item_id) REFERENCES public.content_calendar_items(id) ON DELETE CASCADE;


--
-- Name: hubspot_sync_log hubspot_sync_log_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hubspot_sync_log
    ADD CONSTRAINT hubspot_sync_log_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_category_id_task_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_category_id_task_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.task_categories(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--


