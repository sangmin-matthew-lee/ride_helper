import type { Location, Rider, Vehicle } from "@/types";
import { buildGoogleMapsDirectionsUrl } from "./googleMapsUrls";

/**
 * 라이더 → 차량 → 구글맵 링크 → 픽업(이름/전화) 순
 */
export function buildRideShareText(
  stops: Location[],
  vehicle?: Vehicle | null,
  rider?: Rider | null,
  riderNicknameFallback?: string | null
): string {
  const parts: string[] = [];

  const riderName = rider?.nickname?.trim() || riderNicknameFallback?.trim();
  if (riderName) {
    parts.push("── 운행 라이더 ──");
    parts.push(`이름: ${riderName}`);
    const phone = rider?.phone?.trim();
    if (phone) {
      parts.push(`전화: ${phone}`);
    }
    parts.push("");
  }

  if (vehicle) {
    parts.push("── 운행 차량 ──");
    parts.push(`이름: ${vehicle.name}`);
    parts.push(`차량: ${vehicle.brandModel}`);
    parts.push(`최대 탑승: ${vehicle.maxPassengers}명`);
    parts.push("");
  }

  const url = buildGoogleMapsDirectionsUrl(stops);
  parts.push("── 구글맵 경로 ──");
  parts.push(url);
  parts.push("");

  if (stops.length > 0) {
    parts.push("── 픽업하는 분들 ──");
    stops.forEach((s, i) => {
      const phone = s.phone?.trim() ? s.phone.trim() : "-";
      parts.push(`${i + 1}. ${s.nickname}`);
      parts.push(`   전화: ${phone}`);
    });
  }

  return parts.join("\n");
}

export type ShareRideResult = "shared" | "clipboard" | "aborted";

/**
 * Web Share API 또는 클립보드로 라이드 공유. 모바일에서 사용자 제스처 직후 호출.
 */
export async function shareRideContent(
  stops: Location[],
  vehicle?: Vehicle | null,
  rider?: Rider | null,
  riderNicknameFallback?: string | null
): Promise<ShareRideResult> {
  const text = buildRideShareText(
    stops,
    vehicle ?? undefined,
    rider ?? undefined,
    riderNicknameFallback ?? undefined
  );
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: "라이드 경로",
        text,
      });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "aborted";
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return "clipboard";
    } catch {
      // fall through
    }
  }

  if (typeof window !== "undefined") {
    window.prompt("아래 내용을 복사해 주세요", text);
  }
  return "clipboard";
}
