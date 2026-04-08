"use client";
import { useMemo } from "react";
import { Location, RideActiveEntry } from "@/types";
import { formatDateKeyLabelAppTz, formatRideSlotSummaryLine } from "@/lib/datetime";
import styles from "./RecentRidesView.module.css";

interface Props {
  locations: Location[];
  rides: RideActiveEntry[];
  onBack: () => void;
  onPickRide: (ride: RideActiveEntry) => void;
  onDeleteRide: (ride: RideActiveEntry) => void | Promise<void>;
  /** Web Share / 클립보드로 라이드 내용만 다시 공유 (저장 데이터는 그대로) */
  onShareRide: (ride: RideActiveEntry) => void | Promise<void>;
}

function summarizeRide(ride: RideActiveEntry): string {
  return ride.stops.map((s) => s.nickname).join(" → ");
}

function formatWhenRide(ride: RideActiveEntry): string {
  if (ride.rideDateKey && ride.ridePeriod) {
    return formatRideSlotSummaryLine(ride.rideDateKey, ride.ridePeriod);
  }
  return "—";
}

export default function RideStatusView({
  locations,
  rides,
  onBack,
  onPickRide,
  onDeleteRide,
  onShareRide,
}: Props) {
  const sections = useMemo(() => {
    const withDate = rides.filter((r) => r.rideDateKey);
    const legacy = rides.filter((r) => !r.rideDateKey);
    const keys = [...new Set(withDate.map((r) => r.rideDateKey!))].sort((a, b) =>
      a.localeCompare(b)
    );
    const dated = keys.map((dateKey) => {
      const ridesIn = withDate
        .filter((r) => r.rideDateKey === dateKey)
        .sort((a, b) => b.sharedAt - a.sharedAt);
      return {
        key: dateKey,
        title: formatDateKeyLabelAppTz(dateKey),
        rides: ridesIn,
      };
    });
    if (legacy.length) {
      dated.push({
        key: "legacy",
        title: "일정 없음",
        rides: [...legacy].sort((a, b) => b.sharedAt - a.sharedAt),
      });
    }
    return dated;
  }, [rides]);
  const handleSelect = (ride: RideActiveEntry) => {
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
    onPickRide({ ...ride, stops: ride.stops });
  };

  const handleDelete = (ride: RideActiveEntry) => {
    const slot =
      ride.rideDateKey && ride.ridePeriod
        ? `${ride.rideDateKey} (${ride.ridePeriod === "am" ? "오전" : "오후"})`
        : "해당 일정";
    if (
      !confirm(
        `이 라이드를 삭제할까요?\nFirebase에서도 삭제되며, ${slot}에 배정됐던 라이더·차량은 다시 선택할 수 있어요.`
      )
    ) {
      return;
    }
    void onDeleteRide(ride);
  };

  const handleShare = (ride: RideActiveEntry) => {
    const validIds = ride.stops
      .filter((s) => locations.some((l) => l.id === s.id))
      .map((s) => s.id);
    if (validIds.length === 0) {
      alert("이 경로의 주소가 모두 삭제되어 공유할 수 없습니다.");
      return;
    }
    if (validIds.length < ride.stops.length) {
      if (
        !confirm(
          "일부 주소가 삭제됐어요. 남은 경유지만 공유할까요?"
        )
      ) {
        return;
      }
    }
    void onShareRide(ride);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <button
          className={styles.backBtn}
          onClick={onBack}
          type="button"
          id="ride-status-back-btn"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h2 className={styles.topTitle}>라이드 현황</h2>
        <div style={{ width: 40 }} />
      </div>

      <div className={styles.content}>
        {rides.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <p>진행 중인 라이드가 없어요</p>
            <p className={styles.emptyHint}>
              라이드 공유를 하면 여기에 표시돼요. 라이드 일정이 끝나면 자동으로 이전 라이드로
              옮겨져요.
            </p>
          </div>
        ) : (
          <>
            <p className={styles.hint}>
              가까운 날짜부터 묶여 있어요. 라이드 공유 후 아직 일정이 끝나지 않은 항목만 보여요.
              카드를 누르면 경로·라이더·차량을 수정할 수 있어요. 공유 아이콘으로 같은 내용을 다시
              공유할 수 있어요. 삭제하면 Firebase에 저장된 이 항목도 지워지고, 그 날짜·시간대 라이더·차량
              배정이 풀려요.
            </p>
            <div className={styles.sections}>
              {sections.map((section) => (
                <section key={section.key} className={styles.weekdaySection}>
                  <h3 className={styles.weekdayTitle}>{section.title}</h3>
                  <ul className={styles.list}>
                    {section.rides.map((ride) => (
                      <li key={ride.id} className={styles.rideCardRow}>
                        <button
                          type="button"
                          className={styles.rideCard}
                          onClick={() => handleSelect(ride)}
                          id={`ride-status-${ride.id}`}
                        >
                          <div className={styles.rideField}>
                            <span className={styles.rideFieldLabel}>라이더</span>
                            <span className={styles.rideFieldValue}>
                              {ride.riderNickname?.trim() ? ride.riderNickname : "—"}
                            </span>
                          </div>
                          <div className={styles.rideField}>
                            <span className={styles.rideFieldLabel}>차량</span>
                            <span className={styles.rideFieldValue}>
                              {ride.vehicleId || ride.vehicleName?.trim() || ride.vehicleBrandModel
                                ? [
                                    ride.vehicleName?.trim() || null,
                                    ride.vehicleBrandModel?.trim() || null,
                                    ride.vehicleMaxPassengers != null && ride.vehicleMaxPassengers > 0
                                      ? `최대 ${ride.vehicleMaxPassengers}명`
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")
                                : "—"}
                            </span>
                          </div>
                          <div className={styles.rideField}>
                            <span className={styles.rideFieldLabel}>경로</span>
                            <span className={styles.rideFieldValueRoute}>
                              {summarizeRide(ride)}
                            </span>
                          </div>
                          <div className={styles.rideField}>
                            <span className={styles.rideFieldLabel}>언제 라이드</span>
                            <span className={styles.rideFieldValue}>{formatWhenRide(ride)}</span>
                          </div>
                        </button>
                        <div className={styles.rideCardActions}>
                          <button
                            type="button"
                            className={styles.shareRideBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShare(ride);
                            }}
                            aria-label="다시 공유하기"
                            id={`ride-status-share-${ride.id}`}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="18" cy="5" r="3"/>
                              <circle cx="6" cy="12" r="3"/>
                              <circle cx="18" cy="19" r="3"/>
                              <path d="M8.59 13.51 15.42 17.49M15.41 6.51 8.59 10.49"/>
                            </svg>
                          </button>
                          <button
                            type="button"
                            className={styles.deleteRideBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(ride);
                            }}
                            aria-label="라이드 삭제"
                            id={`ride-status-delete-${ride.id}`}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                              <path d="M10 11v6M14 11v6" />
                            </svg>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
