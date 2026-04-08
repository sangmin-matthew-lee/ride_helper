"use client";
import { useState } from "react";
import { Vehicle } from "@/types";
import styles from "./AddVehicleView.module.css";

interface Props {
  onBack: () => void;
  onSave: (data: Omit<Vehicle, "id">) => Promise<void>;
  checkNameDuplicate: (name: string) => Promise<boolean>;
}

export default function AddVehicleView({ onBack, onSave, checkNameDuplicate }: Props) {
  const [name, setName] = useState("");
  const [brandModel, setBrandModel] = useState("");
  const [maxPassengers, setMaxPassengers] = useState("");
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const handleSave = async () => {
    const n = name.trim();
    const bm = brandModel.trim();
    const mp = parseInt(maxPassengers, 10);
    if (!n) return;
    if (!bm) return;
    if (!Number.isFinite(mp) || mp < 1) return;

    setNameError(null);
    const taken = await checkNameDuplicate(n);
    if (taken) {
      setNameError("같은 이름의 차량이 있어요");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: n,
        brandModel: bm,
        maxPassengers: mp,
        createdAt: Date.now(),
      });
    } finally {
      setSaving(false);
    }
  };

  const mpNum = parseInt(maxPassengers, 10);
  const valid =
    name.trim() &&
    brandModel.trim() &&
    Number.isFinite(mpNum) &&
    mpNum >= 1;

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <button type="button" className={styles.backBtn} onClick={onBack} id="add-vehicle-back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h2 className={styles.topTitle}>운행 차량 등록</h2>
        <div style={{ width: 40 }} />
      </div>

      <div className={styles.content}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="vehicle-name">
            이름
          </label>
          <input
            id="vehicle-name"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 팀 미니밴"
            autoComplete="off"
          />
          {nameError ? <p className={styles.fieldError}>{nameError}</p> : null}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="vehicle-brand">
            차량 브랜드 및 모델명
          </label>
          <input
            id="vehicle-brand"
            className={styles.input}
            value={brandModel}
            onChange={(e) => setBrandModel(e.target.value)}
            placeholder="예: Toyota Sienna"
            autoComplete="off"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="vehicle-max">
            최대 탑승 인원
          </label>
          <input
            id="vehicle-max"
            className={styles.input}
            type="number"
            inputMode="numeric"
            min={1}
            max={99}
            value={maxPassengers}
            onChange={(e) => setMaxPassengers(e.target.value)}
            placeholder="숫자"
          />
        </div>
      </div>

      <div className={styles.bottomBar}>
        <button
          type="button"
          className={`btn btn-primary ${styles.saveBtn}`}
          onClick={() => void handleSave()}
          disabled={!valid || saving}
          id="add-vehicle-save"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </div>
  );
}
