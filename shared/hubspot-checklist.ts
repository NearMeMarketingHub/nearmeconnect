export type HubspotChecklistItemDef = {
  key: string;
  label: string;
  description: string;
};

export type HubspotChecklistSectionDef = {
  section: string;
  items: HubspotChecklistItemDef[];
};

export const HUBSPOT_CHECKLIST_MASTER: HubspotChecklistSectionDef[] = [
  {
    section: "Universal Setup",
    items: [
      { key: "domain_connected", label: "Connect website domain to HubSpot", description: "Configure your website domain in HubSpot Settings → Website → Domains & URLs" },
      { key: "ssl_enabled", label: "Verify SSL certificate active", description: "Ensure SSL is enabled and validated for all connected domains" },
      { key: "subdomain_configured", label: "Configure tracking/landing page subdomain", description: "Set up a subdomain (e.g. pages.yourdomain.com) for tracking and landing pages" },
      { key: "social_facebook", label: "Connect Facebook Page to HubSpot", description: "Link your Facebook Business Page via Settings → Marketing → Social" },
      { key: "social_instagram", label: "Connect Instagram Business account", description: "Connect Instagram Business account via the Facebook Page integration" },
      { key: "social_linkedin", label: "Connect LinkedIn Company Page", description: "Link your LinkedIn Company Page via Settings → Marketing → Social" },
      { key: "social_google_business", label: "Connect Google Business Profile", description: "Link Google Business Profile to HubSpot for review and post management" },
      { key: "social_youtube", label: "Connect YouTube channel (if applicable)", description: "Connect YouTube channel via Social settings if video is part of your strategy" },
      { key: "google_search_console", label: "Connect Google Search Console for SEO data", description: "Link GSC in Settings → Website → SEO to surface keyword performance data" },
      { key: "brand_primary_color", label: "Upload primary brand color to Brand Kit", description: "Add your primary hex color in Settings → Account → Brand Kit" },
      { key: "brand_secondary_color", label: "Upload secondary brand color", description: "Add secondary/accent hex colors to complete the Brand Kit palette" },
      { key: "brand_logo_primary", label: "Upload primary logo (PNG, SVG)", description: "Upload full-color logo in Brand Kit for use across HubSpot marketing assets" },
      { key: "brand_logo_white", label: "Upload white/reversed logo", description: "Upload white or reversed version of logo for dark backgrounds" },
      { key: "brand_font_heading", label: "Set heading font in Brand Kit", description: "Configure primary heading typeface in Brand Kit settings" },
      { key: "brand_font_body", label: "Set body font in Brand Kit", description: "Configure body copy typeface in Brand Kit settings" },
      { key: "icp_defined", label: "Define Ideal Customer Profiles (min. 1 ICP)", description: "Document at least one ICP with firmographics, pain points, and buying triggers" },
      { key: "icp_properties_added", label: "Add ICP properties to contact records", description: "Create custom contact properties to tag and segment by ICP type" },
      { key: "users_added", label: "Add all team members as HubSpot users", description: "Invite all relevant team members via Settings → Users & Teams" },
      { key: "permissions_configured", label: "Set user permissions and access levels", description: "Configure role-based permissions and access for each user or team" },
      { key: "email_connected", label: "Connect team email accounts", description: "Connect Google Workspace or Outlook via Settings → General → Email Integrations" },
      { key: "calendar_connected", label: "Connect Google/Outlook calendar(s)", description: "Sync calendars for meetings scheduling and real-time availability" },
      { key: "ga4_connected", label: "Connect Google Analytics 4", description: "Link GA4 property via Settings → Reports → Analytics Integrations" },
      { key: "gtm_installed", label: "Install Google Tag Manager on website", description: "Add GTM container snippet to website <head> for event tracking" },
      { key: "ads_google_connected", label: "Connect Google Ads account", description: "Link Google Ads account in Settings → Marketing → Ad Accounts" },
      { key: "ads_meta_connected", label: "Connect Meta Ads account", description: "Link Meta Ads Manager account via Ad Accounts settings" },
      { key: "commerce_payments", label: "Set up payment processing (if applicable)", description: "Configure HubSpot Payments or Stripe for commerce and quotes" },
    ],
  },
  {
    section: "CRM Setup",
    items: [
      { key: "contact_properties", label: "Configure contact properties + custom fields", description: "Review default contact properties and add custom fields relevant to your business" },
      { key: "company_properties", label: "Configure company properties", description: "Set up company-level properties for account tracking and segmentation" },
      { key: "deal_properties", label: "Configure deal properties", description: "Define deal fields including custom qualification and tracking criteria" },
      { key: "lifecycle_stages", label: "Configure lifecycle stages", description: "Map and label all lifecycle stages from Subscriber through Customer" },
      { key: "lead_status_values", label: "Configure lead status values", description: "Define lead status picklist values aligned with your sales process" },
      { key: "pipeline_created", label: "Create primary deal pipeline", description: "Set up your main sales pipeline in CRM → Deals → Pipelines" },
      { key: "pipeline_stages", label: "Configure all deal stages with probability", description: "Add each stage name with close probability percentages" },
      { key: "data_import_contacts", label: "Import existing contacts (CSV)", description: "Upload and map existing contact database via CRM → Contacts → Import" },
      { key: "data_import_companies", label: "Import existing companies", description: "Import company records and associate with contact records" },
      { key: "data_import_deals", label: "Import existing deals", description: "Import open or historical deal records into the pipeline" },
      { key: "views_created", label: "Create saved views (My Contacts, Hot Leads, etc.)", description: "Create shared and personal contact/deal views for team efficiency" },
      { key: "lists_segmentation", label: "Create segmentation lists (by ICP, by stage, etc.)", description: "Build active and static lists for marketing campaigns and reporting" },
      { key: "base_notifications", label: "Set up internal notifications for deal changes", description: "Configure deal stage change and assignment notifications for the sales team" },
    ],
  },
  {
    section: "Sales Hub",
    items: [
      { key: "email_templates", label: "Create initial email templates (min. 5)", description: "Build reusable 1:1 email templates for common outreach scenarios" },
      { key: "sequences_created", label: "Build initial sequences (prospecting, follow-up, nurture)", description: "Create automated email + task sequences for key sales motions" },
      { key: "meetings_link", label: "Set up meetings scheduling link", description: "Configure individual and team meeting links via Sales → Meetings" },
      { key: "calling_configured", label: "Configure HubSpot Calling", description: "Set up click-to-call with call recording and automatic logging" },
      { key: "lead_scoring", label: "Set up lead scoring model", description: "Define positive/negative attribute scoring in Marketing → Lead Scoring" },
      { key: "quotes_products", label: "Configure products and quotes (if applicable)", description: "Set up Products Library and quote templates with pricing tiers" },
      { key: "sales_report_dashboard", label: "Set up sales reporting dashboard", description: "Build a sales activity, pipeline, and revenue reporting dashboard" },
      { key: "forecasting_configured", label: "Configure sales forecasting", description: "Set up deal forecasting categories and quota targets" },
    ],
  },
  {
    section: "Marketing Hub",
    items: [
      { key: "email_confirmed_sender", label: "Verify sending domain for email", description: "Authenticate your sending domain via DKIM/DMARC in Email settings" },
      { key: "email_template_branded", label: "Create branded email templates", description: "Build on-brand email templates using the Brand Kit assets" },
      { key: "email_list_welcome", label: "Create welcome/intro email sequence", description: "Set up a welcome workflow triggered by new contact creation or form fill" },
      { key: "forms_created", label: "Create lead capture forms (min. 3)", description: "Build embedded and standalone forms for key website conversion points" },
      { key: "cta_buttons", label: "Create CTAs for website/landing pages", description: "Design and publish CTA buttons and banners in Marketing → Lead Capture → CTAs" },
      { key: "landing_page_1", label: "Publish first landing page", description: "Create and publish an initial landing page for a campaign or service offer" },
      { key: "workflow_lead_nurture", label: "Build lead nurture automation workflow", description: "Set up an enrollment-based nurture workflow for new marketing qualified leads" },
      { key: "workflow_lead_scoring_notify", label: "Build lead scoring notification workflow", description: "Trigger internal sales alerts when contacts reach the MQL threshold score" },
      { key: "attribution_report", label: "Set up attribution reporting", description: "Configure first-touch and multi-touch attribution models in Reports" },
      { key: "campaign_tracking_urls", label: "Create campaign UTM tracking URLs", description: "Build UTM-tagged URLs for all active paid and organic campaigns" },
    ],
  },
  {
    section: "Content Hub",
    items: [
      { key: "blog_setup", label: "Configure blog (domain, template, SEO settings)", description: "Set up blog subdomain, choose a template, and configure meta/SEO defaults" },
      { key: "blog_post_1", label: "Publish first blog post", description: "Research, write, and publish the first SEO-optimized blog article" },
      { key: "seo_tool_configured", label: "Set up SEO tool with target keywords", description: "Add keyword targets and track rankings in Marketing → SEO Tool" },
      { key: "seo_topic_clusters", label: "Create minimum 3 topic clusters", description: "Build pillar-cluster topic structure around core service or product areas" },
      { key: "content_calendar_linked", label: "Link HubSpot content plan to Near Me portal calendar", description: "Connect your HubSpot content schedule with the Near Me Connect content calendar" },
      { key: "case_study_1", label: "Create first case study (if applicable)", description: "Document a client success story as a downloadable lead generation asset" },
      { key: "podcast_setup", label: "Set up podcast (if applicable)", description: "Configure podcast hosting and embed episodes on HubSpot pages" },
      { key: "content_remix_workflow", label: "Build content repurposing workflow", description: "Create an automation to distribute new content across social and email channels" },
    ],
  },
  {
    section: "Service Hub",
    items: [
      { key: "ticket_pipeline", label: "Configure help desk ticket pipeline", description: "Set up ticket pipeline stages in Service → Tickets → Pipelines" },
      { key: "live_chat", label: "Set up live chat on website", description: "Install and configure the live chat widget via Conversations → Chatflows" },
      { key: "chatbot_basic", label: "Build basic chatbot flow", description: "Create a qualifying and routing chatbot flow for website visitors" },
      { key: "knowledge_base", label: "Create knowledge base with min. 5 articles", description: "Build a self-service knowledge base for common client and prospect questions" },
      { key: "nps_survey", label: "Create NPS survey automation", description: "Set up an automated NPS survey workflow triggered after a set customer milestone" },
      { key: "csat_survey", label: "Create CSAT survey", description: "Create customer satisfaction survey triggered automatically post ticket resolution" },
      { key: "customer_portal", label: "Configure customer portal (if Enterprise)", description: "Enable and brand the HubSpot Customer Portal for Enterprise-tier accounts" },
      { key: "service_report", label: "Set up service reporting dashboard", description: "Build a service team performance, ticket volume, and resolution time dashboard" },
    ],
  },
];

export const SECTION_COLORS: Record<string, string> = {
  "Universal Setup": "text-blue-500",
  "CRM Setup": "text-purple-500",
  "Sales Hub": "text-green-500",
  "Marketing Hub": "text-orange-500",
  "Content Hub": "text-pink-500",
  "Service Hub": "text-teal-500",
};

export const SECTION_BG: Record<string, string> = {
  "Universal Setup": "bg-blue-500",
  "CRM Setup": "bg-purple-500",
  "Sales Hub": "bg-green-500",
  "Marketing Hub": "bg-orange-500",
  "Content Hub": "bg-pink-500",
  "Service Hub": "bg-teal-500",
};
