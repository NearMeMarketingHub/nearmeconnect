#!/usr/bin/env node
/**
 * Seed starter AI prompt templates for every content_goal type.
 * Idempotent: only runs if the table is empty.
 * Usage: node scripts/seed-ai-templates.js
 *
 * Actual columns: content_goal, platform, name, image_prompt_template,
 *                 caption_prompt_template, post_text_template, is_active,
 *                 sort_order, created_at
 */

import pg from "pg";
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const now = new Date().toISOString();

const templates = [
  {
    content_goal: "google_business_post",
    platform: "google",
    name: "Google Business Profile Post",
    image_prompt_template:
      "A professional, welcoming photo for a local business post. Show {{business_type}} with warm lighting, clean environment, and brand colours {{brand_colors}}. No text overlays.",
    caption_prompt_template:
      "Write a Google Business Profile post for {{brand_name}}, a {{business_type}} in {{city}}. Hook: {{hook}}. Highlight: {{value_proposition}}. Include the address {{location}} and phone {{phone}}. End with a clear CTA.",
    post_text_template:
      "🌟 {{headline}}\n\n{{body}}\n\n📞 {{phone}} | 📍 {{address}}\n\n{{cta_url}}",
    is_active: true,
    sort_order: 1,
  },
  {
    content_goal: "social_image",
    platform: "instagram",
    name: "Social Media Image Post",
    image_prompt_template:
      "Eye-catching social media graphic for {{brand_name}}. Style: {{brand_style}}. Colours: {{brand_colors}}. Subject: {{topic}}. Clean composition, vibrant, shareable. No text overlays.",
    caption_prompt_template:
      "Write an engaging Instagram caption for {{brand_name}} about {{topic}}. Start with a strong hook. Include the main message, a supporting detail, and end with a CTA. Add 5–8 relevant hashtags.",
    post_text_template:
      "{{hook}} 🔥\n\n{{main_message}}\n\n{{supporting_detail}}\n\n{{cta}} 👇\n\n#{{industry}} #{{city}} #{{brand_name}} #{{topic_tag}} #Marketing #SmallBusiness",
    is_active: true,
    sort_order: 2,
  },
  {
    content_goal: "social_video",
    platform: "instagram",
    name: "Social Media Video Script & Thumbnail",
    image_prompt_template:
      "Thumbnail for a {{duration}}-second video about {{topic}}. Bold colours, clear focal point, no text overlays. Brand palette: {{brand_colors}}.",
    caption_prompt_template:
      "Write a caption for a {{duration}}-second {{platform}} video titled '{{video_title}}' for {{brand_name}}. Include a teaser, CTA to watch, and relevant hashtags.",
    post_text_template:
      "🎬 {{video_title}}\n\n{{teaser_sentence}}\n\nWatch the full video and {{cta}}!\n\n#{{brand_name}} #{{industry}}Tips #VideoMarketing #{{city}} #Reels",
    is_active: true,
    sort_order: 3,
  },
  {
    content_goal: "email_banner",
    platform: "email",
    name: "Email Campaign Banner",
    image_prompt_template:
      "Professional email header banner, 600px wide style. Brand colours: {{brand_colors}}. Topic: {{campaign_topic}}. Clean, minimal, no text. Suitable for {{industry}} audience.",
    caption_prompt_template:
      "Write a compelling email subject line and preview text for {{brand_name}}'s campaign about {{campaign_topic}}. Make it urgent but not spammy. Subject line under 50 characters.",
    post_text_template:
      "Subject: {{urgency_word}}: {{offer_or_topic}} — {{brand_name}}\n\nPreview: {{preview_text}}\n\n{{email_body}}\n\n{{cta_button_text}} →",
    is_active: true,
    sort_order: 4,
  },
  {
    content_goal: "blog_feature",
    platform: "website",
    name: "Blog Feature Image & Outline",
    image_prompt_template:
      "Hero image for a blog post titled '{{blog_title}}'. Professional, editorial feel. Brand colours: {{brand_colors}}. Subject: {{topic}}. No text, clean background.",
    caption_prompt_template:
      "Write a LinkedIn post promoting the blog article '{{blog_title}}' for {{brand_name}}. Start with a stat or question, identify the problem, tease the solution, list 3 key takeaways, and end with a CTA to read the post.",
    post_text_template:
      "**Hook:** {{attention_grabbing_stat_or_question}}\n\n**Problem:** {{pain_point}}\n\n**Solution:** {{your_approach}}\n\n**Key Points:**\n1. {{point_1}}\n2. {{point_2}}\n3. {{point_3}}\n\n**CTA:** {{cta}}\n\n#{{industry}} #Insights #{{brand_name}}",
    is_active: true,
    sort_order: 5,
  },
  {
    content_goal: "ad_creative",
    platform: "facebook",
    name: "Paid Ad Creative",
    image_prompt_template:
      "High-converting ad creative for {{platform}} ({{ad_size}}). Product/service: {{offer}}. Brand colours: {{brand_colors}}. Eye-catching, clean, professional. No text overlays.",
    caption_prompt_template:
      "Write a Facebook/Instagram ad caption for {{brand_name}} promoting {{offer}}. Address the pain point {{pain_point}}, state the value proposition, include social proof, and end with a direct CTA. Keep it under 125 characters for the primary text.",
    post_text_template:
      "{{pain_point}}? We can help. ✅\n\n{{value_proposition}}\n\n{{social_proof}}\n\n{{cta}} →",
    is_active: true,
    sort_order: 6,
  },
  {
    content_goal: "newsletter_header",
    platform: "email",
    name: "Newsletter Header",
    image_prompt_template:
      "Email newsletter header image for {{brand_name}}. Clean, professional masthead style. Brand colours: {{brand_colors}}. Edition: {{newsletter_edition}}. No text.",
    caption_prompt_template:
      "Write a subject line and opening paragraph for {{brand_name}}'s {{month}} {{year}} newsletter. Theme: {{edition_topic}}. Friendly, professional tone. Subject line under 50 characters.",
    post_text_template:
      "Subject: {{brand_name}} Newsletter — {{month}} {{year}}: {{edition_topic}}\n\nHi {{first_name}},\n\n{{opening_paragraph}}\n\nThis month we're covering:\n• {{topic_1}}\n• {{topic_2}}\n• {{topic_3}}\n\n{{cta}}",
    is_active: true,
    sort_order: 7,
  },
  {
    content_goal: "podcast_thumbnail",
    platform: "podcast",
    name: "Podcast Episode Thumbnail",
    image_prompt_template:
      "Bold podcast cover art thumbnail for episode about '{{episode_topic}}'. Host: {{host_name}}. Brand colours: {{brand_colors}}. Engaging, professional, broadcast quality. No text.",
    caption_prompt_template:
      "Write social media copy promoting podcast episode '{{episode_title}}' for {{brand_name}}. Include a teaser of the best insight, 3 bullet points of what listeners will learn, CTA to listen, and 5 hashtags.",
    post_text_template:
      "🎙️ New episode: {{episode_title}}\n\n{{episode_teaser}}\n\nIn this episode:\n• {{insight_1}}\n• {{insight_2}}\n• {{insight_3}}\n\nListen now — link in bio!\n\n#Podcast #{{industry}} #{{brand_name}} #{{episode_topic_tag}} #NewEpisode",
    is_active: true,
    sort_order: 8,
  },
  {
    content_goal: "case_study_visual",
    platform: "linkedin",
    name: "Case Study Visual",
    image_prompt_template:
      "Professional case study infographic style image. Shows before/after or results for {{client_type}} in {{industry}}. Brand colours: {{brand_colors}}. Clean data-driven design. No text.",
    caption_prompt_template:
      "Write a LinkedIn case study post for {{brand_name}} about helping a {{client_type}} achieve {{result_achieved}}. Include the challenge, strategy, 3 measurable results, and a CTA for similar businesses.",
    post_text_template:
      "**The Challenge:** {{client_challenge}}\n\n**Our Approach:** {{strategy_summary}}\n\n**The Results:**\n- {{result_1}}\n- {{result_2}}\n- {{result_3}}\n\n**What made the difference:** {{key_insight}}\n\nReady for similar results? {{cta}}\n\n#CaseStudy #{{industry}} #ClientSuccess",
    is_active: true,
    sort_order: 9,
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      "SELECT COUNT(*) FROM ai_prompt_templates"
    );
    const count = parseInt(rows[0].count, 10);

    if (count > 0) {
      console.log(
        `ai_prompt_templates already has ${count} rows — skipping seed.`
      );
      return;
    }

    console.log(`Seeding ${templates.length} AI prompt templates...`);

    // Use the first admin user as the creator, or fall back to a sentinel value
    const adminRes = await client.query("SELECT id FROM admin_users ORDER BY created_at LIMIT 1");
    const createdBy = adminRes.rows[0]?.id ?? "system";

    for (const t of templates) {
      await client.query(
        `INSERT INTO ai_prompt_templates (
          content_goal, platform, name,
          image_prompt_template, caption_prompt_template, post_text_template,
          is_active, sort_order, created_by, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          t.content_goal,
          t.platform,
          t.name,
          t.image_prompt_template,
          t.caption_prompt_template,
          t.post_text_template,
          t.is_active,
          t.sort_order,
          createdBy,
          now,
        ]
      );
      console.log(`  ✓ ${t.name}`);
    }

    console.log(`\nDone! ${templates.length} templates seeded.`);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
