import type { Express, Request, Response } from "express";
import express from "express";
import crypto from "crypto";
import { storage } from "../storage";
import { isAuthenticated, AuthenticatedRequest } from "../auth";
import { encryptSecret, decryptSecret } from "../lib/credential-encryption";
import {
  syncCompanyDataToHubSpot,
  syncTasksToHubSpot,
  pullContacts,
  pullDeals,
  pullCampaigns,
  pullWorkflows,
  refreshOAuthToken,
} from "./sync";
import type { HubspotConnection } from "@shared/schema";

function buildAuthUrl(companyId: string): string {
  const clientId = process.env.HUBSPOT_CLIENT_ID || "";
  const redirectUri = process.env.HUBSPOT_REDIRECT_URI || "";
  const scopes = [
    'oauth',
    'crm.objects.contacts.read',
    'crm.objects.contacts.write',
    'crm.objects.companies.read',
    'crm.objects.companies.write',
    'crm.objects.deals.read',
    'crm.objects.deals.write',
    'crm.objects.leads.read',
    'crm.objects.leads.write',
    'crm.objects.quotes.read',
    'crm.objects.quotes.write',
    'crm.objects.products.read',
    'crm.objects.products.write',
    'crm.objects.services.read',
    'crm.objects.services.write',
    'crm.objects.subscriptions.read',
    'crm.objects.subscriptions.write',
    'crm.objects.projects.read',
    'crm.objects.projects.write',
    'tickets',
    'social',
    'content',
    'automation',
    'crm.lists.read',
    'crm.lists.write',
  ].join(' ');

  const state = Buffer.from(JSON.stringify({ companyId })).toString("base64url");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    state,
  });
  return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
}

