"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserLocations, addUserLocation, deleteUserLocation, updateUserLocation } from "@/lib/firestore";
import { Location } from "@/types";
import AddAddressView from "./AddAddressView";
import ManageAddressesView from "./ManageAddressesView";
import styles from "./HomeTab.module.css";

type HomeView = "main" | "add" | "manage";

export default function HomeTab() {
  const { user } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<HomeView>("main");

  const fetchLocations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getUserLocations(user.uid);
      setLocations(data);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleAdd = async (data: Omit<Location, "id">) => {
    if (!user) return;
    await addUserLocation(user.uid, data);
    await fetchLocations();
    setView("main");
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    await deleteUserLocation(user.uid, id);
    setLocations((prev) => prev.filter((l) => l.id !== id));
  };

  const handleUpdate = async (id: string, updates: Partial<Omit<Location, "id">>) => {
    if (!user) return;
    await updateUserLocation(user.uid, id, updates);
    await fetchLocations();
  };

  if (view === "add") {
    return <AddAddressView onBack={() => setView("main")} onSave={handleAdd} />;
  }

  if (view === "manage") {
    return (
      <ManageAddressesView
        locations={locations}
        onBack={() => setView("main")}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
      />
    );
  }

  /* ── Main view ── */
  return (
    <div className={styles.mainWrapper}>
      <div className="page-container">
        <div className={styles.header}>
          <h1 className={styles.title}>홈</h1>
          <p className={styles.subtitle}>라이드 팀을 위한 경로 관리</p>
        </div>

        {/* Card row */}
        <div className={styles.cardRow}>
          <button
            className={styles.mainCard}
            onClick={() => setView("add")}
            id="add-address-card-btn"
            type="button"
          >
            <div className={styles.mainCardIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div className={styles.mainCardText}>
              <span className={styles.mainCardTitle}>자주 가는 주소 저장</span>
              <span className={styles.mainCardSub}>새 주소를 추가해요</span>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.mainCardArrow}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          {/* Gear button */}
          <button
            className={styles.gearBtn}
            onClick={() => setView("manage")}
            id="manage-addresses-btn"
            type="button"
            aria-label="주소 관리"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            {locations.length > 0 && (
              <span className={styles.gearBadge}>{locations.length}</span>
            )}
          </button>
        </div>

        {/* Saved addresses preview */}
        {loading ? (
          <div className={styles.skeletonList}>
            {[1, 2].map((i) => <div key={i} className={styles.skeleton} />)}
          </div>
        ) : locations.length > 0 ? (
          <div className={styles.previewSection}>
            <div className="section-title">저장된 주소 ({locations.length})</div>
            {locations.map((loc) => (
              <div key={loc.id} className={styles.previewCard}>
                <div className={styles.previewDot} />
                <div className={styles.previewInfo}>
                  <span className={styles.previewNick}>{loc.nickname}</span>
                  <span className={styles.previewAddr}>{loc.address}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyHint}>
            <p>위 버튼을 눌러 자주 가는 주소를 등록해보세요 📍</p>
          </div>
        )}
      </div>
    </div>
  );
}
