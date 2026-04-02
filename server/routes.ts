import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated, AuthenticatedRequest } from "./auth";
import { insertCompanySchema, insertTaskSchema, insertTaskCategorySchema, insertDeliverableTypeSchema, insertTaskChecklistItemSchema, insertCompanyInvitationSchema, insertChatThreadSchema, insertChatMessageSchema, insertCampaignTypeSchema, insertCampaignRequestSchema, insertTrainingModuleSchema, insertTrainingAssignmentSchema, insertTrainingCompletionSchema } from "@shared/schema";
import { z } from "zod";
import { nanoid } from "nanoid";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { uploadToSharePoint, uploadToSharePointWithIds, downloadFromSharePoint, deleteFromSharePoint } from "./sharepoint";
import { broadcastInvalidation, broadcastNotificationToUser, broadcastNotificationToUsers } from "./websocket";
import multer from "multer";
import { sendMeetingApprovalEmail, sendMeetingInviteEmail, sendMeetingRejectionEmail, sendTrainingAssignmentEmail, sendTrainingReminderEmail, sendOnboardingCompletionEmail, sendTaskAssignmentEmail, sendTaskStatusChangeEmail, sendTaskInReviewEmail, sendTaskDueReminderEmail, sendTestEmail, sendWelcomeEmail, sendCompanyInvitationEmail, sendPasswordResetEmail, sendCampaignResponseEmail, sendCreditPurchaseEmail, sendLowCreditWarningEmail, sendProjectedUsageWarningEmail, sendSignatureRequestEmail, sendSignatureCompletionEmail, sendChatNotificationEmail, sendAdminInvitationEmail, sendMediaUploadNotificationEmail } from "./email";
import { generateOnboardingPdf } from "./pdf-generator";
import { syncCompanyToHubSpot, syncContactToHubSpot, createHubSpotTask, isHubSpotConnected, syncAllToHubSpot, getHubSpotCompanies, searchHubSpotCompanies, getHubSpotCompanyContacts, getHubSpotCompanyById } from "./hubspot";
import { formatDateET, formatDateLongET, formatDateWeekdayET } from "./timezone";

import type { InsertNotification } from "@shared/schema";

async function createAndBroadcastNotification(data: InsertNotification) {
  const notification = await storage.createNotification(data);
  broadcastNotificationToUser(data.userId, {
    title: data.title,
    message: data.message,
    link: data.link,
  });
  return notification;
}

function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function checkProjectedUsageAndNotify(companyId: string) {
  try {
    const company = await storage.getCompany(companyId);
    if (!company || company.monthlyCredits <= 0) return;

    const { getBillingPeriod } = await import("@shared/billing");
    const period = getBillingPeriod(company.billingStartDay);

    if (company.lastProjectedUsageWarningSent) {
      const lastSent = new Date(company.lastProjectedUsageWarningSent);
      const periodStart = new Date(period.startStr);
      if (lastSent >= periodStart) return;
    }

    const allTasks = await storage.getTasks(companyId);
    const activeTasks = allTasks.filter(t => {
      if (t.status === "completed" || t.status === "rejected" || t.status === "cancelled") return false;
      if (t.noCredit) return false;
      const taskStart = t.billingPeriodStart;
      const taskEnd = t.billingPeriodEnd;
      if (taskStart && taskEnd) {
        return taskStart === period.startStr && taskEnd === period.endStr;
      }
      return true;
    });

    const projectedUsage = activeTasks.reduce((sum, t) => sum + parseFloat(String(t.creditCost || "0")), 0);

    const effectiveAllotment = company.monthlyCredits + (company.bonusCredits || 0);

    if (projectedUsage > effectiveAllotment) {
      const baseUrl = process.env.REPLIT_DEPLOYMENT
        ? `https://${(process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || "").split(",")[0]}`
        : process.env.REPLIT_DEV_DOMAIN
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : "http://localhost:5000";

      const members = await storage.getCompanyMembers(companyId);
      const owners = members.filter(m => m.role === "owner" || m.role === "admin");

      for (const member of owners) {
        const user = await storage.getUser(member.userId);
        if (user?.email) {
          sendProjectedUsageWarningEmail({
            recipientEmail: user.email,
            recipientName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
            companyName: company.name,
            projectedUsage: Math.round(projectedUsage * 10) / 10,
            monthlyAllotment: effectiveAllotment,
            currentBalance: company.credits,
            storeUrl: `${baseUrl}/client/credit-store`,
          }).catch(err => console.error("Failed to send projected usage warning email:", err));
        }
      }

      for (const member of members.filter(m => m.role === "owner" || m.role === "admin" || m.role === "company_owner" || m.role === "company_admin")) {
        try {
          await createAndBroadcastNotification({
            userId: member.userId,
            type: "projected_usage_warning",
            title: "Projected Credit Usage Warning",
            message: `Your projected credit usage (${Math.round(projectedUsage * 10) / 10}) exceeds your allotment (${effectiveAllotment}). Consider purchasing more credits or adjusting usage.`,
            link: `/client/credits`,
            createdBy: member.userId,
          });
        } catch (notifErr) {
          console.error("Failed to create projected usage notification:", notifErr);
        }
      }

      await storage.updateCompany(companyId, {
        lastProjectedUsageWarningSent: new Date().toISOString(),
      });

      console.log(`Projected usage warning sent for company ${company.name}: ${projectedUsage} projected vs ${effectiveAllotment} allotment`);
    }
  } catch (error) {
    console.error("Failed to check projected usage:", error);
  }
}

interface CreditDiscrepancy {
  taskId: string;
  taskTitle: string;
  expectedCost: number;
  recordedAmount: number;
  difference: number;
}

