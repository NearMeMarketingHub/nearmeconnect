import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { IncomingMessage } from "http";
import { parse as parseCookie } from "cookie";
import { pool } from "./db";
import { log } from "./index";

interface ConnectedClient {
  ws: WebSocket;
  userId: string | null;
  isAlive: boolean;
}

const clients = new Set<ConnectedClient>();

let wss: WebSocketServer | null = null;

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    const userId = await extractUserIdFromRequest(req);

    const client: ConnectedClient = { ws, userId, isAlive: true };
    clients.add(client);

    if (userId) {
      log(`WebSocket connected: user ${userId}`, "ws");
    }

    ws.on("pong", () => {
      client.isAlive = true;
    });

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
        }
      } catch {}
    });

    ws.on("close", () => {
      clients.delete(client);
    });

    ws.on("error", () => {
      clients.delete(client);
    });

    ws.send(JSON.stringify({ type: "connected" }));
  });

  const heartbeatInterval = setInterval(() => {
    clients.forEach((client) => {
      if (!client.isAlive) {
        client.ws.terminate();
        clients.delete(client);
        return;
      }
      client.isAlive = false;
      client.ws.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  log("WebSocket server started on /ws", "ws");
}

async function extractUserIdFromRequest(req: IncomingMessage): Promise<string | null> {
  try {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;

    const cookies = parseCookie(cookieHeader);
    const sid = cookies["connect.sid"];
    if (!sid) return null;

    const sessionId = sid.startsWith("s:") 
      ? sid.slice(2).split(".")[0] 
      : sid.split(".")[0];

    const result = await pool.query(
      "SELECT sess FROM sessions WHERE sid = $1",
      [sessionId]
    );

    if (result.rows.length === 0) return null;
    const sess = result.rows[0].sess;
    return sess?.userId || null;
  } catch {
    return null;
  }
}

export function broadcastInvalidation(queryKeys: string[]) {
  if (clients.size === 0) return;

  const message = JSON.stringify({
    type: "invalidate",
    queryKeys,
  });

  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  });
}

export function broadcastNotificationToUser(
  userId: string,
  notification: { title: string; message: string; link?: string | null }
) {
  if (clients.size === 0) return;

  const payload = JSON.stringify({
    type: "notification",
    title: notification.title,
    message: notification.message,
    link: notification.link || null,
  });

  clients.forEach((client) => {
    if (
      client.userId === userId &&
      client.ws.readyState === WebSocket.OPEN
    ) {
      client.ws.send(payload);
    }
  });
}

export function broadcastNotificationToUsers(
  userIds: string[],
  notification: { title: string; message: string; link?: string | null }
) {
  if (clients.size === 0 || userIds.length === 0) return;

  const userIdSet = new Set(userIds);
  const payload = JSON.stringify({
    type: "notification",
    title: notification.title,
    message: notification.message,
    link: notification.link || null,
  });

  clients.forEach((client) => {
    if (
      client.userId &&
      userIdSet.has(client.userId) &&
      client.ws.readyState === WebSocket.OPEN
    ) {
      client.ws.send(payload);
    }
  });
}

export function getConnectedClientCount(): number {
  return clients.size;
}
