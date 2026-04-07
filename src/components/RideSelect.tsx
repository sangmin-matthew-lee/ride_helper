"use client";
import { Location, RecentRide } from "@/types";
import { motion } from "framer-motion";
import styles from "./RideSelect.module.css";

interface Props {
  locations: Location[];
  recentRides: RecentRide[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onNext: (stops: Location[]) => void;
  onLoadRecent: (ride: RecentRide) => void;
}

export default function RideSelect({
  locations,
  recentRides,
  selectedIds,
  onToggle,
  onNext,
  onLoadRecent,
}: Props) {
  const selectedCount = selectedIds.size;
  const selectedStops = locations.filter((l) => selectedIds.has(l.id));

  return (
    <div className={styles.wrapper}>
      <div className="page-container">
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>라이드 시작</h1>
          <p className={styles.subtitle}>오늘 갈 곳을 선택하세요</p>
        </div>

        {/* Recent rides */}
        {recentRides.length > 0 && (
          <div className="section">
            <div className="section-title">최근 경로</div>
            <div className={styles.recentList}>
              {recentRides.slice(0, 3).map((ride) => (
                <button
                  key={ride.id}
                  className={styles.recentCard}
                  onClick={() => onLoadRecent(ride)}
                  id={`recent-ride-${ride.id}`}
                >
                  <div className={styles.recentIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1 4 1 10 7 10"/><path d="M3.5 15a9 9 0 1 0 .5-5"/>
                    </svg>
                  </div>
                  <div className={styles.recentInfo}>
                    <span className={styles.recentStops}>
                      {ride.stops.map((s) => s.nickname).join(" → ")}
                    </span>
                    <span className={styles.recentDate}>{ride.date}</span>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: "var(--text-muted)", flexShrink: 0}}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Address list */}
        {locations.length === 0 ? (
          <div className={styles.emptyState}>
            <p>주소록이 비어있어요</p>
            <p className={styles.emptyHint}>주소록 탭에서 주소를 추가한 후 라이드를 시작하세요.</p>
          </div>
        ) : (
          <div className="section">
            <div className="section-title">주소록 ({locations.length})</div>
            <div className={styles.locationList}>
              {locations.map((loc, i) => {
                const checked = selectedIds.has(loc.id);
                return (
                  <motion.button
                    key={loc.id}
                    className={`${styles.locationCard} ${checked ? styles.checked : ""}`}
                    onClick={() => onToggle(loc.id)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    id={`select-location-${loc.id}`}
                  >
                    <div className={`checkbox-custom ${checked ? "checked" : ""}`}>
                      {checked && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>
                    <div className={styles.locInfo}>
                      <span className={styles.locNickname}>{loc.nickname}</span>
                      <span className={styles.locAddress}>{loc.address}</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <motion.div
        className={styles.bottomBar}
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
      >
        <div className={styles.bottomBarInner}>
          <div className={styles.selectedCount}>
            <span className={styles.countNum}>{selectedCount}</span>
            <span className={styles.countLabel}>곳 선택됨</span>
          </div>
          <button
            className={`btn btn-primary ${styles.nextBtn}`}
            disabled={selectedCount === 0}
            onClick={() => onNext(selectedStops)}
            id="ride-next-btn"
          >
            순서 정하기
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