async function auditCompanyCredits(companyId: string): Promise<{ discrepancies: CreditDiscrepancy[]; totalDifference: number; message: string }> {
  const company = await storage.getCompany(companyId);
  if (!company) {
    return { discrepancies: [], totalDifference: 0, message: "Company not found" };
  }

  const tasks = await storage.getTasks(companyId);
  const existingTransactions = await storage.getCreditTransactions(companyId);

  const taskTransactionMap = new Map<string, number>();
  for (const tx of existingTransactions) {
    if (!tx.taskId) continue;
    const amount = parseFloat(tx.amount);
    if (tx.type === "deduction" || tx.type === "task_deduction") {
      const existing = taskTransactionMap.get(tx.taskId) || 0;
      taskTransactionMap.set(tx.taskId, existing + Math.abs(amount));
    } else if (tx.type === "adjustment" || tx.type === "credit_adjustment") {
      const existing = taskTransactionMap.get(tx.taskId) || 0;
      taskTransactionMap.set(tx.taskId, existing + (amount < 0 ? Math.abs(amount) : -Math.abs(amount)));
    } else if (tx.type === "revision_charge") {
      const existing = taskTransactionMap.get(tx.taskId) || 0;
      taskTransactionMap.set(tx.taskId, existing + Math.abs(amount));
    } else if (tx.type === "credit_refund") {
      const existing = taskTransactionMap.get(tx.taskId) || 0;
      taskTransactionMap.set(tx.taskId, existing - Math.abs(amount));
    }
  }

  const discrepancies: CreditDiscrepancy[] = [];
  let totalDifference = 0;

  for (const task of tasks) {
    if (task.status !== "completed" || !task.creditsDeducted) continue;

    const taskCreditCost = parseFloat(task.creditCost);
    const deductedAmount = taskTransactionMap.get(task.id) || 0;
    const difference = taskCreditCost - deductedAmount;

    if (Math.abs(difference) > 0.001) {
      totalDifference += difference;
      discrepancies.push({
        taskId: task.id,
        taskTitle: task.title,
        expectedCost: taskCreditCost,
        recordedAmount: Math.round(deductedAmount * 100) / 100,
        difference: Math.round(difference * 100) / 100,
      });
    }
  }

  const message = discrepancies.length > 0
    ? `Found ${discrepancies.length} discrepancy(ies). Net difference: ${Math.abs(totalDifference).toFixed(2)} credits.`
    : "All credit records are accurate. No discrepancies found.";

  return { discrepancies, totalDifference, message };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);
  registerAuthRoutes(app);
  registerObjectStorageRoutes(app);

  app.get("/api/me", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const memberships = await storage.getUserCompanies(userId);
      
      // Enrich companies with onboarding status
      const companies = await Promise.all(
        memberships.map(async (m) => {
          const company = await storage.getCompany(m.companyId);
          return {
            companyId: m.companyId,
            role: m.role,
            onboardingComplete: company?.onboardingComplete ?? false,
          };
        })
      );
      
      res.json({
        userId,
        isAdmin,
        companies,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user info" });
    }
  });

  app.get("/api/companies", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (isAdmin) {
        const companies = await storage.getAllCompanies();
        res.json(companies);
      } else {
        const memberships = await storage.getUserCompanies(userId);
        const companies = await Promise.all(
          memberships.map((m) => storage.getCompany(m.companyId))
        );
        res.json(companies.filter(Boolean));
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  app.get("/api/companies/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const company = await storage.getCompany(req.params.id);
      
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      
      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, company.id);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      
      res.json(company);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company" });
    }
  });

  app.post("/api/companies", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Only admins can create companies" });
      }
      
      const data = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany(data);

      if (isHubSpotConnected()) {
        syncCompanyToHubSpot({
          id: company.id,
          name: company.name,
          industry: company.industry,
          subscriptionTier: company.subscriptionTier,
          credits: parseFloat(company.credits?.toString() || "0"),
          monthlyCredits: parseFloat(company.monthlyCredits?.toString() || "0"),
        }).catch(err => console.error("Auto HubSpot company sync failed:", err));
      }

      broadcastInvalidation(["/api/companies"]);
      res.status(201).json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create company" });
    }
  });

  app.patch("/api/companies/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, req.params.id);
        if (!member || (member.role !== "company_owner" && member.role !== "company_admin")) {
          return res.status(403).json({ error: "Only admins or company owners can update companies" });
        }
        const allowedFields = ["name", "industry"];
        const filtered: Record<string, any> = {};
        for (const key of allowedFields) {
          if (key in req.body) filtered[key] = req.body[key];
        }
        const company = await storage.updateCompany(req.params.id, filtered);
        if (!company) return res.status(404).json({ error: "Failed to update company" });
        return res.json(company);
      }
      
      // Check if clientType is changing
      const existingCompany = await storage.getCompany(req.params.id);
      if (!existingCompany) {
        return res.status(404).json({ error: "Company not found" });
      }
      
      const company = await storage.updateCompany(req.params.id, req.body);
      if (!company) {
        return res.status(404).json({ error: "Failed to update company" });
      }
      
      if (isHubSpotConnected()) {
        syncCompanyToHubSpot({
          id: company.id,
          name: company.name,
          industry: company.industry,
          subscriptionTier: company.subscriptionTier,
          credits: parseFloat(company.credits?.toString() || "0"),
          monthlyCredits: parseFloat(company.monthlyCredits?.toString() || "0"),
        }).catch(err => console.error("Auto HubSpot company sync failed:", err));
      }

      // If clientType changed, create a placeholder file in the new folder location
      // This ensures the folder structure exists in SharePoint for the new type
      if (req.body.clientType && req.body.clientType !== existingCompany.clientType) {
        try {
          const placeholderContent = Buffer.from(`Folder created for ${company.name} - Client Type: ${req.body.clientType}\nCreated: ${new Date().toISOString()}`);
          await uploadToSharePoint(
            company.name,
            ".folder_created.txt",
            placeholderContent,
            "text/plain",
            undefined,
            req.body.clientType as "marketing" | "government"
          );
          console.log(`Created new SharePoint folder for ${company.name} under ${req.body.clientType} type`);
        } catch (folderError) {
          console.error("Failed to create new SharePoint folder:", folderError);
          // Don't fail the update if folder creation fails
        }
      }
      
      broadcastInvalidation(["/api/companies"]);
      res.json(company);
    } catch (error) {
      res.status(500).json({ error: "Failed to update company" });
    }
  });

  // Pause a company (admin only)
  app.post("/api/companies/:id/pause", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Only admins can pause companies" });
      }
      
      const company = await storage.getCompany(req.params.id);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      
      const updatedCompany = await storage.updateCompany(req.params.id, {
        isPaused: true,
        pausedAt: new Date().toISOString(),
      });
      
      broadcastInvalidation(["/api/companies"]);
      res.json(updatedCompany);
    } catch (error) {
      res.status(500).json({ error: "Failed to pause company" });
    }
  });

  // Resume a company (admin only) - resets credits to full allocation
  app.post("/api/companies/:id/resume", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Only admins can resume companies" });
      }
      
      const company = await storage.getCompany(req.params.id);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      
      // Reset credits to full allocation and clear pause state
      const now = new Date();
      const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      const updatedCompany = await storage.updateCompany(req.params.id, {
        isPaused: false,
        pausedAt: null,
        credits: company.monthlyCredits,
        creditsLastReset: currentMonthYear,
        bonusCredits: 0,
      });
      
      broadcastInvalidation(["/api/companies"]);
      res.json(updatedCompany);
    } catch (error) {
      res.status(500).json({ error: "Failed to resume company" });
    }
  });

  // Check and reset credits if new month has started
  app.post("/api/companies/:id/check-credit-reset", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const companyId = req.params.id;
      
      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      
      // Get current month/year
      const now = new Date();
      const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      let wasReset = false;
      if (!company.creditsLastReset || company.creditsLastReset !== currentMonthYear) {
        await storage.updateCompany(companyId, {
          credits: company.monthlyCredits,
          creditsLastReset: currentMonthYear,
          bonusCredits: 0,
        });
        wasReset = true;
      }
      
      const updatedCompany = await storage.getCompany(companyId);
      broadcastInvalidation(["/api/companies"]);
      res.json({ company: updatedCompany, wasReset });
    } catch (error) {
      res.status(500).json({ error: "Failed to check credit reset" });
    }
  });

  app.get("/api/companies/:id/members", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const companyId = req.params.id;
      
      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      
      const members = await storage.getCompanyMembers(companyId);
      const enrichedMembers = await Promise.all(members.map(async (member) => {
        const user = await storage.getUser(member.userId);
        return {
          ...member,
          firstName: user?.firstName || null,
          lastName: user?.lastName || null,
          email: user?.email || null,
        };
      }));
      res.json(enrichedMembers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  app.post("/api/companies/:id/members", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Only admins can add members" });
      }
      
      const member = await storage.createCompanyMember({
        companyId: req.params.id,
        userId: req.body.userId,
        role: req.body.role || "team_member",
      });

      // Auto-add new member to company-wide chat thread if it exists
      try {
        const companyWideThread = await storage.getCompanyWideThread(req.params.id);
        if (companyWideThread) {
          const existingMember = await storage.getChatThreadMember(companyWideThread.id, req.body.userId);
          if (!existingMember) {
            await storage.addChatThreadMember({
              threadId: companyWideThread.id,
              userId: req.body.userId,
              role: "member",
            });
          }
        }
      } catch (chatErr) {
        console.error("Failed to auto-add member to company-wide chat:", chatErr);
      }

      res.status(201).json(member);
    } catch (error) {
      res.status(500).json({ error: "Failed to add member" });
    }
  });

  app.get("/api/companies/:companyId/task-categories", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = await storage.isAdmin(req.user!.id);
      if (!isAdmin) {
        const membership = await storage.getCompanyMembership(req.params.companyId, req.user!.id);
        if (!membership) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      const categories = await storage.getTaskCategories(req.params.companyId);
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/companies/:companyId/task-categories", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = await storage.isAdmin(req.user!.id);
      if (!isAdmin) return res.status(403).json({ message: "Admin only" });
      const parsed = insertTaskCategorySchema.safeParse({
        ...req.body,
        companyId: req.params.companyId,
      });
      if (!parsed.success) return res.status(400).json({ message: "Invalid category data", errors: parsed.error.flatten() });
      const category = await storage.createTaskCategory(parsed.data);
      broadcastInvalidation(`companies/${req.params.companyId}/task-categories`);
      res.json(category);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/task-categories/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = await storage.isAdmin(req.user!.id);
      if (!isAdmin) return res.status(403).json({ message: "Admin only" });
      const updateSchema = insertTaskCategorySchema.partial().omit({ companyId: true });
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid category data", errors: parsed.error.flatten() });
      const category = await storage.updateTaskCategory(req.params.id, parsed.data);
      if (!category) return res.status(404).json({ message: "Category not found" });
      broadcastInvalidation(`companies/${category.companyId}/task-categories`);
      res.json(category);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/task-categories/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = await storage.isAdmin(req.user!.id);
      if (!isAdmin) return res.status(403).json({ message: "Admin only" });
      const category = await storage.getTaskCategory(req.params.id);
      if (!category) return res.status(404).json({ message: "Category not found" });
      await storage.deleteTaskCategory(req.params.id);
      broadcastInvalidation(`companies/${category.companyId}/task-categories`);
      broadcastInvalidation("tasks");
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/tasks", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const companyId = req.query.companyId as string | undefined;

      const enrichWithCreatorName = async (tasks: any[]) => {
        const creatorCache = new Map<string, string>();
        return Promise.all(tasks.map(async (t) => {
          if (!t.assignedBy) return { ...t, assignedByName: null };
          if (creatorCache.has(t.assignedBy)) return { ...t, assignedByName: creatorCache.get(t.assignedBy) };
          const creator = await storage.getUser(t.assignedBy);
          const name = creator ? `${creator.firstName || ""} ${creator.lastName || ""}`.trim() || creator.email || "Unknown" : "Unknown";
          creatorCache.set(t.assignedBy, name);
          return { ...t, assignedByName: name };
        }));
      };
      
      if (isAdmin) {
        if (companyId) {
          const tasks = await storage.getTasks(companyId);
          res.json(await enrichWithCreatorName(tasks.filter(t => t.approvalStatus !== "pending_internal_approval")));
        } else {
          const tasks = await storage.getAllTasks();
          res.json(await enrichWithCreatorName(tasks.filter(t => t.approvalStatus !== "pending_internal_approval")));
        }
      } else {
        if (!companyId) {
          return res.status(400).json({ error: "Company ID required" });
        }
        const member = await storage.getCompanyMember(userId, companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
        const tasks = await storage.getTasks(companyId);
        res.json(await enrichWithCreatorName(tasks));
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const data = insertTaskSchema.parse(req.body);
      
      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, data.companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const company = await storage.getCompany(data.companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      if (data.categoryId) {
        const category = await storage.getTaskCategory(data.categoryId);
        if (!category || category.companyId !== data.companyId) {
          return res.status(400).json({ error: "Invalid category for this company" });
        }
      }

      const creditCost = parseFloat(data.creditCost || "1");

      let billingPeriodStart = data.billingPeriodStart;
      let billingPeriodEnd = data.billingPeriodEnd;
      let dueDate = data.dueDate;

      if (data.isRecurring) {
        const { getBillingPeriod, getRecurringTaskDueDate, getWeekdayRecurringTaskDueDate, getBiweeklyRecurringTaskDueDate } = await import("@shared/billing");
        const period = getBillingPeriod(company.billingStartDay);
        billingPeriodStart = period.startStr;
        billingPeriodEnd = period.endStr;
        
        const pattern = data.recurrencePattern || 'day_of_month';
        
        // Validate required fields based on pattern
        if (pattern === 'day_of_month') {
          if (data.recurrenceDay === null || data.recurrenceDay === undefined) {
            return res.status(400).json({ error: "Day of month is required for day_of_month recurrence pattern" });
          }
          dueDate = formatDateLocal(getRecurringTaskDueDate(data.recurrenceDay, period));
        } else if (pattern === 'day_of_week') {
          if (data.recurrenceWeekday === null || data.recurrenceWeekday === undefined) {
            return res.status(400).json({ error: "Weekday is required for day_of_week recurrence pattern" });
          }
          if (data.recurrenceWeekOrdinal === null || data.recurrenceWeekOrdinal === undefined) {
            return res.status(400).json({ error: "Week ordinal is required for day_of_week recurrence pattern" });
          }
          dueDate = formatDateLocal(getWeekdayRecurringTaskDueDate(data.recurrenceWeekday, data.recurrenceWeekOrdinal, period));
        } else if (pattern === 'biweekly') {
          if (data.recurrenceWeekday === null || data.recurrenceWeekday === undefined) {
            return res.status(400).json({ error: "Weekday is required for biweekly recurrence pattern" });
          }
          dueDate = formatDateLocal(getBiweeklyRecurringTaskDueDate(data.recurrenceWeekday, period));
        }
      }

      const isClientRequest = data.type === "requested";
      const isSandboxClientRequest = isAdmin && isClientRequest && data.companyId === "sandbox-company-001";
      // Auto-detect rush for client-requested tasks (not campaign or cadence auto-created)
      let isAutoRush = false;
      if ((!isAdmin || isSandboxClientRequest) && isClientRequest && !data.campaignRequestId && !data.cadenceId && dueDate) {
        const rushToday = new Date();
        rushToday.setHours(0, 0, 0, 0);
        const dueDateObj = new Date(dueDate);
        const rushDiffMs = dueDateObj.getTime() - rushToday.getTime();
        const rushDaysUntilDue = Math.ceil(rushDiffMs / (1000 * 60 * 60 * 24));
        if (rushDaysUntilDue <= 14 && rushDaysUntilDue >= 1) {
          isAutoRush = true;
        }
      }
      let memberRole: string | null = null;
      if (!isAdmin) {
        const memberRecord = await storage.getCompanyMember(userId, data.companyId);
        memberRole = memberRecord?.role || "team_member";
      }
      const isTeamMember = !isAdmin && memberRole === "team_member";
      const approvalStatus = (isAdmin && !isSandboxClientRequest) ? "approved" : (isClientRequest ? (isTeamMember ? "pending_internal_approval" : "pending_approval") : "approved");
      
      const taskOwnership = (isAdmin && !isSandboxClientRequest) ? (data.taskOwnership || "agency") : "client";
      
      const bulkQuantity = data.bulkQuantity || 1;
      const perUnitCost = creditCost;
      const rushMultiplier = isAutoRush ? 2 : 1;
      const totalCreditCost = data.noCredit ? 0 : perUnitCost * bulkQuantity * rushMultiplier;

      {
        const task = await storage.createTask({
          ...data,
          creditCost: data.noCredit ? "0" : (data.deliverableType ? String(totalCreditCost) : String(creditCost * rushMultiplier)),
          priority: isAutoRush ? "urgent" : data.priority,
          notes: isAutoRush ? "[RUSH] Auto-detected rush order - due within 14 days" : data.notes,
          assignedBy: userId,
          creditsDeducted: false,
          billingPeriodStart,
          billingPeriodEnd,
          dueDate,
          approvalStatus,
          noCredit: data.noCredit || false,
          taskOwnership,
          bulkQuantity: bulkQuantity > 1 ? bulkQuantity : null,
        });

        if (data.assignedTo) {
          try {
            await storage.addTaskAssignee({ taskId: task.id, userId: data.assignedTo });
          } catch (err) {
            console.error("Failed to sync primary assignee:", err);
          }
        }

        if (data.assignedTo && isAdmin) {
          try {
            await createAndBroadcastNotification({
              userId: data.assignedTo,
              type: "task_assigned",
              title: "New Task Assigned",
              message: `You have been assigned to: ${task.title}`,
              link: `/client/tasks?taskId=${task.id}`,
              createdBy: userId,
              relatedTaskId: task.id,
            });
            
            const assigneeUser = await storage.getUser(data.assignedTo);
            if (assigneeUser?.email) {
              sendTaskAssignmentEmail({
                recipientEmail: assigneeUser.email,
                recipientName: [assigneeUser.firstName, assigneeUser.lastName].filter(Boolean).join(' ') || 'Team Member',
                taskTitle: task.title,
                taskDescription: task.description || undefined,
                dueDate: task.dueDate || undefined,
                priority: task.priority,
                companyName: company.name,
                portalUrl: `${process.env.REPLIT_DEPLOYMENT_URL || 'https://localhost:5000'}/client/tasks?taskId=${task.id}`,
              }).catch(err => console.error("Failed to send task assignment email:", err));
            }
          } catch (notifError) {
            console.error("Failed to create task assignment notification:", notifError);
          }
        }

        if (approvalStatus === "pending_internal_approval") {
          try {
            const companyMembers = await storage.getCompanyMembers(data.companyId);
            const allApprovers = companyMembers.filter(m => m.role === "company_owner" || m.role === "company_admin");

            // Tag-based routing: if team member has tags, only notify approvers who share a tag
            const submitterTags = await storage.getUserTagAssignments(userId);
            let approversToNotify = allApprovers;

            if (submitterTags.length > 0) {
              const submitterTagIds = new Set(submitterTags.map(t => t.tagId));
              const taggedApprovers = [];
              for (const approver of allApprovers) {
                const approverTags = await storage.getUserTagAssignments(approver.userId);
                const hasMatchingTag = approverTags.some(t => submitterTagIds.has(t.tagId));
                if (hasMatchingTag) {
                  taggedApprovers.push(approver);
                }
              }
              // Only filter if at least one approver matches; otherwise fall back to all
              if (taggedApprovers.length > 0) {
                approversToNotify = taggedApprovers;
              }
            }

            for (const approver of approversToNotify) {
              await createAndBroadcastNotification({
                userId: approver.userId,
                type: "task_review_request",
                title: "Team Member Task Request",
                message: `A team member submitted a task request that needs your approval: "${task.title}"`,
                link: `/client/tasks?taskId=${task.id}`,
                createdBy: userId,
                relatedTaskId: task.id,
              });
            }
          } catch (notifErr) {
            console.error("Failed to notify company approvers of task request:", notifErr);
          }
        } else if (approvalStatus === "pending_approval") {
          try {
            const admins = await storage.getAllAdminUsers();
            for (const admin of admins) {
              await createAndBroadcastNotification({
                userId: admin.id,
                type: "task_review_request",
                title: "New Task Request",
                message: `${company.name} submitted a task request: "${task.title}"`,
                link: `/admin/companies/${task.companyId}?tab=pending_approval`,
                createdBy: userId,
                relatedTaskId: task.id,
              });
            }
          } catch (notifErr) {
            console.error("Failed to notify admins of task request:", notifErr);
          }
        }

        checkProjectedUsageAndNotify(data.companyId).catch(() => {});

        broadcastInvalidation(["/api/tasks", "/api/companies", "/api/notifications"]);
        res.status(201).json(task);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      const existingTask = await storage.getTask(req.params.id);
      if (!existingTask) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      if (!isAdmin) {
        const membership = await storage.getCompanyMembership(existingTask.companyId, userId);
        const isCompanyOwnerOrAdmin = membership && (membership.role === "company_owner" || membership.role === "company_admin");

        if (isCompanyOwnerOrAdmin) {
          if (existingTask.taskOwnership === "agency") {
            return res.status(403).json({ error: "Agency-managed tasks can only be updated by agency admins. Use approve/request changes for review tasks." });
          }
          const isPendingTask = existingTask.approvalStatus === "pending_internal_approval" || existingTask.approvalStatus === "pending_approval";
          const allowedFields = isPendingTask ? ["status", "deliverableType", "creditCost"] : ["status"];
          const bodyKeys = Object.keys(req.body);
          const hasDisallowedFields = bodyKeys.some(k => !allowedFields.includes(k));
          if (hasDisallowedFields) {
            return res.status(403).json({ error: isPendingTask ? "Company admins can only change status and deliverable type on pending tasks" : "Company admins can only change task status" });
          }
        } else if (existingTask.taskOwnership === "client") {
          const allowedClientStatusChanges = ["pending", "in_progress", "review", "completed"];
          if (req.body.status && !allowedClientStatusChanges.includes(req.body.status)) {
            return res.status(403).json({ error: "Invalid status change for client-owned task" });
          }
          const allowedFields = ["status"];
          const bodyKeys = Object.keys(req.body);
          const hasDisallowedFields = bodyKeys.some(k => !allowedFields.includes(k));
          if (hasDisallowedFields) {
            return res.status(403).json({ error: "Clients can only change status on client-owned tasks" });
          }
        } else {
          return res.status(403).json({ error: "Only admins or company owners/admins can update this task" });
        }
      }

      if (req.body.categoryId !== undefined && req.body.categoryId !== null) {
        const category = await storage.getTaskCategory(req.body.categoryId);
        if (!category || category.companyId !== existingTask.companyId) {
          return res.status(400).json({ error: "Invalid category for this company" });
        }
      }

      // Check if assignee is being changed and send notification
      const newAssignee = req.body.assignedTo;
      const assigneeChanged = newAssignee && newAssignee !== existingTask.assignedTo;

      // Auto-sync taskOwnership based on assignee
      if (newAssignee !== undefined && isAdmin) {
        if (!newAssignee) {
          req.body.taskOwnership = "agency";
        } else {
          const assigneeIsAdmin = await storage.isAdmin(newAssignee);
          req.body.taskOwnership = assigneeIsAdmin ? "agency" : "client";
        }
      }

      // Ownership lock: clients cannot change taskOwnership on in-progress or beyond tasks
      if (req.body.taskOwnership !== undefined && req.body.taskOwnership !== existingTask.taskOwnership) {
        const activeStatuses = ["in_progress", "review", "approved", "completed"];
        if (!isAdmin && activeStatuses.includes(existingTask.status)) {
          return res.status(403).json({ error: "Task ownership cannot be changed while the task is in progress" });
        }
      }

      const newStatus = req.body.status;
      if (newStatus === "completed" && existingTask.status !== "completed") {
        req.body.completedAt = new Date().toISOString();
        req.body.completedBy = userId;
        const completer = await storage.getUser(userId);
        req.body.completedByName = completer ? `${completer.firstName || ""} ${completer.lastName || ""}`.trim() || completer.email : "Unknown";
      }

      let creditActionTaken = false;
      const effectiveTaskOwnership = req.body.taskOwnership || existingTask.taskOwnership;
      const effectiveNoCredit = req.body.noCredit !== undefined ? req.body.noCredit : existingTask.noCredit;
      const isAgencyTask = effectiveTaskOwnership === "agency" && !effectiveNoCredit;

      // ---- CREDIT DEDUCTION AT "IN PROGRESS" ----
      if (newStatus === "in_progress" && existingTask.status !== "in_progress" && !existingTask.creditsDeducted && isAgencyTask) {
        const company = await storage.getCompany(existingTask.companyId);
        if (!company) {
          return res.status(404).json({ error: "Company not found" });
        }
        const creditCost = parseFloat(req.body.creditCost || existingTask.creditCost);
        if (creditCost > 0 && company.credits < creditCost) {
          return res.status(400).json({ error: "Insufficient credits to start this task. Please purchase more credits or contact the agency." });
        }
        if (creditCost > 0) {
          const newBalance = company.credits - creditCost;
          await storage.updateCompany(company.id, { credits: newBalance });
          await storage.createCreditTransaction({
            companyId: company.id,
            taskId: existingTask.id,
            amount: String(-creditCost),
            type: "task_deduction",
            description: `Task started: ${existingTask.title}`,
            balanceAfter: String(newBalance),
          });
          req.body.creditsDeducted = true;
          req.body.creditsDeductedAt = new Date().toISOString();
          req.body.creditCostAtDeduction = String(creditCost);
          creditActionTaken = true;

          // Low credit warning
          const lowCreditThreshold = 10;
          if (newBalance <= lowCreditThreshold && company.credits > lowCreditThreshold) {
            const members = await storage.getCompanyMembers(company.id);
            const owners = members.filter(m => m.role === "owner" || m.role === "admin");
            const baseUrl = process.env.REPLIT_DEPLOYMENT
              ? `https://${(process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || "").split(",")[0]}`
              : process.env.REPLIT_DEV_DOMAIN 
                ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
                : "http://localhost:5000";
            for (const member of owners) {
              const user = await storage.getUser(member.userId);
              if (user?.email) {
                sendLowCreditWarningEmail({
                  recipientEmail: user.email,
                  recipientName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
                  companyName: company.name,
                  currentBalance: newBalance,
                  warningThreshold: lowCreditThreshold,
                  storeUrl: `${baseUrl}/client/credit-store`,
                }).catch(err => console.error("Failed to send low credit warning email:", err));
              }
            }
          }
        }
      }

      // ---- CREDIT DEDUCTION AT "COMPLETED" (skipping in_progress) ----
      if (newStatus === "completed" && existingTask.status !== "completed" && !existingTask.creditsDeducted && isAgencyTask) {
        const company = await storage.getCompany(existingTask.companyId);
        if (!company) {
          return res.status(404).json({ error: "Company not found" });
        }
        const creditCost = parseFloat(req.body.creditCost || existingTask.creditCost);
        if (creditCost > 0 && company.credits < creditCost) {
          return res.status(400).json({ error: "Insufficient credits to complete this task. Please purchase more credits or contact the agency." });
        }
        if (creditCost > 0) {
          const newBalance = company.credits - creditCost;
          await storage.updateCompany(company.id, { credits: newBalance });
          await storage.createCreditTransaction({
            companyId: company.id,
            taskId: existingTask.id,
            amount: String(-creditCost),
            type: "task_deduction",
            description: `Task completed: ${existingTask.title}`,
            balanceAfter: String(newBalance),
          });
          req.body.creditsDeducted = true;
          req.body.creditsDeductedAt = new Date().toISOString();
          req.body.creditCostAtDeduction = String(creditCost);
          creditActionTaken = true;
        }
      }

      // ---- REFUND CREDITS WHEN GOING BACK TO PENDING ----
      if (newStatus === "pending" && existingTask.status === "in_progress" && existingTask.creditsDeducted) {
        const company = await storage.getCompany(existingTask.companyId);
        if (company) {
          const refundAmount = parseFloat(existingTask.creditCostAtDeduction || existingTask.creditCost);
          if (refundAmount > 0) {
            const newBalance = company.credits + refundAmount;
            await storage.updateCompany(company.id, { credits: newBalance });
            await storage.createCreditTransaction({
              companyId: company.id,
              taskId: existingTask.id,
              amount: String(refundAmount),
              type: "credit_refund",
              description: `Task reverted to pending: ${existingTask.title}`,
              balanceAfter: String(newBalance),
            });
            req.body.creditsDeducted = false;
            req.body.creditsDeductedAt = null;
            req.body.creditCostAtDeduction = null;
            creditActionTaken = true;
          }
        }
      }

      // ---- REFUND CREDITS WHEN TASK IS REJECTED ----
      if (newStatus === "rejected" && existingTask.creditsDeducted) {
        const company = await storage.getCompany(existingTask.companyId);
        if (company) {
          const refundAmount = parseFloat(existingTask.creditCostAtDeduction || existingTask.creditCost);
          if (refundAmount > 0) {
            const newBalance = company.credits + refundAmount;
            await storage.updateCompany(company.id, { credits: newBalance });
            await storage.createCreditTransaction({
              companyId: company.id,
              taskId: existingTask.id,
              amount: String(refundAmount),
              type: "credit_refund",
              description: `Task rejected: ${existingTask.title}`,
              balanceAfter: String(newBalance),
            });
            req.body.creditsDeducted = false;
            req.body.creditsDeductedAt = null;
            req.body.creditCostAtDeduction = null;
            creditActionTaken = true;
          }
        }
      }

      // ---- CREDIT ADJUSTMENT AT COMPLETION ----
      if (newStatus === "completed" && existingTask.status !== "completed" && existingTask.creditsDeducted && existingTask.creditCostAtDeduction) {
        const currentCost = parseFloat(req.body.creditCost || existingTask.creditCost);
        const deductedCost = parseFloat(existingTask.creditCostAtDeduction);
        const difference = currentCost - deductedCost;
        if (difference !== 0) {
          const company = await storage.getCompany(existingTask.companyId);
          if (company) {
            if (difference > 0 && company.credits < difference) {
              return res.status(400).json({ error: `Insufficient credits for cost adjustment. Additional ${difference} credits needed.` });
            }
            const newBalance = company.credits - difference;
            await storage.updateCompany(company.id, { credits: newBalance });
            await storage.createCreditTransaction({
              companyId: company.id,
              taskId: existingTask.id,
              amount: String(-difference),
              type: "credit_adjustment",
              description: `Credit adjustment at completion: ${existingTask.title} (${deductedCost} → ${currentCost} credits)`,
              balanceAfter: String(newBalance),
            });
            creditActionTaken = true;
          }
        }
      }

      // ---- RECURRING TASK CREATION ON COMPLETION ----
      if (newStatus === "completed" && existingTask.status !== "completed" && existingTask.isRecurring && existingTask.billingPeriodStart && !req.body.endRecurrence) {
        const company = await storage.getCompany(existingTask.companyId);
        if (company) {
          const { getNextBillingPeriod, getRecurringTaskDueDate, getWeekdayRecurringTaskDueDate, getBillingPeriod } = await import("@shared/billing");
          const currentPeriodStart = new Date(existingTask.billingPeriodStart);
          const nextPeriod = getNextBillingPeriod(company.billingStartDay, currentPeriodStart);
          
          let nextDueDate: Date | null = null;
          let taskBillingPeriod = nextPeriod;
          const pattern = existingTask.recurrencePattern || 'day_of_month';
          
          if (pattern === 'day_of_month' && existingTask.recurrenceDay) {
            nextDueDate = getRecurringTaskDueDate(existingTask.recurrenceDay, nextPeriod);
          } else if (pattern === 'day_of_week' && existingTask.recurrenceWeekday !== null && existingTask.recurrenceWeekOrdinal !== null) {
            nextDueDate = getWeekdayRecurringTaskDueDate(existingTask.recurrenceWeekday, existingTask.recurrenceWeekOrdinal, nextPeriod);
          } else if (pattern === 'biweekly' && existingTask.recurrenceWeekday !== null) {
            const currentDueDate = existingTask.dueDate ? new Date(existingTask.dueDate) : new Date();
            nextDueDate = new Date(currentDueDate);
            nextDueDate.setDate(nextDueDate.getDate() + 14);
            taskBillingPeriod = getBillingPeriod(company.billingStartDay, nextDueDate);
          }
          
          if (nextDueDate) {
            await storage.createTask({
              companyId: existingTask.companyId,
              title: existingTask.title,
              description: existingTask.description,
              notes: existingTask.notes,
              priority: existingTask.priority,
              creditCost: existingTask.creditCost,
              type: existingTask.type,
              deliverableType: existingTask.deliverableType,
              dueDate: formatDateLocal(nextDueDate),
              startDate: existingTask.startDate,
              assignedBy: existingTask.assignedBy,
              assignedTo: existingTask.assignedTo,
              isRecurring: true,
              recurrencePattern: existingTask.recurrencePattern,
              recurrenceDay: existingTask.recurrenceDay,
              recurrenceWeekday: existingTask.recurrenceWeekday,
              recurrenceWeekOrdinal: existingTask.recurrenceWeekOrdinal,
              billingPeriodStart: taskBillingPeriod.startStr,
              billingPeriodEnd: taskBillingPeriod.endStr,
              parentTaskId: existingTask.parentTaskId || existingTask.id,
              noCredit: existingTask.noCredit,
              approvalStatus: "approved",
            });
          }
        }
      }

      // ---- ADMIN OWNERSHIP CHANGE CREDIT ADJUSTMENTS ----
      if (isAdmin && req.body.taskOwnership && req.body.taskOwnership !== existingTask.taskOwnership) {
        const activeStatuses = ["in_progress", "review", "approved"];
        if (activeStatuses.includes(existingTask.status)) {
          const company = await storage.getCompany(existingTask.companyId);
          if (company) {
            if (existingTask.taskOwnership === "agency" && req.body.taskOwnership === "client" && existingTask.creditsDeducted) {
              const refundAmount = parseFloat(existingTask.creditCostAtDeduction || existingTask.creditCost);
              if (refundAmount > 0) {
                const newBalance = company.credits + refundAmount;
                await storage.updateCompany(company.id, { credits: newBalance });
                await storage.createCreditTransaction({
                  companyId: company.id,
                  taskId: existingTask.id,
                  amount: String(refundAmount),
                  type: "credit_refund",
                  description: `Ownership changed to client: ${existingTask.title}`,
                  balanceAfter: String(newBalance),
                });
                req.body.creditsDeducted = false;
                req.body.creditsDeductedAt = null;
                req.body.creditCostAtDeduction = null;
                creditActionTaken = true;
              }
            } else if (existingTask.taskOwnership === "client" && req.body.taskOwnership === "agency" && !existingTask.creditsDeducted && !existingTask.noCredit) {
              const creditCost = parseFloat(existingTask.creditCost);
              if (creditCost > 0) {
                if (company.credits < creditCost) {
                  return res.status(400).json({ error: "Insufficient credits to change ownership to agency" });
                }
                const newBalance = company.credits - creditCost;
                await storage.updateCompany(company.id, { credits: newBalance });
                await storage.createCreditTransaction({
                  companyId: company.id,
                  taskId: existingTask.id,
                  amount: String(-creditCost),
                  type: "task_deduction",
                  description: `Ownership changed to agency: ${existingTask.title}`,
                  balanceAfter: String(newBalance),
                });
                req.body.creditsDeducted = true;
                req.body.creditsDeductedAt = new Date().toISOString();
                req.body.creditCostAtDeduction = String(creditCost);
                creditActionTaken = true;
              }
            }
          }
        }
      }

      // ---- ADMIN CREDIT COST EDIT ON ACTIVE/COMPLETED TASK ----
      if (req.body.creditCost !== undefined && isAdmin && existingTask.creditsDeducted) {
        const oldCost = parseFloat(existingTask.creditCostAtDeduction || existingTask.creditCost);
        const newCost = parseFloat(req.body.creditCost);
        const difference = newCost - oldCost;

        if (difference !== 0) {
          const company = await storage.getCompany(existingTask.companyId);
          if (company) {
            if (difference > 0 && company.credits < difference) {
              return res.status(400).json({ error: `Insufficient credits for cost adjustment. Additional ${difference} credits needed.` });
            }
            const newBalance = company.credits - difference;
            await storage.updateCompany(existingTask.companyId, { credits: newBalance });
            await storage.createCreditTransaction({
              companyId: existingTask.companyId,
              taskId: existingTask.id,
              amount: String(-difference),
              type: "credit_adjustment",
              description: `Credit cost updated: ${existingTask.title} (${oldCost} → ${newCost} credits)`,
              balanceAfter: String(newBalance),
            });
            req.body.creditCostAtDeduction = String(newCost);
            creditActionTaken = true;
          }
        }
      }

      // ---- RECURRENCE SETTINGS EDIT (admin only) ----
      if (isAdmin && req.body.isRecurring !== undefined && existingTask.status !== "completed") {
        if (existingTask.cadenceId) {
          return res.status(400).json({ error: "Cannot edit recurrence on cadence-generated tasks" });
        }
        if (req.body.isRecurring) {
          const pattern = req.body.recurrencePattern || existingTask.recurrencePattern || 'day_of_month';
          req.body.recurrencePattern = pattern;
          if (pattern === 'day_of_month') {
            const day = req.body.recurrenceDay ?? existingTask.recurrenceDay;
            if (day === null || day === undefined) {
              return res.status(400).json({ error: "Day of month is required for day_of_month recurrence pattern" });
            }
          } else if (pattern === 'day_of_week') {
            const weekday = req.body.recurrenceWeekday ?? existingTask.recurrenceWeekday;
            const ordinal = req.body.recurrenceWeekOrdinal ?? existingTask.recurrenceWeekOrdinal;
            if (weekday === null || weekday === undefined) {
              return res.status(400).json({ error: "Weekday is required for day_of_week recurrence pattern" });
            }
            if (ordinal === null || ordinal === undefined) {
              return res.status(400).json({ error: "Week ordinal is required for day_of_week recurrence pattern" });
            }
          } else if (pattern === 'biweekly') {
            const weekday = req.body.recurrenceWeekday ?? existingTask.recurrenceWeekday;
            if (weekday === null || weekday === undefined) {
              return res.status(400).json({ error: "Weekday is required for biweekly recurrence pattern" });
            }
          }
          const turningOn = !existingTask.isRecurring;
          if (turningOn) {
            const company = await storage.getCompany(existingTask.companyId);
            if (company) {
              const { getBillingPeriod, getRecurringTaskDueDate, getWeekdayRecurringTaskDueDate, getBiweeklyRecurringTaskDueDate } = await import("@shared/billing");
              const period = getBillingPeriod(company.billingStartDay);
              req.body.billingPeriodStart = period.startStr;
              req.body.billingPeriodEnd = period.endStr;

              if (pattern === 'day_of_month') {
                const day = req.body.recurrenceDay ?? existingTask.recurrenceDay;
                req.body.dueDate = formatDateLocal(getRecurringTaskDueDate(day, period));
              } else if (pattern === 'day_of_week') {
                const weekday = req.body.recurrenceWeekday ?? existingTask.recurrenceWeekday;
                const ordinal = req.body.recurrenceWeekOrdinal ?? existingTask.recurrenceWeekOrdinal;
                req.body.dueDate = formatDateLocal(getWeekdayRecurringTaskDueDate(weekday, ordinal, period));
              } else if (pattern === 'biweekly') {
                const weekday = req.body.recurrenceWeekday ?? existingTask.recurrenceWeekday;
                req.body.dueDate = formatDateLocal(getBiweeklyRecurringTaskDueDate(weekday, period));
              }
            }
          }
        } else {
          req.body.recurrencePattern = null;
          req.body.recurrenceDay = null;
          req.body.recurrenceWeekday = null;
          req.body.recurrenceWeekOrdinal = null;
          req.body.billingPeriodStart = null;
          req.body.billingPeriodEnd = null;
        }
      }

      // ---- REVISION TRACKING (T006) ----
      // When task goes from review back to in_progress (changes requested), increment revision count
      if (newStatus === "in_progress" && existingTask.status === "review") {
        const newRevisionCount = (existingTask.revisionCount || 0) + 1;
        req.body.revisionCount = newRevisionCount;
        if (newRevisionCount > 3 && !existingTask.noCredit && effectiveTaskOwnership === "agency") {
          const revisionCreditCost = 0.25;
          const company = await storage.getCompany(existingTask.companyId);
          if (company) {
            const newCreditCost = parseFloat(req.body.creditCost || existingTask.creditCost) + revisionCreditCost;
            req.body.creditCost = String(newCreditCost);
            if (existingTask.creditsDeducted) {
              const newBalance = company.credits - revisionCreditCost;
              await storage.updateCompany(company.id, { credits: newBalance });
              await storage.createCreditTransaction({
                companyId: company.id,
                taskId: existingTask.id,
                amount: String(-revisionCreditCost),
                type: "revision_charge",
                description: `Revision ${newRevisionCount} charge (+0.25 credits): ${existingTask.title}`,
                balanceAfter: String(newBalance),
              });
              creditActionTaken = true;
            }
          }
        }
      }

      const task = await storage.updateTask(req.params.id, req.body);
      
      if (assigneeChanged && newAssignee) {
        try {
          await storage.addTaskAssignee({ taskId: existingTask.id, userId: newAssignee });
        } catch (err) {
          console.error("Failed to sync assignee to task_assignees:", err);
        }
      }

      if (assigneeChanged && newAssignee) {
        try {
          await createAndBroadcastNotification({
            userId: newAssignee,
            type: "task_assigned",
            title: "New Task Assigned",
            message: `You have been assigned to: ${existingTask.title}`,
            link: `/client/tasks?taskId=${existingTask.id}`,
            createdBy: userId,
            relatedTaskId: existingTask.id,
          });
          
          const assigneeUser = await storage.getUser(newAssignee);
          const company = await storage.getCompany(existingTask.companyId);
          if (assigneeUser?.email && company) {
            sendTaskAssignmentEmail({
              recipientEmail: assigneeUser.email,
              recipientName: [assigneeUser.firstName, assigneeUser.lastName].filter(Boolean).join(' ') || 'Team Member',
              taskTitle: existingTask.title,
              taskDescription: existingTask.description || undefined,
              dueDate: existingTask.dueDate || undefined,
              priority: existingTask.priority,
              companyName: company.name,
              portalUrl: `${process.env.REPLIT_DEPLOYMENT_URL || 'https://localhost:5000'}/client/tasks?taskId=${existingTask.id}`,
            }).catch(err => console.error("Failed to send task assignment email:", err));
          }
        } catch (notifError) {
          console.error("Failed to create task assignment notification:", notifError);
        }
      }
      
      // Auto-message and schedule close for task chats when task is completed
      if (newStatus === "completed" && existingTask.status !== "completed") {
        try {
          const taskThread = await storage.getChatThreadByTask(existingTask.id);
          if (taskThread && !taskThread.closedAt) {
            const fiveDaysFromNow = new Date();
            fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
            
            await storage.createChatMessage({
              threadId: taskThread.id,
              senderId: userId,
              content: `This task has been marked as completed. This chat will automatically close in 5 days.`,
            });
            
            await storage.updateChatThread(taskThread.id, {
              autoCloseAt: fiveDaysFromNow.toISOString(),
            });
            
            console.log(`Task ${existingTask.id} completed - chat ${taskThread.id} scheduled to close on ${fiveDaysFromNow.toISOString()}`);
          }
        } catch (chatError) {
          console.error("Failed to send task completion message to chat:", chatError);
        }
      }
      
      // Send email notification for status changes
      if (newStatus && newStatus !== existingTask.status && existingTask.assignedTo) {
        try {
          const assigneeUser = await storage.getUser(existingTask.assignedTo);
          const company = await storage.getCompany(existingTask.companyId);
          if (assigneeUser?.email && company) {
            sendTaskStatusChangeEmail({
              recipientEmail: assigneeUser.email,
              recipientName: [assigneeUser.firstName, assigneeUser.lastName].filter(Boolean).join(' ') || 'Team Member',
              taskTitle: existingTask.title,
              oldStatus: existingTask.status,
              newStatus: newStatus,
              companyName: company.name,
              portalUrl: `${process.env.REPLIT_DEPLOYMENT_URL || 'https://localhost:5000'}/client/tasks?taskId=${existingTask.id}`,
            }).catch(err => console.error("Failed to send task status change email:", err));
          }
        } catch (emailError) {
          console.error("Failed to send task status change email:", emailError);
        }
      }

      // Send notification + email to company admins when agency task moves to review
      if (newStatus === "review" && existingTask.status !== "review" && effectiveTaskOwnership === "agency") {
        try {
          const company = await storage.getCompany(existingTask.companyId);
          if (company) {
            const companyMembers = await storage.getCompanyMembers(existingTask.companyId);
            const adminsAndOwners = companyMembers.filter(m => m.role === "company_owner" || m.role === "company_admin");

            for (const admin of adminsAndOwners) {
              await createAndBroadcastNotification({
                userId: admin.userId,
                type: "task_review_request",
                title: "Task Ready for Review",
                message: `"${existingTask.title}" is ready for your review and approval.`,
                link: `/client/tasks?taskId=${existingTask.id}`,
                createdBy: userId,
                relatedTaskId: existingTask.id,
              });

              const adminUser = await storage.getUser(admin.userId);
              if (adminUser?.email) {
                sendTaskInReviewEmail({
                  recipientEmail: adminUser.email,
                  recipientName: [adminUser.firstName, adminUser.lastName].filter(Boolean).join(' ') || 'Team Member',
                  taskTitle: existingTask.title,
                  companyName: company.name,
                  portalUrl: `${process.env.REPLIT_DEPLOYMENT_URL || 'https://localhost:5000'}/client/tasks?taskId=${existingTask.id}`,
                }).catch(err => console.error("Failed to send task in-review email:", err));
              }
            }
          }
        } catch (reviewNotifError) {
          console.error("Failed to send task review notifications:", reviewNotifError);
        }
      }

      if (newStatus && newStatus !== existingTask.status) {
        checkProjectedUsageAndNotify(existingTask.companyId).catch(err => console.error("Projected usage check failed:", err));
      }

      // Auto-complete campaign when all associated tasks are done
      if (newStatus === "completed" && existingTask.campaignRequestId) {
        try {
          const allTasks = await storage.getAllTasks();
          const campaignTasks = allTasks.filter(t => t.campaignRequestId === existingTask.campaignRequestId);
          const allTasksComplete = campaignTasks.every(t => t.status === "completed");
          
          if (allTasksComplete) {
            await storage.updateCampaignRequest(existingTask.campaignRequestId, { status: "completed" });
            console.log(`Campaign ${existingTask.campaignRequestId} auto-completed - all tasks done`);
          }
        } catch (campaignErr) {
          console.error("Failed to auto-complete campaign:", campaignErr);
        }
      }
      
      broadcastInvalidation(["/api/tasks", "/api/companies", "/api/notifications", "/api/admin/campaign-requests"]);
      res.json(task);
    } catch (error: any) {
      console.error("Failed to update task:", error?.message || error, error?.stack);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.get("/api/tasks/campaign/:campaignRequestId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const allTasks = await storage.getAllTasks();
      const campaignTasks = allTasks.filter(t => t.campaignRequestId === req.params.campaignRequestId);
      res.json(campaignTasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaign tasks" });
    }
  });

  app.patch("/api/tasks/:id/completed-by", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      if (task.status !== "completed") {
        return res.status(400).json({ error: "Task must be completed to change who completed it" });
      }

      const { completedByUserId } = req.body;
      if (!completedByUserId) {
        return res.status(400).json({ error: "completedByUserId is required" });
      }

      const newCompleter = await storage.getUser(completedByUserId);
      if (!newCompleter) {
        return res.status(404).json({ error: "User not found" });
      }

      const newCompleterIsAdmin = await storage.isAdmin(completedByUserId);
      const wasDeducted = task.creditsDeducted;
      const isNoCredit = task.noCredit;
      const creditCost = parseFloat(task.creditCost);
      const company = await storage.getCompany(task.companyId);

      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      const updateData: Record<string, unknown> = {
        completedBy: completedByUserId,
        completedByName: `${newCompleter.firstName || ""} ${newCompleter.lastName || ""}`.trim() || newCompleter.email || "Unknown",
      };

      if (newCompleterIsAdmin && !wasDeducted && !isNoCredit && creditCost > 0) {
        const newBalance = Math.max(0, company.credits - creditCost);
        await storage.updateCompany(company.id, { credits: newBalance });
        await storage.createCreditTransaction({
          companyId: company.id,
          taskId: task.id,
          amount: String(-creditCost),
          type: "task_deduction",
          description: `Task completed by agency: ${task.title}`,
          balanceAfter: String(newBalance),
        });
        updateData.creditsDeducted = true;
      } else if (!newCompleterIsAdmin && wasDeducted && !isNoCredit && creditCost > 0) {
        const newBalance = company.credits + creditCost;
        await storage.updateCompany(company.id, { credits: newBalance });
        await storage.createCreditTransaction({
          companyId: company.id,
          taskId: task.id,
          amount: String(creditCost),
          type: "task_deduction",
          description: `Credit refund - task completed by client (self-service): ${task.title}`,
          balanceAfter: String(newBalance),
        });
        updateData.creditsDeducted = false;
      }

      const updatedTask = await storage.updateTask(req.params.id, updateData);

      broadcastInvalidation(["/api/tasks", "/api/companies"]);
      res.json(updatedTask);
    } catch (error) {
      console.error("Failed to update task completed by:", error);
      res.status(500).json({ error: "Failed to update task completed by" });
    }
  });

  app.post("/api/tasks/:id/approve", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, task.companyId);
        if (!member) {
          return res.status(403).json({ error: "Not authorized to review this task" });
        }
      }

      const { approvalStatus, deliverableType, creditCost, noCredit, rejectionReason, taskOwnership, assignedTo } = req.body;
      
      if (!approvalStatus || !["approved", "rejected"].includes(approvalStatus)) {
        return res.status(400).json({ error: "Invalid approval status" });
      }

      const updateData: Record<string, unknown> = {
        approvalStatus,
      };

      if (isAdmin) {
        updateData.noCredit = noCredit || false;
        if (approvalStatus === "approved") {
          if (deliverableType) {
            updateData.deliverableType = deliverableType;
          }
          if (creditCost !== undefined) {
            updateData.creditCost = String(creditCost);
          }
          if (taskOwnership && ["agency", "client"].includes(taskOwnership)) {
            updateData.taskOwnership = taskOwnership;
          }
          if (assignedTo) {
            updateData.assignedTo = assignedTo;
          }
        }
      }

      if (approvalStatus === "rejected") {
        if (task.status === "review") {
          updateData.status = "in_progress";
          updateData.approvalStatus = "approved";
          const newRevisionCount = (task.revisionCount || 0) + 1;
          updateData.revisionCount = newRevisionCount;
          if (newRevisionCount > 3 && !task.noCredit && task.taskOwnership === "agency") {
            const revisionCreditCost = 0.25;
            const taskCompany = await storage.getCompany(task.companyId);
            if (taskCompany) {
              const newCreditCost = parseFloat(task.creditCost) + revisionCreditCost;
              updateData.creditCost = String(newCreditCost);
              if (task.creditsDeducted) {
                const newBalance = taskCompany.credits - revisionCreditCost;
                await storage.updateCompany(taskCompany.id, { credits: newBalance });
                await storage.createCreditTransaction({
                  companyId: taskCompany.id,
                  taskId: task.id,
                  amount: String(-revisionCreditCost),
                  type: "revision_charge",
                  description: `Revision ${newRevisionCount} charge (+0.25 credits): ${task.title}`,
                  balanceAfter: String(newBalance),
                });
              }
            }
          }
        } else {
          updateData.status = "rejected";
          if (task.creditsDeducted) {
            const taskCompany = await storage.getCompany(task.companyId);
            if (taskCompany) {
              const refundAmount = parseFloat(task.creditCostAtDeduction || task.creditCost);
              if (refundAmount > 0) {
                const newBalance = taskCompany.credits + refundAmount;
                await storage.updateCompany(taskCompany.id, { credits: newBalance });
                await storage.createCreditTransaction({
                  companyId: taskCompany.id,
                  taskId: task.id,
                  amount: String(refundAmount),
                  type: "credit_refund",
                  description: `Task rejected: ${task.title}`,
                  balanceAfter: String(newBalance),
                });
                updateData.creditsDeducted = false;
                updateData.creditsDeductedAt = null;
                updateData.creditCostAtDeduction = null;
              }
            }
          }
        }
      } else if (approvalStatus === "approved" && task.status === "review") {
        updateData.status = "approved";
      }

      const updatedTask = await storage.updateTask(req.params.id, updateData);
      
      const company = await storage.getCompany(task.companyId);
      
      if (approvalStatus === "approved") {
        const adminUsers = await storage.getAllAdminUsers();
        for (const admin of adminUsers) {
          try {
            await createAndBroadcastNotification({
              userId: admin.userId,
              type: "task_approved",
              title: "Task Approved",
              message: `Task "${task.title}" has been approved and is ready to be completed.`,
              link: `/admin/companies/${task.companyId}`,
              createdBy: userId,
              relatedTaskId: task.id,
            });
          } catch (notifErr) {
            console.error("Failed to create approval notification:", notifErr);
          }
        }
      }
      
      if (approvalStatus === "rejected") {
        const isReviewRejection = !isAdmin && task.status === "review";
        
        if (rejectionReason) {
          try {
            let taskThread = await storage.getChatThreadByTask(task.id);
            if (!taskThread) {
              taskThread = await storage.createChatThread({
                companyId: task.companyId,
                name: task.title,
                type: "task",
                taskId: task.id,
                createdBy: userId,
              });
              const addedMemberIds = new Set<string>();
              const adminUsers2 = await storage.getAllAdminUsers();
              for (const admin of adminUsers2) {
                if (!addedMemberIds.has(admin.userId)) {
                  await storage.addChatThreadMember({
                    threadId: taskThread.id,
                    userId: admin.userId,
                    isAdmin: true,
                    joinedAt: new Date().toISOString(),
                  });
                  addedMemberIds.add(admin.userId);
                }
              }
              if (!addedMemberIds.has(userId)) {
                await storage.addChatThreadMember({
                  threadId: taskThread.id,
                  userId: userId,
                  isAdmin: false,
                  joinedAt: new Date().toISOString(),
                });
                addedMemberIds.add(userId);
              }
              if (task.assignedTo && !addedMemberIds.has(task.assignedTo)) {
                await storage.addChatThreadMember({
                  threadId: taskThread.id,
                  userId: task.assignedTo,
                  isAdmin: false,
                  joinedAt: new Date().toISOString(),
                });
                addedMemberIds.add(task.assignedTo);
              }
              if (task.assignedBy && !addedMemberIds.has(task.assignedBy)) {
                await storage.addChatThreadMember({
                  threadId: taskThread.id,
                  userId: task.assignedBy,
                  isAdmin: false,
                  joinedAt: new Date().toISOString(),
                });
                addedMemberIds.add(task.assignedBy);
              }
            } else {
              const ensureMember = async (uid: string) => {
                const existing = await storage.getChatThreadMember(taskThread!.id, uid);
                if (!existing) {
                  await storage.addChatThreadMember({
                    threadId: taskThread!.id,
                    userId: uid,
                    isAdmin: false,
                    joinedAt: new Date().toISOString(),
                  });
                }
              };
              await ensureMember(userId);
              if (task.assignedTo) await ensureMember(task.assignedTo);
            }
            await storage.createChatMessage({
              threadId: taskThread.id,
              senderId: userId,
              content: isReviewRejection 
                ? `Changes requested by client: ${rejectionReason}`
                : `Task rejected: ${rejectionReason}`,
            });
          } catch (chatErr) {
            console.error("Failed to create rejection chat message:", chatErr);
          }
        }

        const adminUsers = await storage.getAllAdminUsers();
        for (const admin of adminUsers) {
          try {
            await createAndBroadcastNotification({
              userId: admin.userId,
              type: isReviewRejection ? "task_changes_requested" : "task_rejected",
              title: isReviewRejection ? "Changes Requested by Client" : "Task Rejected",
              message: isReviewRejection
                ? `The client has requested changes on "${task.title}". Task moved back to In Progress.${rejectionReason ? ` Feedback: ${rejectionReason}` : ""}`
                : `The task "${task.title}" has been rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ""}`,
              link: `/admin/companies/${task.companyId}`,
              createdBy: userId,
              relatedTaskId: task.id,
            });
          } catch (notifErr) {
            console.error("Failed to create rejection notification:", notifErr);
          }
        }

        try {
          if (company) {
            const baseUrl = process.env.REPLIT_DEPLOYMENT
              ? `https://${(process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || "").split(",")[0]}`
              : process.env.REPLIT_DEV_DOMAIN 
                ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
                : "http://localhost:5000";
            
            const { sendTaskRejectionEmail } = await import("./email");
            for (const admin of adminUsers) {
              const adminUser = await storage.getUser(admin.userId);
              if (adminUser?.email) {
                sendTaskRejectionEmail({
                  recipientEmail: adminUser.email,
                  recipientName: `${adminUser.firstName || ""} ${adminUser.lastName || ""}`.trim() || adminUser.email,
                  taskTitle: task.title,
                  companyName: company.name,
                  portalUrl: `${baseUrl}/admin/companies/${task.companyId}`,
                }).catch(err => console.error("Failed to send task rejection email:", err));
              }
            }
          }
        } catch (emailErr) {
          console.error("Error preparing rejection email:", emailErr);
        }
      }
      
      broadcastInvalidation(["/api/tasks", "/api/companies", "/api/notifications", "/api/admin/campaign-requests"]);
      res.json(updatedTask);
    } catch (error: any) {
      console.error("Failed to review task:", error?.message || error);
      res.status(500).json({ error: "Failed to review task" });
    }
  });

  app.post("/api/admin/tasks/bulk-action", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { taskIds, action } = req.body;
      if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({ error: "taskIds array is required" });
      }
      if (!action || !["approve", "reject"].includes(action)) {
        return res.status(400).json({ error: "action must be 'approve' or 'reject'" });
      }

      let succeeded = 0;
      let failed = 0;

      for (const taskId of taskIds) {
        try {
          const task = await storage.getTask(taskId);
          if (!task) { failed++; continue; }

          if (action === "approve") {
            if (task.status !== "review" && task.approvalStatus !== "pending_approval") {
              failed++;
              continue;
            }

            const updateData: Record<string, unknown> = {
              approvalStatus: "approved",
              status: "approved",
            };

            await storage.updateTask(taskId, updateData);

            const adminUsers = await storage.getAllAdminUsers();
            for (const admin of adminUsers) {
              try {
                await createAndBroadcastNotification({
                  userId: admin.userId,
                  type: "task_approved",
                  title: "Task Approved",
                  message: `Task "${task.title}" has been approved and is ready to be completed.`,
                  link: `/admin/companies/${task.companyId}`,
                  createdBy: userId,
                  relatedTaskId: task.id,
                });
              } catch (notifErr) {
                console.error("Failed to create bulk approval notification:", notifErr);
              }
            }

            succeeded++;
          } else {
            if (task.approvalStatus !== "pending_approval" && task.status !== "review") {
              failed++;
              continue;
            }
            await storage.updateTask(taskId, {
              approvalStatus: "rejected",
              status: "rejected",
            });
            succeeded++;
          }
        } catch (err) {
          console.error(`Bulk ${action} failed for task ${taskId}:`, err);
          failed++;
        }
      }

      broadcastInvalidation(["/api/tasks", "/api/companies", "/api/notifications"]);
      res.json({ succeeded, failed, total: taskIds.length });
    } catch (error: any) {
      console.error("Bulk task action failed:", error?.message || error);
      res.status(500).json({ error: "Failed to process bulk action" });
    }
  });

  // Internal approval endpoint for company owners/admins to approve team member tasks
  app.post("/api/tasks/:id/internal-approve", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      if (task.approvalStatus !== "pending_internal_approval") {
        return res.status(400).json({ error: "Task is not pending internal approval" });
      }

      const member = await storage.getCompanyMember(userId, task.companyId);
      if (!member || (member.role !== "company_owner" && member.role !== "company_admin")) {
        if (!isAdmin) {
          return res.status(403).json({ error: "Only Company Owners and Company Admins can approve internal requests" });
        }
      }

      const { action, rejectionReason } = req.body;
      if (!action || !["approve", "reject"].includes(action)) {
        return res.status(400).json({ error: "Invalid action. Must be 'approve' or 'reject'" });
      }

      if (action === "approve") {
        const updatedTask = await storage.updateTask(req.params.id, {
          approvalStatus: "pending_approval",
        });

        const admins = await storage.getAllAdminUsers();
        const company = await storage.getCompany(task.companyId);
        for (const admin of admins) {
          try {
            await createAndBroadcastNotification({
              userId: admin.userId,
              type: "task_review_request",
              title: "New Task Request",
              message: `${company?.name || "A company"} submitted a task request: "${task.title}"`,
              link: `/admin/companies/${task.companyId}?tab=pending_approval`,
              createdBy: userId,
              relatedTaskId: task.id,
            });
          } catch (notifErr) {
            console.error("Failed to notify admins:", notifErr);
          }
        }

        broadcastInvalidation(["/api/tasks", "/api/companies", "/api/notifications"]);
        res.json(updatedTask);
      } else {
        const updatedTask = await storage.updateTask(req.params.id, {
          approvalStatus: "rejected",
          status: "rejected",
        });

        if (task.assignedBy) {
          try {
            await createAndBroadcastNotification({
              userId: task.assignedBy,
              type: "task_rejected",
              title: "Task Request Rejected",
              message: `Your task request "${task.title}" was rejected${rejectionReason ? `: ${rejectionReason}` : ""}`,
              link: `/client/tasks?taskId=${task.id}`,
              createdBy: userId,
              relatedTaskId: task.id,
            });
          } catch (notifErr) {
            console.error("Failed to notify task creator:", notifErr);
          }
        }

        broadcastInvalidation(["/api/tasks", "/api/companies", "/api/notifications"]);
        res.json(updatedTask);
      }
    } catch (error: any) {
      console.error("Failed to process internal approval:", error?.message || error);
      res.status(500).json({ error: "Failed to process internal approval" });
    }
  });

  // Task timer endpoints (admin-only)
  app.post("/api/tasks/:id/timer/start", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Only admins can control task timer" });
      }
      
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      if (task.timerStartedAt) {
        return res.status(400).json({ error: "Timer is already running" });
      }

      const updatedTask = await storage.updateTask(req.params.id, {
        timerStartedAt: new Date().toISOString(),
      });
      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ error: "Failed to start timer" });
    }
  });

  app.post("/api/tasks/:id/timer/stop", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Only admins can control task timer" });
      }
      
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      if (!task.timerStartedAt) {
        return res.status(400).json({ error: "Timer is not running" });
      }

      const startTime = new Date(task.timerStartedAt).getTime();
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      const newTotalTime = (task.totalTimeTracked || 0) + elapsedSeconds;

      const updatedTask = await storage.updateTask(req.params.id, {
        timerStartedAt: null,
        totalTimeTracked: newTotalTime,
      });
      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ error: "Failed to stop timer" });
    }
  });

  app.post("/api/tasks/:id/timer/reset", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Only admins can control task timer" });
      }
      
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const updatedTask = await storage.updateTask(req.params.id, {
        timerStartedAt: null,
        totalTimeTracked: 0,
      });
      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ error: "Failed to reset timer" });
    }
  });

  app.get("/api/credit-transactions", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const companyId = req.query.companyId as string;
      
      if (!companyId) {
        return res.status(400).json({ error: "Company ID required" });
      }
      
      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      
      const transactions = await storage.getCreditTransactions(companyId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/credit-transactions", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Only admins can add credits" });
      }
      
      const { companyId, amount, type, description } = req.body;
      
      if (!companyId || amount === undefined || !type || !description) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      
      const numAmount = parseFloat(amount);
      const newBalance = company.credits + (type === "credit" ? numAmount : -numAmount);
      
      await storage.updateCompany(companyId, { credits: newBalance });
      
      const transaction = await storage.createCreditTransaction({
        companyId,
        amount: type === "credit" ? String(numAmount) : String(-numAmount),
        type,
        description,
        balanceAfter: String(newBalance),
      });
      
      broadcastInvalidation(["/api/companies", "/api/tasks"]);
      res.status(201).json(transaction);
    } catch (error) {
      res.status(500).json({ error: "Failed to create transaction" });
    }
  });

  app.post("/api/admin/companies/:id/recalculate-credits", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const companyId = req.params.id;
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      const result = await auditCompanyCredits(companyId);
      res.json(result);
    } catch (error: any) {
      console.error("Credit audit failed:", error?.message || error);
      res.status(500).json({ error: "Failed to audit credits" });
    }
  });

  app.post("/api/admin/recalculate-all-credits", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const companies = await storage.getAllCompanies();
      let totalDiscrepancies = 0;
      let companiesProcessed = 0;
      const companyResults: Array<{ companyName: string; discrepancies: CreditDiscrepancy[] }> = [];

      for (const company of companies) {
        const result = await auditCompanyCredits(company.id);
        if (result.discrepancies.length > 0) {
          totalDiscrepancies += result.discrepancies.length;
          companyResults.push({ companyName: company.name, discrepancies: result.discrepancies });
        }
        companiesProcessed++;
      }

      res.json({
        companiesProcessed,
        totalDiscrepancies,
        companyResults,
        message: totalDiscrepancies > 0
          ? `Audited ${companiesProcessed} companies. Found ${totalDiscrepancies} discrepancy(ies) across ${companyResults.length} company(ies).`
          : `Audited ${companiesProcessed} companies. All credit records are accurate.`,
      });
    } catch (error: any) {
      console.error("Credit audit failed:", error?.message || error);
      res.status(500).json({ error: "Failed to audit credits" });
    }
  });

  app.get("/api/admin/pending-sharepoint-sync", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = await storage.isAdmin(req.user!.id);
      if (!isAdmin) return res.status(403).json({ error: "Admin access required" });

      const { db } = await import("./db");
      const { mediaSubmissionFiles } = await import("@shared/schema");
      const allFiles = await db.select().from(mediaSubmissionFiles);
      const pendingFiles = allFiles.filter(f => f.sharepointPath?.startsWith("object-storage:"));
      res.json({ count: pendingFiles.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to check pending sync" });
    }
  });

  app.post("/api/admin/sync-to-sharepoint", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = await storage.isAdmin(req.user!.id);
      if (!isAdmin) return res.status(403).json({ error: "Admin access required" });

      const { db } = await import("./db");
      const { mediaSubmissionFiles } = await import("@shared/schema");
      const allFiles = await db.select().from(mediaSubmissionFiles);
      const pendingFiles = allFiles.filter(f => f.sharepointPath?.startsWith("object-storage:"));

      if (pendingFiles.length === 0) {
        return res.json({ total: 0, synced: 0, failed: 0, errors: [] });
      }

      let synced = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const file of pendingFiles) {
        try {
          const objPath = file.sharepointPath!.replace("object-storage:", "");
          const { downloadBuffer } = await import("./object-storage-helpers");
          const { buffer } = await downloadBuffer(objPath);

          const submission = await storage.getMediaSubmission(file.submissionId);
          if (!submission) throw new Error("Submission not found");

          const company = await storage.getCompany(submission.companyId);
          if (!company) throw new Error("Company not found");

          const safeTitle = submission.title.replace(/[<>:"/\\|?*]/g, '_').trim();
          const submissionDate = new Date(submission.createdAt);
          const dateStr = formatDateLongET(submissionDate);
          const folderName = `${safeTitle} (${dateStr})`;

          const fileResult = await uploadToSharePoint(
            company.name,
            file.fileName,
            buffer,
            file.fileType,
            `Media Uploads/${folderName}`,
            company.clientType as "marketing" | "government" || "marketing",
            true
          );

          if (fileResult.success) {
            await storage.updateMediaSubmissionFile(file.id, {
              status: "uploaded",
              sharepointPath: fileResult.path,
              sharepointUrl: fileResult.webUrl,
              lastError: null,
            });

            const { deleteObject } = await import("./object-storage-helpers");
            await deleteObject(objPath);

            if (submission.sharepointFolderPath?.startsWith("object-storage:") || !submission.sharepointFolderPath) {
              const folderPath = fileResult.path ? fileResult.path.substring(0, fileResult.path.lastIndexOf('/')) : undefined;
              const folderUrl = fileResult.webUrl ? fileResult.webUrl.substring(0, fileResult.webUrl.lastIndexOf('/')) : undefined;
              if (folderPath || folderUrl) {
                await storage.updateMediaSubmission(submission.id, {
                  sharepointFolderPath: folderPath || undefined,
                  sharepointFolderUrl: folderUrl || undefined,
                });
              }
            }

            synced++;
          } else {
            throw new Error(fileResult.error || "SharePoint upload failed");
          }
        } catch (err: any) {
          failed++;
          errors.push(`${file.fileName}: ${err.message}`);
          console.error(`[sync] Failed to sync file ${file.id}:`, err.message);
        }
      }

      res.json({ total: pendingFiles.length, synced, failed, errors });
    } catch (error: any) {
      console.error("SharePoint sync failed:", error);
      res.status(500).json({ error: "Failed to sync files to SharePoint" });
    }
  });

  app.get("/api/admin/media-files", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = await storage.isAdmin(req.user!.id);
      if (!isAdmin) return res.status(403).json({ error: "Admin access required" });

      const { db } = await import("./db");
      const { mediaSubmissionFiles, mediaSubmissions } = await import("@shared/schema");
      const { eq, sql } = await import("drizzle-orm");
      const companyFilter = req.query.companyId as string | undefined;

      const allSubmissions = companyFilter
        ? await db.select().from(mediaSubmissions).where(eq(mediaSubmissions.companyId, companyFilter))
        : await db.select().from(mediaSubmissions);

      const submissionIds = allSubmissions.map(s => s.id);
      if (submissionIds.length === 0) {
        return res.json([]);
      }

      const allFiles = await db.select().from(mediaSubmissionFiles)
        .where(sql`${mediaSubmissionFiles.submissionId} IN (${sql.join(submissionIds.map(id => sql`${id}`), sql`, `)})`);

      const companies = await storage.getAllCompanies();
      const companyMap = new Map(companies.map(c => [c.id, c]));
      const submissionMap = new Map(allSubmissions.map(s => [s.id, s]));

      const enrichedFiles = allFiles.map(file => {
        const submission = submissionMap.get(file.submissionId);
        const company = submission ? companyMap.get(submission.companyId) : undefined;
        return {
          ...file,
          submissionTitle: submission?.title || "Unknown",
          companyId: submission?.companyId || "",
          companyName: company?.name || "Unknown",
          isObjectStorage: file.sharepointPath?.startsWith("object-storage:") || false,
        };
      });

      res.json(enrichedFiles);
    } catch (error) {
      console.error("Failed to fetch media files:", error);
      res.status(500).json({ error: "Failed to fetch media files" });
    }
  });

  app.get("/api/deliverable-types", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const deliverables = await storage.getDeliverableTypes();
      res.json(deliverables);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deliverable types" });
    }
  });

  app.post("/api/deliverable-types", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Only admins can create deliverable types" });
      }
      
      const data = insertDeliverableTypeSchema.parse(req.body);
      const deliverable = await storage.createDeliverableType(data);
      res.status(201).json(deliverable);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create deliverable type" });
    }
  });

  app.patch("/api/deliverable-types/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Only admins can update deliverable types" });
      }
      
      const deliverable = await storage.updateDeliverableType(req.params.id, req.body);
      if (!deliverable) {
        return res.status(404).json({ error: "Deliverable type not found" });
      }
      res.json(deliverable);
    } catch (error) {
      res.status(500).json({ error: "Failed to update deliverable type" });
    }
  });

  app.delete("/api/deliverable-types/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Only admins can delete deliverable types" });
      }
      
      await storage.deleteDeliverableType(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete deliverable type" });
    }
  });

  // Subscription Tier Definitions
  app.get("/api/admin/subscription-tiers", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Only admins can manage subscription tiers" });
      }
      const tiers = await storage.getSubscriptionTierDefinitions();
      res.json(tiers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch subscription tiers" });
    }
  });

  app.post("/api/admin/subscription-tiers", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Only admins can create subscription tiers" });
      }
      const existing = await storage.getSubscriptionTierDefinitionByKey(req.body.key);
      if (existing) {
        return res.status(400).json({ error: "A tier with this key already exists" });
      }
      const tier = await storage.createSubscriptionTierDefinition(req.body);
      res.status(201).json(tier);
    } catch (error) {
      res.status(500).json({ error: "Failed to create subscription tier" });
    }
  });

  app.patch("/api/admin/subscription-tiers/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Only admins can update subscription tiers" });
      }
      const tier = await storage.updateSubscriptionTierDefinition(req.params.id, req.body);
      if (!tier) {
        return res.status(404).json({ error: "Subscription tier not found" });
      }
      res.json(tier);
    } catch (error) {
      res.status(500).json({ error: "Failed to update subscription tier" });
    }
  });

  app.get("/api/admin-users", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Only admins can view admin users" });
      }
      
      const admins = await storage.getAllAdminUsers();
      res.json(admins);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch admin users" });
    }
  });

  app.get("/api/companies/:id/assignees", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Only admins can view assignees" });
      }
      
      const companyId = req.params.id;
      const companyMembersList = await storage.getCompanyMembers(companyId);
      const admins = await storage.getAllAdminUsers();
      
      const companyUserIds = companyMembersList.map(m => m.userId);
      const adminUserIds = admins.map(a => a.userId);
      const allUserIds = [...new Set([...companyUserIds, ...adminUserIds])];
      
      const allCustomRoles = await storage.getCustomRoles();
      const customRolesMap = new Map(allCustomRoles.map(r => [r.id, r.name]));
      const membersByUserId = new Map(companyMembersList.map(m => [m.userId, m]));
      
      const assignees = await Promise.all(
        allUserIds.map(async (uid) => {
          const user = await storage.getUser(uid);
          if (!user) return null;
          const isAdminUser = adminUserIds.includes(uid);
          const isCompanyMember = companyUserIds.includes(uid);
          const membership = membersByUserId.get(uid);
          let roleLabel: string | null = null;
          if (isAdminUser && !isCompanyMember) {
            roleLabel = "Admin";
          } else if (membership) {
            if (membership.role === "company_owner") {
              roleLabel = "Owner";
            } else if (membership.role === "company_admin") {
              roleLabel = "Company Admin";
            } else if (membership.role === "custom" && membership.customRoleId) {
              roleLabel = customRolesMap.get(membership.customRoleId) || "Team Member";
            } else {
              roleLabel = "Team Member";
            }
          }
          return {
            id: uid,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            email: user.email,
            isAdmin: isAdminUser,
            isCompanyMember,
            roleLabel,
          };
        })
      );
      
      res.json(assignees.filter(Boolean));
    } catch (error) {
      console.error("Error fetching assignees:", error);
      res.status(500).json({ error: "Failed to fetch assignees" });
    }
  });

  app.post("/api/admin/make-admin", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const existingAdmins = await storage.isAdmin(userId);
      
      const allCompanies = await storage.getAllCompanies();
      if (allCompanies.length === 0 && !existingAdmins) {
        await storage.createAdminUser({
          userId,
          createdAt: new Date().toISOString(),
        });
        return res.json({ success: true, message: "You are now an admin" });
      }
      
      if (!existingAdmins) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const targetUserId = req.body.userId;
      if (!targetUserId) {
        return res.status(400).json({ error: "User ID required" });
      }
      
      await storage.createAdminUser({
        userId: targetUserId,
        createdAt: new Date().toISOString(),
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to make admin" });
    }
  });

  app.get("/api/admin/users", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isUserAdmin = await storage.isAdmin(userId);
      if (!isUserAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const adminRecords = await storage.getAllAdminUsers();
      const allCompanies = await storage.getAllCompanies();
      
      const adminUsersWithDetails = await Promise.all(
        adminRecords.map(async (admin) => {
          const { db } = await import("./db");
          const { users } = await import("@shared/schema");
          const { eq } = await import("drizzle-orm");
          const [user] = await db.select().from(users).where(eq(users.id, admin.userId));
          return {
            ...admin,
            email: user?.email || "Unknown",
            firstName: user?.firstName || null,
            lastName: user?.lastName || null,
          };
        })
      );

      const companiesWithMembers = await Promise.all(
        allCompanies.map(async (company) => {
          const members = await storage.getCompanyMembers(company.id);
          const { db } = await import("./db");
          const { users } = await import("@shared/schema");
          const { eq } = await import("drizzle-orm");
          
          const membersWithDetails = await Promise.all(
            members.map(async (member) => {
              const [user] = await db.select().from(users).where(eq(users.id, member.userId));
              return {
                ...member,
                email: user?.email || "Unknown",
                firstName: user?.firstName || null,
                lastName: user?.lastName || null,
              };
            })
          );

          return {
            ...company,
            members: membersWithDetails,
          };
        })
      );

      const invitations = await storage.getAdminInvitations();
      const sanitizedInvitations = invitations.map(({ token, ...rest }) => rest);

      res.json({
        admins: adminUsersWithDetails,
        companies: companiesWithMembers,
        adminInvitations: sanitizedInvitations,
      });
    } catch (error) {
      console.error("Failed to fetch users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/invite-admin", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isUserAdmin = await storage.isAdmin(userId);
      if (!isUserAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const existingInvitation = await storage.getAdminInvitationByEmail(email);
      if (existingInvitation && !existingInvitation.usedAt) {
        const expiresAt = new Date(existingInvitation.expiresAt);
        if (expiresAt > new Date()) {
          return res.status(400).json({ error: "An active invitation already exists for this email" });
        }
      }

      const { db } = await import("./db");
      const { users: usersTable } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));
      if (existingUser) {
        const existingAdmin = await storage.getAdminUser(existingUser.id);
        if (existingAdmin) {
          return res.status(400).json({ error: "This user is already an admin" });
        }
      }

      const token = nanoid(32);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await storage.createAdminInvitation({
        email,
        token,
        invitedBy: userId,
        expiresAt: expiresAt.toISOString(),
      });

      const baseUrl = process.env.REPLIT_DEPLOYMENT
        ? `https://${(process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || "").split(",")[0]}`
        : process.env.REPLIT_DEV_DOMAIN
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : "http://localhost:5000";

      const inviteUrl = `${baseUrl}/register?adminInvite=${token}`;

      if (existingUser) {
        await storage.createAdminUser({
          userId: existingUser.id,
          createdAt: new Date().toISOString(),
        });
        await storage.markAdminInvitationUsed(token, existingUser.id);
      }

      const inviterName = `${req.user!.firstName || ""} ${req.user!.lastName || ""}`.trim() || req.user!.email;

      sendAdminInvitationEmail({
        recipientEmail: email,
        inviterName,
        inviteUrl,
        expiresAt: expiresAt.toISOString(),
      }).catch(err => console.error("Failed to send admin invitation email:", err));

      res.json({ 
        success: true, 
        message: existingUser 
          ? "User has been granted admin access and notified by email" 
          : "Invitation sent. They'll become an admin when they register." 
      });
    } catch (error) {
      console.error("Failed to invite admin:", error);
      res.status(500).json({ error: "Failed to send invitation" });
    }
  });

  app.delete("/api/admin/invitations/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isUserAdmin = await storage.isAdmin(userId);
      if (!isUserAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      await storage.deleteAdminInvitation(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete admin invitation:", error);
      res.status(500).json({ error: "Failed to delete invitation" });
    }
  });

  app.delete("/api/admin/revoke-admin/:targetUserId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isUserAdmin = await storage.isAdmin(userId);
      if (!isUserAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const targetUserId = req.params.targetUserId;

      if (targetUserId === userId) {
        return res.status(400).json({ error: "You cannot revoke your own admin access" });
      }

      const allAdmins = await storage.getAllAdminUsers();
      if (allAdmins.length <= 1) {
        return res.status(400).json({ error: "Cannot remove the last admin" });
      }

      const targetAdmin = await storage.getAdminUser(targetUserId);
      if (!targetAdmin) {
        return res.status(404).json({ error: "User is not an admin" });
      }

      await storage.deleteAdminUser(targetUserId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to revoke admin:", error);
      res.status(500).json({ error: "Failed to revoke admin access" });
    }
  });

  app.patch("/api/admin/members/:memberId/role", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isUserAdmin = await storage.isAdmin(userId);
      if (!isUserAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { memberId } = req.params;
      const { role, customRoleId } = req.body;

      const validRoles = ["company_owner", "company_admin", "team_member", "custom"];
      if (!role || !validRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role. Must be one of: company_owner, company_admin, team_member, custom" });
      }

      if (role === "custom" && !customRoleId) {
        return res.status(400).json({ error: "customRoleId is required when role is 'custom'" });
      }

      const resolvedCustomRoleId = role === "custom" ? customRoleId : null;
      const updated = await storage.updateCompanyMemberRole(memberId, role, resolvedCustomRoleId);
      if (!updated) {
        return res.status(404).json({ error: "Member not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Failed to update member role:", error);
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  // Task checklist item routes
  app.get("/api/tasks/:id/checklist", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, task.companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const items = await storage.getTaskChecklistItems(req.params.id);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch checklist items" });
    }
  });

  app.post("/api/tasks/:id/checklist", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, task.companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const data = insertTaskChecklistItemSchema.parse({
        ...req.body,
        taskId: req.params.id,
      });
      const item = await storage.createTaskChecklistItem(data);
      broadcastInvalidation(["/api/tasks"]);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create checklist item" });
    }
  });

  app.patch("/api/checklist-items/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const checklistItem = await storage.getTaskChecklistItem(req.params.id);
      if (!checklistItem) {
        return res.status(404).json({ error: "Checklist item not found" });
      }

      const task = await storage.getTask(checklistItem.taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, task.companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const item = await storage.updateTaskChecklistItem(req.params.id, req.body);
      broadcastInvalidation(["/api/tasks"]);
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to update checklist item" });
    }
  });

  app.delete("/api/checklist-items/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const checklistItem = await storage.getTaskChecklistItem(req.params.id);
      if (!checklistItem) {
        return res.status(404).json({ error: "Checklist item not found" });
      }

      const task = await storage.getTask(checklistItem.taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, task.companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      await storage.deleteTaskChecklistItem(req.params.id);
      broadcastInvalidation(["/api/tasks"]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete checklist item" });
    }
  });

  // Task comments endpoints
  app.get("/api/tasks/:id/comments", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, task.companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const comments = await storage.getTaskComments(req.params.id);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/tasks/:id/comments", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, task.companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const { content } = req.body;
      if (!content || typeof content !== "string" || !content.trim()) {
        return res.status(400).json({ error: "Comment content is required" });
      }

      // Get user name for the comment
      let userName = "Unknown User";
      let userType: "admin" | "client" = "client";
      
      if (isAdmin) {
        const admin = await storage.getAdminUser(userId);
        userName = admin?.name || admin?.email || "Admin";
        userType = "admin";
      } else {
        const member = await storage.getCompanyMemberById(userId);
        userName = member?.name || member?.email || "Client";
        userType = "client";
      }

      const comment = await storage.createTaskComment({
        taskId: req.params.id,
        userId,
        userName,
        userType,
        content: content.trim(),
      });
      
      broadcastInvalidation(["/api/tasks"]);
      res.status(201).json(comment);
    } catch (error) {
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  app.patch("/api/comments/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const comment = await storage.getTaskComment(req.params.id);
      
      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }

      if (!isAdmin && comment.userId !== userId) {
        return res.status(403).json({ error: "You can only edit your own comments" });
      }

      const { content } = req.body;
      if (!content || typeof content !== "string" || !content.trim()) {
        return res.status(400).json({ error: "Comment content is required" });
      }

      const updated = await storage.updateTaskComment(req.params.id, content.trim());
      broadcastInvalidation(["/api/tasks"]);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update comment" });
    }
  });

  app.delete("/api/comments/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const comment = await storage.getTaskComment(req.params.id);

      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }

      if (!isAdmin && comment.userId !== userId) {
        return res.status(403).json({ error: "You can only delete your own comments" });
      }

      await storage.deleteTaskComment(req.params.id);
      broadcastInvalidation(["/api/tasks"]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // Task attachments endpoints
  app.get("/api/tasks/:id/attachments", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, task.companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const attachments = await storage.getTaskAttachments(req.params.id);
      res.json(attachments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attachments" });
    }
  });

  // Task attachments upload middleware
  const taskAttachmentUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 * 1024 }, // 50GB limit for attachments
  });

  app.post("/api/tasks/:id/attachments", isAuthenticated, taskAttachmentUpload.single("file"), async (req: AuthenticatedRequest, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, task.companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Get company for upload path
      const company = await storage.getCompany(task.companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      // Get uploader name
      let uploaderName = "Unknown";
      if (isAdmin) {
        const admin = await storage.getAdminUser(userId);
        uploaderName = admin?.name || admin?.email || "Admin";
      } else {
        const user = await storage.getUser(userId);
        uploaderName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.email || "Client";
      }

      const { uploadBuffer } = await import("./object-storage-helpers");
      const { randomUUID } = await import("crypto");
      const objectRelPath = `attachments/${req.params.id}/${randomUUID()}_${req.file.originalname}`;
      const storedPath = await uploadBuffer(objectRelPath, req.file.buffer, req.file.mimetype);

      const attachment = await storage.createTaskAttachment({
        taskId: req.params.id,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        contentType: req.file.mimetype,
        driveId: "object-storage",
        itemId: storedPath,
        webUrl: null,
        uploadedBy: userId,
        uploadedByName: uploaderName,
      });

      broadcastInvalidation(["/api/tasks"]);
      res.status(201).json(attachment);
    } catch (error) {
      console.error("Attachment upload error:", error);
      res.status(500).json({ error: "Failed to upload attachment" });
    }
  });

  app.get("/api/attachments/:id/download", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const attachment = await storage.getTaskAttachment(req.params.id);
      if (!attachment) {
        return res.status(404).json({ error: "Attachment not found" });
      }

      const task = await storage.getTask(attachment.taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, task.companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      if (attachment.driveId === "object-storage") {
        const { downloadBuffer } = await import("./object-storage-helpers");
        const { buffer, contentType } = await downloadBuffer(attachment.itemId);
        res.setHeader("Content-Type", contentType || attachment.contentType);
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(attachment.fileName)}"`);
        res.setHeader("Content-Length", buffer.length);
        res.send(buffer);
      } else {
        const result = await downloadFromSharePoint(attachment.driveId, attachment.itemId);
        if (!result.success || !result.buffer) {
          return res.status(500).json({ error: result.error || "Failed to download from SharePoint" });
        }
        res.setHeader("Content-Type", result.contentType || attachment.contentType);
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(attachment.fileName)}"`);
        res.setHeader("Content-Length", result.buffer.length);
        res.send(result.buffer);
      }
    } catch (error) {
      console.error("Attachment download error:", error);
      res.status(500).json({ error: "Failed to download attachment" });
    }
  });

  app.delete("/api/attachments/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const attachment = await storage.getTaskAttachment(req.params.id);
      if (!attachment) {
        return res.status(404).json({ error: "Attachment not found" });
      }

      if (attachment.driveId === "object-storage") {
        const { deleteObject } = await import("./object-storage-helpers");
        await deleteObject(attachment.itemId);
      } else {
        await deleteFromSharePoint(attachment.driveId, attachment.itemId);
      }

      await storage.deleteTaskAttachment(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Attachment delete error:", error);
      res.status(500).json({ error: "Failed to delete attachment" });
    }
  });

  app.get("/api/tasks/:id/links", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) return res.status(404).json({ error: "Task not found" });

      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, task.companyId);
        if (!member) return res.status(403).json({ error: "Access denied" });
      }

      const links = await storage.getTaskLinks(req.params.id);
      res.json(links);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch links" });
    }
  });

  app.post("/api/tasks/:id/links", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) return res.status(404).json({ error: "Task not found" });

      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, task.companyId);
        if (!member) return res.status(403).json({ error: "Access denied" });
      }

      const { url, label } = req.body;
      if (!url) return res.status(400).json({ error: "URL is required" });

      let createdByName = "Unknown";
      if (isAdmin) {
        const admin = await storage.getAdminUser(userId);
        createdByName = admin?.name || admin?.email || "Admin";
      } else {
        const user = await storage.getUser(userId);
        createdByName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.email || "Client";
      }

      const link = await storage.createTaskLink({
        taskId: req.params.id,
        url,
        label: label || null,
        createdBy: userId,
        createdByName,
      });

      res.status(201).json(link);
    } catch (error) {
      res.status(500).json({ error: "Failed to create link" });
    }
  });

  app.delete("/api/task-links/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);

      const link = await storage.getTaskLink(req.params.id);
      if (!link) return res.status(404).json({ error: "Link not found" });

      if (!isAdmin && link.createdBy !== userId) {
        return res.status(403).json({ error: "You can only delete your own links" });
      }

      await storage.deleteTaskLink(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete link" });
    }
  });

  app.get("/api/tasks/:id/assignees", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const assignees = await storage.getTaskAssignees(req.params.id);
      const enriched = await Promise.all(
        assignees.map(async (a) => {
          const user = await storage.getUser(a.userId);
          return {
            ...a,
            userName: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email : "Unknown",
            userEmail: user?.email || "",
          };
        })
      );
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Failed to get task assignees" });
    }
  });

  app.post("/api/tasks/:id/assignees", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      const task = await storage.getTask(req.params.id);
      if (!task) return res.status(404).json({ error: "Task not found" });
      const assignee = await storage.addTaskAssignee({ taskId: req.params.id, userId });
      const user = await storage.getUser(userId);
      res.json({
        ...assignee,
        userName: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email : "Unknown",
        userEmail: user?.email || "",
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to add task assignee" });
    }
  });

  app.delete("/api/tasks/:id/assignees/:userId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      await storage.removeTaskAssignee(req.params.id, req.params.userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove task assignee" });
    }
  });

  // Get single task with details
  app.get("/api/tasks/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, task.companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      let assignedByName: string | null = null;
      if (task.assignedBy) {
        const creator = await storage.getUser(task.assignedBy);
        assignedByName = creator ? `${creator.firstName || ""} ${creator.lastName || ""}`.trim() || creator.email || "Unknown" : "Unknown";
      }

      res.json({ ...task, assignedByName });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch task" });
    }
  });

  // Invitation routes
  app.post("/api/invitations", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const { companyId, email, role } = req.body;
      
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      
      // Check if user is admin OR company owner/admin
      let canInvite = isAdmin;
      if (!canInvite) {
        const membership = await storage.getCompanyMembership(companyId, userId);
        if (membership && (membership.role === 'company_owner' || membership.role === 'company_admin')) {
          canInvite = true;
        }
      }
      
      if (!canInvite) {
        return res.status(403).json({ error: "Only agency admins, company owners, or company admins can create invitations" });
      }
      
      const token = nanoid(32);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry
      
      const invitation = await storage.createCompanyInvitation({
        companyId,
        email: email || null,
        token,
        role: role || "team_member",
        expiresAt: expiresAt.toISOString(),
        createdBy: userId,
      });
      
      // Send invitation email if email provided
      if (email) {
        const company = await storage.getCompany(companyId);
        const inviter = await storage.getUser(userId);
        const inviterName = inviter ? `${inviter.firstName || ""} ${inviter.lastName || ""}`.trim() || inviter.email : "Near Me Connect";
        const baseUrl = process.env.REPLIT_DEPLOYMENT
          ? `https://${(process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || "").split(",")[0]}`
          : process.env.REPLIT_DEV_DOMAIN 
            ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
            : "http://localhost:5000";
        
        sendCompanyInvitationEmail({
          recipientEmail: email,
          inviterName,
          companyName: company?.name || "a company",
          role: role || "team_member",
          inviteUrl: `${baseUrl}/signup?invite=${token}`,
          expiresAt: expiresAt.toISOString(),
        }).catch(err => console.error("Failed to send invitation email:", err));
      }
      
      res.status(201).json(invitation);
    } catch (error) {
      res.status(500).json({ error: "Failed to create invitation" });
    }
  });

  app.get("/api/invitations/:token", async (req, res) => {
    try {
      const invitation = await storage.getCompanyInvitation(req.params.token);
      
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }
      
      if (invitation.usedAt) {
        return res.status(400).json({ error: "Invitation has already been used" });
      }
      
      const expiresAt = new Date(invitation.expiresAt);
      if (expiresAt < new Date()) {
        return res.status(400).json({ error: "Invitation has expired" });
      }
      
      const company = await storage.getCompany(invitation.companyId);
      
      res.json({
        valid: true,
        companyId: invitation.companyId,
        companyName: company?.name,
        role: invitation.role,
        email: invitation.email,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to validate invitation" });
    }
  });

  app.get("/api/companies/:id/invitations", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const companyId = req.params.id;
      const isAdmin = await storage.isAdmin(userId);
      
      // Check if user is admin OR company owner/admin
      let canView = isAdmin;
      if (!canView) {
        const membership = await storage.getCompanyMembership(companyId, userId);
        if (membership && (membership.role === 'company_owner' || membership.role === 'company_admin')) {
          canView = true;
        }
      }
      
      if (!canView) {
        return res.status(403).json({ error: "Only agency admins, company owners, or company admins can view invitations" });
      }
      
      const invitations = await storage.getCompanyInvitations(companyId);
      res.json(invitations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invitations" });
    }
  });

  app.delete("/api/invitations/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        const invitation = await storage.getCompanyInvitationById(req.params.id);
        if (!invitation) {
          return res.status(404).json({ error: "Invitation not found" });
        }
        const membership = await storage.getCompanyMembership(invitation.companyId, userId);
        if (!membership || (membership.role !== 'company_owner' && membership.role !== 'company_admin')) {
          return res.status(403).json({ error: "Only agency admins, company owners, or company admins can revoke invitations" });
        }
      }

      await storage.deleteCompanyInvitation(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete company invitation:", error);
      res.status(500).json({ error: "Failed to delete invitation" });
    }
  });

  // Client onboarding routes
  app.get("/api/companies/:id/onboarding", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const companyId = req.params.id;
      
      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      
      const onboarding = await storage.getClientOnboarding(companyId);
      res.json(onboarding || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch onboarding data" });
    }
  });

  app.post("/api/companies/:id/onboarding", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const companyId = req.params.id;
      
      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      
      const body = { ...req.body };
      const ytOk = !!(body.youtubeInviteDate || body.youtubeInviteNA);
      const ytfOk = !!(body.youtubeFeatureEligibilityDate || body.youtubeFeatureNA);
      const metaOk = !!(body.metaBusinessInviteDate || body.metaBusinessNA);
      const gbpOk = !!(body.googleBusinessInviteDate || body.googleBusinessNA);
      body.accessInvitesSent = ytOk && ytfOk && metaOk && gbpOk;

      const existing = await storage.getClientOnboarding(companyId);
      if (existing) {
        const updated = await storage.updateClientOnboarding(companyId, body);
        return res.json(updated);
      }
      
      const onboarding = await storage.createClientOnboarding({
        ...body,
        companyId,
      });
      res.status(201).json(onboarding);
    } catch (error) {
      res.status(500).json({ error: "Failed to save onboarding data" });
    }
  });

  app.patch("/api/companies/:id/onboarding", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const companyId = req.params.id;
      
      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      
      const body = { ...req.body };
      const existing = await storage.getClientOnboarding(companyId);
      if (!existing) {
        return res.status(404).json({ error: "Onboarding data not found" });
      }
      const merged = { ...existing, ...body };
      const ytOk = !!(merged.youtubeInviteDate || merged.youtubeInviteNA);
      const ytfOk = !!(merged.youtubeFeatureEligibilityDate || merged.youtubeFeatureNA);
      const metaOk = !!(merged.metaBusinessInviteDate || merged.metaBusinessNA);
      const gbpOk = !!(merged.googleBusinessInviteDate || merged.googleBusinessNA);
      body.accessInvitesSent = ytOk && ytfOk && metaOk && gbpOk;

      const onboarding = await storage.updateClientOnboarding(companyId, body);
      if (!onboarding) {
        return res.status(404).json({ error: "Onboarding data not found" });
      }
      res.json(onboarding);
    } catch (error) {
      res.status(500).json({ error: "Failed to update onboarding data" });
    }
  });

  app.post("/api/companies/:id/onboarding/complete", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const companyId = req.params.id;
      
      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      
      // Get company and onboarding data
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      
      const onboarding = await storage.getClientOnboarding(companyId);
      
      // Get the user who completed onboarding
      const completedByUser = await storage.getUser(userId);
      const completedByName = completedByUser 
        ? `${completedByUser.firstName} ${completedByUser.lastName}` 
        : "Unknown User";
      
      // Create tasks for social accounts client will create
      if (onboarding?.socialPlatforms) {
        try {
          const platforms = JSON.parse(onboarding.socialPlatforms);
          const platformNames: Record<string, string> = {
            facebook: "Facebook",
            instagram: "Instagram",
            youtube: "YouTube",
            tiktok: "TikTok",
            x_twitter: "X (Twitter)",
            linkedin: "LinkedIn",
            pinterest: "Pinterest",
          };
          
          const oneWeekFromNow = new Date();
          oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
          const dueDate = formatDateLocal(oneWeekFromNow);
          
          for (const platform of platforms) {
            if (!platform.exists && platform.accountCreator === "client") {
              const platformName = platformNames[platform.platform] || platform.platform;
              await storage.createTask({
                companyId,
                title: `Create ${platformName} Account`,
                description: `You indicated you would create your own ${platformName} account during onboarding. Please create the account and update your profile information once complete.`,
                status: "pending",
                priority: "medium",
                dueDate,
                creditCost: 0,
                type: "assigned",
              });
            }
          }
        } catch (parseError) {
          console.error("Failed to parse social platforms:", parseError);
        }
      }
      
      // Generate PDF and upload to SharePoint
      let sharepointUrl: string | undefined;
      if (onboarding) {
        try {
          const pdfBuffer = await generateOnboardingPdf({
            onboarding,
            company,
          });
          
          // Create date-based subfolder path
          const now = new Date();
          const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          const subfolder = `Onboarding Documents/${yearMonth}`;
          const fileName = `Onboarding Completion Document - ${company.name}.pdf`;
          
          const uploadResult = await uploadToSharePoint(
            company.name,
            fileName,
            pdfBuffer,
            "application/pdf",
            subfolder,
            company.clientType as "marketing" | "government" || "marketing"
          );
          
          sharepointUrl = uploadResult.webUrl;
          console.log(`Onboarding PDF uploaded to SharePoint: ${sharepointUrl}`);
        } catch (pdfError) {
          console.error("Failed to generate/upload onboarding PDF:", pdfError);
          // Continue even if PDF fails - don't block onboarding completion
        }
      }
      
      // Mark company onboarding as complete
      await storage.updateCompany(companyId, { onboardingComplete: true });
      
      // Notify all agency admins (isolated error handling per admin)
      const adminUsers = await storage.getAllAdminUsers();
      const baseUrlForPortal = process.env.REPLIT_DEPLOYMENT
        ? `https://${(process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || "").split(",")[0]}`
        : process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
          : "http://localhost:5000";
      const portalUrl = `${baseUrlForPortal}/admin/companies/${companyId}`;
      
      for (const admin of adminUsers) {
        try {
          // Create notification
          await createAndBroadcastNotification({
            userId: admin.userId,
            type: "onboarding_complete",
            title: "Client Onboarding Completed",
            message: `${company.name} has completed their onboarding process.`,
            link: `/admin/companies/${companyId}`,
          });
        } catch (notifError) {
          console.error(`Failed to create notification for admin ${admin.userId}:`, notifError);
        }
        
        try {
          // Send email
          const adminUser = await storage.getUser(admin.userId);
          if (adminUser?.email) {
            await sendOnboardingCompletionEmail({
              recipientEmail: adminUser.email,
              recipientName: `${adminUser.firstName} ${adminUser.lastName}`,
              companyName: company.name,
              completedByName,
              sharepointUrl,
              portalUrl,
            });
          }
        } catch (emailError) {
          console.error(`Failed to send onboarding email to admin ${admin.userId}:`, emailError);
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      res.status(500).json({ error: "Failed to complete onboarding" });
    }
  });

  // Media uploads to SharePoint
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 * 1024 }, // 25GB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only images and videos are allowed'));
      }
    }
  });

  app.get("/api/companies/:id/media-uploads", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const companyId = req.params.id;
      
      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      
      const uploads = await storage.getMediaUploads(companyId);
      res.json(uploads);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch media uploads" });
    }
  });

  app.post("/api/companies/:id/media-uploads", isAuthenticated, upload.single('file'), async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const companyId = req.params.id;
      
      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      // Use different subfolder based on client type
      const subfolder = company.clientType === "government" ? "Government Documents" : "Media";

      const result = await uploadToSharePoint(
        company.name,
        req.file.originalname,
        req.file.buffer,
        req.file.mimetype,
        subfolder,
        company.clientType as "marketing" | "government" || "marketing"
      );

      if (!result.success) {
        return res.status(500).json({ error: result.error || "Failed to upload to SharePoint" });
      }

      const mediaUpload = await storage.createMediaUpload({
        companyId,
        uploadedBy: userId,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        sharepointPath: result.path || '',
        sharepointUrl: result.webUrl,
        status: 'uploaded',
      });

      res.status(201).json(mediaUpload);
    } catch (error: any) {
      console.error('Media upload error:', error);
      res.status(500).json({ error: error.message || "Failed to upload file" });
    }
  });

  // Brand asset upload to SharePoint (in Brand Assets subfolder)
  app.post("/api/companies/:id/brand-assets/upload", isAuthenticated, upload.single('file'), async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const companyId = req.params.id;
      const isAdmin = await storage.isAdmin(userId);

      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      const result = await uploadToSharePoint(
        company.name,
        req.file.originalname,
        req.file.buffer,
        req.file.mimetype,
        "Brand Assets",
        company.clientType as "marketing" | "government" || "marketing"
      );

      if (!result.success) {
        return res.status(500).json({ error: result.error || "Failed to upload to SharePoint" });
      }

      res.status(201).json({
        success: true,
        fileName: req.file.originalname,
        sharepointPath: result.path,
        sharepointUrl: result.webUrl,
      });
    } catch (error: any) {
      console.error('Brand asset upload error:', error);
      res.status(500).json({ error: error.message || "Failed to upload brand asset" });
    }
  });

  // ============================================
  // Chat Routes
  // ============================================

  // Get available users for a company chat (company members + admins)
  app.get("/api/companies/:id/chat-users", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const companyId = req.params.id;
      const isAdmin = await storage.isAdmin(userId);

      // Check access
      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      // Get company members
      const companyMembers = await storage.getCompanyMembers(companyId);
      const memberUserIds = companyMembers.map(m => m.userId);
      
      // Get all admin users
      const adminUsersList = await storage.getAllAdminUsers();
      const adminUserIds = adminUsersList.map(a => a.userId);
      
      // Combine unique user IDs
      const allUserIds = [...new Set([...memberUserIds, ...adminUserIds])];
      
      // Get user details
      const users = await Promise.all(
        allUserIds.map(async (uid) => {
          const user = await storage.getUser(uid);
          if (!user) return null;
          const isAdminUser = adminUserIds.includes(uid);
          const isMember = memberUserIds.includes(uid);
          return {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            isAdmin: isAdminUser,
            isCompanyMember: isMember,
          };
        })
      );
      
      res.json(users.filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat users" });
    }
  });

  async function syncCompanyWideChatMembers(threadId: string, companyId: string) {
    try {
      const existingMembers = await storage.getChatThreadMembers(threadId);
      const existingUserIds = new Set(existingMembers.map(m => m.userId));

      const companyMembers = await storage.getCompanyMembers(companyId);
      for (const member of companyMembers) {
        if (!existingUserIds.has(member.userId)) {
          await storage.addChatThreadMember({
            threadId,
            userId: member.userId,
            role: "member",
          });
        }
      }

      const admins = await storage.getAllAdminUsers();
      for (const admin of admins) {
        if (!existingUserIds.has(admin.userId)) {
          await storage.addChatThreadMember({
            threadId,
            userId: admin.userId,
            role: "admin",
          });
        }
      }
    } catch (err) {
      console.error("Failed to sync company-wide chat members:", err);
    }
  }

  // Get all threads for a company (admin) or user's threads (client)
  app.get("/api/chat/threads", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const companyId = req.query.companyId as string | undefined;

      if (isAdmin && companyId) {
        const threads = await storage.getChatThreadsByCompany(companyId);
        for (const thread of threads) {
          if (thread.isCompanyWide) {
            await syncCompanyWideChatMembers(thread.id, thread.companyId);
          }
        }
        res.json(threads);
      } else {
        const membership = await storage.getUserCompanies(userId);
        if (membership.length > 0) {
          for (const m of membership) {
            const cwThread = await storage.getCompanyWideThread(m.companyId);
            if (cwThread) {
              await syncCompanyWideChatMembers(cwThread.id, cwThread.companyId);
            }
          }
        }
        const threads = await storage.getUserThreads(userId);
        res.json(threads);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat threads" });
    }
  });

  // Admin-only: Get all threads with company info and last message
  app.get("/api/admin/chat/threads", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const threads = await storage.getAllChatThreads();
      const companies = await storage.getAllCompanies();
      const companiesMap = new Map(companies.map(c => [c.id, c]));

      // Get last message for each thread
      const threadsWithInfo = await Promise.all(
        threads.map(async (thread) => {
          const messages = await storage.getChatMessages(thread.id, 1);
          const lastMessage = messages[0] || null;
          const company = companiesMap.get(thread.companyId);
          
          let taskInfo: { isRush?: boolean; rushDisabled?: boolean; taskTitle?: string } | null = null;
          if (thread.type === "task" && thread.taskId) {
            const task = await storage.getTask(thread.taskId);
            if (task) {
              taskInfo = { isRush: task.isRush, rushDisabled: task.rushDisabled, taskTitle: task.title };
            }
          }

          return {
            ...thread,
            companyName: company?.name || "Unknown",
            taskInfo,
            lastMessage: lastMessage ? {
              content: lastMessage.content,
              createdAt: lastMessage.createdAt,
              senderId: lastMessage.senderId,
            } : null,
          };
        })
      );

      // Sort by last message date (most recent first)
      threadsWithInfo.sort((a, b) => {
        const dateA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const dateB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      res.json(threadsWithInfo);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat threads" });
    }
  });

  // Get a specific thread
  app.get("/api/chat/threads/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const thread = await storage.getChatThread(req.params.id);

      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }

      // Check access
      if (!isAdmin) {
        const member = await storage.getChatThreadMember(thread.id, userId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      res.json(thread);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch thread" });
    }
  });

  // Create a new chat thread
  app.post("/api/chat/threads", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      const { companyId, name, type, taskId, memberIds, isCompanyWide, addAdmins } = req.body;

      if (!companyId) {
        return res.status(400).json({ error: "Company ID is required" });
      }

      // Check if company-wide thread already exists
      if (isCompanyWide) {
        const existing = await storage.getCompanyWideThread(companyId);
        if (existing) {
          return res.status(400).json({ error: "Company-wide thread already exists" });
        }
      }

      // Check if task thread already exists
      if (type === "task" && taskId) {
        const existing = await storage.getChatThreadByTask(taskId);
        if (existing) {
          return res.json(existing);
        }
      }

      const thread = await storage.createChatThread({
        companyId,
        name: name || (isCompanyWide ? "Team Chat" : null),
        type: type || "general",
        taskId: taskId || null,
        isCompanyWide: isCompanyWide || false,
        createdBy: userId,
      });

      // Add creator as member
      await storage.addChatThreadMember({
        threadId: thread.id,
        userId,
        isAdmin: true,
        joinedAt: new Date().toISOString(),
      });

      // Add specified members
      if (memberIds && Array.isArray(memberIds)) {
        for (const memberId of memberIds) {
          if (memberId !== userId) {
            await storage.addChatThreadMember({
              threadId: thread.id,
              userId: memberId,
              isAdmin: false,
              joinedAt: new Date().toISOString(),
            });
          }
        }
      }

      // For company-wide threads, add all company members and admins
      if (isCompanyWide) {
        const companyMembers = await storage.getCompanyMembers(companyId);
        for (const member of companyMembers) {
          if (member.userId !== userId) {
            const existingMember = await storage.getChatThreadMember(thread.id, member.userId);
            if (!existingMember) {
              await storage.addChatThreadMember({
                threadId: thread.id,
                userId: member.userId,
                isAdmin: false,
                joinedAt: new Date().toISOString(),
              });
            }
          }
        }
        // Add all admins to company-wide chats
        const admins = await storage.getAllAdminUsers();
        for (const admin of admins) {
          if (admin.userId !== userId) {
            const existingMember = await storage.getChatThreadMember(thread.id, admin.userId);
            if (!existingMember) {
              await storage.addChatThreadMember({
                threadId: thread.id,
                userId: admin.userId,
                isAdmin: true,
                joinedAt: new Date().toISOString(),
              });
            }
          }
        }
      }

      if (addAdmins && !isCompanyWide) {
        const admins = await storage.getAllAdminUsers();
        for (const admin of admins) {
          if (admin.userId !== userId) {
            const existingMember = await storage.getChatThreadMember(thread.id, admin.userId);
            if (!existingMember) {
              await storage.addChatThreadMember({
                threadId: thread.id,
                userId: admin.userId,
                isAdmin: true,
                joinedAt: new Date().toISOString(),
              });
            }
          }
        }
      }

      broadcastInvalidation(["/api/chat/threads", "/api/admin/chat/threads", "/api/chat/unread"]);
      res.status(201).json(thread);
    } catch (error) {
      console.error('Create thread error:', error);
      res.status(500).json({ error: "Failed to create chat thread" });
    }
  });

  // Get thread members
  app.get("/api/chat/threads/:id/members", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const thread = await storage.getChatThread(req.params.id);

      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }

      if (!isAdmin) {
        const member = await storage.getChatThreadMember(thread.id, userId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const members = await storage.getChatThreadMembers(thread.id);
      
      // Enrich with user info and actual role
      const enrichedMembers = await Promise.all(
        members.map(async (m) => {
          const user = await storage.getUser(m.userId);
          const isAgencyAdmin = await storage.isAdmin(m.userId);
          let actualRole = "Team Member";
          if (isAgencyAdmin) {
            actualRole = "Agency Admin";
          } else if (thread.companyId) {
            const companyMember = await storage.getCompanyMember(m.userId, thread.companyId);
            if (companyMember) {
              if (companyMember.role === "company_owner") actualRole = "Company Owner";
              else if (companyMember.role === "company_admin") actualRole = "Company Admin";
              else if (companyMember.role === "custom" && companyMember.customRoleId) {
                const customRole = await storage.getCustomRole(companyMember.customRoleId);
                actualRole = customRole?.name || "Team Member";
              } else actualRole = "Team Member";
            }
          }
          return {
            ...m,
            user: user ? { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email } : null,
            actualRole,
          };
        })
      );

      res.json(enrichedMembers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch thread members" });
    }
  });

  // Add member to thread
  app.post("/api/chat/threads/:id/members", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const thread = await storage.getChatThread(req.params.id);
      const { memberUserId } = req.body;

      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }

      if (!isAdmin) {
        const member = await storage.getChatThreadMember(thread.id, userId);
        if (!member?.isAdmin) {
          return res.status(403).json({ error: "Only thread admins can add members" });
        }
      }

      // Check if already a member
      const existing = await storage.getChatThreadMember(thread.id, memberUserId);
      if (existing) {
        return res.status(400).json({ error: "User is already a member" });
      }

      const newMember = await storage.addChatThreadMember({
        threadId: thread.id,
        userId: memberUserId,
        isAdmin: false,
        joinedAt: new Date().toISOString(),
      });

      res.status(201).json(newMember);
    } catch (error) {
      res.status(500).json({ error: "Failed to add member" });
    }
  });

  // Remove member from thread
  app.delete("/api/chat/threads/:id/members/:memberId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const thread = await storage.getChatThread(req.params.id);

      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }

      if (!isAdmin) {
        const member = await storage.getChatThreadMember(thread.id, userId);
        if (!member?.isAdmin && req.params.memberId !== userId) {
          return res.status(403).json({ error: "Only thread admins can remove members" });
        }
      }

      await storage.removeChatThreadMember(thread.id, req.params.memberId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove member" });
    }
  });

  // Get messages for a thread
  app.get("/api/chat/threads/:id/messages", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const thread = await storage.getChatThread(req.params.id);
      const limit = parseInt(req.query.limit as string) || 100;

      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }

      if (!isAdmin) {
        const member = await storage.getChatThreadMember(thread.id, userId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const messages = await storage.getChatMessages(thread.id, limit);

      // Enrich with sender info
      const enrichedMessages = await Promise.all(
        messages.map(async (m) => {
          const sender = await storage.getUser(m.senderId);
          return {
            ...m,
            sender: sender ? { id: sender.id, firstName: sender.firstName, lastName: sender.lastName, email: sender.email } : null,
          };
        })
      );

      res.json(enrichedMessages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Send a message
  app.post("/api/chat/threads/:id/messages", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const thread = await storage.getChatThread(req.params.id);
      const { content, mentions } = req.body;

      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }

      if (!isAdmin) {
        const member = await storage.getChatThreadMember(thread.id, userId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      if (thread.closedAt) {
        return res.status(403).json({ error: "This chat is closed. Messages cannot be sent." });
      }

      if (!content || !content.trim()) {
        return res.status(400).json({ error: "Message content is required" });
      }

      const message = await storage.createChatMessage({
        threadId: thread.id,
        senderId: userId,
        content: content.trim(),
      });

      // Process mentions and create notifications
      if (mentions && Array.isArray(mentions) && mentions.length > 0) {
        const sender = await storage.getUser(userId);
        const senderName = sender ? `${sender.firstName || ""} ${sender.lastName || ""}`.trim() || sender.email : "Someone";
        
        for (const mentionedUserId of mentions) {
          // Don't notify yourself
          if (mentionedUserId === userId) continue;
          
          // Create mention record
          await storage.createChatMention({
            messageId: message.id,
            threadId: thread.id,
            mentionedUserId,
            mentionedByUserId: userId,
          });
          
          // Create notification for mentioned user
          const threadName = thread.name || "a chat";
          await createAndBroadcastNotification({
            userId: mentionedUserId,
            type: "mention",
            title: "You were mentioned",
            message: `${senderName} mentioned you in ${threadName}`,
            link: isAdmin ? `/admin/chat` : `/client/chat`,
            relatedMessageId: message.id,
            relatedThreadId: thread.id,
            createdBy: userId,
          });

          // Send email notification for mention
          const mentionedUser = await storage.getUser(mentionedUserId);
          if (mentionedUser?.email) {
            const baseUrl = process.env.REPLIT_DEPLOYMENT
              ? `https://${(process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || "").split(",")[0]}`
              : process.env.REPLIT_DEV_DOMAIN 
                ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
                : "http://localhost:5000";

            const isRecipientAdmin = await storage.isAdmin(mentionedUserId);
            sendChatNotificationEmail({
              recipientEmail: mentionedUser.email,
              recipientName: `${mentionedUser.firstName || ""} ${mentionedUser.lastName || ""}`.trim() || mentionedUser.email,
              senderName,
              threadTitle: threadName,
              messagePreview: content.trim().substring(0, 100) + (content.trim().length > 100 ? "..." : ""),
              chatUrl: `${baseUrl}${isRecipientAdmin ? "/admin/chat" : "/client/chat"}`,
            }).catch(err => console.error("Failed to send chat notification email:", err));
          }
        }
      }

      // Enrich with sender info
      const sender = await storage.getUser(userId);
      const senderDisplayName = sender ? `${sender.firstName || ""} ${sender.lastName || ""}`.trim() || sender.email : "Someone";
      const enrichedMessage = {
        ...message,
        sender: sender ? { id: sender.id, firstName: sender.firstName, lastName: sender.lastName, email: sender.email } : null,
      };

      const threadMembers = await storage.getChatThreadMembers(thread.id);
      const adminUsersList = await storage.getAllAdminUsers();
      const adminUserIds = new Set(adminUsersList.map(a => a.userId));
      const memberUserIds = threadMembers.map(m => m.userId);
      const allThreadUserIds = [...new Set([...memberUserIds, ...Array.from(adminUserIds)])];
      const mentionedSet = new Set(mentions && Array.isArray(mentions) ? mentions : []);
      const recipientIds = allThreadUserIds.filter(id => id !== userId && !mentionedSet.has(id));

      if (recipientIds.length > 0) {
        const threadName = thread.name || "a chat";
        const preview = content.trim().substring(0, 80) + (content.trim().length > 80 ? "..." : "");
        const adminRecipients = recipientIds.filter(id => adminUserIds.has(id));
        const clientRecipients = recipientIds.filter(id => !adminUserIds.has(id));
        const notifPayload = (link: string) => ({
          title: `New message in ${threadName}`,
          message: `${senderDisplayName}: ${preview}`,
          link,
        });
        if (adminRecipients.length > 0) {
          broadcastNotificationToUsers(adminRecipients, notifPayload("/admin/chat"));
        }
        if (clientRecipients.length > 0) {
          broadcastNotificationToUsers(clientRecipients, notifPayload("/client/chat"));
        }
      }

      broadcastInvalidation(["/api/chat/threads", "/api/admin/chat/threads", "/api/chat/unread", "/api/notifications"]);
      res.status(201).json(enrichedMessage);
    } catch (error) {
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Mark messages as read
  app.post("/api/chat/threads/:id/read", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const thread = await storage.getChatThread(req.params.id);
      const { messageId } = req.body;

      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }

      const member = await storage.getChatThreadMember(thread.id, userId);
      const isAdmin = await storage.isAdmin(userId);
      
      if (!member && !isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }

      const receipt = await storage.updateChatReadReceipt(thread.id, userId, messageId);
      broadcastInvalidation(["/api/chat/unread"]);
      res.json(receipt);
    } catch (error) {
      res.status(500).json({ error: "Failed to mark as read" });
    }
  });

  // Get read receipts for a thread
  app.get("/api/chat/threads/:id/read-receipts", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const thread = await storage.getChatThread(req.params.id);

      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }

      if (!isAdmin) {
        const member = await storage.getChatThreadMember(thread.id, userId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const members = await storage.getChatThreadMembers(thread.id);
      const receipts = await Promise.all(
        members.map(async (m) => {
          const receipt = await storage.getChatReadReceipt(thread.id, m.userId);
          const user = await storage.getUser(m.userId);
          return {
            userId: m.userId,
            user: user ? { id: user.id, firstName: user.firstName, lastName: user.lastName } : null,
            lastReadMessageId: receipt?.lastReadMessageId || null,
            lastReadAt: receipt?.lastReadAt || null,
          };
        })
      );

      res.json(receipts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch read receipts" });
    }
  });

  // Get unread counts
  app.get("/api/chat/unread", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const counts = await storage.getUnreadCounts(userId);
      res.json(counts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch unread counts" });
    }
  });

  // Close a chat thread
  app.post("/api/chat/threads/:id/close", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const thread = await storage.getChatThread(req.params.id);

      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }

      if (!isAdmin) {
        const member = await storage.getChatThreadMember(thread.id, userId);
        if (!member || !member.isAdmin) {
          return res.status(403).json({ error: "Only admins or thread admins can close chats" });
        }
      }

      const updated = await storage.updateChatThread(thread.id, {
        closedAt: new Date().toISOString(),
        autoCloseAt: null,
      });

      broadcastInvalidation(["/api/chat/threads", "/api/admin/chat/threads"]);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to close chat" });
    }
  });

  // Reopen a closed chat thread
  app.post("/api/chat/threads/:id/reopen", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const thread = await storage.getChatThread(req.params.id);

      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }

      if (!isAdmin) {
        const member = await storage.getChatThreadMember(thread.id, userId);
        if (!member || !member.isAdmin) {
          return res.status(403).json({ error: "Only admins or thread admins can reopen chats" });
        }
      }

      const updated = await storage.updateChatThread(thread.id, {
        closedAt: null,
        autoCloseAt: null,
      });

      broadcastInvalidation(["/api/chat/threads", "/api/admin/chat/threads"]);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to reopen chat" });
    }
  });

  // Update chat thread (rename)
  app.patch("/api/chat/threads/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const thread = await storage.getChatThread(req.params.id);

      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }

      if (!isAdmin) {
        const member = await storage.getChatThreadMember(thread.id, userId);
        if (!member) {
          return res.status(403).json({ error: "Only thread members can edit chats" });
        }
      }

      const { name } = req.body;
      if (name !== undefined) {
        const updated = await storage.updateChatThread(thread.id, { name });
        broadcastInvalidation(["/api/chat/threads", "/api/admin/chat/threads"]);
        res.json(updated);
      } else {
        res.status(400).json({ error: "No fields to update" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update chat" });
    }
  });

  // Delete a closed chat thread
  app.delete("/api/chat/threads/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const thread = await storage.getChatThread(req.params.id);

      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }

      if (!thread.closedAt) {
        return res.status(400).json({ error: "Only closed chats can be deleted" });
      }

      if (!isAdmin) {
        const member = await storage.getChatThreadMember(thread.id, userId);
        if (!member || !member.isAdmin) {
          return res.status(403).json({ error: "Only admins or thread admins can delete chats" });
        }
      }

      await storage.deleteChatThread(thread.id);
      broadcastInvalidation(["/api/chat/threads", "/api/admin/chat/threads", "/api/chat/unread"]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete chat" });
    }
  });

  app.post("/api/admin/chat/merge", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin only" });
      }
      const { targetThreadId, sourceThreadId } = req.body;
      if (!targetThreadId || !sourceThreadId || targetThreadId === sourceThreadId) {
        return res.status(400).json({ error: "Invalid thread IDs" });
      }
      const targetThread = await storage.getChatThread(targetThreadId);
      const sourceThread = await storage.getChatThread(sourceThreadId);
      if (!targetThread || !sourceThread) {
        return res.status(404).json({ error: "Thread not found" });
      }
      if (targetThread.companyId !== sourceThread.companyId) {
        return res.status(400).json({ error: "Can only merge threads from the same company" });
      }
      await storage.mergeChatThreads(targetThreadId, sourceThreadId);
      broadcastInvalidation(["/api/chat/threads", "/api/admin/chat/threads", "/api/chat/unread"]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to merge chats" });
    }
  });

  // Get chat thread by task ID
  app.get("/api/tasks/:id/chat", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const task = await storage.getTask(req.params.id);

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, task.companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const thread = await storage.getChatThreadByTask(task.id);
      res.json(thread || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch task chat" });
    }
  });

  // Get users available for chat in a company
  app.get("/api/companies/:id/chat-users", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const companyId = req.params.id;

      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      // Get company members
      const members = await storage.getCompanyMembers(companyId);
      const memberUsers = await Promise.all(
        members.map(async (m) => {
          const user = await storage.getUser(m.userId);
          return user ? { 
            id: user.id, 
            firstName: user.firstName, 
            lastName: user.lastName, 
            email: user.email,
            role: m.role,
            type: 'client' as const
          } : null;
        })
      );

      // Get admin users
      const admins = await storage.getAllAdminUsers();
      const adminUsers = await Promise.all(
        admins.map(async (a) => {
          const user = await storage.getUser(a.userId);
          return user ? { 
            id: user.id, 
            firstName: user.firstName, 
            lastName: user.lastName, 
            email: user.email,
            role: 'admin',
            type: 'admin' as const
          } : null;
        })
      );

      const allUsers = [...memberUsers.filter(Boolean), ...adminUsers.filter(Boolean)];
      res.json(allUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat users" });
    }
  });

  // ========== Campaign Types (Admin) ==========
  
  // Get all campaign types
  app.get("/api/campaign-types", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const types = await storage.getCampaignTypes();
      res.json(types);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaign types" });
    }
  });

  // Create campaign type (admin only)
  app.post("/api/campaign-types", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { name, description, includedDeliverableIds, deliverableQuantities, estimatedCredits, meetingTypeQuantities } = req.body;
      if (!name || typeof name !== "string") {
        return res.status(400).json({ error: "Name is required" });
      }
      const deliverableIds = Array.isArray(includedDeliverableIds) ? includedDeliverableIds : [];

      let normalizedQuantities: Record<string, number> = {};
      if (deliverableQuantities) {
        const parsed = typeof deliverableQuantities === "string" ? JSON.parse(deliverableQuantities) : deliverableQuantities;
        for (const id of deliverableIds) {
          normalizedQuantities[id] = parsed[id] && parsed[id] >= 1 ? parsed[id] : 1;
        }
      } else {
        for (const id of deliverableIds) {
          normalizedQuantities[id] = 1;
        }
      }

      const campaignType = await storage.createCampaignType({
        name,
        description: description || null,
        includedDeliverableIds: deliverableIds,
        deliverableQuantities: JSON.stringify(normalizedQuantities),
        estimatedCredits: estimatedCredits || "0",
        meetingTypeQuantities: meetingTypeQuantities ? (typeof meetingTypeQuantities === "string" ? meetingTypeQuantities : JSON.stringify(meetingTypeQuantities)) : null,
      });
      res.status(201).json(campaignType);
    } catch (error) {
      res.status(500).json({ error: "Failed to create campaign type" });
    }
  });

  // Update campaign type (admin only)
  app.patch("/api/campaign-types/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const updateData = { ...req.body };
      if (updateData.includedDeliverableIds && !Array.isArray(updateData.includedDeliverableIds)) {
        updateData.includedDeliverableIds = [updateData.includedDeliverableIds];
      }
      if (updateData.includedDeliverableIds && updateData.deliverableQuantities) {
        const parsed = typeof updateData.deliverableQuantities === "string" ? JSON.parse(updateData.deliverableQuantities) : updateData.deliverableQuantities;
        const normalized: Record<string, number> = {};
        for (const id of updateData.includedDeliverableIds) {
          normalized[id] = parsed[id] && parsed[id] >= 1 ? parsed[id] : 1;
        }
        updateData.deliverableQuantities = JSON.stringify(normalized);
      } else if (updateData.deliverableQuantities && typeof updateData.deliverableQuantities !== "string") {
        updateData.deliverableQuantities = JSON.stringify(updateData.deliverableQuantities);
      }
      if (updateData.meetingTypeQuantities && typeof updateData.meetingTypeQuantities !== "string") {
        updateData.meetingTypeQuantities = JSON.stringify(updateData.meetingTypeQuantities);
      }
      const campaignType = await storage.updateCampaignType(req.params.id, updateData);
      if (!campaignType) {
        return res.status(404).json({ error: "Campaign type not found" });
      }
      res.json(campaignType);
    } catch (error) {
      res.status(500).json({ error: "Failed to update campaign type" });
    }
  });

  // Delete campaign type (admin only)
  app.delete("/api/campaign-types/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      await storage.deleteCampaignType(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete campaign type" });
    }
  });

  // ========== Cadences ==========

  app.get("/api/companies/:id/cadences", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const companyId = req.params.id;

      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const cadenceList = await storage.getCadences(companyId);
      res.json(cadenceList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cadences" });
    }
  });

  app.get("/api/cadences/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const cadence = await storage.getCadence(req.params.id);
      if (!cadence) {
        return res.status(404).json({ error: "Cadence not found" });
      }
      res.json(cadence);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cadence" });
    }
  });

  app.post("/api/companies/:id/cadences", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const companyId = req.params.id;
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      const data = req.body;
      const cadence = await storage.createCadence({
        companyId,
        title: data.title,
        deliverableTypeId: data.deliverableTypeId || null,
        frequency: data.frequency,
        scheduledDays: data.scheduledDays?.length ? data.scheduledDays : null,
        monthDays: data.monthDays?.length ? data.monthDays : null,
        assignedTo: data.assignedTo || null,
        assignedToName: data.assignedToName || null,
        creditCost: data.creditCost || "1",
        noCredit: data.noCredit || false,
        taskOwnership: data.taskOwnership || "agency",
        isActive: true,
        createdBy: userId,
      });

      res.status(201).json(cadence);
    } catch (error) {
      res.status(500).json({ error: "Failed to create cadence" });
    }
  });

  app.patch("/api/cadences/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const cadence = await storage.getCadence(req.params.id);
      if (!cadence) {
        return res.status(404).json({ error: "Cadence not found" });
      }

      const data = req.body;
      if (data.cancel) {
        await storage.deleteCadence(req.params.id);
        return res.json({ deleted: true });
      }

      const updateData: any = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.deliverableTypeId !== undefined) updateData.deliverableTypeId = data.deliverableTypeId;
      if (data.frequency !== undefined) updateData.frequency = data.frequency;
      if (data.scheduledDays !== undefined) updateData.scheduledDays = data.scheduledDays;
      if (data.monthDays !== undefined) updateData.monthDays = data.monthDays;
      if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;
      if (data.assignedToName !== undefined) updateData.assignedToName = data.assignedToName;
      if (data.creditCost !== undefined) updateData.creditCost = data.creditCost;
      if (data.noCredit !== undefined) updateData.noCredit = data.noCredit;
      if (data.taskOwnership !== undefined) updateData.taskOwnership = data.taskOwnership;

      const updated = await storage.updateCadence(req.params.id, updateData);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update cadence" });
    }
  });

  app.post("/api/admin/cadences/generate", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { generateCadenceTasks } = await import("./monthly-report");
      const result = await generateCadenceTasks();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate cadence tasks" });
    }
  });

  app.post("/api/cadences/:id/start-now", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const cadence = await storage.getCadence(req.params.id);
      if (!cadence) {
        return res.status(404).json({ error: "Cadence not found" });
      }
      if (!cadence.isActive) {
        return res.status(400).json({ error: "Cadence is not active" });
      }

      const { generateCadenceTasksForRemainingMonth } = await import("./monthly-report");
      const result = await generateCadenceTasksForRemainingMonth(cadence);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to start cadence" });
    }
  });

  app.post("/api/cadences/:id/start-entire-month", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const cadence = await storage.getCadence(req.params.id);
      if (!cadence) {
        return res.status(404).json({ error: "Cadence not found" });
      }
      if (!cadence.isActive) {
        return res.status(400).json({ error: "Cadence is not active" });
      }

      const { generateCadenceTasksForEntireMonth } = await import("./monthly-report");
      const result = await generateCadenceTasksForEntireMonth(cadence);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate cadence tasks for entire month" });
    }
  });

  // ========== Campaign Requests ==========
  
  // Get campaign requests for a company
  app.get("/api/companies/:id/campaign-requests", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      const companyId = req.params.id;

      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const requests = await storage.getCampaignRequests(companyId);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaign requests" });
    }
  });

  // Get all campaign requests (admin only)
  app.get("/api/admin/campaign-requests", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const requests = await storage.getAllCampaignRequests();
      
      // Enrich with company and campaign type info
      const enrichedRequests = await Promise.all(
        requests.map(async (request) => {
          const company = await storage.getCompany(request.companyId);
          const campaignType = await storage.getCampaignType(request.campaignTypeId);
          const requestedByUser = await storage.getUser(request.requestedBy);
          return {
            ...request,
            companyName: company?.name,
            campaignTypeName: campaignType?.name,
            requestedByName: requestedByUser ? `${requestedByUser.firstName} ${requestedByUser.lastName}` : null,
          };
        })
      );
      
      res.json(enrichedRequests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaign requests" });
    }
  });

  // Create campaign request (client)
  app.post("/api/companies/:id/campaign-requests", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const companyId = req.params.id;
      const isAdmin = await storage.isAdmin(userId);

      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      // Validate date requirements
      const dueDate = new Date(req.body.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffMs = dueDate.getTime() - today.getTime();
      const daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (daysUntilDue < 7) {
        return res.status(400).json({ 
          error: "Requests within 7 days are not allowed. Please reach out via Chat." 
        });
      }

      const isRush = daysUntilDue >= 7 && daysUntilDue <= 30;

      // Get campaign type and calculate credits server-side
      const campaignType = await storage.getCampaignType(req.body.campaignTypeId);
      if (!campaignType) {
        return res.status(400).json({ error: "Invalid campaign type" });
      }
      if (!campaignType.isActive) {
        return res.status(400).json({ error: "Campaign type is not available" });
      }

      const baseCredits = parseFloat(String(campaignType.estimatedCredits));
      const finalCredits = isRush ? baseCredits * 2 : baseCredits;

      const memberIds = Array.isArray(req.body.campaignMemberIds) ? req.body.campaignMemberIds : [];
      if (memberIds.length > 0) {
        const companyMembersList = await storage.getCompanyMembers(companyId);
        const validMemberUserIds = new Set(companyMembersList.map(m => m.userId));
        const invalidIds = memberIds.filter((id: string) => !validMemberUserIds.has(id));
        if (invalidIds.length > 0) {
          return res.status(400).json({ error: "Some selected members do not belong to your company" });
        }
      }

      const validation = insertCampaignRequestSchema.safeParse({
        ...req.body,
        companyId,
        requestedBy: userId,
        estimatedCredits: String(finalCredits),
        isRush,
        campaignMemberIds: memberIds,
      });
      
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.message });
      }

      const request = await storage.createCampaignRequest(validation.data);
      res.status(201).json(request);
    } catch (error) {
      res.status(500).json({ error: "Failed to create campaign request" });
    }
  });

  // Create campaign request (admin)
  app.post("/api/admin/campaign-requests", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { companyId, campaignTypeId, dueDate, name, notes, targetAudience, goals, preferredTone, keyMessages, referenceLinks, budgetNotes, additionalDetails, deliverableQuantities, campaignMemberIds } = req.body;
      
      if (!companyId || !campaignTypeId || !dueDate) {
        return res.status(400).json({ error: "Company, campaign type, and due date are required" });
      }

      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      const campaignType = await storage.getCampaignType(campaignTypeId);
      if (!campaignType) {
        return res.status(400).json({ error: "Invalid campaign type" });
      }

      let estimatedCredits = campaignType.estimatedCredits;
      if (deliverableQuantities) {
        const quantities = typeof deliverableQuantities === 'string' ? JSON.parse(deliverableQuantities) : deliverableQuantities;
        const deliverableTypes = await storage.getDeliverableTypes();
        let total = 0;
        for (const delId of (campaignType.includedDeliverableIds || [])) {
          const del = deliverableTypes.find(d => d.id === delId || d.key === delId);
          const qty = quantities[delId] || 1;
          total += parseFloat(del?.credits || "0") * qty;
        }
        if (total > 0) estimatedCredits = String(total);
      }

      const request = await storage.createCampaignRequest({
        companyId,
        campaignTypeId,
        requestedBy: userId,
        dueDate,
        name: name || null,
        notes: notes || null,
        targetAudience: targetAudience || null,
        goals: goals || null,
        preferredTone: preferredTone || null,
        keyMessages: keyMessages || null,
        referenceLinks: referenceLinks || null,
        budgetNotes: budgetNotes || null,
        additionalDetails: additionalDetails || null,
        estimatedCredits,
        deliverableQuantities: deliverableQuantities ? (typeof deliverableQuantities === 'string' ? deliverableQuantities : JSON.stringify(deliverableQuantities)) : null,
        campaignMemberIds: Array.isArray(campaignMemberIds) ? campaignMemberIds : [],
        requestDeliverableIds: campaignType.includedDeliverableIds || [],
        requestDeliverableQuantities: deliverableQuantities ? (typeof deliverableQuantities === 'string' ? deliverableQuantities : JSON.stringify(deliverableQuantities)) : (campaignType.deliverableQuantities || null),
        requestMeetingQuantities: campaignType.meetingTypeQuantities || null,
      });
      broadcastInvalidation(["/api/admin/campaign-requests", "/api/notifications"]);
      res.status(201).json(request);
    } catch (error) {
      res.status(500).json({ error: "Failed to create campaign request" });
    }
  });

  // Update campaign request (admin - for approval workflow)
  app.patch("/api/campaign-requests/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const updateData = { ...req.body };
      if (updateData.creditOverride !== undefined && updateData.creditOverride !== null) {
        const parsed = parseFloat(updateData.creditOverride);
        if (isNaN(parsed) || parsed < 0) {
          return res.status(400).json({ error: "Credit override must be a valid non-negative number" });
        }
        updateData.creditOverride = String(parsed);
      }
      const existingRequest = await storage.getCampaignRequest(req.params.id);

      if (req.body.rushDisabled !== undefined && existingRequest && existingRequest.isRush) {
        const wasDisabled = existingRequest.rushDisabled ?? false;
        const nowDisabled = !!req.body.rushDisabled;
        if (wasDisabled !== nowDisabled) {
          const currentCredits = parseFloat(existingRequest.estimatedCredits || "0");
          if (currentCredits > 0) {
            const newCredits = nowDisabled ? currentCredits / 2 : currentCredits * 2;
            updateData.estimatedCredits = String(newCredits);
          }
        }
      }

      const request = await storage.updateCampaignRequest(req.params.id, updateData);
      if (!request) {
        return res.status(404).json({ error: "Campaign request not found" });
      }
      
      // Auto-create tasks when campaign is approved
      if (req.body.status === "approved" && existingRequest?.status !== "approved") {
        try {
          const approvalCompany = await storage.getCompany(request.companyId);
          const approvalCampaignType = await storage.getCampaignType(request.campaignTypeId);
          if (approvalCompany && approvalCampaignType) {
            const deliverableTypes = await storage.getDeliverableTypes();
            const effectiveDeliverableIds = request.requestDeliverableIds || approvalCampaignType.includedDeliverableIds || [];
            let quantities: Record<string, number> = {};
            if (request.requestDeliverableQuantities) {
              quantities = JSON.parse(request.requestDeliverableQuantities);
            } else if (request.deliverableQuantities) {
              quantities = JSON.parse(request.deliverableQuantities);
            } else if (approvalCampaignType.deliverableQuantities) {
              quantities = JSON.parse(approvalCampaignType.deliverableQuantities);
            }
            const { getBillingPeriod } = await import("@shared/billing");
            const period = getBillingPeriod(approvalCompany.billingStartDay);

            const totalDeliverables = effectiveDeliverableIds.reduce((sum: number, delId: string) => {
              return sum + (quantities[delId] || 1);
            }, 0);

            for (const delId of effectiveDeliverableIds) {
              const del = deliverableTypes.find(d => d.id === delId || d.key === delId);
              if (!del) continue;
              const qty = quantities[delId] || 1;
              const rushMultiplier = (request.isRush && !request.rushDisabled) ? 2 : 1;
              const totalCreditForDeliverable = request.creditOverride != null 
                ? String(parseFloat(String(request.creditOverride)) / totalDeliverables * qty)
                : String(parseFloat(del.credits) * qty * rushMultiplier);

              const campaignTitle = request.name || approvalCampaignType.name;
              const allDeliverableNames = effectiveDeliverableIds
                .map((id: string) => {
                  const d = deliverableTypes.find(dt => dt.id === id || dt.key === id);
                  const q = quantities[id] || 1;
                  return d ? (q > 1 ? `${d.name} (x${q})` : d.name) : null;
                })
                .filter(Boolean);
              const taskDescription = [
                `This task is part of the campaign: ${campaignTitle}`,
                request.notes ? `\nCampaign Notes: ${request.notes}` : '',
                request.goals ? `\nGoals: ${request.goals}` : '',
                request.targetAudience ? `\nTarget Audience: ${request.targetAudience}` : '',
                `\nDeliverables in this campaign: ${allDeliverableNames.join(', ')}`,
                `\nThis task covers: ${del.name}${qty > 1 ? ` (x${qty})` : ''}`,
              ].filter(Boolean).join('');

              await storage.createTask({
                companyId: request.companyId,
                title: `${campaignTitle} - ${del.name}`,
                description: taskDescription,
                status: "pending",
                priority: "medium",
                creditCost: totalCreditForDeliverable,
                type: "assigned",
                deliverableType: del.key,
                dueDate: request.dueDate,
                assignedBy: userId,
                creditsDeducted: false,
                billingPeriodStart: period.startStr,
                billingPeriodEnd: period.endStr,
                approvalStatus: "approved",
                noCredit: false,
                taskOwnership: "agency",
                campaignRequestId: request.id,
                bulkQuantity: qty > 1 ? qty : null,
              });
            }
          }
          checkProjectedUsageAndNotify(request.companyId).catch(() => {});
        } catch (taskError: any) {
          console.error("Failed to auto-create tasks for approved campaign:", taskError.message);
        }

        try {
          const approvalCampaignType = await storage.getCampaignType(request.campaignTypeId);
          let meetingTypeQuantitiesMap: Record<string, number> = {};
          if (request.requestMeetingQuantities) {
            try { meetingTypeQuantitiesMap = JSON.parse(request.requestMeetingQuantities); } catch {}
          } else if (approvalCampaignType?.meetingTypeQuantities) {
            try { meetingTypeQuantitiesMap = JSON.parse(approvalCampaignType.meetingTypeQuantities); } catch {}
          }
          const meetingEntries = Object.entries(meetingTypeQuantitiesMap).filter(([, qty]) => qty > 0);
          
          if (meetingEntries.length > 0) {
            const allAdmins = await storage.getAllAdminUsers();
            const adminUserIds = allAdmins.map(a => a.userId);
            const campaignMemberIds = request.campaignMemberIds || [];
            const allAttendeeIds = [...new Set([...adminUserIds, ...campaignMemberIds, request.requestedBy])];
            const campaignName = request.name || approvalCampaignType?.name || "Campaign";
            const proposedDate = request.dueDate;
            
            for (const [mtId, qty] of meetingEntries) {
              const mt = await storage.getMeetingType(mtId);
              if (!mt) continue;
              
              for (let i = 1; i <= qty; i++) {
                const meetingTitle = qty > 1
                  ? `${campaignName} - ${mt.name} ${i} of ${qty}`
                  : `${campaignName} - ${mt.name}`;
                
                await storage.createMeetingRequest({
                  companyId: request.companyId,
                  meetingTypeId: mt.id,
                  requestedBy: request.requestedBy,
                  title: meetingTitle,
                  description: `Auto-created from campaign: ${campaignName}`,
                  proposedDate: proposedDate,
                  proposedTime: "10:00",
                  duration: mt.defaultDuration,
                  attendeeIds: allAttendeeIds,
                  externalAttendeeEmails: [],
                  creditCost: String(parseFloat(mt.creditCost) * ((request.isRush && !request.rushDisabled) ? 2 : 1)),
                  notes: null,
                });
              }
            }
          }
        } catch (meetingError: any) {
          console.error("Failed to auto-create meetings for approved campaign:", meetingError.message);
        }
      }

      // Send email if status changed to approved or rejected
      if (req.body.status && (req.body.status === "approved" || req.body.status === "rejected") && existingRequest?.status !== req.body.status) {
        const company = await storage.getCompany(request.companyId);
        const members = company ? await storage.getCompanyMembers(company.id) : [];
        const owners = members.filter(m => m.role === "owner" || m.role === "admin");
        const campaignType = await storage.getCampaignType(request.campaignTypeId);
        
        const baseUrl = process.env.REPLIT_DEPLOYMENT
          ? `https://${(process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || "").split(",")[0]}`
          : process.env.REPLIT_DEV_DOMAIN 
            ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
            : "http://localhost:5000";
        
        for (const member of owners) {
          const user = await storage.getUser(member.userId);
          if (user?.email) {
            sendCampaignResponseEmail({
              recipientEmail: user.email,
              recipientName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
              campaignName: request.name,
              campaignType: campaignType?.name || "Campaign",
              status: req.body.status,
              adminNotes: req.body.adminNotes,
              portalUrl: `${baseUrl}/client/campaigns`,
            }).catch(err => console.error("Failed to send campaign response email:", err));
          }
        }
      }
      
      broadcastInvalidation(["/api/admin/campaign-requests", "/api/tasks", "/api/companies", "/api/notifications"]);
      res.json(request);
    } catch (error) {
      res.status(500).json({ error: "Failed to update campaign request" });
    }
  });

  // ==================== MEETING TYPES ====================

  // Get all meeting types
  app.get("/api/meeting-types", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const types = await storage.getMeetingTypes();
      res.json(types);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch meeting types" });
    }
  });

  // Get active meeting types (for clients creating requests)
  app.get("/api/meeting-types/active", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const types = await storage.getActiveMeetingTypes();
      res.json(types);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch meeting types" });
    }
  });

  // Create meeting type (admin only)
  app.post("/api/meeting-types", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const type = await storage.createMeetingType(req.body);
      res.status(201).json(type);
    } catch (error) {
      res.status(500).json({ error: "Failed to create meeting type" });
    }
  });

  // Update meeting type (admin only)
  app.patch("/api/meeting-types/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const type = await storage.updateMeetingType(req.params.id, req.body);
      if (!type) {
        return res.status(404).json({ error: "Meeting type not found" });
      }
      res.json(type);
    } catch (error) {
      res.status(500).json({ error: "Failed to update meeting type" });
    }
  });

  // Delete meeting type (admin only)
  app.delete("/api/meeting-types/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      await storage.deleteMeetingType(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete meeting type" });
    }
  });

  // ==================== MEETING REQUESTS ====================

  // Get all meeting requests (admin)
  app.get("/api/meeting-requests", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const requests = await storage.getAllMeetingRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch meeting requests" });
    }
  });

  // Get meeting requests for a company
  app.get("/api/companies/:id/meeting-requests", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const companyId = req.params.id;
      
      // Check access
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      let requests = await storage.getMeetingRequests(companyId);
      if (!isAdmin) {
        requests = requests.filter(r => 
          r.requestedBy === userId || 
          (r.attendeeIds && r.attendeeIds.includes(userId))
        );
      }
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch meeting requests" });
    }
  });

  // Create meeting request
  app.post("/api/companies/:id/meeting-requests", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const companyId = req.params.id;
      
      // Check access
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        const member = await storage.getCompanyMember(userId, companyId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      // Get meeting type and validate
      const meetingType = await storage.getMeetingType(req.body.meetingTypeId);
      if (!meetingType) {
        return res.status(400).json({ error: "Invalid meeting type" });
      }
      if (!meetingType.isActive) {
        return res.status(400).json({ error: "Meeting type is not available" });
      }

      // For client-created meetings, auto-include all agency admins in attendeeIds
      let attendeeIds = req.body.attendeeIds || [];
      if (!isAdmin) {
        const admins = await storage.getAllAdminUsers();
        const adminIds = admins.map(a => a.userId);
        const mergedIds = [...new Set([...adminIds, ...attendeeIds])];
        attendeeIds = mergedIds;
      }

      // Create request with server-calculated credit cost
      const request = await storage.createMeetingRequest({
        ...req.body,
        attendeeIds,
        companyId,
        requestedBy: userId,
        creditCost: meetingType.creditCost,
        duration: req.body.duration || meetingType.defaultDuration,
      });

      res.status(201).json(request);
    } catch (error) {
      res.status(500).json({ error: "Failed to create meeting request" });
    }
  });

  // Update meeting request (admin - for approval workflow)
  app.patch("/api/meeting-requests/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const existingRequest = await storage.getMeetingRequest(req.params.id);
      if (!existingRequest) {
        return res.status(404).json({ error: "Meeting request not found" });
      }

      // Handle approval - no longer deduct credits at approval, only mark approved
      if (req.body.status === "approved" && existingRequest.status === "pending") {
        req.body.approvedBy = userId;
        req.body.approvedAt = new Date().toISOString();
      }

      // Handle completion - deduct credits when meeting is completed
      if (req.body.status === "completed" && existingRequest.status !== "completed" && !existingRequest.creditsDeducted) {
        const creditCostToUse = req.body.creditCost ? parseFloat(req.body.creditCost) : parseFloat(existingRequest.creditCost);
        const company = await storage.getCompany(existingRequest.companyId);
        if (!company) {
          return res.status(400).json({ error: "Company not found" });
        }

        if (company.credits < creditCostToUse) {
          return res.status(400).json({ error: "Insufficient credits" });
        }

        const newBalance = company.credits - creditCostToUse;

        await storage.updateCompany(existingRequest.companyId, {
          credits: newBalance,
        });

        await storage.createCreditTransaction({
          companyId: existingRequest.companyId,
          amount: String(-creditCostToUse),
          type: "deduction",
          description: `Meeting: ${existingRequest.title}`,
          taskId: existingRequest.id,
          balanceAfter: String(newBalance),
        });

        req.body.creditsDeducted = true;
        if (req.body.creditCost) {
          req.body.creditCost = String(creditCostToUse);
        }
      }

      if (req.body.status === "rejected" && existingRequest.status !== "rejected") {
        req.body.rejectedAt = new Date().toISOString();
      }
      if (req.body.status === "completed" && existingRequest.status !== "completed") {
        req.body.completedAt = new Date().toISOString();
      }

      const updateData: Record<string, any> = {};
      const allowedFields = ["status", "teamsLink", "outlookMeetingLink", "adminNotes", "notes", "creditsDeducted", "approvedBy", "approvedAt", "proposedDate", "proposedTime", "creditCost", "duration", "rejectionReason", "rejectedAt", "completedAt"];
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      const request = await storage.updateMeetingRequest(req.params.id, updateData);

      // Send email notification when meeting is approved
      if (req.body.status === "approved" && existingRequest.status === "pending") {
        try {
          const requester = await storage.getUser(existingRequest.requestedBy);
          if (requester?.email) {
            const finalDate = request?.proposedDate || existingRequest.proposedDate;
            const finalTime = request?.proposedTime || existingRequest.proposedTime;
            const finalDuration = request?.duration || existingRequest.duration;

            const [year, month, day] = finalDate.split("-").map(Number);
            const [hours, minutes] = finalTime.split(":").map(Number);
            const meetingDateDisplay = new Date(year, month - 1, day);
            const formattedDate = formatDateWeekdayET(meetingDateDisplay);
            const hour12 = hours % 12 || 12;
            const ampm = hours >= 12 ? "PM" : "AM";
            const formattedTime = `${hour12}:${String(minutes).padStart(2, "0")} ${ampm}`;

            const outlookCalendarLink = request?.outlookMeetingLink || "";

            await sendMeetingApprovalEmail({
              recipientEmail: requester.email,
              recipientName: `${requester.firstName || ""} ${requester.lastName || ""}`.trim() || requester.email,
              meetingTitle: existingRequest.title,
              meetingDate: formattedDate,
              meetingTime: formattedTime,
              duration: finalDuration,
              teamsLink: request?.teamsLink || undefined,
              adminNotes: request?.adminNotes || undefined,
              outlookCalendarLink,
            });

            // Send invite emails to external attendees
            if (existingRequest.externalAttendeeEmails && existingRequest.externalAttendeeEmails.length > 0) {
              const company = await storage.getCompany(existingRequest.companyId);
              const organizerName = `${requester.firstName || ""} ${requester.lastName || ""}`.trim() || requester.email;
              const companyName = company?.name || "Near Me Marketing";

              for (const externalEmail of existingRequest.externalAttendeeEmails) {
                try {
                  await sendMeetingInviteEmail({
                    recipientEmail: externalEmail,
                    meetingTitle: existingRequest.title,
                    meetingDate: formattedDate,
                    meetingTime: formattedTime,
                    duration: finalDuration,
                    teamsLink: request?.teamsLink || undefined,
                    organizerName,
                    companyName,
                    outlookCalendarLink,
                  });
                } catch (externalEmailError) {
                  console.error(`Failed to send meeting invite to ${externalEmail}:`, externalEmailError);
                }
              }
            }
          }
        } catch (emailError) {
          console.error("Failed to send meeting approval email:", emailError);
        }
      }

      if (req.body.status === "rejected" && existingRequest.status !== "rejected") {
        try {
          const requester = await storage.getUser(existingRequest.requestedBy);
          if (requester) {
            await createAndBroadcastNotification({
              userId: requester.id,
              type: "meeting_rejected",
              title: "Meeting Request Rejected",
              message: `Your meeting request "${existingRequest.title}" has been rejected.${req.body.rejectionReason ? ` Reason: ${req.body.rejectionReason}` : ""}`,
              link: `/client/meetings`,
            });

            if (requester.email) {
              const protocol = req.headers["x-forwarded-proto"] || "https";
              const host = req.headers.host || "localhost:5000";
              const portalUrl = `${protocol}://${host}/client/meetings`;

              await sendMeetingRejectionEmail({
                recipientEmail: requester.email,
                recipientName: `${requester.firstName || ""} ${requester.lastName || ""}`.trim() || requester.email,
                meetingTitle: existingRequest.title,
                rejectionReason: req.body.rejectionReason || undefined,
                portalUrl,
              });
            }
          }
        } catch (notifError) {
          console.error("Failed to send meeting rejection notification:", notifError);
        }
      }

      res.json(request);
    } catch (error) {
      console.error("Failed to update meeting request:", error);
      res.status(500).json({ error: "Failed to update meeting request" });
    }
  });

  // Get single meeting request
  app.get("/api/meeting-requests/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const request = await storage.getMeetingRequest(req.params.id);
      
      if (!request) {
        return res.status(404).json({ error: "Meeting request not found" });
      }

      // Check access
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        const member = await storage.getCompanyMember(request.companyId, userId);
        if (!member) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      res.json(request);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch meeting request" });
    }
  });

  // Get company members with user details (for document assignment)
  app.get("/api/companies/:companyId/members-with-users", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { companyId } = req.params;
      
      // Only admins can access this endpoint
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const members = await storage.getCompanyMembers(companyId);
      
      // Get user details for each member
      const membersWithUsers = await Promise.all(
        members.map(async (member) => {
          const user = await storage.getUser(member.userId);
          return {
            ...member,
            firstName: user?.firstName || "Unknown",
            lastName: user?.lastName || "User",
            email: user?.email || "No email",
          };
        })
      );

      res.json(membersWithUsers);
    } catch (error) {
      console.error("Get company members with users error:", error);
      res.status(500).json({ error: "Failed to fetch company members" });
    }
  });

  // ============ Government Documents Routes ============

  // Get government documents for a company
  app.get("/api/companies/:companyId/government-documents", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { companyId } = req.params;
      
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        const membership = await storage.getCompanyMembership(companyId, userId);
        if (!membership) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const documents = await storage.getGovernmentDocuments(companyId);
      res.json(documents);
    } catch (error) {
      console.error("Get government documents error:", error);
      res.status(500).json({ error: "Failed to fetch government documents" });
    }
  });

  // Get single government document
  app.get("/api/government-documents/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      
      const doc = await storage.getGovernmentDocument(id);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        const membership = await storage.getCompanyMembership(doc.companyId, userId);
        if (!membership) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      res.json(doc);
    } catch (error) {
      console.error("Get government document error:", error);
      res.status(500).json({ error: "Failed to fetch government document" });
    }
  });

  // Create government document (admin only)
  app.post("/api/companies/:companyId/government-documents", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { companyId } = req.params;
      
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const user = await storage.getUser(userId);
      const { title, description, documentType, dueDate, assignedToUserId, assignedToName, assignedToEmail } = req.body;

      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      const doc = await storage.createGovernmentDocument({
        companyId,
        title,
        description: description || null,
        documentType: documentType || "contract",
        dueDate: dueDate || null,
        assignedToUserId: assignedToUserId || null,
        assignedToName: assignedToName || null,
        assignedToEmail: assignedToEmail || null,
        createdByUserId: userId,
        createdByName: user ? `${user.firstName} ${user.lastName}` : "Admin",
      });

      // Send notification email if document is assigned to someone
      if (assignedToEmail && assignedToName) {
        try {
          const company = await storage.getCompany(companyId);
          const dueDateFormatted = dueDate ? formatDateET(dueDate) : "Not specified";
          
          await sendEmail({
            to: assignedToEmail,
            subject: `Document Assigned: ${title}`,
            html: `
              <h2>You have a document to sign</h2>
              <p>Hello ${assignedToName},</p>
              <p>A new document has been assigned to you that requires your signature.</p>
              <table style="margin: 20px 0; border-collapse: collapse;">
                <tr><td style="padding: 8px; font-weight: bold;">Document:</td><td style="padding: 8px;">${title}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">Company:</td><td style="padding: 8px;">${company?.name || "Your Company"}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">Type:</td><td style="padding: 8px;">${documentType || "Contract"}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">Due Date:</td><td style="padding: 8px;">${dueDateFormatted}</td></tr>
              </table>
              <p>Please log in to the client portal to review and sign this document.</p>
              <p>Thank you,<br>Near Me Connect Team</p>
            `,
          });

          // Update document to record notification was sent
          await storage.updateGovernmentDocument(doc.id, {
            notificationSentAt: new Date().toISOString(),
          });
        } catch (emailError) {
          console.error("Failed to send document notification email:", emailError);
          // Don't fail the request if email fails
        }
      }

      res.status(201).json(doc);
    } catch (error) {
      console.error("Create government document error:", error);
      res.status(500).json({ error: "Failed to create government document" });
    }
  });

  // Sign government document
  app.post("/api/government-documents/:id/sign", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { signatureData, signatureType } = req.body;
      
      if (!signatureData) {
        return res.status(400).json({ error: "Signature data is required" });
      }
      
      const doc = await storage.getGovernmentDocument(id);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      if (doc.status === "signed") {
        return res.status(400).json({ error: "Document has already been signed" });
      }
      
      // Check access
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        const membership = await storage.getCompanyMembership(doc.companyId, userId);
        if (!membership) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const user = await storage.getUser(userId);
      const company = await storage.getCompany(doc.companyId);
      const signedAt = new Date().toISOString();
      
      // Calculate expiration date (90 days from signing)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);

      // Update document with signature
      const updatedDoc = await storage.updateGovernmentDocument(id, {
        status: "signed",
        signatureData,
        signatureType: signatureType || "drawn",
        signedByUserId: userId,
        signedByName: user ? `${user.firstName} ${user.lastName}` : "Unknown",
        signedByEmail: user?.email || null,
        signedAt,
        signerIp: req.ip || null,
        signerAgent: req.headers["user-agent"] || null,
        expiresAt: expiresAt.toISOString(),
      });

      // Upload to SharePoint if company exists
      if (company) {
        try {
          const { uploadToSharePoint } = await import("./sharepoint");
          
          // Create a simple signed document record with signature
          const signedDocContent = JSON.stringify({
            documentId: doc.id,
            title: doc.title,
            description: doc.description,
            documentType: doc.documentType,
            signedBy: user ? `${user.firstName} ${user.lastName}` : "Unknown",
            signedByEmail: user?.email,
            signedAt,
            signatureType: signatureType || "drawn",
            // Note: signatureData is base64 image
          }, null, 2);

          const fileName = `${doc.title.replace(/[^a-zA-Z0-9]/g, '_')}_signed_${new Date().toISOString().split('T')[0]}.json`;
          const uploadResult = await uploadToSharePoint(
            company.name,
            fileName,
            Buffer.from(signedDocContent),
            "application/json",
            "Government Documents",
            company.clientType as "marketing" | "government" || "marketing"
          );

          if (uploadResult.success) {
            await storage.updateGovernmentDocument(id, {
              sharepointUrl: uploadResult.webUrl || null,
              sharepointFolderId: uploadResult.path || null,
            });
          }
        } catch (uploadError) {
          console.error("SharePoint upload error:", uploadError);
          // Don't fail the signing if SharePoint upload fails
        }
      }

      res.json(updatedDoc);
    } catch (error) {
      console.error("Sign government document error:", error);
      res.status(500).json({ error: "Failed to sign government document" });
    }
  });

  // Delete government document (admin only)
  app.delete("/api/government-documents/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const doc = await storage.getGovernmentDocument(id);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }

      await storage.deleteGovernmentDocument(id);
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error("Delete government document error:", error);
      res.status(500).json({ error: "Failed to delete government document" });
    }
  });

  // ============ PDF Upload for Signing ============
  const pdfUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for PDFs
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed'));
      }
    }
  });

  app.post("/api/upload/pdf", isAuthenticated, pdfUpload.single('file'), async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      // Store the PDF in object storage
      const { Client } = await import("@replit/object-storage");
      const client = new Client();
      
      const fileName = `signing-pdfs/${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { ok, error } = await client.uploadFromBytes(fileName, req.file.buffer, {
        contentType: 'application/pdf',
      });

      if (!ok) {
        console.error("Object storage upload error:", error);
        return res.status(500).json({ error: "Failed to upload PDF" });
      }

      // Get the public URL
      const baseUrl = process.env.REPLIT_DEPLOYMENT
        ? `https://${(process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || "").split(",")[0]}`
        : process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
          : "http://localhost:5000";
      const url = `${baseUrl}/api/object-storage/file/${fileName}`;

      res.json({ url, fileName });
    } catch (error) {
      console.error("PDF upload error:", error);
      res.status(500).json({ error: "Failed to upload PDF" });
    }
  });

  // ============ Signing Packet Routes (DocuSign-style) ============

  // Get all signing packets for a company
  app.get("/api/companies/:companyId/signing-packets", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { companyId } = req.params;
      
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        const membership = await storage.getCompanyMember(userId, companyId);
        if (!membership) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const packets = await storage.getSigningPackets(companyId);
      res.json(packets);
    } catch (error) {
      console.error("Get signing packets error:", error);
      res.status(500).json({ error: "Failed to fetch signing packets" });
    }
  });

  // Get single signing packet with participants and fields
  app.get("/api/signing-packets/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      
      const packet = await storage.getSigningPacket(id);
      if (!packet) {
        return res.status(404).json({ error: "Signing packet not found" });
      }

      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        const membership = await storage.getCompanyMember(userId, packet.companyId);
        if (!membership) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const participants = await storage.getSigningParticipants(id);
      const fields = await storage.getSigningFields(id);
      const events = await storage.getSigningEvents(id);

      res.json({ ...packet, participants, fields, events });
    } catch (error) {
      console.error("Get signing packet error:", error);
      res.status(500).json({ error: "Failed to fetch signing packet" });
    }
  });

  // Create signing packet (admin only)
  app.post("/api/companies/:companyId/signing-packets", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { companyId } = req.params;
      
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { name, description, documentUrl, dueDate, participants, fields } = req.body;
      const adminUser = await storage.getAdminUser(userId);

      if (!name || !documentUrl) {
        return res.status(400).json({ error: "Name and document URL are required" });
      }

      const packet = await storage.createSigningPacket({
        companyId,
        title: name,
        message: description || null,
        originalFileUrl: documentUrl,
        dueDate: dueDate || null,
        createdById: userId,
        createdByName: adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : "Admin",
      });

      // Create participants
      if (participants && Array.isArray(participants)) {
        for (const p of participants) {
          const accessToken = nanoid(32);
          await storage.createSigningParticipant({
            packetId: packet.id,
            name: p.name,
            email: p.email,
            role: p.role || "signer",
            signingOrder: p.order || 1,
            accessToken,
          });
        }
      }

      // Create fields
      if (fields && Array.isArray(fields)) {
        for (const f of fields) {
          await storage.createSigningField({
            packetId: packet.id,
            participantId: f.participantId || null,
            fieldType: f.type,
            pageNumber: f.page,
            xPosition: f.x,
            yPosition: f.y,
            width: f.width,
            height: f.height,
            isRequired: f.required ?? true,
            label: f.label || null,
          });
        }
      }

      // Log creation event
      await storage.createSigningEvent({
        packetId: packet.id,
        participantId: null,
        eventType: "created",
        actorName: adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : "Admin",
        actorEmail: adminUser?.email || null,
        ipAddress: req.ip || null,
        userAgent: req.headers["user-agent"] || null,
      });

      const createdPacket = await storage.getSigningPacket(packet.id);
      const createdParticipants = await storage.getSigningParticipants(packet.id);
      const createdFields = await storage.getSigningFields(packet.id);

      res.json({ ...createdPacket, participants: createdParticipants, fields: createdFields });
    } catch (error) {
      console.error("Create signing packet error:", error);
      res.status(500).json({ error: "Failed to create signing packet" });
    }
  });

  // Update signing packet (admin only)
  app.patch("/api/signing-packets/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const packet = await storage.getSigningPacket(id);
      if (!packet) {
        return res.status(404).json({ error: "Signing packet not found" });
      }

      const { name, description, status, fields } = req.body;
      
      const updated = await storage.updateSigningPacket(id, {
        ...(name && { title: name }),
        ...(description !== undefined && { message: description }),
        ...(status && { status }),
      });

      // Update fields if provided
      if (fields && Array.isArray(fields)) {
        await storage.deleteSigningFieldsByPacketId(id);
        for (const f of fields) {
          await storage.createSigningField({
            packetId: id,
            participantId: f.participantId || null,
            fieldType: f.type,
            pageNumber: f.page,
            xPosition: f.x,
            yPosition: f.y,
            width: f.width,
            height: f.height,
            isRequired: f.required ?? true,
            label: f.label || null,
          });
        }
      }

      const updatedFields = await storage.getSigningFields(id);
      res.json({ ...updated, fields: updatedFields });
    } catch (error) {
      console.error("Update signing packet error:", error);
      res.status(500).json({ error: "Failed to update signing packet" });
    }
  });

  // Send signing packet (admin only - sends emails to participants)
  app.post("/api/signing-packets/:id/send", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const packet = await storage.getSigningPacket(id);
      if (!packet) {
        return res.status(404).json({ error: "Signing packet not found" });
      }

      if (packet.status !== "draft") {
        return res.status(400).json({ error: "Packet has already been sent" });
      }

      const participants = await storage.getSigningParticipants(id);
      if (participants.length === 0) {
        return res.status(400).json({ error: "No participants to send to" });
      }

      // Update packet status
      await storage.updateSigningPacket(id, { status: "sent" });

      // Log send event
      await storage.createSigningEvent({
        packetId: id,
        participantId: null,
        eventType: "sent",
        metadata: JSON.stringify({ participantCount: participants.length }),
        ipAddress: req.ip || null,
        userAgent: req.headers["user-agent"] || null,
      });

      // Send emails to participants with their signing links
      const baseUrl = process.env.REPLIT_DEPLOYMENT
        ? `https://${(process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || "").split(",")[0]}`
        : process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
          : "http://localhost:5000";
      
      for (const participant of participants) {
        sendSignatureRequestEmail({
          recipientEmail: participant.email,
          recipientName: participant.name,
          documentTitle: packet.title,
          senderName: "Near Me Connect",
          dueDate: packet.dueDate || undefined,
          signUrl: `${baseUrl}/sign?token=${participant.token}`,
        }).catch(err => console.error(`Failed to send signature request email to ${participant.email}:`, err));
      }

      res.json({ message: "Signing packet sent successfully", participantCount: participants.length });
    } catch (error) {
      console.error("Send signing packet error:", error);
      res.status(500).json({ error: "Failed to send signing packet" });
    }
  });

  // Delete signing packet (admin only)
  app.delete("/api/signing-packets/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const packet = await storage.getSigningPacket(id);
      if (!packet) {
        return res.status(404).json({ error: "Signing packet not found" });
      }

      await storage.deleteSigningFieldsByPacketId(id);
      await storage.deleteSigningPacket(id);

      res.json({ message: "Signing packet deleted successfully" });
    } catch (error) {
      console.error("Delete signing packet error:", error);
      res.status(500).json({ error: "Failed to delete signing packet" });
    }
  });

  // ============ Public Signing Routes (no auth required) ============

  // Get signing session by token (public - for recipients)
  app.get("/api/sign/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const participant = await storage.getSigningParticipantByToken(token);
      if (!participant) {
        return res.status(404).json({ error: "Invalid or expired signing link" });
      }

      if (participant.status === "completed") {
        return res.status(400).json({ error: "You have already signed this document" });
      }

      const packet = await storage.getSigningPacket(participant.packetId);
      if (!packet) {
        return res.status(404).json({ error: "Signing packet not found" });
      }

      if (packet.status === "cancelled" || packet.status === "expired") {
        return res.status(400).json({ error: "This signing request is no longer valid" });
      }

      const fields = await storage.getSigningFields(packet.id);
      const participantFields = fields
        .filter(f => f.participantId === participant.id || !f.participantId)
        .map(f => ({
          ...f,
          required: f.isRequired,
          xPosition: String(f.xPosition),
          yPosition: String(f.yPosition),
          width: String(f.width),
          height: String(f.height),
        }));

      // Log view event
      await storage.createSigningEvent({
        packetId: packet.id,
        participantId: participant.id,
        eventType: "viewed",
        actorName: participant.name,
        actorEmail: participant.email,
        ipAddress: req.ip || null,
        userAgent: req.headers["user-agent"] || null,
      });

      // Update participant viewed status
      if (!participant.viewedAt) {
        await storage.updateSigningParticipant(participant.id, { viewedAt: new Date().toISOString() });
      }

      res.json({
        packet: {
          id: packet.id,
          title: packet.title,
          message: packet.message,
          documentUrl: packet.originalFileUrl,
        },
        participant: {
          id: participant.id,
          name: participant.name,
          email: participant.email,
          role: participant.role,
        },
        fields: participantFields,
      });
    } catch (error) {
      console.error("Get signing session error:", error);
      res.status(500).json({ error: "Failed to load signing session" });
    }
  });

  // Submit signature (public - for recipients)
  app.post("/api/sign/:token/submit", async (req, res) => {
    try {
      const { token } = req.params;
      const { fieldValues } = req.body;
      
      const participant = await storage.getSigningParticipantByToken(token);
      if (!participant) {
        return res.status(404).json({ error: "Invalid or expired signing link" });
      }

      if (participant.status === "completed") {
        return res.status(400).json({ error: "You have already signed this document" });
      }

      const packet = await storage.getSigningPacket(participant.packetId);
      if (!packet || packet.status === "cancelled" || packet.status === "expired") {
        return res.status(400).json({ error: "This signing request is no longer valid" });
      }

      // Update field values
      if (fieldValues && typeof fieldValues === "object") {
        for (const [fieldId, value] of Object.entries(fieldValues)) {
          await storage.updateSigningField(fieldId, { value: value as string });
        }
      }

      // Update participant status
      await storage.updateSigningParticipant(participant.id, {
        status: "signed",
        signedAt: new Date().toISOString(),
        signerIp: req.ip || null,
        signerAgent: req.headers["user-agent"] || null,
      });

      // Log signing event
      await storage.createSigningEvent({
        packetId: packet.id,
        participantId: participant.id,
        eventType: "signed",
        actorName: participant.name,
        actorEmail: participant.email,
        ipAddress: req.ip || null,
        userAgent: req.headers["user-agent"] || null,
      });

      // Check if all participants have signed
      const allParticipants = await storage.getSigningParticipants(packet.id);
      const allSigned = allParticipants.every(p => p.status === "signed");
      
      if (allSigned) {
        const completedAt = new Date().toISOString();
        await storage.updateSigningPacket(packet.id, {
          status: "completed",
          completedAt,
        });

        await storage.createSigningEvent({
          packetId: packet.id,
          participantId: null,
          eventType: "completed",
          ipAddress: null,
          userAgent: null,
        });

        // Send completion emails to all participants
        const baseUrl = process.env.REPLIT_DEPLOYMENT
          ? `https://${(process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || "").split(",")[0]}`
          : process.env.REPLIT_DEV_DOMAIN 
            ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
            : "http://localhost:5000";

        const participantsWithSignDates = allParticipants.map(p => ({
          name: p.name,
          signedAt: p.signedAt || completedAt,
        }));

        for (const p of allParticipants) {
          sendSignatureCompletionEmail({
            recipientEmail: p.email,
            recipientName: p.name,
            documentTitle: packet.title,
            completedAt,
            downloadUrl: `${baseUrl}/sign?token=${p.token}`,
            participants: participantsWithSignDates,
          }).catch(err => console.error(`Failed to send signature completion email to ${p.email}:`, err));
        }
      }

      res.json({ message: "Signature submitted successfully", allComplete: allSigned });
    } catch (error) {
      console.error("Submit signature error:", error);
      res.status(500).json({ error: "Failed to submit signature" });
    }
  });

  // ============ Training Module Routes ============

  // Get all training modules (admin only)
  app.get("/api/admin/training-modules", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const modules = await storage.getTrainingModules();
      res.json(modules);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch training modules" });
    }
  });

  // Create training module (admin only)
  app.post("/api/admin/training-modules", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const parsed = insertTrainingModuleSchema.safeParse({
        ...req.body,
        createdBy: userId,
      });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid training module data", details: parsed.error.errors });
      }

      const module = await storage.createTrainingModule(parsed.data);
      res.json(module);
    } catch (error) {
      res.status(500).json({ error: "Failed to create training module" });
    }
  });

  // Update training module (admin only)
  app.patch("/api/admin/training-modules/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Validate update data using partial schema
      const updateSchema = insertTrainingModuleSchema.partial();
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid training module data", details: parsed.error.errors });
      }

      const module = await storage.updateTrainingModule(req.params.id, parsed.data);
      res.json(module);
    } catch (error) {
      res.status(500).json({ error: "Failed to update training module" });
    }
  });

  // Delete training module (admin only)
  app.delete("/api/admin/training-modules/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      await storage.deleteTrainingModule(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete training module" });
    }
  });

  // Upload training document to SharePoint (admin only)
  app.post("/api/admin/training-modules/:id/document", isAuthenticated, upload.single("file"), async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Check file size (50GB limit)
      const maxSize = 50 * 1024 * 1024 * 1024;
      if (req.file.size > maxSize) {
        return res.status(400).json({ error: "File too large (max 50GB)" });
      }

      const module = await storage.getTrainingModule(req.params.id);
      if (!module) {
        return res.status(404).json({ error: "Training module not found" });
      }

      // Upload to SharePoint in "Training Documents" folder
      const result = await uploadToSharePointWithIds(
        "Training Portal",
        req.file.originalname,
        req.file.buffer,
        req.file.mimetype,
        "Training Documents",
        "marketing"
      );

      if (!result.success || !result.driveId || !result.itemId) {
        return res.status(500).json({ error: result.error || "Failed to upload to SharePoint" });
      }

      // Update training module with document info
      await storage.updateTrainingModule(req.params.id, {
        contentType: "document",
        documentDriveId: result.driveId,
        documentItemId: result.itemId,
        documentFileName: req.file.originalname,
        documentFileSize: req.file.size,
        documentWebUrl: result.webUrl || null,
      });

      res.json({
        success: true,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        webUrl: result.webUrl,
      });
    } catch (error) {
      console.error("Training document upload error:", error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  // Download training document (authenticated users)
  app.get("/api/training-modules/:id/document/download", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const module = await storage.getTrainingModule(req.params.id);
      if (!module) {
        return res.status(404).json({ error: "Training module not found" });
      }

      if (!module.documentDriveId || !module.documentItemId) {
        return res.status(404).json({ error: "No document attached to this module" });
      }

      const result = await downloadFromSharePoint(module.documentDriveId, module.documentItemId);
      if (!result.success || !result.content) {
        return res.status(500).json({ error: result.error || "Failed to download document" });
      }

      res.setHeader("Content-Type", result.contentType || "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(module.documentFileName || 'document')}"`);
      res.send(result.content);
    } catch (error) {
      console.error("Training document download error:", error);
      res.status(500).json({ error: "Failed to download document" });
    }
  });

  // Get training assignments (admin can see all, clients see their own)
  app.get("/api/training-assignments", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (isAdmin) {
        const assignments = await storage.getAllTrainingAssignments();
        const enriched = await Promise.all(assignments.map(async (a) => {
          let userName: string | null = null;
          if (a.userId) {
            try {
              const user = await storage.getUser(a.userId);
              if (user) userName = `${user.firstName} ${user.lastName}`.trim();
            } catch {}
          }
          return { ...a, userName };
        }));
        res.json(enriched);
      } else {
        const assignments = await storage.getUserTrainingAssignments(userId);
        res.json(assignments);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch training assignments" });
    }
  });

  // Create training assignment (admin only)
  app.post("/api/admin/training-assignments", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const parsed = insertTrainingAssignmentSchema.safeParse({
        ...req.body,
        assignedBy: userId,
      });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid training assignment data", details: parsed.error.errors });
      }

      const assignment = await storage.createTrainingAssignment(parsed.data);
      
      // Get module details for email
      const modules = await storage.getTrainingModules();
      const module = modules.find(m => m.id === parsed.data.trainingModuleId);
      
      // Send email notification
      if (module) {
        const portalUrl = `${req.protocol}://${req.get('host')}/client/training`;
        
        // If assigned to specific user
        if (parsed.data.userId) {
          const user = await storage.getUser(parsed.data.userId);
          if (user?.email) {
            sendTrainingAssignmentEmail({
              recipientEmail: user.email,
              recipientName: user.firstName || 'Team Member',
              trainingTitle: module.title,
              trainingDescription: module.description || undefined,
              dueDate: parsed.data.dueDate ? formatDateET(parsed.data.dueDate) : undefined,
              isRequired: parsed.data.isRequired ?? true,
              portalUrl,
            }).catch(err => console.error('Failed to send training email:', err));
          }
        }
        
        // If assigned to entire company
        if (parsed.data.companyId) {
          const members = await storage.getCompanyMembers(parsed.data.companyId);
          for (const member of members) {
            const user = await storage.getUser(member.userId);
            if (user?.email) {
              sendTrainingAssignmentEmail({
                recipientEmail: user.email,
                recipientName: user.firstName || 'Team Member',
                trainingTitle: module.title,
                trainingDescription: module.description || undefined,
                dueDate: parsed.data.dueDate ? formatDateET(parsed.data.dueDate) : undefined,
                isRequired: parsed.data.isRequired ?? true,
                portalUrl,
              }).catch(err => console.error('Failed to send training email:', err));
            }
          }
        }
      }
      
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ error: "Failed to create training assignment" });
    }
  });

  // Delete training assignment (admin only)
  app.delete("/api/admin/training-assignments/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      await storage.deleteTrainingAssignment(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete training assignment" });
    }
  });

  // Get user's training with completion status
  app.get("/api/my-training", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const training = await storage.getUserTrainingWithProgress(userId);
      res.json(training);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch training" });
    }
  });

  // Mark training as completed
  app.post("/api/training-completions", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { trainingModuleId, assignmentId, watchTime, score } = req.body;

      if (!trainingModuleId) {
        return res.status(400).json({ error: "Training module ID is required" });
      }

      // Verify the user has access to this training (through assignment)
      const userTraining = await storage.getUserTrainingWithProgress(userId);
      const matchingTraining = userTraining.find(t => t.module.id === trainingModuleId);
      if (!matchingTraining) {
        return res.status(403).json({ error: "You do not have access to this training module" });
      }

      // Check if already completed
      if (matchingTraining.completion) {
        return res.status(400).json({ error: "Training already completed" });
      }

      // Verify assignmentId matches if provided
      if (assignmentId) {
        if (!matchingTraining.assignment || matchingTraining.assignment.id !== assignmentId) {
          return res.status(403).json({ error: "Invalid assignment ID for this training" });
        }
      }

      // Use the correct assignment ID from the user's training
      const validAssignmentId = matchingTraining.assignment?.id || assignmentId;

      const parsed = insertTrainingCompletionSchema.safeParse({
        trainingModuleId,
        userId,
        assignmentId: validAssignmentId,
        completedAt: new Date().toISOString(),
        watchTime,
        score,
      });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid completion data", details: parsed.error.errors });
      }

      const completion = await storage.createTrainingCompletion(parsed.data);
      res.json(completion);
    } catch (error) {
      res.status(500).json({ error: "Failed to record training completion" });
    }
  });

  // Get training completions for admin
  app.get("/api/admin/training-completions", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { moduleId, companyId } = req.query;
      const completions = await storage.getTrainingCompletions(
        moduleId as string | undefined,
        companyId as string | undefined
      );
      res.json(completions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch training completions" });
    }
  });

  // Send training reminders for upcoming due dates (admin only - can be triggered by cron/scheduler)
  app.post("/api/admin/training-reminders/send", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { daysBeforeDue = 3 } = req.body;
      const portalUrl = `${req.protocol}://${req.get('host')}/client/training`;
      
      // Get all assignments with due dates
      const allAssignments = await storage.getAllTrainingAssignments();
      const modules = await storage.getTrainingModules();
      
      const today = new Date();
      const targetDate = new Date();
      targetDate.setDate(today.getDate() + daysBeforeDue);
      
      let remindersSent = 0;
      
      for (const assignment of allAssignments) {
        if (!assignment.dueDate) continue;
        
        const dueDate = new Date(assignment.dueDate);
        const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // Send reminder if due within the specified days and not past due
        if (daysRemaining > 0 && daysRemaining <= daysBeforeDue) {
          const module = modules.find(m => m.id === assignment.trainingModuleId);
          if (!module) continue;
          
          // Get users to notify
          const usersToNotify: { email: string; name: string }[] = [];
          
          if (assignment.userId) {
            const user = await storage.getUser(assignment.userId);
            // Check if user has completed this training
            const userTraining = await storage.getUserTrainingWithProgress(assignment.userId);
            const isCompleted = userTraining.some(t => t.module.id === module.id && t.completion);
            
            if (!isCompleted && user?.email) {
              usersToNotify.push({ email: user.email, name: user.firstName || 'Team Member' });
            }
          }
          
          if (assignment.companyId) {
            const members = await storage.getCompanyMembers(assignment.companyId);
            for (const member of members) {
              const user = await storage.getUser(member.userId);
              // Check if user has completed this training
              const userTraining = await storage.getUserTrainingWithProgress(member.userId);
              const isCompleted = userTraining.some(t => t.module.id === module.id && t.completion);
              
              if (!isCompleted && user?.email) {
                usersToNotify.push({ email: user.email, name: user.firstName || 'Team Member' });
              }
            }
          }
          
          for (const { email, name } of usersToNotify) {
            try {
              await sendTrainingReminderEmail({
                recipientEmail: email,
                recipientName: name,
                trainingTitle: module.title,
                dueDate: formatDateET(dueDate),
                daysRemaining,
                portalUrl,
              });
              remindersSent++;
            } catch (err) {
              console.error(`Failed to send training reminder to ${email}:`, err);
            }
          }
        }
      }
      
      res.json({ success: true, remindersSent });
    } catch (error) {
      console.error('Failed to send training reminders:', error);
      res.status(500).json({ error: "Failed to send training reminders" });
    }
  });

  // Task due date reminder endpoint
  app.post("/api/admin/task-reminders/send", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { daysBeforeDue = 3 } = req.body;
      const portalUrl = `${req.protocol}://${req.get('host')}`;
      
      // Get all pending/in_progress tasks with due dates
      const allTasks = await storage.getAllTasks();
      const tasksWithDueDates = allTasks.filter(t => 
        t.dueDate && 
        t.status !== 'completed' && 
        t.status !== 'cancelled' &&
        t.assignedTo
      );
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let remindersSent = 0;
      
      for (const task of tasksWithDueDates) {
        if (!task.dueDate || !task.assignedTo) continue;
        
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // Send reminder if due within the specified days (including overdue up to -7 days)
        if (daysRemaining <= daysBeforeDue && daysRemaining >= -7) {
          const assignee = await storage.getCompanyMemberById(task.assignedTo);
          const company = await storage.getCompany(task.companyId);
          
          if (assignee?.email && company) {
            try {
              await sendTaskDueReminderEmail({
                recipientEmail: assignee.email,
                recipientName: assignee.name,
                taskTitle: task.title,
                dueDate: task.dueDate,
                daysRemaining,
                companyName: company.name,
                portalUrl: `${portalUrl}/client/tasks?taskId=${task.id}`,
              });
              remindersSent++;
            } catch (err) {
              console.error(`Failed to send task reminder to ${assignee.email}:`, err);
            }
          }
        }
      }
      
      res.json({ success: true, remindersSent });
    } catch (error) {
      console.error('Failed to send task reminders:', error);
      res.status(500).json({ error: "Failed to send task reminders" });
    }
  });

  // HubSpot Integration Routes
  app.get("/api/hubspot/status", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const connected = isHubSpotConnected();
      res.json({ connected });
    } catch (error) {
      console.error('HubSpot status check error:', error);
      res.json({ connected: false });
    }
  });

  app.get("/api/hubspot/companies", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const result = await getHubSpotCompanies();
      res.json(result);
    } catch (error) {
      console.error('HubSpot companies fetch error:', error);
      res.status(500).json({ error: "Failed to fetch HubSpot companies" });
    }
  });

  app.post("/api/hubspot/sync-company/:companyId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const { companyId } = req.params;
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      
      const result = await syncCompanyToHubSpot({
        id: company.id,
        name: company.name,
        industry: company.industry,
        subscriptionTier: company.subscriptionTier,
        credits: parseFloat(company.credits?.toString() || "0"),
        monthlyCredits: parseFloat(company.monthlyCredits?.toString() || "0"),
      });
      
      res.json(result);
    } catch (error) {
      console.error('HubSpot company sync error:', error);
      res.status(500).json({ error: "Failed to sync company to HubSpot" });
    }
  });

  app.post("/api/hubspot/sync-all", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      // Get all companies
      const allCompanies = await storage.getAllCompanies();
      const companiesData = allCompanies.map(c => ({
        id: c.id,
        name: c.name,
        industry: c.industry,
        subscriptionTier: c.subscriptionTier,
        credits: parseFloat(c.credits?.toString() || "0"),
        monthlyCredits: parseFloat(c.monthlyCredits?.toString() || "0"),
      }));
      
      // Get all company members with their details
      const contactsData: Array<{ email: string; firstName: string; lastName: string; companyName?: string }> = [];
      for (const company of allCompanies) {
        const members = await storage.getCompanyMembers(company.id);
        for (const member of members) {
          const user = await storage.getUser(member.userId);
          if (user) {
            contactsData.push({
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              companyName: company.name,
            });
          }
        }
      }
      
      const result = await syncAllToHubSpot(companiesData, contactsData);
      res.json(result);
    } catch (error) {
      console.error('HubSpot sync all error:', error);
      res.status(500).json({ error: "Failed to sync all data to HubSpot" });
    }
  });

  app.post("/api/hubspot/sync-task/:taskId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const { taskId } = req.params;
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      const company = await storage.getCompany(task.companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      
      const result = await createHubSpotTask({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        companyName: company.name,
        dueDate: task.dueDate?.toString() || null,
      });
      
      res.json(result);
    } catch (error) {
      console.error('HubSpot task sync error:', error);
      res.status(500).json({ error: "Failed to sync task to HubSpot" });
    }
  });

  // Search HubSpot companies by name
  app.get("/api/hubspot/search", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.json({ success: true, companies: [] });
      }
      
      const result = await searchHubSpotCompanies(query);
      res.json(result);
    } catch (error) {
      console.error('HubSpot search error:', error);
      res.status(500).json({ error: "Failed to search HubSpot companies" });
    }
  });

  // Get HubSpot company by ID
  app.get("/api/hubspot/company/:hubspotId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const { hubspotId } = req.params;
      const result = await getHubSpotCompanyById(hubspotId);
      res.json(result);
    } catch (error) {
      console.error('HubSpot get company error:', error);
      res.status(500).json({ error: "Failed to get HubSpot company" });
    }
  });

  // Get contacts associated with a HubSpot company
  app.get("/api/hubspot/company/:hubspotId/contacts", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const { hubspotId } = req.params;
      const result = await getHubSpotCompanyContacts(hubspotId);
      res.json(result);
    } catch (error) {
      console.error('HubSpot get contacts error:', error);
      res.status(500).json({ error: "Failed to get HubSpot contacts" });
    }
  });

  // ===========================================
  // Credit Store Routes
  // ===========================================

  // Get credit store settings
  app.get("/api/credit-store/settings", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const settings = await storage.getCreditStoreSettings();
      res.json(settings || { basePricePerCredit: "125.00", isStoreEnabled: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to get credit store settings" });
    }
  });

  // Update credit store settings (admin only)
  app.put("/api/credit-store/settings", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { basePricePerCredit, isStoreEnabled } = req.body;
      const settings = await storage.upsertCreditStoreSettings({
        basePricePerCredit,
        isStoreEnabled,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      });
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update credit store settings" });
    }
  });

  // Get credit packages
  app.get("/api/credit-store/packages", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const activeOnly = req.query.active === "true";
      const packages = await storage.getCreditPackages(activeOnly);
      res.json(packages);
    } catch (error) {
      res.status(500).json({ error: "Failed to get credit packages" });
    }
  });

  // Create credit package (admin only)
  app.post("/api/credit-store/packages", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const pkg = await storage.createCreditPackage({
        ...req.body,
        createdBy: userId,
      });
      res.status(201).json(pkg);
    } catch (error) {
      res.status(500).json({ error: "Failed to create credit package" });
    }
  });

  // Update credit package (admin only)
  app.put("/api/credit-store/packages/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const pkg = await storage.updateCreditPackage(req.params.id, req.body);
      res.json(pkg);
    } catch (error) {
      res.status(500).json({ error: "Failed to update credit package" });
    }
  });

  // Delete credit package (admin only)
  app.delete("/api/credit-store/packages/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      await storage.deleteCreditPackage(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete credit package" });
    }
  });

  // Get credit sales
  app.get("/api/credit-store/sales", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const activeOnly = req.query.active === "true";
      const sales = await storage.getCreditSales(activeOnly);
      res.json(sales);
    } catch (error) {
      res.status(500).json({ error: "Failed to get credit sales" });
    }
  });

  // Create credit sale (admin only)
  app.post("/api/credit-store/sales", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const sale = await storage.createCreditSale({
        ...req.body,
        createdBy: userId,
      });
      res.status(201).json(sale);
    } catch (error) {
      res.status(500).json({ error: "Failed to create credit sale" });
    }
  });

  // Update credit sale (admin only)
  app.put("/api/credit-store/sales/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const sale = await storage.updateCreditSale(req.params.id, req.body);
      res.json(sale);
    } catch (error) {
      res.status(500).json({ error: "Failed to update credit sale" });
    }
  });

  // Delete credit sale (admin only)
  app.delete("/api/credit-store/sales/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      await storage.deleteCreditSale(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete credit sale" });
    }
  });

  // Get credit purchases (for company or admin)
  app.get("/api/credit-store/purchases", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (isAdmin) {
        const companyId = req.query.companyId as string | undefined;
        const purchases = await storage.getCreditPurchases(companyId);
        res.json(purchases);
      } else {
        const membership = await storage.getUserCompanies(userId);
        if (membership.length === 0) {
          return res.status(403).json({ error: "No company membership found" });
        }
        const purchases = await storage.getCreditPurchases(membership[0].companyId);
        res.json(purchases);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to get credit purchases" });
    }
  });

  // Check Stripe configuration status
  app.get("/api/credit-store/stripe-status", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    const { isStripeConfigured } = await import("./stripe");
    res.json({ configured: isStripeConfigured() });
  });

  // Create Stripe checkout session (company owner/admin only)
  app.post("/api/credit-store/checkout", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { packageId } = req.body;

      // Check if user is company owner or admin
      const memberships = await storage.getUserCompanies(userId);
      if (memberships.length === 0) {
        return res.status(403).json({ error: "No company membership found" });
      }

      const membership = memberships[0];
      if (membership.role !== 'company_owner' && membership.role !== 'company_admin') {
        return res.status(403).json({ error: "Only Company Owners and Company Admins can purchase credits" });
      }

      const { isStripeConfigured, createCheckoutSession } = await import("./stripe");
      if (!isStripeConfigured()) {
        return res.status(503).json({ error: "Payment system is not configured. Please contact support." });
      }

      // Get package details
      const pkg = await storage.getCreditPackage(packageId);
      if (!pkg || !pkg.isActive) {
        return res.status(404).json({ error: "Package not found or not available" });
      }

      // Get company details
      const company = await storage.getCompany(membership.companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      // Check for active sales
      const activeSales = await storage.getCreditSales(true);
      let finalPrice = parseFloat(pkg.price);
      let discountApplied = 0;

      for (const sale of activeSales) {
        if (sale.appliesTo === 'all' || sale.appliesTo.split(',').includes(pkg.id)) {
          const discount = parseFloat(sale.discountPercentage);
          discountApplied = finalPrice * (discount / 100);
          finalPrice = finalPrice - discountApplied;
          break; // Apply first matching sale only
        }
      }

      // Create checkout session
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await createCheckoutSession({
        companyId: company.id,
        companyName: company.name,
        userId,
        creditAmount: pkg.creditAmount,
        price: finalPrice,
        packageName: pkg.name,
        successUrl: `${baseUrl}/client/credits?success=true`,
        cancelUrl: `${baseUrl}/client/credits?canceled=true`,
      });

      if (!session) {
        return res.status(500).json({ error: "Failed to create checkout session" });
      }

      // Create pending purchase record
      await storage.createCreditPurchase({
        companyId: company.id,
        userId,
        packageId: pkg.id,
        creditAmount: pkg.creditAmount,
        amountPaid: finalPrice.toFixed(2),
        discountApplied: discountApplied > 0 ? discountApplied.toFixed(2) : undefined,
        stripeSessionId: session.id,
        status: "pending",
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Get company users with full details and tags (admin only)
  app.get("/api/admin/companies/:id/users", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const companyId = req.params.id;
      const members = await storage.getCompanyMembers(companyId);
      const allTags = await storage.getUserTags();
      const allCustomRoles = await storage.getCustomRoles();
      const customRolesMap = new Map(allCustomRoles.map(r => [r.id, r.name]));
      
      const usersWithDetails = await Promise.all(
        members.map(async (member) => {
          const user = await storage.getUser(member.userId);
          const tagAssignments = await storage.getUserTagAssignments(member.userId);
          const userTags = tagAssignments
            .map(a => allTags.find(t => t.id === a.tagId))
            .filter(Boolean);
          
          let roleLabel: string | null = null;
          if (member.role === "company_owner") {
            roleLabel = "Owner";
          } else if (member.role === "company_admin") {
            roleLabel = "Company Admin";
          } else if (member.role === "custom" && member.customRoleId) {
            roleLabel = customRolesMap.get(member.customRoleId) || "Team Member";
          } else {
            roleLabel = "Team Member";
          }
          
          return {
            id: member.userId,
            memberId: member.id,
            role: member.role,
            roleLabel,
            email: user?.email || "",
            firstName: user?.firstName || "",
            lastName: user?.lastName || "",
            createdAt: member.createdAt,
            tags: userTags,
          };
        })
      );

      res.json(usersWithDetails);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company users" });
    }
  });

  // ==================== User Tags ====================

  // Get all user tags
  app.get("/api/admin/user-tags", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const tags = await storage.getUserTags();
      res.json(tags);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user tags" });
    }
  });

  // Create user tag
  app.post("/api/admin/user-tags", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { name, color, isPreset } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Tag name is required" });
      }

      const tag = await storage.createUserTag({
        name,
        color: color || "#6366f1",
        isPreset: isPreset ?? false,
        createdBy: userId,
      });
      res.json(tag);
    } catch (error) {
      res.status(500).json({ error: "Failed to create user tag" });
    }
  });

  // Update user tag
  app.patch("/api/admin/user-tags/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const tag = await storage.updateUserTag(req.params.id, req.body);
      if (!tag) {
        return res.status(404).json({ error: "Tag not found" });
      }
      res.json(tag);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user tag" });
    }
  });

  // Delete user tag
  app.delete("/api/admin/user-tags/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      await storage.deleteUserTag(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user tag" });
    }
  });

  // Get tags for a specific user
  app.get("/api/admin/users/:userId/tags", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const assignments = await storage.getUserTagAssignments(req.params.userId);
      const tags = await storage.getUserTags();
      const userTags = assignments
        .map(a => tags.find(t => t.id === a.tagId))
        .filter(Boolean);
      res.json(userTags);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user tags" });
    }
  });

  // Assign tag to user
  app.post("/api/admin/users/:userId/tags", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const adminId = req.user!.id;
      const isAdmin = await storage.isAdmin(adminId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { tagId } = req.body;
      if (!tagId) {
        return res.status(400).json({ error: "Tag ID is required" });
      }

      const assignment = await storage.assignUserTag({
        userId: req.params.userId,
        tagId,
        assignedBy: adminId,
      });
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ error: "Failed to assign tag" });
    }
  });

  // Remove tag from user
  app.delete("/api/admin/users/:userId/tags/:tagId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      await storage.removeUserTag(req.params.userId, req.params.tagId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove tag" });
    }
  });

  // ==========================================
  // Notification API endpoints
  // ==========================================

  // Get current user's notifications
  app.get("/api/notifications", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Get unread notification count
  app.get("/api/notifications/unread-count", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  // Mark a notification as read
  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const notification = await storage.markNotificationRead(req.params.id);
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }
      // Verify the notification belongs to the current user
      if (notification.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(notification);
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.post("/api/notifications/mark-all-read", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notifications as read" });
    }
  });

  app.delete("/api/notifications/clear-read", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      await storage.clearReadNotifications(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear notifications" });
    }
  });

  app.post("/api/notifications/test", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const notification = await createAndBroadcastNotification({
        userId,
        type: "system",
        title: "Test Notification",
        message: "This is a test notification. If you can see this and hear a sound, notifications are working correctly!",
        link: null,
        createdBy: userId,
      });
      res.json(notification);
    } catch (error) {
      res.status(500).json({ error: "Failed to send test notification" });
    }
  });

  app.post("/api/notifications/test-delayed", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const requestedDelay = typeof req.body.delayMs === "number" ? req.body.delayMs : 5000;
      const delayMs = Math.max(1000, Math.min(30000, requestedDelay));
      res.json({ scheduled: true, delayMs });
      setTimeout(async () => {
        try {
          await createAndBroadcastNotification({
            userId,
            type: "system",
            title: "Test Notification",
            message: "This is a test notification. If you can see this and hear a sound, notifications are working correctly!",
            link: null,
            createdBy: userId,
          });
        } catch (err) {
          console.error("Failed to send delayed test notification:", err);
        }
      }, delayMs);
    } catch (error) {
      res.status(500).json({ error: "Failed to schedule test notification" });
    }
  });

  // Get mentionable users for a chat thread (members of that thread)
  app.get("/api/chat/threads/:id/mentionable-users", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const threadId = req.params.id;
      
      const thread = await storage.getChatThread(threadId);
      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }

      // Check access to thread
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        const member = await storage.getChatThreadMember(threadId, userId);
        if (!member || member.leftAt) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      // Get all thread members
      const members = await storage.getChatThreadMembers(threadId);
      const activeMembers = members.filter(m => !m.leftAt);
      
      // Get user details for each member
      const userDetails = await Promise.all(
        activeMembers.map(async (member) => {
          const user = await storage.getUser(member.userId);
          if (!user) return null;
          const isAdminUser = await storage.isAdmin(member.userId);
          return {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            type: isAdminUser ? "admin" : "client",
          };
        })
      );

      res.json(userDetails.filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch mentionable users" });
    }
  });

  // ============ SANDBOX ROUTES ============
  const SANDBOX_COMPANY_ID = "sandbox-company-001";

  // Get sandbox status
  app.get("/api/sandbox/status", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const company = await storage.getCompany(SANDBOX_COMPANY_ID);
      
      if (!company) {
        return res.json({ exists: false });
      }

      // Ensure admin is a member of sandbox company for client view interactions
      const existingAdminMember = await storage.getCompanyMember(userId, SANDBOX_COMPANY_ID);
      if (!existingAdminMember) {
        await storage.createCompanyMember({
          companyId: SANDBOX_COMPANY_ID,
          userId: userId,
          role: "company_owner",
        });
      }

      // Get counts
      const tasks = await storage.getTasks(SANDBOX_COMPANY_ID);
      const threads = await storage.getChatThreads(SANDBOX_COMPANY_ID);
      const members = await storage.getCompanyMembers(SANDBOX_COMPANY_ID);

      res.json({
        exists: true,
        company,
        userCount: members.length,
        taskCount: tasks.length,
        chatThreadCount: threads.length,
      });
    } catch (error) {
      console.error("Sandbox status error:", error);
      res.status(500).json({ error: "Failed to get sandbox status" });
    }
  });

  // Initialize sandbox
  app.post("/api/sandbox/init", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Check if already exists
      const existing = await storage.getCompany(SANDBOX_COMPANY_ID);
      if (existing) {
        return res.status(400).json({ error: "Sandbox already exists" });
      }

      // Create sandbox company
      await storage.createCompanyWithId(SANDBOX_COMPANY_ID, {
        name: "Sandbox Test Company",
        industry: "Technology",
        subscriptionTier: "growth",
        billingStartDay: 1,
      });

      // Set initial credits
      await storage.updateCompany(SANDBOX_COMPANY_ID, { 
        credits: 40, 
        monthlyCredits: 40,
        onboardingComplete: false,
      });

      // Create a sandbox test user and add as member
      const sandboxUserId = "sandbox-user-001";
      let sandboxUser = await storage.getUser(sandboxUserId);
      
      if (!sandboxUser) {
        const bcrypt = await import("bcryptjs");
        const hashedPassword = await bcrypt.hash("sandbox123", 10);
        sandboxUser = await storage.createUserWithId(sandboxUserId, {
          email: "sandbox@test.com",
          password: hashedPassword,
          firstName: "Sandbox",
          lastName: "User",
        });
      }

      // Add sandbox user as company owner
      await storage.createCompanyMember({
        companyId: SANDBOX_COMPANY_ID,
        userId: sandboxUserId,
        role: "company_owner",
      });

      // Add the admin user as a sandbox company member so they can interact with client views
      const existingAdminMember = await storage.getCompanyMember(userId, SANDBOX_COMPANY_ID);
      if (!existingAdminMember) {
        await storage.createCompanyMember({
          companyId: SANDBOX_COMPANY_ID,
          userId: userId,
          role: "company_owner",
        });
      }

      res.json({ success: true, companyId: SANDBOX_COMPANY_ID });
    } catch (error) {
      console.error("Sandbox init error:", error);
      res.status(500).json({ error: "Failed to initialize sandbox" });
    }
  });

  // Reset sandbox
  app.post("/api/sandbox/reset", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Delete all sandbox data
      await storage.deleteSandboxData(SANDBOX_COMPANY_ID);

      // Reset company to initial state
      await storage.updateCompany(SANDBOX_COMPANY_ID, {
        credits: 40,
        monthlyCredits: 40,
        onboardingComplete: false,
        isPaused: false,
        pausedAt: null,
      });

      // Delete client onboarding data for this company
      await storage.deleteClientOnboarding(SANDBOX_COMPANY_ID);

      // Re-add admin as sandbox company member
      const existingAdminMember = await storage.getCompanyMember(userId, SANDBOX_COMPANY_ID);
      if (!existingAdminMember) {
        await storage.createCompanyMember({
          companyId: SANDBOX_COMPANY_ID,
          userId: userId,
          role: "company_owner",
        });
      }

      res.json({ success: true, message: "Sandbox reset complete" });
    } catch (error) {
      console.error("Sandbox reset error:", error);
      res.status(500).json({ error: "Failed to reset sandbox" });
    }
  });

  // Skip sandbox onboarding
  app.post("/api/sandbox/skip-onboarding", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Mark sandbox company onboarding as complete
      await storage.updateCompany(SANDBOX_COMPANY_ID, {
        onboardingComplete: true,
      });

      res.json({ success: true, message: "Onboarding skipped" });
    } catch (error) {
      console.error("Skip onboarding error:", error);
      res.status(500).json({ error: "Failed to reset sandbox" });
    }
  });

  // Update sandbox client type
  const clientTypeSchema = z.object({
    clientType: z.enum(["marketing", "government"]),
  });

  app.post("/api/sandbox/client-type", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const parseResult = clientTypeSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid client type. Must be 'marketing' or 'government'" });
      }

      const { clientType } = parseResult.data;

      await storage.updateCompany(SANDBOX_COMPANY_ID, {
        clientType: clientType,
      });

      res.json({ success: true, message: `Client type updated to ${clientType}`, clientType });
    } catch (error) {
      console.error("Update client type error:", error);
      res.status(500).json({ error: "Failed to update client type" });
    }
  });

  // Simulate sandbox credit purchase (dev only)
  app.post("/api/sandbox/purchase-credits", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { packageId, creditAmount, price } = req.body;
      
      if (!creditAmount || creditAmount <= 0) {
        return res.status(400).json({ error: "Invalid credit amount" });
      }

      // Get current company credits
      const company = await storage.getCompany(SANDBOX_COMPANY_ID);
      if (!company) {
        return res.status(404).json({ error: "Sandbox company not found" });
      }

      // Add credits to company
      const newCredits = (company.credits || 0) + creditAmount;
      await storage.updateCompany(SANDBOX_COMPANY_ID, {
        credits: newCredits,
      });

      // Create a simulated purchase record
      const purchase = await storage.createCreditPurchase({
        companyId: SANDBOX_COMPANY_ID,
        userId: userId,
        packageId: packageId || null,
        creditAmount: creditAmount,
        amountPaid: price || (creditAmount * 125), // $125 per credit default
        stripeSessionId: `sandbox_sim_${Date.now()}`,
        status: "completed",
      });

      // Create a credit transaction
      await storage.createCreditTransaction({
        companyId: SANDBOX_COMPANY_ID,
        amount: creditAmount,
        type: "allocation",
        description: `Simulated purchase: ${creditAmount} credits`,
        createdBy: userId,
        balanceAfter: newCredits,
      });

      res.json({ 
        success: true, 
        message: `Added ${creditAmount} credits (simulated)`,
        newBalance: newCredits,
        purchase
      });
    } catch (error) {
      console.error("Sandbox purchase error:", error);
      res.status(500).json({ error: "Failed to simulate purchase" });
    }
  });

  // Admin test email endpoint
  app.post("/api/admin/test-email", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email address is required" });
      }

      const success = await sendTestEmail(email);
      if (success) {
        res.json({ success: true, message: `Test email sent to ${email}` });
      } else {
        res.status(500).json({ error: "Failed to send test email" });
      }
    } catch (error) {
      console.error("Test email error:", error);
      res.status(500).json({ error: "Failed to send test email" });
    }
  });

  // Admin Analytics endpoint
  app.get("/api/admin/analytics", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const days = parseInt(req.query.days as string) || 30;
      const companyFilter = req.query.companyId as string | undefined;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString();

      // Get all tasks and filter by date
      let allTasks = await storage.getAllTasks();
      const allCompanies = await storage.getAllCompanies();
      let allTransactions = await storage.getAllCreditTransactions();

      if (companyFilter) {
        allTasks = allTasks.filter(t => t.companyId === companyFilter);
        allTransactions = allTransactions.filter(t => t.companyId === companyFilter);
      }

      // Task statistics - filtered by period
      const tasksInPeriod = allTasks.filter(t => t.createdAt && t.createdAt >= startDateStr);
      const completedTasksAll = allTasks.filter(t => t.status === "completed");
      const completedInPeriod = completedTasksAll.filter(t => t.completedAt && t.completedAt >= startDateStr);
      const pendingTasks = allTasks.filter(t => t.status === "pending" || t.status === "pending_approval");
      const inProgressTasks = allTasks.filter(t => t.status === "in_progress");
      
      const completionRate = tasksInPeriod.length > 0 
        ? (completedInPeriod.length / tasksInPeriod.length) * 100 
        : (completedTasksAll.length > 0 && allTasks.length > 0 ? (completedTasksAll.length / allTasks.length) * 100 : 0);

      // Calculate average completion time for completed tasks in period
      let avgCompletionTimeHours = null;
      const completedWithTimes = completedInPeriod.filter(t => t.createdAt && t.completedAt);
      if (completedWithTimes.length > 0) {
        const totalHours = completedWithTimes.reduce((acc, t) => {
          const created = new Date(t.createdAt!);
          const completed = new Date(t.completedAt!);
          return acc + (completed.getTime() - created.getTime()) / (1000 * 60 * 60);
        }, 0);
        avgCompletionTimeHours = totalHours / completedWithTimes.length;
      }

      // Credit statistics
      const transactionsInPeriod = allTransactions.filter(t => t.createdAt >= startDateStr);
      const creditsUsed = transactionsInPeriod
        .filter(t => parseFloat(t.amount) < 0)
        .reduce((acc, t) => acc + Math.abs(parseFloat(t.amount)), 0);
      const creditsAdded = transactionsInPeriod
        .filter(t => parseFloat(t.amount) > 0)
        .reduce((acc, t) => acc + parseFloat(t.amount), 0);

      const avgCreditsPerTask = completedInPeriod.length > 0
        ? completedInPeriod.reduce((acc, t) => acc + parseFloat(t.creditCost), 0) / completedInPeriod.length
        : (completedTasksAll.length > 0 ? completedTasksAll.reduce((acc, t) => acc + parseFloat(t.creditCost), 0) / completedTasksAll.length : null);

      // Company statistics
      const companiesWithTasksInPeriod = new Set(tasksInPeriod.map(t => t.companyId));
      const companiesWithTasks = new Set(allTasks.map(t => t.companyId));
      const activeCompanies = allCompanies.filter(c => companiesWithTasksInPeriod.has(c.id) || companiesWithTasks.has(c.id));
      
      const avgCreditsPerCompany = allCompanies.length > 0
        ? allCompanies.reduce((acc, c) => acc + parseFloat(c.currentCredits), 0) / allCompanies.length
        : null;

      // Time series data - tasks completed per day
      const tasksCompletedByDate: { [key: string]: number } = {};
      const creditsUsedByDate: { [key: string]: number } = {};

      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        tasksCompletedByDate[dateStr] = 0;
        creditsUsedByDate[dateStr] = 0;
      }

      completedInPeriod.forEach(t => {
        if (t.completedAt) {
          const dateStr = t.completedAt.split('T')[0];
          if (tasksCompletedByDate[dateStr] !== undefined) {
            tasksCompletedByDate[dateStr]++;
          }
        }
      });

      transactionsInPeriod.forEach(t => {
        const dateStr = t.createdAt.split('T')[0];
        if (creditsUsedByDate[dateStr] !== undefined && parseFloat(t.amount) < 0) {
          creditsUsedByDate[dateStr] += Math.abs(parseFloat(t.amount));
        }
      });

      const tasksCompleted = Object.entries(tasksCompletedByDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const creditsUsedTimeSeries = Object.entries(creditsUsedByDate)
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date));

      res.json({
        taskStats: {
          total: allTasks.length,
          totalInPeriod: tasksInPeriod.length,
          completed: completedTasksAll.length,
          completedInPeriod: completedInPeriod.length,
          pending: pendingTasks.length,
          inProgress: inProgressTasks.length,
          completionRate,
          avgCompletionTimeHours,
        },
        creditStats: {
          totalCreditsUsed: creditsUsed,
          totalCreditsAdded: creditsAdded,
          transactionCount: transactionsInPeriod.length,
          avgCreditsPerTask,
        },
        companyStats: {
          totalCompanies: allCompanies.length,
          activeCompanies: activeCompanies.length,
          avgCreditsPerCompany,
        },
        timeSeriesData: {
          tasksCompleted,
          creditsUsed: creditsUsedTimeSeries,
        },
      });
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  app.get("/api/admin/companies/:id/report-notes", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const companyId = req.params.id;
      const month = parseInt(req.query.month as string);
      const year = parseInt(req.query.year as string);
      if (!month || !year || month < 1 || month > 12) {
        return res.status(400).json({ error: "Valid month (1-12) and year query params required" });
      }
      const note = await storage.getMonthlyReportNote(companyId, month, year);
      res.json(note || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch report note" });
    }
  });

  app.put("/api/admin/companies/:id/report-notes", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const companyId = req.params.id;
      const { month, year, notes } = req.body;
      if (!month || !year || typeof notes !== "string") {
        return res.status(400).json({ error: "month (1-12), year (number), and notes (string) are required" });
      }
      const m = Number(month);
      const y = Number(year);
      if (isNaN(m) || m < 1 || m > 12 || isNaN(y) || y < 2020 || y > 2100) {
        return res.status(400).json({ error: "Invalid month (1-12) or year" });
      }
      const note = await storage.upsertMonthlyReportNote({
        companyId,
        month,
        year,
        notes,
        createdBy: userId,
      });
      broadcastInvalidation([`/api/admin/companies/${companyId}/report-notes`, "/api/admin/report-notes"]);
      res.json(note);
    } catch (error) {
      res.status(500).json({ error: "Failed to save report note" });
    }
  });

  app.get("/api/admin/report-notes", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const month = parseInt(req.query.month as string);
      const year = parseInt(req.query.year as string);
      if (!month || !year || month < 1 || month > 12) {
        return res.status(400).json({ error: "Valid month (1-12) and year query params required" });
      }
      const notes = await storage.getMonthlyReportNotesByMonth(month, year);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch report notes" });
    }
  });

  app.get("/api/admin/monthly-report/status", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { getMonthlyReportStatus } = await import("./monthly-report");
      res.json(getMonthlyReportStatus());
    } catch (error) {
      console.error("Monthly report status error:", error);
      res.status(500).json({ error: "Failed to get report status" });
    }
  });

  app.post("/api/admin/monthly-report/send", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { year, month } = req.body;
      const { generateAndSendMonthlyReports, markReportSent } = await import("./monthly-report");
      const result = await generateAndSendMonthlyReports(year, month);
      if (result.companiesSent > 0 && !year && !month) {
        markReportSent();
      }
      res.json(result);
    } catch (error) {
      console.error("Monthly report error:", error);
      res.status(500).json({ error: "Failed to send monthly reports" });
    }
  });

  app.post("/api/admin/onboarding-reminders/send", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { sendOnboardingReminders } = await import("./monthly-report");
      const result = await sendOnboardingReminders();
      res.json(result);
    } catch (error) {
      console.error("Onboarding reminder error:", error);
      res.status(500).json({ error: "Failed to send onboarding reminders" });
    }
  });

  // Stripe webhook handler
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    try {
      const { isStripeConfigured, constructWebhookEvent } = await import("./stripe");
      if (!isStripeConfigured()) {
        return res.status(503).json({ error: "Stripe is not configured" });
      }

      const signature = req.headers["stripe-signature"] as string;
      if (!signature) {
        return res.status(400).json({ error: "Missing stripe-signature header" });
      }

      const event = await constructWebhookEvent(req.body, signature);

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as any;
        const purchase = await storage.getCreditPurchaseBySessionId(session.id);
        
        if (purchase && purchase.status === "pending") {
          await storage.completeCreditPurchase(purchase.id);
          const purchaseCompany = await storage.getCompany(purchase.companyId);
          if (purchaseCompany) {
            await storage.updateCompany(purchase.companyId, {
              bonusCredits: (purchaseCompany.bonusCredits || 0) + purchase.creditAmount,
            });
          }
          console.log(`Credit purchase completed: ${purchase.creditAmount} credits for company ${purchase.companyId}`);
          broadcastInvalidation(["/api/companies", "/api/notifications"]);

          // Send credit purchase confirmation email
          const company = await storage.getCompany(purchase.companyId);
          if (company) {
            const members = await storage.getCompanyMembers(company.id);
            const owners = members.filter(m => m.role === "owner" || m.role === "admin");
            const creditPackage = await storage.getCreditPackage(purchase.packageId);
            
            const baseUrl = process.env.REPLIT_DEPLOYMENT
              ? `https://${(process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || "").split(",")[0]}`
              : process.env.REPLIT_DEV_DOMAIN 
                ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
                : "http://localhost:5000";

            for (const member of owners) {
              const user = await storage.getUser(member.userId);
              if (user?.email) {
                sendCreditPurchaseEmail({
                  recipientEmail: user.email,
                  recipientName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
                  companyName: company.name,
                  packageName: creditPackage?.name || "Credit Package",
                  creditsAdded: purchase.creditAmount,
                  amountPaid: purchase.amountPaid,
                  newBalance: company.credits + purchase.creditAmount,
                  transactionId: purchase.id,
                  portalUrl: `${baseUrl}/client/credits`,
                }).catch(err => console.error("Failed to send credit purchase email:", err));
              }
            }
          }
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(400).json({ error: "Webhook error" });
    }
  });

  // ===== Media Profiles (Admin Only) =====

  // Get all media profiles
  app.get("/api/admin/media-profiles", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = await storage.isAdmin(req.user!.id);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const profiles = await storage.getMediaProfiles();
      
      // Enrich with field counts and company assignments
      const enrichedProfiles = await Promise.all(
        profiles.map(async (profile) => {
          const fields = await storage.getMediaProfileFields(profile.id);
          const assignments = await storage.getMediaProfileCompanies(profile.id);
          return {
            ...profile,
            fieldCount: fields.length,
            companyCount: assignments.length,
          };
        })
      );

      res.json(enrichedProfiles);
    } catch (error) {
      console.error("Error fetching media profiles:", error);
      res.status(500).json({ error: "Failed to fetch media profiles" });
    }
  });

  // Get single media profile with fields
  app.get("/api/admin/media-profiles/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = await storage.isAdmin(req.user!.id);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const profile = await storage.getMediaProfile(req.params.id);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      const fields = await storage.getMediaProfileFields(profile.id);
      const assignments = await storage.getMediaProfileCompanies(profile.id);
      
      // Get company details for assignments
      const companies = await Promise.all(
        assignments.map(async (a) => {
          const company = await storage.getCompany(a.companyId);
          return company ? { id: company.id, name: company.name } : null;
        })
      );

      res.json({
        ...profile,
        fields,
        assignedCompanies: companies.filter(Boolean),
      });
    } catch (error) {
      console.error("Error fetching media profile:", error);
      res.status(500).json({ error: "Failed to fetch media profile" });
    }
  });

  // Create media profile
  app.post("/api/admin/media-profiles", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = await storage.isAdmin(req.user!.id);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { name, description } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Profile name is required" });
      }

      const profile = await storage.createMediaProfile({
        name,
        description,
        isActive: true,
        createdBy: req.user!.id,
      });

      res.status(201).json(profile);
    } catch (error) {
      console.error("Error creating media profile:", error);
      res.status(500).json({ error: "Failed to create media profile" });
    }
  });

  // Update media profile
  app.patch("/api/admin/media-profiles/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = await storage.isAdmin(req.user!.id);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { name, description, isActive } = req.body;
      const profile = await storage.updateMediaProfile(req.params.id, {
        name,
        description,
        isActive,
      });

      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      res.json(profile);
    } catch (error) {
      console.error("Error updating media profile:", error);
      res.status(500).json({ error: "Failed to update media profile" });
    }
  });

  // Delete media profile
  app.delete("/api/admin/media-profiles/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = await storage.isAdmin(req.user!.id);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Delete associated fields first
      await storage.deleteMediaProfileFieldsByProfileId(req.params.id);
      await storage.deleteMediaProfile(req.params.id);

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting media profile:", error);
      res.status(500).json({ error: "Failed to delete media profile" });
    }
  });

  // ===== Media Profile Fields =====

  // Get fields for a profile
  app.get("/api/admin/media-profiles/:id/fields", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = await storage.isAdmin(req.user!.id);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const fields = await storage.getMediaProfileFields(req.params.id);
      res.json(fields);
    } catch (error) {
      console.error("Error fetching profile fields:", error);
      res.status(500).json({ error: "Failed to fetch profile fields" });
    }
  });

  // Create field for a profile
  app.post("/api/admin/media-profiles/:id/fields", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = await storage.isAdmin(req.user!.id);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { fieldType, label, placeholder, helpText, isRequired, options, sortOrder } = req.body;
      if (!fieldType || !label) {
        return res.status(400).json({ error: "Field type and label are required" });
      }

      const field = await storage.createMediaProfileField({
        profileId: req.params.id,
        fieldType,
        label,
        placeholder,
        helpText,
        isRequired: isRequired ?? false,
        options: options ? JSON.stringify(options) : null,
        sortOrder: sortOrder ?? 0,
      });

      res.status(201).json(field);
    } catch (error) {
      console.error("Error creating profile field:", error);
      res.status(500).json({ error: "Failed to create profile field" });
    }
  });

  // Update field
  app.patch("/api/admin/media-profile-fields/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = await storage.isAdmin(req.user!.id);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { fieldType, label, placeholder, helpText, isRequired, options, sortOrder } = req.body;
      const field = await storage.updateMediaProfileField(req.params.id, {
        fieldType,
        label,
        placeholder,
        helpText,
        isRequired,
        options: options ? JSON.stringify(options) : undefined,
        sortOrder,
      });

      if (!field) {
        return res.status(404).json({ error: "Field not found" });
      }

      res.json(field);
    } catch (error) {
      console.error("Error updating profile field:", error);
      res.status(500).json({ error: "Failed to update profile field" });
    }
  });

  // Delete field
  app.delete("/api/admin/media-profile-fields/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = await storage.isAdmin(req.user!.id);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      await storage.deleteMediaProfileField(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting profile field:", error);
      res.status(500).json({ error: "Failed to delete profile field" });
    }
  });

  // Reorder fields
  app.post("/api/admin/media-profiles/:id/fields/reorder", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = await storage.isAdmin(req.user!.id);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { fieldIds } = req.body;
      if (!Array.isArray(fieldIds)) {
        return res.status(400).json({ error: "fieldIds must be an array" });
      }

      // Update sort order for each field
      await Promise.all(
        fieldIds.map((id, index) =>
          storage.updateMediaProfileField(id, { sortOrder: index })
        )
      );

      const fields = await storage.getMediaProfileFields(req.params.id);
      res.json(fields);
    } catch (error) {
      console.error("Error reordering fields:", error);
      res.status(500).json({ error: "Failed to reorder fields" });
    }
  });

  // ===== Company Media Profile Assignments =====

  // Get profiles assigned to a company
  app.get("/api/companies/:companyId/media-profiles", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const assignments = await storage.getCompanyMediaProfiles(req.params.companyId);
      
      // Enrich with profile details
      const profiles = await Promise.all(
        assignments.map(async (a) => {
          const profile = await storage.getMediaProfile(a.profileId);
          if (!profile) return null;
          const fields = await storage.getMediaProfileFields(profile.id);
          return {
            ...profile,
            fields,
            assignedAt: a.assignedAt,
          };
        })
      );

      res.json(profiles.filter(Boolean));
    } catch (error) {
      console.error("Error fetching company media profiles:", error);
      res.status(500).json({ error: "Failed to fetch company media profiles" });
    }
  });

  // Assign profile to company
  app.post("/api/admin/companies/:companyId/media-profiles", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = await storage.isAdmin(req.user!.id);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { profileId } = req.body;
      if (!profileId) {
        return res.status(400).json({ error: "Profile ID is required" });
      }

      // Check if already assigned
      const existing = await storage.getCompanyMediaProfiles(req.params.companyId);
      if (existing.some(a => a.profileId === profileId)) {
        return res.status(400).json({ error: "Profile already assigned to this company" });
      }

      const assignment = await storage.assignMediaProfileToCompany({
        companyId: req.params.companyId,
        profileId,
        assignedBy: req.user!.id,
      });

      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning profile:", error);
      res.status(500).json({ error: "Failed to assign profile" });
    }
  });

  // Unassign profile from company
  app.delete("/api/admin/companies/:companyId/media-profiles/:profileId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = await storage.isAdmin(req.user!.id);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      await storage.unassignMediaProfileFromCompany(req.params.companyId, req.params.profileId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error unassigning profile:", error);
      res.status(500).json({ error: "Failed to unassign profile" });
    }
  });

  // Get companies assigned to a profile
  app.get("/api/admin/media-profiles/:profileId/companies", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = await storage.isAdmin(req.user!.id);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const assignments = await storage.getMediaProfileCompanies(req.params.profileId);
      
      // Enrich with company details
      const enriched = await Promise.all(
        assignments.map(async (a) => {
          const company = await storage.getCompany(a.companyId);
          return {
            ...a,
            company: company ? { id: company.id, name: company.name } : null,
          };
        })
      );

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching profile companies:", error);
      res.status(500).json({ error: "Failed to fetch profile companies" });
    }
  });

  // Assign profile to company (from profile side)
  app.post("/api/admin/media-profiles/:profileId/companies", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = await storage.isAdmin(req.user!.id);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { companyId } = req.body;
      if (!companyId) {
        return res.status(400).json({ error: "Company ID required" });
      }

      const assignment = await storage.assignMediaProfileToCompany({ companyId, profileId: req.params.profileId, assignedBy: req.user!.id });
      res.json(assignment);
    } catch (error) {
      console.error("Error assigning profile:", error);
      res.status(500).json({ error: "Failed to assign profile" });
    }
  });

  // Unassign profile from company (from profile side)
  app.delete("/api/admin/media-profiles/:profileId/companies/:companyId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = await storage.isAdmin(req.user!.id);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      await storage.unassignMediaProfileFromCompany(req.params.companyId, req.params.profileId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error unassigning profile:", error);
      res.status(500).json({ error: "Failed to unassign profile" });
    }
  });

  // ===== Media Submissions =====

  // Get all submissions (admin)
  app.get("/api/admin/media-submissions", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = await storage.isAdmin(req.user!.id);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const submissions = await storage.getAllMediaSubmissions();
      
      // Enrich with company, profile, and files
      const enriched = await Promise.all(
        submissions.map(async (s) => {
          const company = await storage.getCompany(s.companyId);
          const profile = await storage.getMediaProfile(s.profileId);
          const files = await storage.getMediaSubmissionFiles(s.id);
          const submitter = await storage.getUser(s.submittedBy);
          return {
            ...s,
            company: company ? { id: company.id, name: company.name } : null,
            profile: profile ? { id: profile.id, name: profile.name } : null,
            files,
            submitter: submitter ? { id: submitter.id, firstName: submitter.firstName, lastName: submitter.lastName, email: submitter.email } : null,
            submitterName: submitter ? `${submitter.firstName} ${submitter.lastName}`.trim() : null,
            formData: JSON.parse(s.formData || "{}"),
          };
        })
      );

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching media submissions:", error);
      res.status(500).json({ error: "Failed to fetch media submissions" });
    }
  });

  // Get submission details
  app.get("/api/media-submissions/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const submission = await storage.getMediaSubmission(req.params.id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Check access
      const isAdmin = await storage.isAdmin(req.user!.id);
      const membership = await storage.getCompanyMemberById(req.user!.id);
      if (!isAdmin && (!membership || membership.companyId !== submission.companyId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const profile = await storage.getMediaProfile(submission.profileId);
      const files = await storage.getMediaSubmissionFiles(submission.id);
      const submitter = await storage.getUser(submission.submittedBy);

      res.json({
        ...submission,
        profile: profile ? { id: profile.id, name: profile.name } : null,
        files,
        submitter: submitter ? { id: submitter.id, firstName: submitter.firstName, lastName: submitter.lastName, email: submitter.email } : null,
        submitterName: submitter ? `${submitter.firstName} ${submitter.lastName}`.trim() : null,
        formData: JSON.parse(submission.formData || "{}"),
      });
    } catch (error) {
      console.error("Error fetching media submission:", error);
      res.status(500).json({ error: "Failed to fetch media submission" });
    }
  });

  // Get company submissions (client)
  app.get("/api/companies/:companyId/media-submissions", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const membership = await storage.getCompanyMemberById(req.user!.id);
      const isAdmin = await storage.isAdmin(req.user!.id);
      
      if (!isAdmin && (!membership || membership.companyId !== req.params.companyId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const submissions = await storage.getMediaSubmissions(req.params.companyId);
      
      // Enrich with profile, files, and submitter name
      const enriched = await Promise.all(
        submissions.map(async (s) => {
          const profile = await storage.getMediaProfile(s.profileId);
          const files = await storage.getMediaSubmissionFiles(s.id);
          const submitter = await storage.getUser(s.submittedBy);
          return {
            ...s,
            profile: profile ? { id: profile.id, name: profile.name } : null,
            files,
            submitterName: submitter ? `${submitter.firstName} ${submitter.lastName}`.trim() : null,
            formData: JSON.parse(s.formData || "{}"),
          };
        })
      );

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching company media submissions:", error);
      res.status(500).json({ error: "Failed to fetch company media submissions" });
    }
  });

  // Create media submission (client uploads) with file uploads - two-phase approach
  // Phase 1: Save files to disk and DB immediately, respond to client
  // Phase 2: Upload to SharePoint in background with auto-retry
  const MEDIA_UPLOAD_DIR = "/tmp/media-uploads";
  if (!fs.existsSync(MEDIA_UPLOAD_DIR)) {
    fs.mkdirSync(MEDIA_UPLOAD_DIR, { recursive: true });
  }

  const mediaSubmissionUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, MEDIA_UPLOAD_DIR),
      filename: (_req, file, cb) => cb(null, `${nanoid()}_${file.originalname}`),
    }),
    limits: { fileSize: 50 * 1024 * 1024 * 1024 },
  });

  async function processSharePointUpload(submissionId: string, maxRetries: number = 3) {
    const submission = await storage.getMediaSubmission(submissionId);
    if (!submission) return;

    const company = await storage.getCompany(submission.companyId);
    if (!company) return;

    const profile = await storage.getMediaProfile(submission.profileId);
    if (!profile) return;

    const profileFields = await storage.getMediaProfileFields(submission.profileId);
    const files = await storage.getMediaSubmissionFiles(submissionId);
    const formData = typeof submission.formData === 'string' ? JSON.parse(submission.formData) : submission.formData;

    const safeTitle = submission.title.replace(/[<>:"/\\|?*]/g, '_').trim();
    const submissionDate = new Date(submission.createdAt);
    const dateStr = formatDateLongET(submissionDate);
    const folderName = `${safeTitle} (${dateStr})`;

    let userName = "Unknown User";
    const isAdmin = await storage.isAdmin(submission.submittedBy);
    if (isAdmin) {
      const admin = await storage.getAdminUserById(submission.submittedBy);
      if (admin) userName = `${admin.firstName} ${admin.lastName}`.trim() || admin.email;
    } else {
      const member = await storage.getCompanyMemberById(submission.submittedBy);
      if (member) userName = `${member.firstName} ${member.lastName}`.trim() || (member as any).email;
    }

    let pdfResult: { success: boolean; path?: string; webUrl?: string; error?: string } = { success: false };
    let sharePointAvailable = true;
    try {
      const { generateMediaUploadFormPdf } = await import("./pdf-generator");
      const pdfBuffer = await generateMediaUploadFormPdf({
        title: submission.title,
        profileName: profile.name,
        companyName: company.name,
        submittedBy: userName,
        submittedAt: new Date(submission.createdAt),
        fields: profileFields,
        formData,
      });

      pdfResult = await uploadToSharePoint(
        company.name,
        `Form_Data_${safeTitle}.pdf`,
        pdfBuffer,
        "application/pdf",
        `Media Uploads/${folderName}`,
        company.clientType as "marketing" | "government" || "marketing",
        true
      );
    } catch (pdfError: any) {
      console.error("PDF generation/upload failed (continuing):", pdfError);
      if (pdfError.message?.includes("SharePoint") || pdfError.message?.includes("token") || pdfError.message?.includes("Cannot access") || pdfError.message?.includes("ECONNREFUSED")) {
        sharePointAvailable = false;
        console.log("[media-upload] SharePoint unavailable, will fall back to Object Storage");
        try {
          const { generateMediaUploadFormPdf } = await import("./pdf-generator");
          const pdfBuffer = await generateMediaUploadFormPdf({
            title: submission.title,
            profileName: profile.name,
            companyName: company.name,
            submittedBy: userName,
            submittedAt: new Date(submission.createdAt),
            fields: profileFields,
            formData,
          });
          const { uploadBuffer } = await import("./object-storage-helpers");
          const pdfObjPath = `media/${submission.companyId}/${submissionId}/Form_Data_${safeTitle}.pdf`;
          await uploadBuffer(pdfObjPath, pdfBuffer, "application/pdf");
          pdfResult = { success: true, path: `object-storage:${pdfObjPath}` };
        } catch (fallbackPdfErr) {
          console.error("[media-upload] PDF Object Storage fallback also failed:", fallbackPdfErr);
        }
      }
    }

    let allSuccess = true;

    for (const file of files) {
      if (file.status === "uploaded") continue;

      let attempts = file.retryCount || 0;
      let uploaded = false;

      while (attempts < maxRetries && !uploaded) {
        try {
          await storage.updateMediaSubmissionFile(file.id, {
            status: "uploading",
            retryCount: attempts,
            lastRetryAt: new Date().toISOString(),
          });

          if (!file.tempFilePath || !fs.existsSync(file.tempFilePath)) {
            throw new Error(`Temp file not found: ${file.tempFilePath}`);
          }

          const fileBuffer = await fs.promises.readFile(file.tempFilePath);

          if (sharePointAvailable) {
            const fileResult = await uploadToSharePoint(
              company.name,
              file.fileName,
              fileBuffer,
              file.fileType,
              `Media Uploads/${folderName}`,
              company.clientType as "marketing" | "government" || "marketing",
              true
            );

            if (fileResult.success) {
              await storage.updateMediaSubmissionFile(file.id, {
                status: "uploaded",
                sharepointPath: fileResult.path,
                sharepointUrl: fileResult.webUrl,
                retryCount: attempts + 1,
                lastRetryAt: new Date().toISOString(),
                lastError: null,
              });
              uploaded = true;
            } else {
              throw new Error(fileResult.error || "SharePoint upload returned failure");
            }
          } else {
            const { uploadBuffer } = await import("./object-storage-helpers");
            const objPath = `media/${submission.companyId}/${submissionId}/${file.fileName}`;
            await uploadBuffer(objPath, fileBuffer, file.fileType);

            await storage.updateMediaSubmissionFile(file.id, {
              status: "uploaded",
              sharepointPath: `object-storage:${objPath}`,
              sharepointUrl: null,
              retryCount: attempts + 1,
              lastRetryAt: new Date().toISOString(),
              lastError: null,
            });
            uploaded = true;
          }

          if (uploaded) {
            try {
              if (file.tempFilePath && fs.existsSync(file.tempFilePath)) {
                await fs.promises.unlink(file.tempFilePath);
                console.log(`[media-upload] Deleted temp file: ${file.tempFilePath}`);
              }
            } catch (cleanupErr) {
              console.error(`[media-upload] Failed to delete temp file: ${file.tempFilePath}`, cleanupErr);
            }
          }
        } catch (err: any) {
          attempts++;
          console.error(`[media-upload] Attempt ${attempts}/${maxRetries} failed for ${file.fileName}:`, err.message);

          if (!sharePointAvailable || err.message?.includes("SharePoint") || err.message?.includes("token") || err.message?.includes("Cannot access")) {
            sharePointAvailable = false;
            const fileBuffer = file.tempFilePath && fs.existsSync(file.tempFilePath) ? await fs.promises.readFile(file.tempFilePath) : null;
            if (fileBuffer) {
              try {
                const { uploadBuffer } = await import("./object-storage-helpers");
                const objPath = `media/${submission.companyId}/${submissionId}/${file.fileName}`;
                await uploadBuffer(objPath, fileBuffer, file.fileType);
                await storage.updateMediaSubmissionFile(file.id, {
                  status: "uploaded",
                  sharepointPath: `object-storage:${objPath}`,
                  sharepointUrl: null,
                  retryCount: attempts,
                  lastRetryAt: new Date().toISOString(),
                  lastError: null,
                });
                try {
                  if (file.tempFilePath && fs.existsSync(file.tempFilePath)) {
                    await fs.promises.unlink(file.tempFilePath);
                  }
                } catch (_) {}
                uploaded = true;
                break;
              } catch (objErr: any) {
                console.error(`[media-upload] Object Storage fallback failed for ${file.fileName}:`, objErr.message);
              }
            }
          }

          await storage.updateMediaSubmissionFile(file.id, {
            retryCount: attempts,
            lastRetryAt: new Date().toISOString(),
            lastError: err.message,
            status: attempts >= maxRetries ? "failed" : "pending",
          });

          if (attempts < maxRetries) {
            const delay = Math.min(5000 * Math.pow(2, attempts - 1), 30000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      if (!uploaded) allSuccess = false;
    }

    const folderPath = pdfResult.path ? pdfResult.path.replace(`/Form_Data_${safeTitle}.pdf`, '') : undefined;
    const folderUrl = pdfResult.webUrl ? pdfResult.webUrl.replace(`/Form_Data_${safeTitle}.pdf`, '') : undefined;

    const finalStatus = allSuccess ? "completed" : "failed";
    await storage.updateMediaSubmission(submissionId, {
      status: finalStatus,
      sharepointFolderPath: folderPath || submission.sharepointFolderPath,
      sharepointFolderUrl: folderUrl || submission.sharepointFolderUrl,
    });

    console.log(`[media-upload] Submission ${submissionId} ${finalStatus}`);

    try {
      const admins = await storage.getAllAdminUsers();
      const portalUrl = `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.replit.app` : 'https://app.nearmemarketinghub.com'}/admin/media-submissions`;
      for (const admin of admins) {
        await sendMediaUploadNotificationEmail({
          recipientEmail: admin.email,
          recipientName: `${admin.firstName} ${admin.lastName}`.trim() || admin.email,
          companyName: company.name,
          submissionTitle: submission.title,
          submitterName: userName,
          fileCount: files.length,
          status: finalStatus as "completed" | "failed",
          portalUrl,
          sharepointUrl: folderUrl || submission.sharepointFolderUrl || undefined,
        });
      }
    } catch (emailErr) {
      console.error("[media-upload] Failed to send notification emails:", emailErr);
    }

    try {
      const allAdmins = await storage.getAllAdminUsers();
      for (const admin of allAdmins) {
        await createAndBroadcastNotification({
          userId: admin.userId,
          type: "media_upload",
          title: allSuccess ? "Media Upload Complete" : "Media Upload Failed",
          message: allSuccess
            ? `${userName} from ${company.name} uploaded "${submission.title}" (${files.length} file${files.length !== 1 ? "s" : ""}) successfully.`
            : `Upload "${submission.title}" from ${company.name} by ${userName} failed. Some files could not be uploaded.`,
          link: "/admin/media-submissions",
          createdBy: submission.submittedBy,
        });
      }
    } catch (notifErr) {
      console.error("[media-upload] Failed to create in-app notifications:", notifErr);
    }
  }

  app.post("/api/companies/:companyId/media-submissions", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const membership = await storage.getCompanyMemberById(req.user!.id);
      const isAdmin = await storage.isAdmin(req.user!.id);
      
      if (!isAdmin && (!membership || membership.companyId !== req.params.companyId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { profileId, title, formData: formDataString, files: filesMeta } = req.body;
      if (!profileId || !title) {
        return res.status(400).json({ error: "Profile ID and title are required" });
      }

      const formData = typeof formDataString === 'string' ? JSON.parse(formDataString) : (formDataString || {});
      const parsedFiles = typeof filesMeta === 'string' ? JSON.parse(filesMeta) : (filesMeta || []);

      if (!Array.isArray(parsedFiles) || parsedFiles.length === 0) {
        return res.status(400).json({ error: "At least one file is required" });
      }

      const company = await storage.getCompany(req.params.companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      const profile = await storage.getMediaProfile(profileId);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      const submission = await storage.createMediaSubmission({
        companyId: req.params.companyId,
        profileId,
        submittedBy: req.user!.id,
        title,
        formData: JSON.stringify(formData),
        status: "processing",
      });

      const fileRecords = [];
      for (const fileMeta of parsedFiles) {
        let tempFilePath = null;
        if (fileMeta.uploadId) {
          const completed = completedUploads.get(fileMeta.uploadId);
          if (completed && completed.userId === req.user!.id) {
            tempFilePath = completed.destPath;
            completedUploads.delete(fileMeta.uploadId);
          }
        }
        const record = await storage.createMediaSubmissionFile({
          submissionId: submission.id,
          fileName: fileMeta.fileName || "unknown",
          fileType: fileMeta.fileType || "application/octet-stream",
          fileSize: fileMeta.fileSize || 0,
          tempFilePath,
          status: "pending",
        });
        fileRecords.push(record);
      }

      res.status(201).json({ ...submission, fileRecords });

      processSharePointUpload(submission.id).catch(err => {
        console.error(`[media-upload] Background upload failed for submission ${submission.id}:`, err);
      });

    } catch (error) {
      console.error("Error creating media submission:", error);
      res.status(500).json({ error: "Failed to create media submission" });
    }
  });

  app.get("/api/admin/media-files/:fileId/download", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = await storage.isAdmin(req.user!.id);
      if (!isAdmin) return res.status(403).json({ error: "Admin access required" });

      const file = await storage.getMediaSubmissionFile(req.params.fileId);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.fileName)}"`);
      res.setHeader('Content-Type', file.fileType || 'application/octet-stream');

      if (file.sharepointPath?.startsWith("object-storage:")) {
        const objPath = file.sharepointPath.replace("object-storage:", "");
        const { downloadBuffer } = await import("./object-storage-helpers");
        const { buffer, contentType } = await downloadBuffer(objPath);
        res.setHeader('Content-Type', contentType || file.fileType || 'application/octet-stream');
        res.setHeader('Content-Length', buffer.length.toString());
        res.send(buffer);
      } else if (file.sharepointDriveId && file.sharepointItemId) {
        const result = await downloadFromSharePoint(file.sharepointDriveId, file.sharepointItemId);
        if (!result.success || !result.buffer) {
          return res.status(500).json({ error: result.error || "Failed to download from SharePoint" });
        }
        res.setHeader('Content-Type', result.contentType || file.fileType || 'application/octet-stream');
        res.setHeader('Content-Length', result.buffer.length.toString());
        res.send(result.buffer);
      } else if (file.tempFilePath && fs.existsSync(file.tempFilePath)) {
        res.setHeader('Content-Length', file.fileSize.toString());
        const readStream = fs.createReadStream(file.tempFilePath);
        readStream.pipe(res);
      } else {
        return res.status(404).json({ error: "File is no longer available for download" });
      }
    } catch (error) {
      console.error("Error downloading media file:", error);
      res.status(500).json({ error: "Failed to download file" });
    }
  });

  app.delete("/api/admin/media-files/:fileId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = await storage.isAdmin(req.user!.id);
      if (!isAdmin) return res.status(403).json({ error: "Admin access required" });

      const file = await storage.getMediaSubmissionFile(req.params.fileId);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      if (file.status === "processing" || file.status === "uploading") {
        return res.status(400).json({ error: "Cannot delete a file that is currently being processed or uploaded" });
      }

      if (file.tempFilePath && fs.existsSync(file.tempFilePath)) {
        await fs.promises.unlink(file.tempFilePath);
        console.log(`[media-upload] Admin deleted temp file: ${file.tempFilePath}`);
      }

      await storage.updateMediaSubmissionFile(file.id, {
        tempFilePath: null,
        status: "deleted",
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting media file:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
  const activeUploads = new Map<string, { destPath: string; fileName: string; fileType: string; expectedSize: number; chunksReceived: number; totalChunks: number; userId: string }>();
  const completedUploads = new Map<string, { destPath: string; fileName: string; fileType: string; fileSize: number; userId: string }>();
  const chunkUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, MEDIA_UPLOAD_DIR),
      filename: (_req, _file, cb) => cb(null, `chunk_${nanoid()}`),
    }),
    limits: { fileSize: CHUNK_SIZE + 1024 * 1024 },
  });

  app.post("/api/media-uploads/init", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { fileName, fileType, fileSize } = req.body;
      if (!fileName || !fileType || !fileSize) {
        return res.status(400).json({ error: "fileName, fileType, and fileSize are required" });
      }

      const uploadId = nanoid();
      const safeFileName = path.basename(String(fileName)).replace(/[^a-zA-Z0-9._-]/g, '_');
      const destPath = path.join(MEDIA_UPLOAD_DIR, `${uploadId}_${safeFileName}`);
      const totalChunks = Math.ceil(Number(fileSize) / CHUNK_SIZE);
      
      await fs.promises.writeFile(destPath, Buffer.alloc(0));

      activeUploads.set(uploadId, {
        destPath,
        fileName: safeFileName,
        fileType: String(fileType),
        expectedSize: Number(fileSize),
        chunksReceived: 0,
        totalChunks,
        userId: req.user!.id,
      });
      
      console.log(`[media-upload] Chunked upload initialized: ${uploadId} for ${safeFileName} (${fileSize} bytes, ${totalChunks} chunks)`);
      
      res.json({ uploadId, totalChunks });
    } catch (error) {
      console.error("Error initializing chunked upload:", error);
      res.status(500).json({ error: "Failed to initialize upload" });
    }
  });

  app.post("/api/media-uploads/:uploadId/chunk", isAuthenticated, chunkUpload.single("chunk"), async (req: AuthenticatedRequest, res) => {
    try {
      const { uploadId } = req.params;
      const upload = activeUploads.get(uploadId);
      if (!upload) {
        return res.status(404).json({ error: "Upload not found or expired" });
      }
      if (upload.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const chunkIndex = parseInt(req.body.chunkIndex, 10);
      if (isNaN(chunkIndex) || chunkIndex !== upload.chunksReceived) {
        return res.status(400).json({ error: `Expected chunk ${upload.chunksReceived}, got ${chunkIndex}` });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No chunk data received" });
      }

      const chunkData = await fs.promises.readFile(req.file.path);
      await fs.promises.appendFile(upload.destPath, chunkData);
      
      try { await fs.promises.unlink(req.file.path); } catch {}

      upload.chunksReceived++;
      console.log(`[media-upload] Chunk ${upload.chunksReceived}/${upload.totalChunks} received for upload ${uploadId}`);

      res.json({ chunkIndex, received: true });
    } catch (error) {
      console.error("Error receiving chunk:", error);
      res.status(500).json({ error: "Failed to receive chunk" });
    }
  });

  app.post("/api/media-uploads/:uploadId/complete", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { uploadId } = req.params;
      const upload = activeUploads.get(uploadId);
      if (!upload) {
        return res.status(404).json({ error: "Upload not found or expired" });
      }
      if (upload.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (upload.chunksReceived !== upload.totalChunks) {
        return res.status(400).json({ error: `Missing chunks: received ${upload.chunksReceived}/${upload.totalChunks}` });
      }

      const stats = await fs.promises.stat(upload.destPath);
      
      if (Math.abs(stats.size - upload.expectedSize) > 1024) {
        try { await fs.promises.unlink(upload.destPath); } catch {}
        activeUploads.delete(uploadId);
        return res.status(400).json({ error: `File size mismatch: got ${stats.size}, expected ${upload.expectedSize}` });
      }

      completedUploads.set(uploadId, {
        destPath: upload.destPath,
        fileName: upload.fileName,
        fileType: upload.fileType,
        fileSize: stats.size,
        userId: upload.userId,
      });

      const result = {
        success: true,
        uploadId,
        fileName: upload.fileName,
        fileType: upload.fileType,
        fileSize: stats.size,
      };

      activeUploads.delete(uploadId);
      console.log(`[media-upload] Upload ${uploadId} complete: ${upload.fileName} (${stats.size} bytes)`);

      res.json(result);
    } catch (error) {
      console.error("Error completing chunked upload:", error);
      res.status(500).json({ error: "Failed to complete upload" });
    }
  });

  app.post("/api/admin/media-submissions/:id/retry", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = await storage.isAdmin(req.user!.id);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const submission = await storage.getMediaSubmission(req.params.id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      const files = await storage.getMediaSubmissionFiles(req.params.id);
      const hasPendingOrFailed = files.some(f => f.status === "pending" || f.status === "failed");
      if (!hasPendingOrFailed) {
        return res.status(400).json({ error: "No files need retrying" });
      }

      for (const file of files) {
        if (file.status === "failed" || file.status === "pending") {
          await storage.updateMediaSubmissionFile(file.id, {
            status: "pending",
            retryCount: 0,
            lastError: null,
          });
        }
      }

      await storage.updateMediaSubmission(req.params.id, { status: "processing" });

      res.json({ message: "Retry initiated" });

      processSharePointUpload(req.params.id).catch(err => {
        console.error(`[media-upload] Retry failed for submission ${req.params.id}:`, err);
      });

    } catch (error) {
      console.error("Error retrying media submission:", error);
      res.status(500).json({ error: "Failed to retry media submission" });
    }
  });

  // Update submission (e.g., after SharePoint upload)
  app.patch("/api/media-submissions/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const submission = await storage.getMediaSubmission(req.params.id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      const isAdmin = await storage.isAdmin(req.user!.id);
      const membership = await storage.getCompanyMemberById(req.user!.id);
      if (!isAdmin && (!membership || membership.companyId !== submission.companyId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const updated = await storage.updateMediaSubmission(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating media submission:", error);
      res.status(500).json({ error: "Failed to update media submission" });
    }
  });

  // Add file to submission
  app.post("/api/media-submissions/:id/files", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const submission = await storage.getMediaSubmission(req.params.id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      const isAdmin = await storage.isAdmin(req.user!.id);
      const membership = await storage.getCompanyMemberById(req.user!.id);
      if (!isAdmin && (!membership || membership.companyId !== submission.companyId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { fileName, fileType, fileSize } = req.body;
      if (!fileName || !fileType || !fileSize) {
        return res.status(400).json({ error: "File name, type, and size are required" });
      }

      const file = await storage.createMediaSubmissionFile({
        submissionId: req.params.id,
        fileName,
        fileType,
        fileSize,
      });

      res.status(201).json(file);
    } catch (error) {
      console.error("Error adding file to submission:", error);
      res.status(500).json({ error: "Failed to add file to submission" });
    }
  });

  // Update file (e.g., after SharePoint upload)
  app.patch("/api/media-submission-files/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const file = await storage.updateMediaSubmissionFile(req.params.id, req.body);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      res.json(file);
    } catch (error) {
      console.error("Error updating submission file:", error);
      res.status(500).json({ error: "Failed to update submission file" });
    }
  });

  // Custom Roles routes (admin-only)
  app.get("/api/admin/custom-roles", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isUserAdmin = await storage.isAdmin(userId);
      if (!isUserAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const roles = await storage.getCustomRoles();
      res.json(roles);
    } catch (error) {
      console.error("Failed to fetch custom roles:", error);
      res.status(500).json({ error: "Failed to fetch custom roles" });
    }
  });

  app.post("/api/admin/custom-roles", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isUserAdmin = await storage.isAdmin(userId);
      if (!isUserAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { name, description, allowedViews, isActive } = req.body;
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "Name is required" });
      }

      const role = await storage.createCustomRole({
        name: name.trim(),
        description: description || null,
        allowedViews: allowedViews || [],
        isActive: isActive !== undefined ? isActive : true,
        createdBy: userId,
      });
      res.status(201).json(role);
    } catch (error) {
      console.error("Failed to create custom role:", error);
      res.status(500).json({ error: "Failed to create custom role" });
    }
  });

  app.patch("/api/admin/custom-roles/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isUserAdmin = await storage.isAdmin(userId);
      if (!isUserAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const updated = await storage.updateCustomRole(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Custom role not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Failed to update custom role:", error);
      res.status(500).json({ error: "Failed to update custom role" });
    }
  });

  app.delete("/api/admin/custom-roles/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isUserAdmin = await storage.isAdmin(userId);
      if (!isUserAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      await storage.deleteCustomRole(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete custom role:", error);
      res.status(500).json({ error: "Failed to delete custom role" });
    }
  });

  // Public custom role lookup (any authenticated user)
  app.get("/api/custom-roles/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const role = await storage.getCustomRole(req.params.id);
      if (!role) {
        return res.status(404).json({ error: "Custom role not found" });
      }
      res.json(role);
    } catch (error) {
      console.error("Failed to fetch custom role:", error);
      res.status(500).json({ error: "Failed to fetch custom role" });
    }
  });

  // Notification Preferences routes (any authenticated user)
  app.get("/api/notification-preferences", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const prefs = await storage.getNotificationPreferences(userId);
      if (!prefs) {
        return res.json({
          taskUpdates: true,
          chatMentions: true,
          campaignUpdates: true,
          creditAlerts: true,
          trainingReminders: true,
          meetingReminders: true,
          emailDigest: true,
        });
      }
      res.json(prefs);
    } catch (error) {
      console.error("Failed to fetch notification preferences:", error);
      res.status(500).json({ error: "Failed to fetch notification preferences" });
    }
  });

  app.patch("/api/notification-preferences", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const updated = await storage.upsertNotificationPreferences(userId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Failed to update notification preferences:", error);
      res.status(500).json({ error: "Failed to update notification preferences" });
    }
  });

  app.delete("/api/admin/companies/:companyId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const isUserAdmin = await storage.isAdmin(userId);
      if (!isUserAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { companyId } = req.params;
      const { db } = await import("./db");
      const { eq, inArray } = await import("drizzle-orm");
      const {
        chatMessages, chatThreadMembers, chatThreads,
        taskComments, taskAttachments, tasks,
        creditTransactions, creditPurchases,
        campaignRequests, meetingRequests, trainingAssignments,
        mediaUploads, mediaSubmissions, companyMediaProfiles,
        governmentDocuments, signingPackets, clientOnboarding,
        notificationPreferences, companyMembers, companies,
      } = await import("@shared/schema");

      const threads = await db.select({ id: chatThreads.id }).from(chatThreads).where(eq(chatThreads.companyId, companyId));
      const threadIds = threads.map(t => t.id);
      if (threadIds.length > 0) {
        await db.delete(chatMessages).where(inArray(chatMessages.threadId, threadIds));
        await db.delete(chatThreadMembers).where(inArray(chatThreadMembers.threadId, threadIds));
      }
      await db.delete(chatThreads).where(eq(chatThreads.companyId, companyId));

      const companyTasks = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.companyId, companyId));
      const taskIds = companyTasks.map(t => t.id);
      if (taskIds.length > 0) {
        await db.delete(taskComments).where(inArray(taskComments.taskId, taskIds));
        await db.delete(taskAttachments).where(inArray(taskAttachments.taskId, taskIds));
      }
      await db.delete(tasks).where(eq(tasks.companyId, companyId));

      await db.delete(creditTransactions).where(eq(creditTransactions.companyId, companyId));
      await db.delete(creditPurchases).where(eq(creditPurchases.companyId, companyId));
      await db.delete(campaignRequests).where(eq(campaignRequests.companyId, companyId));
      await db.delete(meetingRequests).where(eq(meetingRequests.companyId, companyId));
      await db.delete(trainingAssignments).where(eq(trainingAssignments.companyId, companyId));
      await db.delete(mediaUploads).where(eq(mediaUploads.companyId, companyId));
      await db.delete(mediaSubmissions).where(eq(mediaSubmissions.companyId, companyId));
      await db.delete(companyMediaProfiles).where(eq(companyMediaProfiles.companyId, companyId));
      await db.delete(governmentDocuments).where(eq(governmentDocuments.companyId, companyId));
      await db.delete(signingPackets).where(eq(signingPackets.companyId, companyId));
      await db.delete(clientOnboarding).where(eq(clientOnboarding.companyId, companyId));

      const members = await db.select({ userId: companyMembers.userId }).from(companyMembers).where(eq(companyMembers.companyId, companyId));
      const memberUserIds = members.map(m => m.userId);
      if (memberUserIds.length > 0) {
        await db.delete(notificationPreferences).where(inArray(notificationPreferences.userId, memberUserIds));
      }

      await db.delete(companyMembers).where(eq(companyMembers.companyId, companyId));
      await db.delete(companies).where(eq(companies.id, companyId));

      console.log(`Admin ${userId} deleted company ${companyId} and all related data`);
      res.json({ message: "Company and all related data deleted successfully" });
    } catch (error) {
      console.error("Failed to delete company:", error);
      res.status(500).json({ error: "Failed to delete company" });
    }
  });

  app.delete("/api/admin/users/:userId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const currentUserId = req.user!.id;
      const isUserAdmin = await storage.isAdmin(currentUserId);
      if (!isUserAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const targetUserId = req.params.userId;
      if (currentUserId === targetUserId) {
        return res.status(400).json({ error: "Cannot delete yourself" });
      }

      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const { notificationPreferences, companyMembers, adminUsers, users, chatThreadMembers } = await import("@shared/schema");

      await db.delete(chatThreadMembers).where(eq(chatThreadMembers.userId, targetUserId));
      await db.delete(notificationPreferences).where(eq(notificationPreferences.userId, targetUserId));
      await db.delete(companyMembers).where(eq(companyMembers.userId, targetUserId));
      await db.delete(adminUsers).where(eq(adminUsers.userId, targetUserId));
      await db.delete(users).where(eq(users.id, targetUserId));

      console.log(`Admin ${currentUserId} deleted user ${targetUserId} and all related data`);
      res.json({ message: "User and all related data deleted successfully" });
    } catch (error) {
      console.error("Failed to delete user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.post("/api/admin/send-password-reset", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const currentUserId = req.user!.id;
      const isUserAdmin = await storage.isAdmin(currentUserId);
      if (!isUserAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
      }

      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const { users, passwordResetTokens } = await import("@shared/schema");
      const crypto = await import("crypto");
      const { sendPasswordResetEmail } = await import("./email");

      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token,
        expiresAt,
        createdAt: new Date().toISOString(),
      });

      const origin = req.headers.origin || req.headers.referer?.replace(/\/+$/, "");
      const baseUrl = origin
        ? origin.replace(/\/+$/, "")
        : process.env.REPLIT_DEPLOYMENT
          ? `https://${(process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || "").split(",")[0]}`
          : process.env.REPLIT_DEV_DOMAIN
            ? `https://${process.env.REPLIT_DEV_DOMAIN}`
            : "http://localhost:5000";

      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      await sendPasswordResetEmail({
        recipientEmail: user.email!,
        recipientName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email!,
        resetUrl,
        expiresIn: "1 hour",
      });

      console.log(`Admin ${currentUserId} triggered password reset for ${email}`);
      res.json({ message: "Password reset email sent" });
    } catch (error) {
      console.error("Failed to send admin password reset:", error);
      res.status(500).json({ error: "Failed to send password reset email" });
    }
  });

  return httpServer;
}
