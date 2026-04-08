"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { Location } from "@/types";
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
}: Props) {
  const [focusedId, setFocusedId] = useState<string | null>(null);
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

  const { isLoaded, loadError } = useJsApiLoader({
    id: "ride-route-map",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: ["places"],
  });

  const isSelected = (id: string) => orderedIds.includes(id);
  const getOrderNum = (id: string) => orderedIds.indexOf(id) + 1;

  /** 마지막으로 누른 행 (목록에 없어지면 무시, 첫 주소로 대체하지 않음) */
  const effectiveFocusId =
    focusedId != null && locations.some((l) => l.id === focusedId)
      ? focusedId
      : null;

  const handleToggle = (id: string) => {
    if (isSelected(id)) {
      onOrderedIdsChange(orderedIds.filter((r) => r !== id));
    } else {
      const prev = loadAddressPickCounts(userId);
      saveAddressPickCounts(userId, {
        ...prev,
        [id]: (prev[id] ?? 0) + 1,
      });
      onOrderedIdsChange([...orderedIds, id]);
    }
  };

  const handleRowClick = (id: string) => {
    setFocusedId(id);
    handleToggle(id);
  };

  const handlePickRider = () => {
    if (orderedIds.length === 0) return;
    onPickRider();
  };

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

  const renderAddressRow = (loc: Location) => {
    const selected = isSelected(loc.id);
    const orderNum = selected ? getOrderNum(loc.id) : null;
    const isFocused = effectiveFocusId === loc.id;
    const genderClass =
      loc.gender === "male"
        ? styles.itemMale
        : loc.gender === "female"
          ? styles.itemFemale
          : "";

    return (
      <button
        key={loc.id}
        type="button"
        className={`${styles.item} ${genderClass} ${selected ? styles.itemSelected : ""} ${isFocused ? styles.itemFocused : ""}`}
        onClick={() => handleRowClick(loc.id)}
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
        <div className={styles.scheduleBanner} id="route-schedule-summary">
          {scheduleSummary}
        </div>
      ) : null}

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
                  ) : (
                    fixedLocs.map(renderAddressRow)
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
                  ) : (
                    tempLocs.map(renderAddressRow)
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