export function registerHubSpotOAuthRoutes(app: Express) {

  // ── Debug route (admin-only) ───────────────────────────────────────────────
  app.get("/api/debug/hubspot-config", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) return res.status(403).json({ error: "Admin access required" });

      res.json({
        hasClientId: !!process.env.HUBSPOT_CLIENT_ID,
        hasClientSecret: !!process.env.HUBSPOT_CLIENT_SECRET,
        hasRedirectUri: !!process.env.HUBSPOT_REDIRECT_URI,
        redirectUri: process.env.HUBSPOT_REDIRECT_URI || "(not set)",
        clientIdPreview: process.env.HUBSPOT_CLIENT_ID
          ? process.env.HUBSPOT_CLIENT_ID.substring(0, 8) + "..."
          : "(not set)",
        expectedRedirectUri: "https://portal.nearmemarketinghub.com/api/hubspot/callback",
        redirectUriMatches:
          process.env.HUBSPOT_REDIRECT_URI === "https://portal.nearmemarketinghub.com/api/hubspot/callback",
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── OAuth connection ──────────────────────────────────────────────────────

  app.get("/api/hubspot/connect/:companyId", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) return res.status(403).json({ error: "Admin access required" });

      const companyId = req.params.companyId as string;
      if (!process.env.HUBSPOT_CLIENT_ID || !process.env.HUBSPOT_REDIRECT_URI) {
        return res.status(500).json({ error: "HUBSPOT_CLIENT_ID and HUBSPOT_REDIRECT_URI must be configured" });
      }

      res.redirect(buildAuthUrl(companyId));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/hubspot/callback", async (req: Request, res: Response) => {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string;
      const oauthError = req.query.error as string | undefined;

      if (oauthError) {
        return res.redirect(`/admin/companies?hubspot=error&msg=${encodeURIComponent(oauthError)}`);
      }
      if (!code || !state) {
        return res.redirect("/admin/companies?hubspot=error&msg=missing_params");
      }

      let companyId: string;
      try {
        const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
        companyId = parsed.companyId;
      } catch {
        return res.redirect("/admin/companies?hubspot=error&msg=invalid_state");
      }

      const params = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.HUBSPOT_CLIENT_ID || "",
        client_secret: process.env.HUBSPOT_CLIENT_SECRET || "",
        redirect_uri: process.env.HUBSPOT_REDIRECT_URI || "",
        code,
      });

      const tokenResp = await fetch("https://api.hubapi.com/oauth/v1/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      if (!tokenResp.ok) {
        const msg = await tokenResp.text();
        console.error("[hubspot-oauth] token exchange failed:", msg);
        return res.redirect(`/admin/companies/${companyId}?hubspot=error&msg=token_exchange_failed`);
      }

      const tokens = await tokenResp.json();
      const expiresAt = new Date(Date.now() + (tokens.expires_in as number) * 1000).toISOString();

      let portalId = "";
      let hubDomain = "";
      try {
        const infoResp = await fetch(`https://api.hubapi.com/oauth/v1/access-tokens/${tokens.access_token as string}`);
        if (infoResp.ok) {
          const info = await infoResp.json();
          portalId = String(info.hub_id ?? "");
          hubDomain = (info.hub_domain as string) || "";
        }
      } catch {}

      const sessionUser = (req as any).user as { id?: string } | undefined;
      const connectedBy = sessionUser?.id || "system";

      await storage.upsertHubspotConnection({
        companyId,
        portalId,
        accessToken: encryptSecret(tokens.access_token as string),
        refreshToken: tokens.refresh_token ? encryptSecret(tokens.refresh_token as string) : null,
        tokenExpiresAt: expiresAt,
        hubDomain,
        hubspotCompanyId: null,
        scopesGranted: (tokens.scope as string) || "",
        connectedBy,
        connectedAt: new Date().toISOString(),
        lastSyncedAt: null,
        isActive: true,
      });

      storage.createHubspotSyncLog({ companyId, action: "oauth_connect", status: "success", details: `Portal ${portalId} (${hubDomain}) connected` }).catch(() => {});
      (async () => { try { await syncCompanyDataToHubSpot(companyId); } catch {} })();

      res.redirect(`/admin/companies/${companyId}?tab=hubspot&hubspot=connected`);
    } catch (err: any) {
      console.error("[hubspot-oauth] callback error:", err);
      res.redirect(`/admin/companies?hubspot=error&msg=${encodeURIComponent(err.message)}`);
    }
  });

  app.post("/api/hubspot/refresh/:companyId", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) return res.status(403).json({ error: "Admin access required" });

      const companyId = req.params.companyId as string;
      const conn = await storage.getHubspotConnection(companyId);
      if (!conn?.refreshToken) return res.status(400).json({ error: "No refresh token stored" });

      await refreshOAuthToken(companyId, decryptSecret(conn.refreshToken));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/hubspot/disconnect/:companyId", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) return res.status(403).json({ error: "Admin access required" });

      const companyId = req.params.companyId as string;
      const conn = await storage.getHubspotConnection(companyId);
      if (conn?.refreshToken) {
        try {
          const token = decryptSecret(conn.refreshToken);
          await fetch(`https://api.hubapi.com/oauth/v1/refresh-tokens/${token}`, { method: "DELETE" });
        } catch {}
      }

      await storage.updateHubspotConnection(companyId, {
        isActive: false,
        accessToken: null,
        refreshToken: null,
      });

      storage.createHubspotSyncLog({ companyId, action: "oauth_disconnect", status: "success", details: "HubSpot disconnected" }).catch(() => {});
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/hubspot/connection/:companyId", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) return res.status(403).json({ error: "Admin access required" });

      const conn = await storage.getHubspotConnection(req.params.companyId as string);
      if (!conn || !conn.isActive) return res.json({ connected: false });

      // Look up connected-by user name
      let connectedByName = "";
      if (conn.connectedBy && conn.connectedBy !== "system") {
        try {
          const u = await storage.getUser(conn.connectedBy);
          if (u) connectedByName = `${(u as any).firstName ?? ""} ${(u as any).lastName ?? ""}`.trim() || (u as any).email || conn.connectedBy;
        } catch {}
      }

      res.json({
        connected: true,
        portalId: conn.portalId,
        hubDomain: conn.hubDomain,
        scopesGranted: conn.scopesGranted,
        connectedAt: conn.connectedAt,
        lastSyncedAt: conn.lastSyncedAt,
        hubspotCompanyId: conn.hubspotCompanyId,
        connectedBy: connectedByName || conn.connectedBy,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Sync routes ───────────────────────────────────────────────────────────

  app.post("/api/hubspot/sync-now/:companyId", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) return res.status(403).json({ error: "Admin access required" });

      const companyId = req.params.companyId as string;
      const [companyResult, tasksResult] = await Promise.all([
        syncCompanyDataToHubSpot(companyId),
        syncTasksToHubSpot(companyId),
      ]);

      res.json({ success: true, company: companyResult, tasks: tasksResult });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/hubspot/crm/:companyId/contacts", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) return res.status(403).json({ error: "Admin access required" });
      const result = await pullContacts(req.params.companyId as string);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/hubspot/crm/:companyId/deals", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) return res.status(403).json({ error: "Admin access required" });
      const result = await pullDeals(req.params.companyId as string);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/hubspot/crm/:companyId/campaigns", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) return res.status(403).json({ error: "Admin access required" });
      const result = await pullCampaigns(req.params.companyId as string);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/hubspot/crm/:companyId/workflows", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) return res.status(403).json({ error: "Admin access required" });
      const result = await pullWorkflows(req.params.companyId as string);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/hubspot/crm/:companyId/sync-log", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) return res.status(403).json({ error: "Admin access required" });
      const companyId = req.params.companyId as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getHubspotSyncLog(companyId, limit);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Social channels ──────────────────────────────────────────────────────
  app.get("/api/hubspot/crm/:companyId/social-channels", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) return res.status(403).json({ error: "Admin access required" });

      const companyId = req.params.companyId as string;
      const conn = await storage.getHubspotConnection(companyId);
      if (!conn?.isActive || !conn.accessToken) {
        return res.status(400).json({ error: "HubSpot not connected for this company" });
      }

      const accessToken = decryptSecret(conn.accessToken);
      const resp = await fetch("https://api.hubapi.com/marketing/v3/social/channels", {
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      });

      if (!resp.ok) {
        const errText = await resp.text();
        return res.status(resp.status).json({ error: `HubSpot API error: ${errText}` });
      }

      const data = await resp.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Social publish ────────────────────────────────────────────────────────
  app.post("/api/hubspot/crm/:companyId/social-publish", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const isAdmin = await storage.isAdmin(userId);
      if (!isAdmin) return res.status(403).json({ error: "Admin access required" });

      const companyId = req.params.companyId as string;
      const { calendarItemId, channelGuid, body, triggerAt } = req.body as {
        calendarItemId: string;
        channelGuid: string;
        body: string;
        triggerAt?: string;
      };

      if (!calendarItemId || !channelGuid || !body) {
        return res.status(400).json({ error: "calendarItemId, channelGuid, and body are required" });
      }

      const conn = await storage.getHubspotConnection(companyId);
      if (!conn?.isActive || !conn.accessToken) {
        return res.status(400).json({ error: "HubSpot not connected for this company" });
      }

      const accessToken = decryptSecret(conn.accessToken);

      const payload: Record<string, any> = {
        channelGuid,
        content: { body },
        triggerAt: triggerAt || new Date().toISOString(),
        status: "SCHEDULED",
      };

      const resp = await fetch("https://api.hubapi.com/marketing/v3/social/broadcasts", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        storage.createHubspotSyncLog({ companyId, action: "push_social", status: "error", details: errText }).catch(() => {});
        return res.status(resp.status).json({ error: `HubSpot API error: ${errText}` });
      }

      const broadcast = await resp.json();
      const broadcastId = String(broadcast.id || broadcast.broadcastGuid || "");
      const newStatus = triggerAt ? "scheduled" : "published";

      await storage.updateContentCalendarItem(calendarItemId, {
        hubspotPostId: broadcastId,
        status: newStatus,
        publishedAt: new Date().toISOString(),
      });

      storage.createHubspotSyncLog({
        companyId,
        action: "push_social",
        status: "success",
        details: `Broadcast ${broadcastId} created for content item ${calendarItemId} (${newStatus})`,
      }).catch(() => {});

      res.json({ success: true, broadcast, broadcastId, status: newStatus });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Webhooks ──────────────────────────────────────────────────────────────

  app.post("/api/hubspot/webhooks", express.raw({ type: "*/*" }), (req: Request, res: Response) => {
    // HubSpot requires a fast 200 — respond immediately, then process async.
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : JSON.stringify(req.body);
    res.status(200).send("OK");

    (async () => {
      try {
        // ── Signature verification ────────────────────────────────────────
        // Prefer v3 header (HMAC-SHA256 with HUBSPOT_WEBHOOK_SECRET).
        // Fall back to v1 header (SHA256 of CLIENT_SECRET + body).
        const sigV3 = req.headers["x-hubspot-signature-v3"] as string | undefined;
        const sigV1 = req.headers["x-hubspot-signature"] as string | undefined;
        const webhookSecret = process.env.HUBSPOT_WEBHOOK_SECRET || "";
        const clientSecret  = process.env.HUBSPOT_CLIENT_SECRET  || "";

        let verified = false;

        if (sigV3 && webhookSecret) {
          const expected = crypto
            .createHmac("sha256", webhookSecret)
            .update(rawBody)
            .digest("hex");
          verified = expected === sigV3;
        } else if (sigV1 && clientSecret) {
          const expected = crypto
            .createHash("sha256")
            .update(clientSecret + rawBody)
            .digest("hex");
          verified = expected === sigV1;
        } else {
          // No signature headers present — still process in development,
          // but log a warning.
          console.warn("[hubspot-webhook] no signature header present — processing without verification");
          verified = true;
        }

        if (!verified) {
          console.warn("[hubspot-webhook] signature mismatch — discarding payload");
          return;
        }

        let events: any[];
        try { events = JSON.parse(rawBody); } catch { events = []; }
        if (!Array.isArray(events)) {
          // Single-event payload wrapped in an object
          try {
            const single = JSON.parse(rawBody);
            events = single && typeof single === "object" ? [single] : [];
          } catch { return; }
        }

        for (const event of events) {
          try { await handleWebhookEvent(event); } catch (e: any) {
            console.error("[hubspot-webhook] event error:", e.message);
          }
        }
      } catch (err: any) {
        console.error("[hubspot-webhook] processing error:", err.message);
      }
    })();
  });
}

async function findConnectionByPortalId(portalId: string): Promise<HubspotConnection | null> {
  const companies = await storage.getAllCompanies();
  const connections = await Promise.all(companies.map(c => storage.getHubspotConnection(c.id)));
  return connections.find((c): c is HubspotConnection =>
    c != null && c.portalId === String(portalId) && c.isActive
  ) ?? null;
}

async function notifyAdmins(title: string, message: string, link: string) {
  try {
    const admins = await storage.getAllAdminUsers();
    await Promise.all(admins.map(admin =>
      storage.createNotification({
        userId: admin.userId,
        type: "info",
        title,
        message,
        link,
        createdBy: "system",
      }).catch(() => {})
    ));
  } catch {}
}

async function handleWebhookEvent(event: any) {
  const { subscriptionType, propertyName, propertyValue, portalId, objectId } = event;

  // deal.propertyChange → dealstage = closedwon
  if (subscriptionType === "deal.propertyChange" && propertyName === "dealstage" && propertyValue === "closedwon") {
    const conn = await findConnectionByPortalId(portalId);
    if (!conn) return;
    await notifyAdmins(
      "HubSpot Deal Closed Won",
      "A deal moved to Closed Won — consider creating onboarding tasks.",
      `/admin/companies/${conn.companyId}?tab=work&sub=tasks`
    );
    storage.createHubspotSyncLog({ companyId: conn.companyId, action: "webhook_deal_closed_won", status: "success", details: `Deal ${objectId} closed won` }).catch(() => {});
  }

  // contact.creation → notify team
  if (subscriptionType === "contact.creation") {
    const conn = await findConnectionByPortalId(portalId);
    if (!conn) return;
    await notifyAdmins(
      "New HubSpot Contact",
      `New contact added to HubSpot (ID: ${objectId}).`,
      `/admin/companies/${conn.companyId}?tab=marketing&sub=hubspot`
    );
    storage.createHubspotSyncLog({ companyId: conn.companyId, action: "webhook_contact_created", status: "success", details: `Contact ${objectId} created` }).catch(() => {});
  }

  // contact.propertyChange → hs_lead_status = MQL/SQL
  if (subscriptionType === "contact.propertyChange" && propertyName === "hs_lead_status" &&
    ["MQL", "SQL"].includes(String(propertyValue))) {
    const conn = await findConnectionByPortalId(portalId);
    if (!conn) return;
    const company = await storage.getCompany(conn.companyId);
    const companyName = company?.name ?? "Unknown Company";
    // Create a follow-up task assigned to account manager (or first member)
    const members = await storage.getCompanyMembers(conn.companyId);
    const manager = members.find((m: any) => m.role === "account_manager") || members[0];
    if (manager) {
      await storage.createTask({
        companyId: conn.companyId,
        title: `Follow up with new ${propertyValue} lead from HubSpot`,
        description: `Contact ID ${objectId} became ${propertyValue} in HubSpot for ${companyName}. Review and follow up.`,
        status: "pending",
        priority: "high",
        assignedTo: manager.userId,
        type: "general",
        createdBy: "system",
      } as any);
    }
    await notifyAdmins(
      `New HubSpot ${propertyValue} Lead`,
      `A contact became ${propertyValue} in HubSpot for ${companyName}.`,
      `/admin/companies/${conn.companyId}?tab=work&sub=tasks`
    );
    storage.createHubspotSyncLog({ companyId: conn.companyId, action: "webhook_lead_qualified", status: "success", details: `Contact ${objectId} → ${propertyValue}` }).catch(() => {});
  }

  // ticket.creation → mirror as support task + notify
  if (subscriptionType === "ticket.creation") {
    const conn = await findConnectionByPortalId(portalId);
    if (!conn) return;
    const company = await storage.getCompany(conn.companyId);
    const companyName = company?.name ?? "Unknown Company";
    await storage.createTask({
      companyId: conn.companyId,
      title: `Support ticket from HubSpot (#${objectId})`,
      description: `A new support ticket was created in HubSpot for ${companyName}. Review and respond.`,
      status: "pending",
      priority: "medium",
      type: "support",
      createdBy: "system",
    } as any);
    await notifyAdmins(
      "New HubSpot Support Ticket",
      `Ticket #${objectId} created in HubSpot for ${companyName}.`,
      `/admin/companies/${conn.companyId}?tab=communicate`
    );
    storage.createHubspotSyncLog({ companyId: conn.companyId, action: "webhook_ticket_created", status: "success", details: `Ticket ${objectId} mirrored as support task` }).catch(() => {});
  }
}
