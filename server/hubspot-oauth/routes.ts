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
  refreshOAuthToken,
} from "./sync";
import type { HubspotConnection } from "@shared/schema";

function buildAuthUrl(companyId: string): string {
  const clientId = process.env.HUBSPOT_CLIENT_ID || "";
  const redirectUri = process.env.HUBSPOT_REDIRECT_URI || "";
  const scopes = [
    "crm.objects.contacts.read", "crm.objects.contacts.write",
    "crm.objects.companies.read", "crm.objects.companies.write",
    "crm.objects.deals.read", "crm.objects.deals.write",
    "crm.objects.tasks.read", "crm.objects.tasks.write",
    "content", "reports", "tickets",
    "analytics.behavioral_events.send",
  ].join(" ");

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
      if (conn?.accessToken) {
        try {
          const token = decryptSecret(conn.accessToken);
          await fetch(`https://api.hubapi.com/oauth/v1/refresh-tokens/${token}`, { method: "DELETE" });
        } catch {}
      }

      await storage.updateHubspotConnection(companyId, {
        isActive: false,
        accessToken: null,
        refreshToken: null,
      });

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

      res.json({
        connected: true,
        portalId: conn.portalId,
        hubDomain: conn.hubDomain,
        scopesGranted: conn.scopesGranted,
        connectedAt: conn.connectedAt,
        lastSyncedAt: conn.lastSyncedAt,
        hubspotCompanyId: conn.hubspotCompanyId,
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

  // ── Webhooks ──────────────────────────────────────────────────────────────

  app.post("/api/hubspot/webhooks", express.raw({ type: "*/*" }), async (req: Request, res: Response) => {
    try {
      const clientSecret = process.env.HUBSPOT_CLIENT_SECRET || "";
      const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : JSON.stringify(req.body);

      const sig = (req.headers["x-hubspot-signature"] as string) || "";
      if (clientSecret && sig) {
        const expected = crypto
          .createHash("sha256")
          .update(clientSecret + rawBody)
          .digest("hex");
        if (sig !== expected) {
          console.warn("[hubspot-webhook] signature mismatch — ignored");
          return res.status(401).json({ error: "Invalid signature" });
        }
      }

      let events: any[];
      try { events = JSON.parse(rawBody); } catch { events = []; }
      if (!Array.isArray(events)) return res.json({ received: true });

      (async () => {
        for (const event of events) {
          try { await handleWebhookEvent(event); } catch (e: any) {
            console.error("[hubspot-webhook] event error:", e.message);
          }
        }
      })();

      res.json({ received: true });
    } catch (err: any) {
      console.error("[hubspot-webhook] error:", err);
      res.status(500).json({ error: err.message });
    }
  });
}

async function handleWebhookEvent(event: any) {
  const { subscriptionType, propertyName, propertyValue, portalId } = event;

  if (subscriptionType === "deal.propertyChange" && propertyName === "dealstage" && propertyValue === "closedwon") {
    const companies = await storage.getAllCompanies();
    const connections = await Promise.all(companies.map(c => storage.getHubspotConnection(c.id)));
    const conn = connections.find((c): c is HubspotConnection =>
      c != null && c.portalId === String(portalId) && c.isActive
    );
    if (!conn) return;
    await storage.createNotification({
      userId: "system",
      title: "HubSpot Deal Closed Won",
      message: `A deal moved to Closed Won in HubSpot — consider creating onboarding tasks.`,
      type: "info",
      link: `/admin/companies/${conn.companyId}`,
    });
  }

  if (subscriptionType === "contact.propertyChange" && propertyName === "hs_lead_status" &&
    ["MQL", "SQL"].includes(String(propertyValue))) {
    const companies = await storage.getAllCompanies();
    const connections = await Promise.all(companies.map(c => storage.getHubspotConnection(c.id)));
    const conn = connections.find((c): c is HubspotConnection =>
      c != null && c.portalId === String(portalId) && c.isActive
    );
    if (!conn) return;
    await storage.createNotification({
      userId: "system",
      title: "New HubSpot Lead",
      message: `A contact became ${String(propertyValue)}. Consider following up.`,
      type: "info",
      link: `/admin/companies/${conn.companyId}?tab=hubspot`,
    });
  }
}
