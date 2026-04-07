"use client";
import { useState } from "react";
import { Location } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./ManageAddressesView.module.css";

interface Props {
  locations: Location[];
  onBack: () => void;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Omit<Location, "id">>) => Promise<void>;
}

export default function ManageAddressesView({ locations, onBack, onDelete, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNickname, setEditNickname] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const startEdit = (loc: Location) => {
    setEditingId(loc.id);
    setEditNickname(loc.nickname);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNickname("");
  };

  const saveEdit = async (id: string) => {
    if (!editNickname.trim()) return;
    setSavingId(id);
    await onUpdate(id, { nickname: editNickname.trim() });
    setSavingId(null);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 주소를 삭제할까요?")) return;
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  };

  return (
    <div className={styles.wrapper}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={onBack} id="manage-back-btn">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h2 className={styles.topTitle}>주소 관리</h2>
        <div style={{ width: 40 }} />
      </div>

      <div className={styles.content}>
        {locations.length === 0 ? (
          <motion.div
            className={styles.emptyState}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={styles.emptyIcon}>📭</div>
            <p>저장된 주소가 없어요</p>
            <p className={styles.emptyHint}>홈 화면으로 돌아가서 주소를 추가해보세요</p>
          </motion.div>
        ) : (
          <>
            <div className="section-title">{locations.length}개의 저장된 주소</div>
            <AnimatePresence>
              {locations.map((loc, i) => (
                <motion.div
                  key={loc.id}
                  className={styles.card}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40, height: 0, marginBottom: 0 }}
                  transition={{ delay: i * 0.04 }}
                  layout
                >
                  {editingId === loc.id ? (
                    /* Edit mode */
                    <div className={styles.editMode}>
                      <div className={styles.editField}>
                        <label className={styles.editLabel}>별명 수정</label>
                        <input
                          className={styles.editInput}
                          value={editNickname}
                          onChange={(e) => setEditNickname(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(loc.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          id={`edit-nickname-${loc.id}`}
                        />
                      </div>
                      <div className={styles.editAddr}>{loc.address}</div>
                      <div className={styles.editActions}>
                        <button className="btn btn-ghost" onClick={cancelEdit} style={{ padding: "8px 16px" }} id={`cancel-edit-${loc.id}`}>
                          취소
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={() => saveEdit(loc.id)}
                          disabled={!editNickname.trim() || savingId === loc.id}
                          style={{ padding: "8px 20px", borderRadius: 10 }}
                          id={`save-edit-${loc.id}`}
                        >
                          {savingId === loc.id ? "저장 중..." : "저장"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View mode */
                    <div className={styles.viewMode}>
                      <div className={styles.cardIcon}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                      </div>
                      <div className={styles.cardInfo}>
                        <span className={styles.nickname}>{loc.nickname}</span>
                        <span className={styles.address}>{loc.address}</span>
                      </div>
                      <div className={styles.cardActions}>
                        <button
                          className={styles.editBtn}
                          onClick={() => startEdit(loc)}
                          aria-label="수정"
                          id={`edit-btn-${loc.id}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDelete(loc.id)}
                          disabled={deletingId === loc.id}
                          aria-label="삭제"
                          id={`delete-btn-${loc.id}`}
                        >
                          {deletingId === loc.id ? (
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
