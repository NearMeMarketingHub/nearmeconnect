import { Client } from "@hubspot/api-client";
import { storage } from "../storage";
import { decryptSecret } from "../lib/credential-encryption";

// Build a HubSpot client for a specific company's OAuth connection.
// Automatically refreshes the token if it is within 5 minutes of expiry.
export async function getOAuthClient(companyId: string): Promise<Client> {
  const conn = await storage.getHubspotConnection(companyId);
  if (!conn || !conn.isActive) throw new Error("HubSpot not connected for this company");

  const expiresAt = conn.tokenExpiresAt ? new Date(conn.tokenExpiresAt) : null;
  const needsRefresh = !expiresAt || expiresAt.getTime() - Date.now() < 5 * 60 * 1000;

  let accessToken = conn.accessToken ? decryptSecret(conn.accessToken) : "";

  if (needsRefresh && conn.refreshToken) {
    const refreshed = await refreshOAuthToken(companyId, decryptSecret(conn.refreshToken));
    accessToken = refreshed;
  }

  return new Client({ accessToken });
}

// Internal: exchange refresh token for a new access token and persist it.
export async function refreshOAuthToken(companyId: string, refreshToken: string): Promise<string> {
  const { encryptSecret } = await import("../lib/credential-encryption");
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: process.env.HUBSPOT_CLIENT_ID || "",
    client_secret: process.env.HUBSPOT_CLIENT_SECRET || "",
    refresh_token: refreshToken,
  });

  const resp = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token refresh failed: ${text}`);
  }

  const data = await resp.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  await storage.updateHubspotConnection(companyId, {
    accessToken: encryptSecret(data.access_token),
    tokenExpiresAt: expiresAt,
  });

  return data.access_token;
}

// Sync this portal company → HubSpot Company object
export async function syncCompanyDataToHubSpot(companyId: string) {
  try {
    const client = await getOAuthClient(companyId);
    const company = await storage.getCompany(companyId);
    if (!company) return { success: false, error: "Company not found" };

    const properties: Record<string, string> = {
      name: company.name,
      industry: company.industry || "",
      description: `Subscription: ${company.subscriptionTier} | Credits: ${company.credits}/${company.monthlyCredits}`,
    };

    const conn = await storage.getHubspotConnection(companyId);
    if (conn?.hubspotCompanyId) {
      await client.crm.companies.basicApi.update(conn.hubspotCompanyId, { properties });
      await storage.updateHubspotConnection(companyId, { lastSyncedAt: new Date().toISOString() });
      return { success: true, action: "updated", hubspotCompanyId: conn.hubspotCompanyId };
    }

    // Search by name first
    const search = await client.crm.companies.searchApi.doSearch({
      filterGroups: [{ filters: [{ propertyName: "name", operator: "EQ" as any, value: company.name }] }],
      properties: ["name", "hs_object_id"],
      limit: 1,
    });

    let hubspotCompanyId: string;
    if (search.results?.length) {
      hubspotCompanyId = search.results[0].id;
      await client.crm.companies.basicApi.update(hubspotCompanyId, { properties });
    } else {
      const created = await client.crm.companies.basicApi.create({ properties, associations: [] });
      hubspotCompanyId = created.id;
    }

    await storage.updateHubspotConnection(companyId, {
      hubspotCompanyId,
      lastSyncedAt: new Date().toISOString(),
    });

    return { success: true, action: search.results?.length ? "updated" : "created", hubspotCompanyId };
  } catch (err: any) {
    console.error("[hubspot-oauth] syncCompanyData error:", err.message);
    return { success: false, error: err.message };
  }
}

// Sync portal tasks → HubSpot Tasks
export async function syncTasksToHubSpot(companyId: string) {
  try {
    const client = await getOAuthClient(companyId);
    const tasks = await storage.getTasks(companyId);
    const conn = await storage.getHubspotConnection(companyId);

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const task of tasks) {
      try {
        const statusMap: Record<string, string> = {
          completed: "COMPLETED", in_progress: "IN_PROGRESS",
          pending: "NOT_STARTED", review: "IN_PROGRESS",
        };
        const properties: Record<string, string> = {
          hs_task_subject: task.title,
          hs_task_body: task.description || "",
          hs_task_status: statusMap[task.status] || "NOT_STARTED",
          hs_task_type: "TODO",
        };
        if (task.dueDate) {
          properties.hs_timestamp = new Date(task.dueDate).getTime().toString();
        }

        const associations: any[] = [];
        if (conn?.hubspotCompanyId) {
          associations.push({
            to: { id: conn.hubspotCompanyId },
            types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 192 }],
          });
        }

        const created = await client.crm.objects.basicApi.create("tasks", { properties, associations });
        // store hubspot_task_id back — fire-and-forget DB update
        (async () => {
          try {
            await storage.updateTaskHubspotId(task.id, created.id);
          } catch {}
        })();
        synced++;
      } catch (e: any) {
        failed++;
        errors.push(`${task.title}: ${e.message}`);
      }
    }

    await storage.updateHubspotConnection(companyId, { lastSyncedAt: new Date().toISOString() });
    return { success: true, synced, failed, errors };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Pull contacts from this company's HubSpot portal
export async function pullContacts(companyId: string) {
  try {
    const client = await getOAuthClient(companyId);
    const conn = await storage.getHubspotConnection(companyId);

    if (!conn?.hubspotCompanyId) {
      // Just return all contacts in portal (up to 50)
      const resp = await client.crm.contacts.basicApi.getPage(
        50, undefined,
        ["email", "firstname", "lastname", "hs_lead_status", "phone", "createdate"],
      );
      return { success: true, contacts: resp.results.map(mapContact) };
    }

    // Get contacts associated with this company
    const assoc = await client.crm.associations.v4.basicApi.getPage(
      "company", conn.hubspotCompanyId, "contact", undefined, 50,
    );
    if (!assoc.results?.length) return { success: true, contacts: [] };

    const contactIds = assoc.results.map((a: any) => a.toObjectId);
    const contacts = await Promise.all(
      contactIds.slice(0, 50).map(async (id: string) => {
        try {
          const c = await client.crm.contacts.basicApi.getById(id, [
            "email", "firstname", "lastname", "hs_lead_status", "phone", "createdate",
          ]);
          return mapContact(c);
        } catch { return null; }
      }),
    );

    return { success: true, contacts: contacts.filter(Boolean) };
  } catch (err: any) {
    return { success: false, error: err.message, contacts: [] };
  }
}

function mapContact(c: any) {
  return {
    id: c.id,
    email: c.properties?.email || "",
    firstName: c.properties?.firstname || "",
    lastName: c.properties?.lastname || "",
    leadStatus: c.properties?.hs_lead_status || "",
    phone: c.properties?.phone || "",
    createdAt: c.properties?.createdate || "",
  };
}

// Pull open deals
export async function pullDeals(companyId: string) {
  try {
    const client = await getOAuthClient(companyId);
    const conn = await storage.getHubspotConnection(companyId);

    if (!conn?.hubspotCompanyId) {
      const resp = await client.crm.deals.basicApi.getPage(
        50, undefined,
        ["dealname", "dealstage", "amount", "closedate", "pipeline"],
      );
      return { success: true, deals: resp.results.map(mapDeal) };
    }

    const assoc = await client.crm.associations.v4.basicApi.getPage(
      "company", conn.hubspotCompanyId, "deal", undefined, 50,
    );
    if (!assoc.results?.length) return { success: true, deals: [] };

    const dealIds = assoc.results.map((a: any) => a.toObjectId);
    const deals = await Promise.all(
      dealIds.slice(0, 50).map(async (id: string) => {
        try {
          const d = await client.crm.deals.basicApi.getById(id, [
            "dealname", "dealstage", "amount", "closedate", "pipeline",
          ]);
          return mapDeal(d);
        } catch { return null; }
      }),
    );

    return { success: true, deals: deals.filter(Boolean) };
  } catch (err: any) {
    return { success: false, error: err.message, deals: [] };
  }
}

function mapDeal(d: any) {
  return {
    id: d.id,
    name: d.properties?.dealname || "",
    stage: d.properties?.dealstage || "",
    amount: d.properties?.amount || "",
    closeDate: d.properties?.closedate || "",
    pipeline: d.properties?.pipeline || "",
  };
}

// Pull email / social campaigns
export async function pullCampaigns(companyId: string) {
  try {
    const client = await getOAuthClient(companyId);
    // HubSpot marketing emails
    const resp = await (client as any).apiRequest({
      method: "GET",
      path: "/marketing/v3/emails",
      qs: { limit: 20 },
    });
    const body = await resp.json?.() ?? {};
    const emails = (body.results || []).map((e: any) => ({
      id: e.id,
      name: e.name || "",
      type: "email",
      status: e.currentState || "",
      stats: {
        openRate: e.stats?.ratios?.openRatio ?? null,
        clickRate: e.stats?.ratios?.clickRatio ?? null,
        sent: e.stats?.counters?.sent ?? null,
      },
    }));
    return { success: true, campaigns: emails };
  } catch (err: any) {
    return { success: false, error: err.message, campaigns: [] };
  }
}

// Push a content calendar item to HubSpot Social
export async function pushToHubSpotSocial(calendarItemId: string) {
  try {
    const client = await getOAuthClient(""); // caller must resolve companyId first
    void client; // placeholder — full social push requires channel IDs per company
    return { success: false, error: "Social push requires channel configuration — set up HubSpot Social channels first." };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
