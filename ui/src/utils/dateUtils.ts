/**
 * Date / time formatting utilities that respect the school's configured timezone.
 *
 * The active timezone is read from localStorage key "app_tz" which is written by
 * SettingsManager's AppearanceTab whenever user preferences are loaded or saved.
 * Falls back to "Asia/Kolkata" (IST) for Indian schools if nothing is stored.
 */

/** Returns the configured IANA timezone string (e.g. "Asia/Kolkata"). */
export function getAppTz(): string {
  return localStorage.getItem("app_tz") || "Asia/Kolkata";
}

/** Returns the configured time format preference ("12h" | "24h"). */
export function getTimeFormat(): string {
  return localStorage.getItem("app_time_fmt") || "12h";
}

/**
 * Format a date as "29 May 2026" in the school's timezone.
 * Pass extra `opts` to override any Intl.DateTimeFormat options.
 */
export function formatDate(
  date: string | Date | null | undefined,
  opts?: Intl.DateTimeFormatOptions
): string {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: getAppTz(),
      day: "2-digit",
      month: "short",
      year: "numeric",
      ...opts,
    }).format(new Date(date));
  } catch {
    return String(date);
  }
}

/**
 * Format a date-time as "29 May 2026, 07:45 PM" in the school's timezone.
 */
export function formatDateTime(
  date: string | Date | null | undefined,
  opts?: Intl.DateTimeFormatOptions
): string {
  if (!date) return "—";
  try {
    const hour12 = getTimeFormat() !== "24h";
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: getAppTz(),
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12,
      ...opts,
    }).format(new Date(date));
  } catch {
    return String(date);
  }
}

/**
 * Format only the time portion as "07:45 PM" in the school's timezone.
 */
export function formatTime(
  date: string | Date | null | undefined,
  opts?: Intl.DateTimeFormatOptions
): string {
  if (!date) return "—";
  try {
    const hour12 = getTimeFormat() !== "24h";
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: getAppTz(),
      hour: "2-digit",
      minute: "2-digit",
      hour12,
      ...opts,
    }).format(new Date(date));
  } catch {
    return String(date);
  }
}
