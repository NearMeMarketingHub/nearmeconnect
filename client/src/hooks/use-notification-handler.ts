import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { setNotificationUserId } from "@/lib/notification-sounds";

export function useNotificationHandler(isAuthenticated: boolean) {
  const { user } = useAuth();
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      lastUserIdRef.current = null;
      setNotificationUserId(null);
      return;
    }

    if (lastUserIdRef.current !== user.id) {
      lastUserIdRef.current = user.id;
      setNotificationUserId(user.id);
    }
  }, [isAuthenticated, user]);
}
