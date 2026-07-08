import { Request } from "express";

/**
 * Returns the correct base URL for email links.
 * Priority order:
 * 1. APP_URL env var (explicit override — set this in production secrets)
 * 2. Request origin header (works when browser triggers the action)
 * 3. REPLIT_DOMAINS (the deployed .replit.app domain)
 * 4. REPLIT_DEV_DOMAIN (dev preview)
 * 5. localhost fallback
 */
export function getBaseUrl(req?: Request): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, "");
  }
  if (req) {
    const origin = req.headers.origin || req.headers.referer?.replace(/\/[^/]*$/, "");
    if (origin) return origin.replace(/\/+$/, "");
  }
  if (process.env.REPLIT_DOMAINS) {
    const first = process.env.REPLIT_DOMAINS.split(",")[0].trim();
    if (first) return `https://${first}`;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return "http://localhost:5000";
}
