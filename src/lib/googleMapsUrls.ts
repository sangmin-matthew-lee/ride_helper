import type { Location } from "@/types";

/**
 * 현재 위치(출발) 생략 시 기기 위치 → 경유지 순 → 최종 목적지까지 한 번에 여는 구글 맵 길찾기 URL.
 *
 * ⚠️ waypoints 파라미터에서 encodeURIComponent 를 쓰면 좌표 안의 ',' 까지 %2C 로 변환돼,
 *    구글맵 모바일 앱이 좌표를 파싱하지 못해 "출발하자마자 도착" 버그가 발생한다.
 *    Google Maps URL 스펙상 '|' 구분자만 %7C 로 인코딩하고, 좌표 내 ',' 는 그대로 둬야 한다.
 *
 * @see https://developers.google.com/maps/documentation/urls/get-started#directions-action
 */
export function buildGoogleMapsDirectionsUrl(stops: Location[]): string {
  if (stops.length === 0) {
    return "https://www.google.com/maps/";
  }
  const base = "https://www.google.com/maps/dir/?api=1&travelmode=driving";
  if (stops.length === 1) {
    const s = stops[0];
    return `${base}&destination=${s.lat},${s.lng}`;
  }
  const dest = stops[stops.length - 1];
  // '|' 만 %7C 로 인코딩. 좌표 내 ',' 는 인코딩하지 않아야 구글맵이 올바르게 파싱한다.
  const wps = stops
    .slice(0, -1)
    .map((s) => `${s.lat},${s.lng}`)
    .join("%7C");
  return `${base}&destination=${dest.lat},${dest.lng}&waypoints=${wps}`;
}

/**
 * 사용자 탭 직후 동기 호출해야 함. await 뒤에 window.open 하면 모바일에서 팝업 차단되는 경우가 많음.
 */
export function openGoogleMapsDirections(stops: Location[]): void {
  if (typeof window === "undefined") return;
  const url = buildGoogleMapsDirectionsUrl(stops);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (win != null) return;
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
