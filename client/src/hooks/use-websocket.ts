import { useEffect, useRef, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";
import { playNotificationSound, showBrowserNotification } from "@/lib/notification-sounds";

export function useWebSocket(isAuthenticated: boolean) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(1000);
  const isConnectedRef = useRef(false);
  const wasConnectedRef = useRef(false);

  const connect = useCallback(() => {
    if (!isAuthenticated) return;
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      isConnectedRef.current = true;
      reconnectDelayRef.current = 1000;
      if (wasConnectedRef.current) {
        queryClient.invalidateQueries();
      }
      wasConnectedRef.current = true;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "invalidate" && Array.isArray(msg.queryKeys)) {
          msg.queryKeys.forEach((key: string) => {
            queryClient.invalidateQueries({ queryKey: [key] });
          });
        }

        if (msg.type === "notification") {
          console.log("[NMC] WS notification received:", msg.title);
          playNotificationSound();
          const safePath = msg.link && typeof msg.link === "string" && msg.link.startsWith("/") ? msg.link : undefined;
          showBrowserNotification(msg.title || "New Notification", msg.message || "", safePath);
          queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
          queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
        }

        if (msg.type === "pong" || msg.type === "connected") {
          return;
        }
      } catch {}
    };

    ws.onclose = () => {
      isConnectedRef.current = false;
      wsRef.current = null;
      scheduleReconnect();
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [isAuthenticated]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, 30000);
      connect();
    }, reconnectDelayRef.current);
  }, [connect]);

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    }

    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 25000);

    return () => {
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, connect]);
}
