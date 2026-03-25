let audioCtx: AudioContext | null = null;
let audioUnlocked = false;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  getAudioContext();
}

if (typeof document !== "undefined") {
  const events = ["click", "touchstart", "keydown"];
  const handler = () => {
    unlockAudio();
    events.forEach(e => document.removeEventListener(e, handler));
  };
  events.forEach(e => document.addEventListener(e, handler, { once: false }));
}

export type SoundType = "chime" | "pop" | "tone" | "ping";

export const SOUND_OPTIONS: { id: SoundType; name: string; description: string }[] = [
  { id: "chime", name: "Soft Chime", description: "Gentle, pleasant bell tone" },
  { id: "pop", name: "Pop", description: "Short, bubbly pop sound" },
  { id: "tone", name: "Subtle Tone", description: "Minimal two-note tone" },
  { id: "ping", name: "Alert Ping", description: "Crisp, attention-grabbing ping" },
];

function playChime() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = "sine";
  osc1.frequency.setValueAtTime(880, now);
  osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.15);

  osc2.type = "sine";
  osc2.frequency.setValueAtTime(1320, now + 0.15);
  osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.3);

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now + 0.15);
  osc1.stop(now + 0.3);
  osc2.stop(now + 0.6);
}

function playPop() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);

  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.15);
}

function playTone() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = "sine";
  osc1.frequency.setValueAtTime(523, now);

  osc2.type = "sine";
  osc2.frequency.setValueAtTime(659, now + 0.2);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.setValueAtTime(0.2, now + 0.15);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now + 0.2);
  osc1.stop(now + 0.2);
  osc2.stop(now + 0.5);
}

function playPing() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(1500, now);
  osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);

  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.3);
}

const SOUND_PLAYERS: Record<SoundType, () => void> = {
  chime: playChime,
  pop: playPop,
  tone: playTone,
  ping: playPing,
};

export function playSound(type: SoundType) {
  try {
    SOUND_PLAYERS[type]();
  } catch {
  }
}

const PREFS_KEY_PREFIX = "nmc_notification_prefs";
let currentUserId: string | null = null;

export function setNotificationUserId(userId: string | null) {
  currentUserId = userId;
}

function getPrefsKey(): string {
  return currentUserId ? `${PREFS_KEY_PREFIX}:${currentUserId}` : PREFS_KEY_PREFIX;
}

export interface NotificationPrefs {
  soundEnabled: boolean;
  soundType: SoundType;
  browserNotificationsEnabled: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  soundEnabled: true,
  soundType: "chime",
  browserNotificationsEnabled: false,
};

export function getNotificationPrefs(): NotificationPrefs {
  try {
    const stored = localStorage.getItem(getPrefsKey());
    if (stored) {
      return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
    }
  } catch {
  }
  return { ...DEFAULT_PREFS };
}

export function saveNotificationPrefs(prefs: Partial<NotificationPrefs>) {
  const current = getNotificationPrefs();
  const updated = { ...current, ...prefs };
  localStorage.setItem(getPrefsKey(), JSON.stringify(updated));
  return updated;
}

export function playNotificationSound() {
  const prefs = getNotificationPrefs();
  if (prefs.soundEnabled) {
    playSound(prefs.soundType);
  }
}

export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function showBrowserNotification(title: string, body: string, link?: string) {
  const prefs = getNotificationPrefs();
  if (!prefs.browserNotificationsEnabled) {
    console.log("[NMC] Browser notifications disabled in prefs");
    return;
  }
  if (!("Notification" in window)) {
    console.log("[NMC] Notification API not available");
    return;
  }
  if (Notification.permission !== "granted") {
    console.log("[NMC] Notification permission not granted:", Notification.permission);
    return;
  }

  try {
    console.log("[NMC] Creating browser notification:", title);
    const notification = new Notification(title, {
      body,
      icon: "/favicon.png",
      tag: `nmc-${Date.now()}`,
    });

    notification.onshow = () => console.log("[NMC] Notification shown");
    notification.onerror = (e) => console.warn("[NMC] Notification error:", e);

    if (link && link.startsWith("/")) {
      notification.onclick = () => {
        window.focus();
        window.location.href = link;
        notification.close();
      };
    }
  } catch (err) {
    console.warn("[NMC] Browser notification failed:", err);
  }
}
