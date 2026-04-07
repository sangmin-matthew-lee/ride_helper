"use client";
import { useState, useRef, useEffect } from "react";
import { Location } from "@/types";
import { motion } from "framer-motion";
import styles from "./AddressModal.module.css";

interface Props {
  onClose: () => void;
  onSave: (data: Omit<Location, "id">) => void;
}

declare global {
  interface Window {
    google: typeof google;
  }
}

export default function AddressModal({ onClose, onSave }: Props) {
  const [nickname, setNickname] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!inputRef.current || !window.google) return;
    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      { fields: ["geometry", "formatted_address"] }
    );
    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace();
      if (place?.geometry?.location) {
        setLat(place.geometry.location.lat());
        setLng(place.geometry.location.lng());
        setAddress(place.formatted_address ?? "");
      }
    });
  }, []);

  const handleSave = async () => {
    if (!nickname.trim() || !address.trim() || lat === null || lng === null) return;
    setSaving(true);
    await onSave({
      nickname: nickname.trim(),
      address,
      lat,
      lng,
      createdAt: Date.now(),
    });
    setSaving(false);
  };

  const isValid = nickname.trim() && address.trim() && lat !== null && lng !== null;

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className={styles.modal}
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className={styles.header}>
          <h3>새 주소 추가</h3>
          <button className={styles.closeBtn} onClick={onClose} id="close-address-modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <label className={styles.label}>별명 *</label>
            <input
              className="input"
              placeholder="예: 아카집, 루떠집, 교회..."
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              id="location-nickname"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>주소 검색 *</label>
            <input
              ref={inputRef}
              className="input"
              placeholder="주소를 입력하세요"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setLat(null);
                setLng(null);
              }}
              id="location-address"
            />
            {address && lat === null && (
              <p className={styles.hint}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                드롭다운에서 주소를 선택해주세요
              </p>
            )}
            {lat !== null && (
              <p className={styles.hintSuccess}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>
                위치 확인됨
              </p>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button className="btn btn-secondary" onClick={onClose} id="cancel-address-btn">취소</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!isValid || saving}
            id="save-address-btn"
          >
            {saving ? (
              <span className={styles.miniSpinner} />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>
            )}
            저장
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
