const TZ = "America/New_York";

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(date: Date | string): Date {
  if (typeof date !== "string") return date;
  if (DATE_ONLY_RE.test(date)) {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }
  return new Date(date);
}

export function formatDateET(date: Date | string): string {
  const d = parseDate(date);
  return d.toLocaleDateString("en-US", { timeZone: TZ });
}

export function formatTimeET(date: Date | string): string {
  const d = parseDate(date);
  return d.toLocaleTimeString("en-US", { timeZone: TZ });
}

export function formatDateTimeET(date: Date | string): string {
  const d = parseDate(date);
  return d.toLocaleString("en-US", { timeZone: TZ });
}

export function formatDateLongET(date: Date | string): string {
  const d = parseDate(date);
  return d.toLocaleDateString("en-US", { timeZone: TZ, month: "long", day: "numeric", year: "numeric" });
}

export function formatDateShortET(date: Date | string): string {
  const d = parseDate(date);
  return d.toLocaleDateString("en-US", { timeZone: TZ, month: "short", day: "numeric", year: "numeric" });
}

export function formatDateWeekdayET(date: Date | string): string {
  const d = parseDate(date);
  return d.toLocaleDateString("en-US", { timeZone: TZ, weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
