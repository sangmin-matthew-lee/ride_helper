"use client";
import { useState, useRef, useEffect } from "react";
import { Location } from "@/types";
import { motion } from "framer-motion";
import styles from "./AddAddressView.module.css";

interface Props {
  onBack: () => void;
  onSave: (data: Omit<Location, "id">) => Promise<void>;
}

export default function AddAddressView({ onBack, onSave }: Props) {
  const [nickname, setNickname] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Wait for Google Maps to be available
  useEffect(() => {
    const check = () => {
      if (typeof window !== "undefined" && window.google?.maps?.places) {
        setMapsReady(true);
      } else {
        setTimeout(check, 300);
      }
    };
    check();
  }, []);

  // Init autocomplete once maps is ready and input is rendered
  useEffect(() => {
    if (!mapsReady || !inputRef.current || autocompleteRef.current) return;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      { fields: ["geometry", "formatted_address", "name"] }
    );

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace();
      if (place?.geometry?.location) {
        setLat(place.geometry.location.lat());
        setLng(place.geometry.location.lng());
        setAddress(place.formatted_address ?? place.name ?? "");
      }
    });
  }, [mapsReady]);

  const handleSave = async () => {
    if (!nickname.trim() || !address || lat === null || lng === null) return;
    setSaving(true);
    try {
      await onSave({
        nickname: nickname.trim(),
        address,
        lat,
        lng,
        createdAt: Date.now(),
      });
    } finally {
      setSaving(false);
    }
  };

  const isValid = nickname.trim().length > 0 && lat !== null && lng !== null;

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={onBack} id="add-address-back-btn">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h2 className={styles.topTitle}>새 주소 추가</h2>
        <div style={{ width: 40 }} />
      </div>

      <div className={styles.content}>
        {/* Step 1: Address search */}
        <motion.div
          className={styles.step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className={styles.stepNum}>1</div>
          <div className={styles.stepBody}>
            <div className={styles.stepLabel}>주소 찾기</div>
            <p className={styles.stepDesc}>구글 맵에서 주소를 검색하세요</p>
            <div className={styles.searchWrap}>
              <div className={styles.searchIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
              <input
                ref={inputRef}
                className={styles.searchInput}
                placeholder={mapsReady ? "주소 또는 장소 이름 입력..." : "지도 로딩 중..."}
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setLat(null);
                  setLng(null);
                }}
                disabled={!mapsReady}
                id="address-search-input"
              />
              {address && (
                <button
                  className={styles.clearBtn}
                  onClick={() => { setAddress(""); setLat(null); setLng(null); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Status pill */}
            {lat !== null ? (
              <div className={styles.statusPill + " " + styles.statusOk}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>
                위치 확인됨
              </div>
            ) : address.length > 0 ? (
              <div className={styles.statusPill + " " + styles.statusWarn}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
                드롭다운에서 주소를 선택해주세요
              </div>
            ) : null}
          </div>
        </motion.div>

        <div className={styles.stepDivider} />

        {/* Step 2: Nickname */}
        <motion.div
          className={`${styles.step} ${lat === null ? styles.stepDisabled : ""}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className={`${styles.stepNum} ${lat !== null ? styles.stepNumActive : ""}`}>2</div>
          <div className={styles.stepBody}>
            <div className={styles.stepLabel}>이름 붙이기</div>
            <p className={styles.stepDesc}>이 주소의 별명을 정해요</p>
            <div className={styles.nickSuggestions}>
              {["루떠집", "아카집", "교회", "학교", "직장"].map((s) => (
                <button
                  key={s}
                  className={`${styles.suggestionChip} ${nickname === s ? styles.suggestionActive : ""}`}
                  onClick={() => setNickname(s)}
                  disabled={lat === null}
                  id={`suggest-${s}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <input
              className={styles.nickInput}
              placeholder="직접 입력 (예: 자바집, 서재집...)"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              disabled={lat === null}
              id="address-nickname-input"
            />
          </div>
        </motion.div>
      </div>

      {/* Save button */}
      <motion.div
        className={styles.bottomBar}
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <button
          className={`btn btn-primary ${styles.saveBtn}`}
          onClick={handleSave}
          disabled={!isValid || saving}
          id="save-address-btn"
        >
          {saving ? (
            <span className={styles.spinner} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>
          )}
          {saving ? "저장 중..." : "저장하기"}
        </button>
      </motion.div>
    </div>
  );
}
