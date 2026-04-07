"use client";
import { Location, RecentRide } from "@/types";
import styles from "./RecentRidesView.module.css";

interface Props {
  locations: Location[];
  recentRides: RecentRide[];
  onBack: () => void;
  /** 유효한 경유지 ID 순서로 경로 설정 화면으로 이동 */
  onPickRide: (orderedLocationIds: string[]) => void;
}

function summarizeRide(ride: RecentRide): string {
  return ride.stops.map((s) => s.nickname).join(" → ");
}

export default function RecentRidesView({
  locations,
  recentRides,
  onBack,
  onPickRide,
}: Props) {
  const handleSelect = (ride: RecentRide) => {
    const validIds = ride.stops
      .filter((s) => locations.some((l) => l.id === s.id))
      .map((s) => s.id);
    if (validIds.length === 0) {
      alert("이 경로의 주소가 모두 삭제되어 불러올 수 없습니다.");
      return;
    }
    if (validIds.length < ride.stops.length) {
      if (
        !confirm(
          "일부 주소가 삭제되어 남은 경유지만 적용합니다. 계속할까요?"
        )
      ) {
        return;
      }
    }
    onPickRide(validIds);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <button
          className={styles.backBtn}
          onClick={onBack}
          type="button"
          id="recent-rides-back-btn"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h2 className={styles.topTitle}>이전 라이드</h2>
        <div style={{ width: 40 }} />
      </div>

      <div className={styles.content}>
        {recentRides.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🗂️</div>
            <p>저장된 라이드가 없어요</p>
            <p className={styles.emptyHint}>
              라이드 시작을 누르면 경로가 여기에 쌓여요(최대 10건). 다음에 같은
              순서로 다시 갈 때 불러올 수 있어요.
            </p>
          </div>
        ) : (
          <>
            <p className={styles.hint}>
              항목을 누르면 그때와 같은 순서로 라이드 경로 설정에 반영돼요. 날짜·시간은
              라이드 시작을 누른 시각이에요.
            </p>
            <ul className={styles.list}>
              {recentRides.map((ride) => (
                <li key={ride.id}>
                  <button
                    type="button"
                    className={styles.rideCard}
                    onClick={() => handleSelect(ride)}
                    id={`recent-ride-${ride.id}`}
                  >
                    <div className={styles.rideMeta}>
                      <span className={styles.rideDate}>{ride.date}</span>
                      <span className={styles.rideCount}>
                        {ride.stops.length}곳
                      </span>
                    </div>
                    <div className={styles.rideRoute}>{summarizeRide(ride)}</div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
