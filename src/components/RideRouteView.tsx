"use client";
import { Location } from "@/types";
import styles from "./RideRouteView.module.css";

interface Props {
  locations: Location[];
  /** 클릭 순서대로 선택된 주소 ID (부모에서 보관해 라이드 중단 후에도 복원) */
  orderedIds: string[];
  onOrderedIdsChange: (ids: string[]) => void;
  onBack: () => void;
  onStart: (route: Location[]) => void;
}

export default function RideRouteView({
  locations,
  orderedIds,
  onOrderedIdsChange,
  onBack,
  onStart,
}: Props) {
  const isSelected = (id: string) => orderedIds.includes(id);
  const getOrderNum = (id: string) => orderedIds.indexOf(id) + 1;

  const handleToggle = (id: string) => {
    if (isSelected(id)) {
      onOrderedIdsChange(orderedIds.filter((r) => r !== id));
    } else {
      onOrderedIdsChange([...orderedIds, id]);
    }
  };

  const handleStart = () => {
    const route = orderedIds
      .map((id) => locations.find((l) => l.id === id))
      .filter((l): l is Location => !!l);
    onStart(route);
  };

  const routeLocations = orderedIds
    .map((id) => locations.find((l) => l.id === id))
    .filter((l): l is Location => !!l);

  return (
    <div className={styles.wrapper}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={onBack} id="route-back-btn">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h2 className={styles.topTitle}>라이드 경로 설정</h2>
        <div style={{ width: 40 }} />
      </div>

      {/* Route preview strip */}
      <div className={styles.previewStrip}>
        {routeLocations.length === 0 ? (
          <p className={styles.previewEmpty}>아래 주소를 순서대로 클릭해서 경로를 설정하세요</p>
        ) : (
          <div className={styles.previewRoute}>
            {routeLocations.map((loc, i) => (
              <span key={loc.id} className={styles.previewItem}>
                {i > 0 && <span className={styles.previewArrow}>→</span>}
                <span className={styles.previewName}>{loc.nickname}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Address list */}
      <div className={styles.list}>
        <div className="section-title">저장된 주소 ({locations.length})</div>
        {locations.map((loc) => {
          const selected = isSelected(loc.id);
          const orderNum = selected ? getOrderNum(loc.id) : null;
          return (
            <button
              key={loc.id}
              className={`${styles.item} ${selected ? styles.itemSelected : ""}`}
              onClick={() => handleToggle(loc.id)}
              id={`route-item-${loc.id}`}
            >
              <div className={`${styles.orderBadge} ${selected ? styles.orderBadgeActive : ""}`}>
                {selected ? orderNum : ""}
              </div>
              <div className={styles.itemInfo}>
                <div className={styles.itemNick}>{loc.nickname}</div>
                <div className={styles.itemAddr}>{loc.address}</div>
              </div>
              {selected && (
                <div className={styles.checkIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom start button */}
      <div className={styles.bottomBar}>
        <div className={styles.bottomInfo}>
          {orderedIds.length > 0 ? (
            <span className={styles.bottomCount}>{orderedIds.length}개 경유지 선택됨</span>
          ) : (
            <span className={styles.bottomHint}>경유지를 선택해주세요</span>
          )}
        </div>
        <button
          className={`btn btn-primary ${styles.startBtn}`}
          onClick={handleStart}
          disabled={orderedIds.length === 0}
          id="start-ride-btn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
          라이드 시작
        </button>
      </div>
    </div>
  );
}
