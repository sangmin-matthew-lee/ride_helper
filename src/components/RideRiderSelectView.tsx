"use client";
import { useState, useEffect } from "react";
import { Location, Rider, Vehicle } from "@/types";
import { motion } from "framer-motion";
import styles from "./RideRiderSelectView.module.css";

interface Props {
  route: Location[];
  riders: Rider[];
  /** 탑승 인원에 맞는 차량만 (최대 탑승 ≥ 탑승 인원) */
  eligibleVehicles: Vehicle[];
  /** 등록된 차량 수(조건 미달 안내용) */
  vehicleRegisteredCount: number;
  /** 탑승 인원 = 선택된 주소 수 − 1 */
  passengerCount: number;
  /** 같은 날·같은 오전/오후에 이미 배정된 라이더 id */
  busyRiderIds: string[];
  /** 같은 날·같은 오전/오후에 이미 배정된 차량 id */
  busyVehicleIds: string[];
  /** 상단에 표시할 일정 요약 */
  slotSummaryLine: string;
  /** 라이드 현황에서 들어온 경우 기존 선택(초기값) */
  initialRiderId?: string;
  initialVehicleId?: string;
  onBack: () => void;
  /** 선택된 경로로 구글맵 열기 + 최근 라이드 저장 (기존 라이드 시작과 동일) */
  onStartRide: (route: Location[], rider: Rider, vehicle: Vehicle | null) => void;
  /** 경로 링크 + 방문지 정보 공유 + 이전 라이드에 저장 */
  onShare: (route: Location[], rider: Rider | null, vehicle: Vehicle | null) => void | Promise<void>;
  /** 메인(처음) 화면으로 이동 — 경로 선택 초기화 */
  onGoHome: () => void;
}

