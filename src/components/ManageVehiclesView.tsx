"use client";
import { useState } from "react";
import { Vehicle } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./ManageAddressesView.module.css";

interface Props {
  vehicles: Vehicle[];
  onBack: () => void;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Omit<Vehicle, "id">>) => Promise<void>;
}

export default function ManageVehiclesView({ vehicles, onBack, onDelete, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBrandModel, setEditBrandModel] = useState("");
  const [editMax, setEditMax] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const startEdit = (v: Vehicle) => {
    setEditingId(v.id);
    setEditName(v.name);
    setEditBrandModel(v.brandModel);
    setEditMax(String(v.maxPassengers));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditBrandModel("");
    setEditMax("");
  };

  const saveEdit = async (id: string) => {
    const n = editName.trim();
    const bm = editBrandModel.trim();
    const mp = parseInt(editMax, 10);
    if (!n || !bm || !Number.isFinite(mp) || mp < 1) return;
    setSavingId(id);
    await onUpdate(id, {
      name: n,
      brandModel: bm,
      maxPassengers: mp,
    });
    setSavingId(null);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 차량을 삭제할까요?")) return;
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <button type="button" className={styles.backBtn} onClick={onBack} id="manage-vehicles-back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h2 className={styles.topTitle}>운행 차량 관리</h2>
        <div style={{ width: 40 }} />
      </div>

      <div className={styles.content}>
        {vehicles.length === 0 ? (
          <motion.div
            className={styles.emptyState}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={styles.emptyIcon}>🚐</div>
            <p>등록된 차량이 없어요</p>
            <p className={styles.emptyHint}>홈에서 운행 차량 등록으로 추가해보세요</p>
          </motion.div>
        ) : (
          <>
            <div className="section-title">{vehicles.length}대의 차량</div>
            <AnimatePresence>
              {vehicles.map((v, i) => (
                <motion.div
                  key={v.id}
                  className={styles.card}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40, height: 0, marginBottom: 0 }}
                  transition={{ delay: i * 0.04 }}
                  layout
                >
                  {editingId === v.id ? (
                    <div className={styles.editMode}>
                      <div className={styles.editField}>
                        <label className={styles.editLabel}>이름</label>
                        <input
                          className={styles.editInput}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          autoFocus
                          id={`edit-v-name-${v.id}`}
                        />
                      </div>
                      <div className={styles.editField}>
                        <label className={styles.editLabel}>브랜드·모델</label>
                        <input
                          className={styles.editInput}
                          value={editBrandModel}
                          onChange={(e) => setEditBrandModel(e.target.value)}
                          id={`edit-v-brand-${v.id}`}
                        />
                      </div>
                      <div className={styles.editField}>
                        <label className={styles.editLabel}>최대 탑승 인원</label>
                        <input
                          className={styles.editInput}
                          type="number"
                          min={1}
                          value={editMax}
                          onChange={(e) => setEditMax(e.target.value)}
                          id={`edit-v-max-${v.id}`}
                        />
                      </div>
                      <div className={styles.editActions}>
                        <button type="button" className="btn btn-ghost" onClick={cancelEdit} style={{ padding: "8px 16px" }} id={`cancel-v-${v.id}`}>
                          취소
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => saveEdit(v.id)}
                          disabled={
                            !editName.trim() ||
                            !editBrandModel.trim() ||
                            !Number.isFinite(parseInt(editMax, 10)) ||
                            parseInt(editMax, 10) < 1 ||
                            savingId === v.id
                          }
                          style={{ padding: "8px 20px", borderRadius: 10 }}
                          id={`save-v-${v.id}`}
                        >
                          {savingId === v.id ? "저장 중..." : "저장"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.viewMode}>
                      <div className={styles.cardIcon} style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                          <circle cx="7" cy="17" r="2"/>
                          <path d="M9 17h6"/>
                          <circle cx="17" cy="17" r="2"/>
                        </svg>
                      </div>
                      <div className={styles.cardInfo}>
                        <span className={styles.nickname}>{v.name}</span>
                        <span className={styles.address}>{v.brandModel}</span>
                        <span className={styles.address} style={{ fontSize: "0.75rem", marginTop: "2px" }}>
                          최대 {v.maxPassengers}명
                        </span>
                      </div>
                      <div className={styles.cardActions}>
                        <button
                          type="button"
                          className={styles.editBtn}
                          onClick={() => startEdit(v)}
                          aria-label="수정"
                          id={`edit-v-btn-${v.id}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          type="button"
                          className={styles.deleteBtn}
                          onClick={() => handleDelete(v.id)}
                          disabled={deletingId === v.id}
                          aria-label="삭제"
                          id={`delete-v-btn-${v.id}`}
                        >
                          {deletingId === v.id ? (
                            <div className={styles.miniSpinner} />
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14H6L5 6"/>
                              <path d="M10 11v6M14 11v6"/>
                              <path d="M9 6V4h6v2"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
