import { storage } from "./storage";
import { syncCompanyDataToHubSpot, refreshOAuthToken } from "./hubspot-oauth/sync";
import { decryptSecret } from "./lib/credential-encryption";

const log = (msg: string) => console.log(`[hubspot-scheduler] ${msg}`);

// Sync all companies that have an active HubSpot OAuth connection.
// Skips companies whose tokens fail to refresh gracefully.
export async function syncAllHubSpotConnections(): Promise<void> {
  log("Starting nightly HubSpot sync for all active connections...");
  const connections = await storage.getAllActiveHubspotConnections();

  if (connections.length === 0) {
    log("No active HubSpot connections found — nothing to sync.");
    return;
  }

  let succeeded = 0;
  let failed = 0;

  for (const conn of connections) {
    try {
      const result = await syncCompanyDataToHubSpot(conn.companyId);
      if (result.success) {
        succeeded++;
        log(`✓ Synced company ${conn.companyId}`);
      } else {
        failed++;
        log(`✗ Sync failed for ${conn.companyId}: ${result.error}`);
      }
    } catch (err: any) {
      failed++;
      log(`✗ Error syncing ${conn.companyId}: ${err.message}`);
    }
  }

  log(`Nightly sync complete — ${succeeded} succeeded, ${failed} failed.`);
}

// Refresh OAuth tokens that are expiring within the next 24 hours.
export async function refreshExpiringTokens(): Promise<void> {
  log("Checking for OAuth tokens expiring within 24 hours...");
  const connections = await storage.getAllActiveHubspotConnections();
  const cutoff = Date.now() + 24 * 60 * 60 * 1000;

  let refreshed = 0;
  let failed = 0;

  for (const conn of connections) {
    if (!conn.tokenExpiresAt || !conn.refreshToken) continue;
    const expiresAt = new Date(conn.tokenExpiresAt).getTime();
    if (expiresAt > cutoff) continue;

    try {
      const rawRefreshToken = decryptSecret(conn.refreshToken);
      await refreshOAuthToken(conn.companyId, rawRefreshToken);
      refreshed++;
      log(`✓ Refreshed token for company ${conn.companyId}`);
    } catch (err: any) {
      failed++;
      log(`✗ Token refresh failed for ${conn.companyId}: ${err.message}`);
    }
  }

  if (refreshed === 0 && failed === 0) {
    log("No tokens needed refreshing.");
  } else {
    log(`Token refresh complete — ${refreshed} refreshed, ${failed} failed.`);
  }
}

export async function setupHubSpotScheduler(): Promise<void> {
  const cron = await import("node-cron");

  // Every night at 2:00 AM ET — sync all active connections
  cron.schedule(
    "0 2 * * *",
    async () => {
      try {
        await syncAllHubSpotConnections();
      } catch (err: any) {
        console.error("[hubspot-scheduler] Nightly sync error:", err.message);
      }
    },
    { timezone: "America/New_York" }
  );
  log("Nightly sync scheduler started (2:00 AM ET daily).");

  // Every 6 hours — refresh tokens expiring within 24 hours
  cron.schedule(
    "0 */6 * * *",
    async () => {
      try {
        await refreshExpiringTokens();
      } catch (err: any) {
        console.error("[hubspot-scheduler] Token refresh error:", err.message);
      }
    },
    { timezone: "America/New_York" }
  );
  log("Token refresh scheduler started (every 6 hours).");

  // Run token refresh immediately on startup to catch any already-expired tokens
  refreshExpiringTokens().catch((err) =>
    console.error("[hubspot-scheduler] Startup token refresh error:", err.message)
  );
}
