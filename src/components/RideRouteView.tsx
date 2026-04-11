"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { AnimatePresence, motion } from "framer-motion";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { Location, RideDayPeriod } from "@/types";
import { formatRideSlotSummaryLine } from "@/lib/datetime";
import schedStyles from "./RideScheduleView.module.css";
import { loadAddressPickCounts, saveAddressPickCounts } from "@/lib/addressPickCounts";
import styles from "./RideRouteView.module.css";

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };

interface Props {
  locations: Location[];
  /** 클릭 순서대로 선택된 주소 ID (부모에서 보관해 라이드 중단 후에도 복원) */
  orderedIds: string[];
  onOrderedIdsChange: (ids: string[]) => void;
  onBack: () => void;
  /** 다음 화면(라이더 선택)으로 이동 */
  onPickRider: () => void;
  /** 자주 고른 주소 정렬용 (localStorage 키) */
  userId: string;
  /** 라이드 일정(날짜·오전/오후) 요약 문구 */
  scheduleSummary?: string;
  rideDateKey?: string;
  ridePeriod?: RideDayPeriod;
  onRideDateKeyChange?: (dateKey: string) => void;
  onRidePeriodChange?: (period: RideDayPeriod) => void;
}

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

export default function RideRouteView({
  locations,
  orderedIds,
  onOrderedIdsChange,
  onBack,
  onPickRider,
  userId,
  scheduleSummary,
  rideDateKey,
  ridePeriod,
  onRideDateKeyChange,
  onRidePeriodChange,
}: Props) {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [fixedOpen, setFixedOpen] = useState(true);
  const [tempOpen, setTempOpen] = useState(true);
  const [pickCounts, setPickCounts] = useState<Record<string, number>>({});
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    setPickCounts(loadAddressPickCounts(userId));
  }, [userId]);

  const sortLocsByPickCount = useCallback((locs: Location[]) => {
    return [...locs].sort((a, b) => {
      const ca = pickCounts[a.id] ?? 0;
      const cb = pickCounts[b.id] ?? 0;
      if (cb !== ca) return cb - ca;
      return a.createdAt - b.createdAt;
    });
  }, [pickCounts]);

  const fixedLocs = useMemo(
    () =>
      sortLocsByPickCount(
        locations.filter((l) => (l.group ?? "fixed") !== "temporary")
      ),
    [locations, sortLocsByPickCount]
  );
  const tempLocs = useMemo(
    () =>
      sortLocsByPickCount(locations.filter((l) => l.group === "temporary")),
    [locations, sortLocsByPickCount]
  );

  const fixedLocsPickable = useMemo(
    () => fixedLocs.filter((l) => !orderedIds.includes(l.id)),
    [fixedLocs, orderedIds]
  );
  const tempLocsPickable = useMemo(
    () => tempLocs.filter((l) => !orderedIds.includes(l.id)),
    [tempLocs, orderedIds]
  );

  const { isLoaded, loadError } = useJsApiLoader({
    id: "ride-route-map",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: ["places"],
  });

  /** 마지막으로 누른 행 (목록에 없어지면 무시, 첫 주소로 대체하지 않음) */
  const effectiveFocusId =
    focusedId != null && locations.some((l) => l.id === focusedId)
      ? focusedId
      : null;

  const handleAddFromList = (id: string) => {
    if (orderedIds.includes(id)) return;
    setFocusedId(id);
    const prev = loadAddressPickCounts(userId);
    saveAddressPickCounts(userId, {
      ...prev,
      [id]: (prev[id] ?? 0) + 1,
    });
    onOrderedIdsChange([...orderedIds, id]);
  };

  const handlePreviewDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const next = Array.from(orderedIds);
    const [removed] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, removed);
    onOrderedIdsChange(next);
  };

  const removeFromRoute = (id: string) => {
    onOrderedIdsChange(orderedIds.filter((x) => x !== id));
  };

  const handlePickRider = () => {
    if (orderedIds.length === 0) return;
    onPickRider();
  };

  const scheduleEditable =
    rideDateKey != null &&
    ridePeriod != null &&
    onRideDateKeyChange != null &&
    onRidePeriodChange != null;

  const routeLocations = orderedIds
    .map((id) => locations.find((l) => l.id === id))
    .filter((l): l is Location => !!l);

  const fitMapToPoints = useCallback(
    (map: google.maps.Map) => {
      if (locations.length === 0) return;
      const pts =
        orderedIds.length > 0
          ? orderedIds
              .map((id) => locations.find((l) => l.id === id))
              .filter((l): l is Location => !!l)
          : locations;
      if (pts.length === 0) return;
      const bounds = new google.maps.LatLngBounds();
      pts.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
      map.fitBounds(bounds, 56);
    },
    [locations, orderedIds]
  );

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      requestAnimationFrame(() => fitMapToPoints(map));
    },
    [fitMapToPoints]
  );

  const onMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const map = mapRef.current;
    if (!map || locations.length === 0) return;
    const id = requestAnimationFrame(() => fitMapToPoints(map));
    return () => cancelAnimationFrame(id);
  }, [isLoaded, fitMapToPoints, locations.length]);

  const listMotion = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -28 },
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
  };

  const renderPickableRow = (loc: Location) => {
    const isFocused = effectiveFocusId === loc.id;
    const genderClass =
      loc.gender === "male"
        ? styles.itemMale
        : loc.gender === "female"
          ? styles.itemFemale
          : "";

    return (
      <button
        type="button"
        className={`${styles.item} ${genderClass} ${isFocused ? styles.itemFocused : ""}`}
        onClick={() => handleAddFromList(loc.id)}
        id={`route-item-${loc.id}`}
      >
        <div className={styles.orderBadge} />
        <div className={styles.itemInfo}>
          <div className={styles.itemNick}>{loc.nickname}</div>
          <div className={styles.itemAddr}>{loc.address}</div>
        </div>
      </button>
    );
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={onBack} id="route-back-btn">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h2 className={styles.topTitle}>라이드 구성</h2>
        <div style={{ width: 40 }} />
      </div>

      {scheduleSummary ? (
        scheduleEditable ? (
          <button
            type="button"
            className={styles.scheduleBannerButton}
            id="route-schedule-summary"
            onClick={() => setScheduleModalOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={scheduleModalOpen}
            aria-label="라이드 일정 변경"
          >
            {scheduleSummary}
          </button>
        ) : (
          <div className={styles.scheduleBanner} id="route-schedule-summary">
            {scheduleSummary}
          </div>
        )
      ) : null}

      {scheduleModalOpen && scheduleEditable ? (
        <div
          className={styles.scheduleModalBackdrop}
          role="presentation"
          onClick={() => setScheduleModalOpen(false)}
        >
          <div
            className={styles.scheduleModalPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="route-schedule-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.scheduleModalHeader}>
              <h3 className={styles.scheduleModalTitle} id="route-schedule-modal-title">
                라이드 일정
              </h3>
              <button
                type="button"
                className={styles.scheduleModalClose}
                onClick={() => setScheduleModalOpen(false)}
                id="route-schedule-modal-close"
              >
                {"\uB2EB\uAE30"}
              </button>
            </div>
            <p className={schedStyles.lead} style={{ marginBottom: 4 }}>
              {"\uB0A0\uC9DC\uC640 \uC624\uC804\u00B7\uC624\uD6C4\uB97C \uBC14\uAFC0 \uC218 \uC788\uC5B4\uC694."}
            </p>
            <div className={schedStyles.fieldBlock}>
              <span className={schedStyles.fieldLabel}>{"\uB0A0\uC9DC"}</span>
              <input
                type="date"
                className={schedStyles.dateInput}
                value={rideDateKey}
                onChange={(e) => onRideDateKeyChange(e.target.value)}
                id="route-modal-schedule-date"
              />
            </div>
            <div className={schedStyles.fieldBlock}>
              <span className={schedStyles.fieldLabel}>오전 / 오후</span>
              <div className={schedStyles.periodRow}>
                <button
                  type="button"
                  className={`${schedStyles.periodBtn} ${ridePeriod === "am" ? schedStyles.periodBtnActive : ""}`}
                  onClick={() => onRidePeriodChange("am")}
                  id="route-modal-schedule-am"
                >
                  오전
                </button>
                <button
                  type="button"
                  className={`${schedStyles.periodBtn} ${ridePeriod === "pm" ? schedStyles.periodBtnActive : ""}`}
                  onClick={() => onRidePeriodChange("pm")}
                  id="route-modal-schedule-pm"
                >
                  오후
                </button>
              </div>
            </div>
            <div className={schedStyles.previewCard}>
              <div className={schedStyles.previewLabel}>선택한 일정</div>
              <div className={schedStyles.previewValue}>
                {formatRideSlotSummaryLine(rideDateKey, ridePeriod)}
              </div>
            </div>
            <button
              type="button"
              className={`btn btn-primary ${styles.scheduleModalDone}`}
              onClick={() => setScheduleModalOpen(false)}
              id="route-schedule-modal-done"
            >
              확인
            </button>
          </div>
        </div>
      ) : null}

      <div className={styles.previewStrip}>
        {routeLocations.length === 0 ? (
          <p className={styles.previewEmpty}>
            아래에서 주소를 클릭해 추가하고, 위 칩을 드래그해 순서를 바꿀 수 있어요
          </p>
        ) : (
          <DragDropContext onDragEnd={handlePreviewDragEnd}>
            <Droppable droppableId="route-preview" direction="horizontal">
              {(dropProvided) => (
                <div
                  ref={dropProvided.innerRef}
                  {...dropProvided.droppableProps}
                  className={styles.previewRoute}
                >
                  {routeLocations.map((loc, index) => (
                    <Draggable key={loc.id} draggableId={loc.id} index={index}>
                      {(dragProvided, snapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={`${styles.previewItem} ${snapshot.isDragging ? styles.previewItemDragging : ""}`}
                        >
                          {index > 0 ? (
                            <span className={styles.previewArrow} aria-hidden>
                              →
                            </span>
                          ) : null}
                          <span
                            className={styles.previewChipWrap}
                            {...dragProvided.dragHandleProps}
                          >
                            <span className={styles.previewName}>{loc.nickname}</span>
                            <button
                              type="button"
                              className={styles.previewRemove}
                              aria-label={`${loc.nickname} 경로에서 제거`}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromRoute(loc.id);
                              }}
                            >
                              ×
                            </button>
                          </span>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {dropProvided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.listPane}>
          <div className="section-title">저장된 주소 ({locations.length})</div>
          <p className={styles.listSortHint}>
            자주 경로에 넣은 주소가 위로 올라와요 (이 기기·계정 기준)
          </p>
          <div className={styles.listColumns}>
            <div className={styles.listColumn}>
              <button
                type="button"
                className={`${styles.sectionHeader} ${styles.sectionHeaderFixed}`}
                onClick={() => setFixedOpen((o) => !o)}
                aria-expanded={fixedOpen}
                aria-controls="route-group-fixed"
                id="route-toggle-fixed"
              >
                <span className={styles.sectionHeaderLabel}>고정 ({fixedLocs.length})</span>
                <span className={styles.sectionHeaderRight}>
                  <span className={styles.sectionToggleText}>{fixedOpen ? "접기" : "펼치기"}</span>
                  <svg
                    className={`${styles.sectionChevron} ${fixedOpen ? "" : styles.sectionChevronCollapsed}`}
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </button>
              {fixedOpen ? (
                <div className={styles.listColumnScroll} id="route-group-fixed" role="region" aria-labelledby="route-toggle-fixed">
                  {fixedLocs.length === 0 ? (
                    <p className={styles.columnEmpty}>고정 주소 없음</p>
                  ) : fixedLocsPickable.length === 0 ? (
                    <p className={styles.columnEmpty}>고정 주소는 모두 경로에 포함되어 있어요</p>
                  ) : (
                    <AnimatePresence initial={false} mode="popLayout">
                      {fixedLocsPickable.map((loc) => (
                        <motion.div key={loc.id} layout {...listMotion}>
                          {renderPickableRow(loc)}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              ) : null}
            </div>

            <div className={styles.listColumn}>
              <button
                type="button"
                className={`${styles.sectionHeader} ${styles.sectionHeaderTemp}`}
                onClick={() => setTempOpen((o) => !o)}
                aria-expanded={tempOpen}
                aria-controls="route-group-temp"
                id="route-toggle-temp"
              >
                <span className={styles.sectionHeaderLabel}>임시 ({tempLocs.length})</span>
                <span className={styles.sectionHeaderRight}>
                  <span className={styles.sectionToggleText}>{tempOpen ? "접기" : "펼치기"}</span>
                  <svg
                    className={`${styles.sectionChevron} ${tempOpen ? "" : styles.sectionChevronCollapsed}`}
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </button>
              {tempOpen ? (
                <div className={styles.listColumnScroll} id="route-group-temp" role="region" aria-labelledby="route-toggle-temp">
                  {tempLocs.length === 0 ? (
                    <p className={styles.columnEmpty}>임시 주소 없음</p>
                  ) : tempLocsPickable.length === 0 ? (
                    <p className={styles.columnEmpty}>임시 주소는 모두 경로에 포함되어 있어요</p>
                  ) : (
                    <AnimatePresence initial={false} mode="popLayout">
                      {tempLocsPickable.map((loc) => (
                        <motion.div key={loc.id} layout {...listMotion}>
                          {renderPickableRow(loc)}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className={styles.mapPane}>
          {loadError ? (
            <div className={styles.mapFallback}>
              지도를 불러올 수 없습니다. API 키를 확인해 주세요.
            </div>
          ) : !isLoaded ? (
            <div className={styles.mapFallback}>
              <div className="spinner" />
              <span>지도 로딩 중…</span>
            </div>
          ) : (
            <GoogleMap
              mapContainerClassName={styles.mapInner}
              center={DEFAULT_CENTER}
              zoom={11}
              options={mapOptions}
              onLoad={onMapLoad}
              onUnmount={onMapUnmount}
            >
              {routeLocations.map((loc, i) => (
                <Marker
                  key={loc.id}
                  position={{ lat: loc.lat, lng: loc.lng }}
                  title={`${i + 1}. ${loc.nickname}`}
                  label={{
                    text: String(i + 1),
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "700",
                  }}
                />
              ))}
            </GoogleMap>
          )}
          <p className={styles.mapHint}>
            선택한 경유지마다 핀이 남고, 순서대로 번호가 붙어요
          </p>
        </div>
      </div>

      <div className={styles.bottomBar}>
        <div className={styles.bottomInfo}>
          {orderedIds.length > 0 ? (
            <span className={styles.bottomCount}>{orderedIds.length}개 경유지 선택됨</span>
          ) : (
            <span className={styles.bottomHint}>경유지를 선택해주세요</span>
          )}
        </div>
        <button
          type="button"
          className={`btn btn-primary ${styles.pickRiderBtn}`}
          onClick={handlePickRider}
          disabled={orderedIds.length === 0}
          id="ride-pick-rider-btn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          라이더 선택
        </button>
      </div>
    </div>
  );
}
