/**
 * 라이드 구성에서 주소를 경로에 넣을 때마다 횟수를 올려,
 * 자주 고른 주소가 목록 위로 오도록 함 (브라우저 localStorage, 계정별).
 */
const key = (userId: string) => `ride_helper:addr_pick_counts:${userId}`;

export function loadAddressPickCounts(userId: string): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return {};
    const out: Record<string, number> = {};
    for (const [id, n] of Object.entries(parsed)) {
      if (typeof n === "number" && Number.isFinite(n) && n >= 0) {
        out[id] = Math.floor(n);
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function saveAddressPickCounts(
  userId: string,
  counts: Record<string, number>
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key(userId), JSON.stringify(counts));
  } catch {
    /* quota 등 */
  }
}
