import type { RideDayPeriod } from "@/types";

/** 앱 전역 날짜·시간: 미국 캘리포니아(로스앤젤레스, PST/PDT) */
export const APP_TIMEZONE = "America/Los_Angeles" as const;

/** 이전 라이드 문서에 넣는 표시용 문자열 */
export function formatStoredRideDateTime(ms: number): string {
  return new Date(ms).toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: APP_TIMEZONE,
  });
}

/** 같은 날짜끼리 묶기용 키 (YYYY-MM-DD, LA 달력 기준) */
export function calendarDateKeyAppTz(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

/** 섹션 제목: `월요일 · 2026. 4. 7.` 형태 */
export function sectionTitleDayAppTz(ms: number): string {
  const weekday = new Date(ms).toLocaleDateString("ko-KR", {
    weekday: "long",
    timeZone: APP_TIMEZONE,
  });
  const dateStr = new Date(ms).toLocaleDateString("ko-KR", {
    dateStyle: "medium",
    timeZone: APP_TIMEZONE,
  });
  return `${weekday} · ${dateStr}`;
}

/** `YYYY-MM-DD`(LA 달력) 한 줄 표시 */
export function formatDateKeyLabelAppTz(dateKey: string): string {
  const parts = dateKey.split("-").map(Number);
  const [y, m, d] = parts;
  if (parts.length !== 3 || !Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return dateKey;
  }
  const ms = Date.UTC(y, m - 1, d, 7, 0, 0);
  return new Date(ms).toLocaleDateString("ko-KR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: APP_TIMEZONE,
  });
}

export function formatRideSlotSummaryLine(dateKey: string, period: RideDayPeriod): string {
  const day = formatDateKeyLabelAppTz(dateKey);
  const p = period === "am" ? "오전" : "오후";
  return `${day} · ${p}`;
}
