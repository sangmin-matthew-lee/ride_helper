import type { Location } from "@/types";

/**
 * 현재 위치(출발) → 경유지 순 → 최종 목적지까지 한 번에 여는 구글 맵 길찾기 URL.
 *
 * ⚠️ ?api=1 포맷은 destination 을 "경로 최적화 목표"로 취급하기 때문에,
 *    현재 GPS 위치가 destination 과 가까울 때(원형 경로) 경로 스냅이 경로 끝으로 붙어
 *    "Start 누르자마자 모든 경유지 도착" 버그가 발생한다.
 *
 *    path 방식( /dir//stop1/stop2/.../ )은 경유지를 순서대로 처리하는 독립 세그먼트로 취급하므로
 *    원형 경로에서도 GPS 스냅이 경로 시작점으로 올바르게 작동한다.
 *    앞의 빈 세그먼트(//)는 현재 GPS 위치를 출발지로 사용한다.
 *
 * @see https://developers.google.com/maps/documentation/urls/get-started#directions-action
 */
export function buildGoogleMapsDirectionsUrl(stops: Location[]): string {
  if (stops.length === 0) {
    return "https://www.google.com/maps/";
  }
  // path 기반 포맷: //stop1/stop2/.../stopN/
  // 앞의 빈 세그먼트(//)가 현재 GPS 위치를 출발지로 지정한다.
  const path = stops.map((s) => `${s.lat},${s.lng}`).join("/");
  return `https://www.google.com/maps/dir//${path}/`;
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