export default function RideRiderSelectView({
  route,
  riders,
  eligibleVehicles,
  vehicleRegisteredCount,
  passengerCount,
  busyRiderIds,
  busyVehicleIds,
  slotSummaryLine,
  initialRiderId,
  initialVehicleId,
  onBack,
  onStartRide,
  onShare,
  onGoHome,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(initialRiderId ?? null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    initialVehicleId ?? null
  );

  const selectedRider = selectedId ? riders.find((r) => r.id === selectedId) : null;
  const selectedVehicle = selectedVehicleId
    ? eligibleVehicles.find((v) => v.id === selectedVehicleId) ?? null
    : null;
  const needVehicle = eligibleVehicles.length > 0;

  const riderBusy = (id: string) => busyRiderIds.includes(id);
  const vehicleBusy = (id: string) => busyVehicleIds.includes(id);

  const selectedRiderOk =
    selectedRider != null && !riderBusy(selectedRider.id);

  const canStart =
    selectedRiderOk &&
    route.length > 0 &&
    (!needVehicle ||
      (selectedVehicle != null && !vehicleBusy(selectedVehicle.id)));

  useEffect(() => {
    if (selectedId && riderBusy(selectedId)) setSelectedId(null);
  }, [busyRiderIds, selectedId]);

  useEffect(() => {
    if (selectedVehicleId && vehicleBusy(selectedVehicleId)) setSelectedVehicleId(null);
  }, [busyVehicleIds, selectedVehicleId]);

  useEffect(() => {
    if (
      selectedVehicleId &&
      !eligibleVehicles.some((v) => v.id === selectedVehicleId)
    ) {
      setSelectedVehicleId(null);
    }
  }, [eligibleVehicles, selectedVehicleId, passengerCount]);

  const handleStart = () => {
    if (!canStart || !selectedRider) return;
    onStartRide(route, selectedRider, selectedVehicle);
  };

  const handleShare = () => {
    if (route.length === 0) return;
    void onShare(route, selectedRider ?? null, selectedVehicle);
  };

  const allRidersBusy = riders.length > 0 && riders.every((r) => riderBusy(r.id));

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <button type="button" className={styles.backBtn} onClick={onBack} id="rider-select-back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h2 className={styles.topTitle}>라이더 선택</h2>
        <div style={{ width: 40 }} />
      </div>

      <div className={styles.content}>
        <div className={styles.slotSummary}>{slotSummaryLine}</div>

        <div className="section-title">이번 라이드 경로 ({route.length}곳)</div>
        <div className={styles.routePreview}>
          {route.map((loc, i) => (
            <div key={loc.id} className={styles.routeChip}>
              <span className={styles.routeOrder}>{i + 1}</span>
              <span className={styles.routeName}>{loc.nickname}</span>
            </div>
          ))}
        </div>

        <div className={styles.passengerLine}>
          탑승 인원 <strong>{passengerCount}명</strong>
          <span className={styles.passengerHint}> (경유지 {route.length}곳 − 1)</span>
        </div>

        <div className="section-title">운행하는 라이더</div>

        {riders.length === 0 ? (
          <motion.div
            className={styles.emptyState}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={styles.emptyIcon}>👤</div>
            <p>등록된 라이더가 없어요</p>
            <p className={styles.emptyHint}>홈에서 라이더 등록 후 다시 시도해 주세요</p>
            <button type="button" className={`btn btn-secondary ${styles.emptyBack}`} onClick={onBack}>
              라이드 구성으로 돌아가기
            </button>
          </motion.div>
        ) : (
          <div className={styles.riderList}>
            {riders.map((r, i) => {
              const selected = selectedId === r.id;
              const busy = riderBusy(r.id);
              return (
                <motion.button
                  key={r.id}
                  type="button"
                  disabled={busy}
                  className={`${styles.riderCard} ${selected ? styles.riderCardSelected : ""} ${
                    busy ? styles.riderCardBusy : ""
                  } ${
                    r.gender === "male"
                      ? styles.riderCardMale
                      : r.gender === "female"
                        ? styles.riderCardFemale
                        : ""
                  }`}
                  onClick={() => !busy && setSelectedId(r.id)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  id={`rider-pick-${r.id}`}
                >
                  <div className={styles.riderAvatar}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <div className={styles.riderInfo}>
                    <span className={styles.riderName}>{r.nickname}</span>
                    {r.address?.trim() ? (
                      <span className={styles.riderAddr}>{r.address}</span>
                    ) : null}
                    {r.phone ? <span className={styles.riderPhone}>{r.phone}</span> : null}
                    {busy ? (
                      <span className={styles.assignedBadge}>라이드 배정됨</span>
                    ) : null}
                  </div>
                  <div className={`${styles.radio} ${selected ? styles.radioOn : ""} ${busy ? styles.radioDisabled : ""}`} aria-hidden />
                </motion.button>
              );
            })}
          </div>
        )}

        <div className="section-title">운행 차량</div>
        {vehicleRegisteredCount === 0 ? (
          <p className={styles.vehicleEmpty}>
            등록된 차량이 없어요. 홈에서 운행 차량 등록을 이용할 수 있어요.
          </p>
        ) : eligibleVehicles.length === 0 ? (
          <p className={styles.vehicleEmpty}>
            최대 탑승 인원이 탑승 인원({passengerCount}명) 이상인 차량만 선택할 수 있어요. 조건에 맞는 차량이
            없어요.
          </p>
        ) : (
          <div className={styles.vehicleList}>
            {eligibleVehicles.map((v, i) => {
              const selected = selectedVehicleId === v.id;
              const busy = vehicleBusy(v.id);
              return (
                <motion.button
                  key={v.id}
                  type="button"
                  disabled={busy}
                  className={`${styles.vehicleCard} ${selected ? styles.vehicleCardSelected : ""} ${
                    busy ? styles.vehicleCardBusy : ""
                  }`}
                  onClick={() => !busy && setSelectedVehicleId(v.id)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  id={`vehicle-pick-${v.id}`}
                >
                  <div className={styles.vehicleIcon}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                      <circle cx="7" cy="17" r="2"/>
                      <path d="M9 17h6"/>
                      <circle cx="17" cy="17" r="2"/>
                    </svg>
                  </div>
                  <div className={styles.vehicleInfo}>
                    <span className={styles.vehicleName}>{v.name}</span>
                    <span className={styles.vehicleMeta}>{v.brandModel}</span>
                    <span className={styles.vehicleMeta}>최대 {v.maxPassengers}명</span>
                    {busy ? (
                      <span className={styles.assignedBadge}>라이드 배정됨</span>
                    ) : null}
                  </div>
                  <div className={`${styles.radio} ${selected ? styles.radioOn : ""} ${busy ? styles.radioDisabled : ""}`} aria-hidden />
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      <div className={styles.bottomBar}>
        <div className={styles.bottomInfo}>
          {riders.length === 0 ? (
            <span className={styles.bottomHint}>라이더 등록이 필요해요</span>
          ) : allRidersBusy ? (
            <span className={styles.bottomHint}>이 시간대에 배정 가능한 라이더가 없어요</span>
          ) : !selectedId ? (
            <span className={styles.bottomHint}>라이더를 한 명 선택해 주세요</span>
          ) : selectedId && riderBusy(selectedId) ? (
            <span className={styles.bottomHint}>이미 배정된 라이더예요</span>
          ) : needVehicle && !selectedVehicle ? (
            <span className={styles.bottomHint}>운행 차량을 선택해 주세요</span>
          ) : needVehicle && selectedVehicleId && vehicleBusy(selectedVehicleId) ? (
            <span className={styles.bottomHint}>이미 배정된 차량이에요</span>
          ) : (
            <span className={styles.bottomOk}>라이더·차량 선택이 완료됐어요</span>
          )}
        </div>
        <div className={styles.bottomActions}>
          <button
            type="button"
            className={`btn btn-ghost ${styles.startBtn}`}
            onClick={handleStart}
            disabled={!canStart}
            id="rider-select-start-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
            라이드 시작
          </button>
          <button
            type="button"
            className={`btn btn-secondary ${styles.homeBtn}`}
            onClick={onGoHome}
            id="rider-select-home-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z"/>
            </svg>
            처음 화면
          </button>
          <button
            type="button"
            className={`btn btn-primary ${styles.shareBtn}`}
            onClick={handleShare}
            disabled={route.length === 0}
            id="rider-select-share-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <path d="M8.59 13.51 15.42 17.49M15.41 6.51 8.59 10.49"/>
            </svg>
            라이드 공유
          </button>
        </div>
      </div>
    </div>
  );
}
