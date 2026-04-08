import type { RideDayPeriod } from "@/types";
import { APP_TIMEZONE } from "./datetime";

type LaParts = { y: number; m: number; d: number; h: number; min: number; s: number };

function getPartsLA(ms: number): LaParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(ms));
  const get = (t: Intl.DateTimeFormatPart["type"]) =>
    parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
  return {
    y: get("year"),
    m: get("month"),
    d: get("day"),
    h: get("hour"),
    min: get("minute"),
    s: get("second"),
  };
}

function compareLaParts(a: LaParts, b: LaParts): number {
  const keys: (keyof LaParts)[] = ["y", "m", "d", "h", "min", "s"];
  for (const k of keys) {
    if (a[k] !== b[k]) return a[k] - b[k];
  }
  return 0;
}

/**
 * LA 달력 기준 해당 시·분의 UTC epoch(ms).
 * DST(서머타임) 포함해 Intl로 역산.
 */
export function laWallClockToUtcMs(
  y: number,
  m: number,
  d: number,
  hour: number,
  minute: number
): number {
  const target: LaParts = { y, m, d, h: hour, min: minute, s: 0 };
  let lo = Date.UTC(y, m - 1, d, 0, 0, 0) - 48 * 3600 * 1000;
  let hi = Date.UTC(y, m - 1, d, 0, 0, 0) + 48 * 3600 * 1000;
  for (let i = 0; i < 56; i++) {
    const mid = (lo + hi) / 2;
    const p = getPartsLA(mid);
    const cmp = compareLaParts(p, target);
    if (cmp === 0) return Math.floor(mid);
    if (cmp < 0) lo = mid;
    else hi = mid;
  }
  return Math.floor((lo + hi) / 2);
}

/**
 * 라이드 슬롯이 "끝난" 시각(UTC ms).
 * - 오전: 해당 날 LA 12:00
 * - 오후: 해당 날이 끝나는 시각 = 다음날 LA 00:00
 */
export function getRideSlotEndUtcMs(rideDateKey: string, period: RideDayPeriod): number {
  const parts = rideDateKey.split("-").map(Number);
  const [y, m, d] = parts;
  if (parts.length !== 3 || !Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return Date.now();
  }
  if (period === "am") {
    return laWallClockToUtcMs(y, m, d, 12, 0);
  }
  const nextCal = new Date(Date.UTC(y, m - 1, d + 1));
  const ny = nextCal.getUTCFullYear();
  const nm = nextCal.getUTCMonth() + 1;
  const nd = nextCal.getUTCDate();
  return laWallClockToUtcMs(ny, nm, nd, 0, 0);
}

export function isRideSlotEnded(
  rideDateKey: string,
  period: RideDayPeriod,
  nowMs: number = Date.now()
): boolean {
  return nowMs >= getRideSlotEndUtcMs(rideDateKey, period);
}
