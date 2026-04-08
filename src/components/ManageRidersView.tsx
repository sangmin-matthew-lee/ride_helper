"use client";
import { useState } from "react";
import { Rider } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./ManageAddressesView.module.css";

interface Props {
  riders: Rider[];
  onBack: () => void;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Omit<Rider, "id">>) => Promise<void>;
}

export default function ManageRidersView({ riders, onBack, onDelete, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNickname, setEditNickname] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const startEdit = (r: Rider) => {
    setEditingId(r.id);
    setEditNickname(r.nickname);
    setEditPhone(r.phone ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNickname("");
    setEditPhone("");
  };

  const saveEdit = async (id: string) => {
    if (!editNickname.trim()) return;
    setSavingId(id);
    const phoneTrim = editPhone.trim();
    await onUpdate(id, {
      nickname: editNickname.trim(),
      ...(phoneTrim ? { phone: phoneTrim } : { phone: "" }),
    });
    setSavingId(null);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 라이더를 삭제할까요?")) return;
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={onBack} id="manage-riders-back-btn">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h2 className={styles.topTitle}>라이더 관리</h2>
        <div style={{ width: 40 }} />
      </div>

      <div className={styles.content}>
        {riders.length === 0 ? (
          <motion.div
            className={styles.emptyState}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={styles.emptyIcon}>👤</div>
            <p>등록된 라이더가 없어요</p>
            <p className={styles.emptyHint}>홈에서 라이더 등록으로 추가해보세요</p>
          </motion.div>
        ) : (
          <>
            <div className="section-title">{riders.length}명의 라이더</div>
            <AnimatePresence>
              {riders.map((loc, i) => (
                <motion.div
                  key={loc.id}
                  className={`${styles.card} ${
                    loc.gender === "male"
                      ? styles.cardMale
                      : loc.gender === "female"
                        ? styles.cardFemale
                        : ""
                  }`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40, height: 0, marginBottom: 0 }}
                  transition={{ delay: i * 0.04 }}
                  layout
                >
                  {editingId === loc.id ? (
                    <div className={styles.editMode}>
                      <div className={styles.editField}>
                        <label className={styles.editLabel}>이름 수정</label>
                        <input
                          className={styles.editInput}
                          value={editNickname}
                          onChange={(e) => setEditNickname(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(loc.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          id={`rider-edit-nickname-${loc.id}`}
                        />
                      </div>
                      <div className={styles.editField}>
                        <label className={styles.editLabel} htmlFor={`rider-edit-phone-${loc.id}`}>
                          전화번호
                        </label>
                        <input
                          id={`rider-edit-phone-${loc.id}`}
                          className={styles.editInput}
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="선택"
                        />
                      </div>
                      {loc.address?.trim() ? (
                        <div className={styles.editAddr}>{loc.address}</div>
                      ) : null}
                      <div className={styles.editActions}>
                        <button className="btn btn-ghost" onClick={cancelEdit} style={{ padding: "8px 16px" }} id={`rider-cancel-edit-${loc.id}`}>
                          취소
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={() => saveEdit(loc.id)}
                          disabled={!editNickname.trim() || savingId === loc.id}
                          style={{ padding: "8px 20px", borderRadius: 10 }}
                          id={`rider-save-edit-${loc.id}`}
                        >
                          {savingId === loc.id ? "저장 중..." : "저장"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.viewMode}>
                      <div className={styles.cardIcon}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                      </div>
                      <div className={styles.cardInfo}>
                        <div className={styles.nameRow}>
                          <span className={styles.nickname}>{loc.nickname}</span>
                          {loc.gender === "male" && (
                            <span className={styles.genderBadgeMale}>남</span>
                          )}
                          {loc.gender === "female" && (
                            <span className={styles.genderBadgeFemale}>여</span>
                          )}
                        </div>
                        {loc.address?.trim() ? (
                          <span className={styles.address}>{loc.address}</span>
                        ) : null}
                        {loc.phone ? (
                          <a
                            className={styles.phoneLink}
                            href={`tel:${loc.phone.replace(/\s/g, "")}`}
                          >
                            {loc.phone}
                          </a>
                        ) : null}
                      </div>
                      <div className={styles.cardActions}>
                        <button
                          className={styles.editBtn}
                          onClick={() => startEdit(loc)}
                          aria-label="수정"
                          id={`rider-edit-btn-${loc.id}`}
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
                          id={`rider-delete-btn-${loc.id}`}
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
