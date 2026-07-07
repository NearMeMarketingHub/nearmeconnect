import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { storage } from "./storage";
import { setupWebSocket } from "./websocket";
import bcrypt from "bcryptjs";

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
  } catch (error) {
    console.error("Database seed error:", error);
  }
}

(async () => {
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
    () => {
      log(`serving on port ${port}`);
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
})();
