"use client";
import { useState, useEffect, useCallback } from "react";
import { signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Location, RecentRide } from "@/types";
import {
  getUserLocations,
  addUserLocation,
  deleteUserLocation,
  updateUserLocation,
  getRecentRides,
  saveRecentRide,
} from "@/lib/firestore";
import { openGoogleMapsDirections } from "@/lib/googleMapsUrls";
import AddAddressView from "./AddAddressView";
import ManageAddressesView from "./ManageAddressesView";
import RecentRidesView from "./RecentRidesView";
import RideRouteView from "./RideRouteView";
import RideActive from "./RideActive";
import Script from "next/script";
import styles from "./MainApp.module.css";

type View = "home" | "register" | "manage" | "route" | "recentRides" | "navigate";

interface Props {
  user: User;
}

export default function MainApp({ user }: Props) {
  const [view, setView] = useState<View>("home");
  const [locations, setLocations] = useState<Location[]>([]);
  /** 라이드 경로 설정에서 선택한 주소 ID 순서 (라이드 중단 후에도 유지) */
  const [routeSelectionIds, setRouteSelectionIds] = useState<string[]>([]);
  const [recentRides, setRecentRides] = useState<RecentRide[]>([]);

  const fetchLocations = useCallback(async () => {
    const data = await getUserLocations(user.uid);
    setLocations(data);
  }, [user.uid]);

  const fetchRecentRides = useCallback(async () => {
    const rides = await getRecentRides(user.uid);
    setRecentRides(rides);
  }, [user.uid]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    fetchRecentRides();
  }, [fetchRecentRides]);

  useEffect(() => {
    const valid = new Set(locations.map((l) => l.id));
    setRouteSelectionIds((prev) => prev.filter((id) => valid.has(id)));
  }, [locations]);

  const handleAddAddress = async (data: Omit<Location, "id">) => {
    await addUserLocation(user.uid, data);
    await fetchLocations();
    setView("home");
  };

  const handleDeleteAddress = async (id: string) => {
    await deleteUserLocation(user.uid, id);
    setLocations((prev) => prev.filter((l) => l.id !== id));
  };

  const handleUpdateAddress = async (id: string, updates: Partial<Omit<Location, "id">>) => {
    await updateUserLocation(user.uid, id, updates);
    await fetchLocations();
  };

  const handleStartRide = (route: Location[]) => {
    openGoogleMapsDirections(route);
    setView("navigate");
    void (async () => {
      try {
        await saveRecentRide(user.uid, route);
      } catch (err) {
        console.error("라이드 저장 실패:", err);
      }
      await fetchRecentRides();
    })();
  };

  const handlePickPastRide = (orderedLocationIds: string[]) => {
    setRouteSelectionIds(orderedLocationIds);
    setView("route");
  };

  if (view === "register") {
    return (
      <>
        <Script src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`} strategy="afterInteractive" />
        <AddAddressView onBack={() => setView("home")} onSave={handleAddAddress} />
      </>
    );
  }
  if (view === "manage") {
    return (
      <ManageAddressesView
        locations={locations}
        onBack={() => setView("home")}
        onDelete={handleDeleteAddress}
        onUpdate={handleUpdateAddress}
      />
    );
  }
  if (view === "recentRides") {
    return (
      <RecentRidesView
        locations={locations}
        recentRides={recentRides}
        onBack={() => setView("home")}
        onPickRide={handlePickPastRide}
      />
    );
  }
  if (view === "route") {
    return (
      <RideRouteView
        locations={locations}
        orderedIds={routeSelectionIds}
        onOrderedIdsChange={setRouteSelectionIds}
        onBack={() => {
          setRouteSelectionIds([]);
          setView("home");
        }}
        onStart={handleStartRide}
      />
    );
  }
  if (view === "navigate") {
    return (
      <RideActive
        onBackToMain={() => {
          setRouteSelectionIds([]);
          setView("home");
        }}
      />
    );
  }

  /* ── Home screen ── */
  const handleLogout = async () => {
    if (confirm("로그아웃 하시겠습니까?")) {
      await signOut(auth);
    }
  };

  return (
    <div className={styles.screen}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.appBrand}>
          <div className={styles.brandIcon}>
            <svg width="20" height="20" viewBox="0 0 64 64" fill="none">
              <rect width="64" height="64" rx="14" fill="url(#g1)"/>
              <path d="M14 38h36M18 38l4-10h20l4 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="22" cy="42" r="3" fill="white"/>
              <circle cx="42" cy="42" r="3" fill="white"/>
              <path d="M40 24V16M36 20h8" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#1a56db"/>
                  <stop offset="1" stopColor="#60a5fa"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className={styles.brandName}>Ride Helper</span>
        </div>
        <div className={styles.userArea}>
          {user.photoURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.avatar} src={user.photoURL} alt="profile" referrerPolicy="no-referrer" />
          )}
          <button className={styles.logoutBtn} onClick={handleLogout} id="logout-btn">
            로그아웃
          </button>
        </div>
      </div>

      {/* Greeting */}
      <div className={styles.greeting}>
        <p className={styles.greetingText}>안녕하세요, {user.displayName?.split(" ")[0] ?? "팀원"}님 👋</p>
        <p className={styles.greetingSubText}>오늘도 안전한 라이드 되세요</p>
      </div>

      {/* Cards */}
      <div className={styles.cards}>
        {/* 주소 등록 */}
        <div className={styles.cardRow}>
          <button
            className={styles.card}
            onClick={() => setView("register")}
            id="register-address-btn"
          >
            <div className={styles.cardIconWrap} style={{ background: "rgba(59,130,246,0.15)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.cardTitle}>주소 등록</div>
              <div className={styles.cardSub}>
                {locations.length > 0 ? `${locations.length}개 저장됨` : "자주 가는 주소를 추가해요"}
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.cardArrow}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          <button
            className={styles.gearBtn}
            onClick={() => setView("manage")}
            id="manage-addresses-btn"
            aria-label="주소 관리"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            {locations.length > 0 && (
              <span className={styles.gearBadge}>{locations.length}</span>
            )}
          </button>
        </div>

        {/* 라이드 경로 설정 */}
        <button
          className={`${styles.card} ${styles.cardFull} ${locations.length === 0 ? styles.cardDisabled : ""}`}
          onClick={() => {
            if (locations.length === 0) return;
            setRouteSelectionIds([]);
            setView("route");
          }}
          id="ride-route-btn"
        >
          <div className={styles.cardIconWrap} style={{ background: "rgba(139,92,246,0.15)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h18M3 6h18M3 18h18"/>
            </svg>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.cardTitle}>라이드 경로 설정</div>
            <div className={styles.cardSub}>
              {locations.length === 0 ? "주소를 먼저 등록해주세요" : "목적지를 순서대로 선택해요"}
            </div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.cardArrow}>
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        {/* 이전 라이드 */}
        <button
          className={`${styles.card} ${styles.cardFull}`}
          onClick={() => setView("recentRides")}
          id="recent-rides-btn"
          type="button"
        >
          <div className={styles.cardIconWrap} style={{ background: "rgba(16,185,129,0.12)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.cardTitle}>이전 라이드</div>
            <div className={styles.cardSub}>
              {recentRides.length === 0
                ? "라이드 시작 시 경로가 여기에 저장돼요"
                : `최근 ${recentRides.length}건 · 불러와서 그대로 갈 수 있어요`}
            </div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.cardArrow}>
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        {/* 구글맵 내비게이션 연동 */}
        <div className={`${styles.card} ${styles.cardFull} ${styles.cardInactive}`}>
          <div className={styles.cardIconWrap} style={{ background: "rgba(255,255,255,0.05)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.cardTitle} style={{ color: "var(--text-muted)" }}>구글맵 내비게이션 연동</div>
            <div className={styles.cardSub}>경로 설정 후 자동 연동됩니다</div>
          </div>
        </div>
      </div>
    </div>
  );
}
