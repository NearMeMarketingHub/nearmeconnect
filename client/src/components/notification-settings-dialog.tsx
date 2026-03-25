import { useState, useEffect, useRef } from "react";
import { Settings, Volume2, VolumeX, Play, BellRing, Send, Loader2, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  SOUND_OPTIONS,
  playSound,
  getNotificationPrefs,
  saveNotificationPrefs,
  requestBrowserNotificationPermission,
  type SoundType,
} from "@/lib/notification-sounds";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function NotificationSettingsDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(getNotificationPrefs);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [delayCountdown, setDelayCountdown] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const handleSendTest = async () => {
    setIsSendingTest(true);
    try {
      await apiRequest("POST", "/api/notifications/test");
      toast({ title: "Test notification sent", description: "You should see and hear it momentarily." });
    } catch {
      toast({ title: "Failed to send test notification", variant: "destructive" });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSendDelayedTest = async () => {
    try {
      await apiRequest("POST", "/api/notifications/test-delayed", { delayMs: 5000 });
      toast({ title: "Delayed test scheduled", description: "Notification will arrive in 5 seconds — switch tabs to test!" });
      setDelayCountdown(5);
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setDelayCountdown((prev) => {
          if (prev === null || prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            countdownRef.current = null;
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      toast({ title: "Failed to schedule delayed test", variant: "destructive" });
    }
  };

  const updatePrefs = (update: Partial<typeof prefs>) => {
    const newPrefs = saveNotificationPrefs(update);
    setPrefs(newPrefs);
  };

  const handleBrowserToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestBrowserNotificationPermission();
      if (!granted) {
        return;
      }
    }
    updatePrefs({ browserNotificationsEnabled: enabled });
  };

  const browserPermission = typeof Notification !== "undefined" ? Notification.permission : "denied";
  const browserSupported = typeof Notification !== "undefined";

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (val) setPrefs(getNotificationPrefs()); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" data-testid="button-notification-settings">
          <Settings className="h-3 w-3 mr-1" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Notification Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 mt-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {prefs.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
                <Label htmlFor="sound-toggle" className="font-medium">Notification Sounds</Label>
              </div>
              <Switch
                id="sound-toggle"
                checked={prefs.soundEnabled}
                onCheckedChange={(checked) => updatePrefs({ soundEnabled: checked })}
                data-testid="switch-sound-enabled"
              />
            </div>

            {prefs.soundEnabled && (
              <div className="space-y-2 pl-6">
                <Label className="text-sm text-muted-foreground">Choose a sound</Label>
                <div className="space-y-2">
                  {SOUND_OPTIONS.map((sound) => (
                    <div
                      key={sound.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        prefs.soundType === sound.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-accent/50"
                      }`}
                      onClick={() => updatePrefs({ soundType: sound.id })}
                      data-testid={`sound-option-${sound.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{sound.name}</span>
                          {prefs.soundType === sound.id && (
                            <Badge variant="secondary" className="text-xs">Selected</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{sound.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          playSound(sound.id as SoundType);
                        }}
                        data-testid={`button-play-${sound.id}`}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4" />
                <div>
                  <Label htmlFor="browser-toggle" className="font-medium">Browser Notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Show desktop alerts when the tab isn't focused
                  </p>
                </div>
              </div>
              <Switch
                id="browser-toggle"
                checked={prefs.browserNotificationsEnabled}
                onCheckedChange={handleBrowserToggle}
                disabled={!browserSupported || (browserPermission === "denied" && !prefs.browserNotificationsEnabled)}
                data-testid="switch-browser-notifications"
              />
            </div>
            {!browserSupported && (
              <p className="text-xs text-destructive mt-2 pl-6">
                Browser notifications are not supported in this browser.
              </p>
            )}
            {browserSupported && browserPermission === "denied" && (
              <p className="text-xs text-destructive mt-2 pl-6">
                Notifications are blocked. Please enable them in your browser settings.
              </p>
            )}
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Test Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Send yourself a test to verify sound and browser alerts
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendTest}
                  disabled={isSendingTest}
                  data-testid="button-send-test-notification"
                >
                  {isSendingTest ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-1" />
                  )}
                  Send Test
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendDelayedTest}
                  disabled={delayCountdown !== null}
                  data-testid="button-send-delayed-test-notification"
                >
                  {delayCountdown !== null ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      {delayCountdown}s
                    </>
                  ) : (
                    <>
                      <Timer className="h-4 w-4 mr-1" />
                      Send in 5s
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
