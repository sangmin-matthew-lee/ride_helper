import type { Location } from "@/types";

/**
 * 현재 위치(출발) 생략 시 기기 위치 → 경유지 순 → 최종 목적지까지 한 번에 여는 구글 맵 길찾기 URL.
 * @see https://developers.google.com/maps/documentation/urls/get-started#directions-action
 */
export function buildGoogleMapsDirectionsUrl(stops: Location[]): string {
  if (stops.length === 0) {
    return "https://www.google.com/maps/";
  }
  const base = "https://www.google.com/maps/dir/?api=1";
  if (stops.length === 1) {
    const s = stops[0];
    return `${base}&destination=${s.lat},${s.lng}`;
  }
  const dest = stops[stops.length - 1];
  const wps = stops
    .slice(0, -1)
    .map((s) => `${s.lat},${s.lng}`)
    .join("|");
  return `${base}&destination=${dest.lat},${dest.lng}&waypoints=${encodeURIComponent(wps)}`;
}
