"use client";
import { useState } from "react";
import { Location, LocationGender, LocationGroup } from "@/types";
import { downloadLocationsAsExcelCsv } from "@/lib/exportLocationsSpreadsheet";
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
  const [editPhone, setEditPhone] = useState("");
  const [editGroup, setEditGroup] = useState<LocationGroup>("fixed");
  const [editGender, setEditGender] = useState<LocationGender>("male");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const startEdit = (loc: Location) => {
    setEditingId(loc.id);
    setEditNickname(loc.nickname);
    setEditPhone(loc.phone ?? "");
    setEditGroup(loc.group ?? "fixed");
    setEditGender(loc.gender ?? "male");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNickname("");
    setEditPhone("");
    setEditGroup("fixed");
    setEditGender("male");
  };

  const saveEdit = async (id: string) => {
    if (!editNickname.trim()) return;
    setSavingId(id);
    const phoneTrim = editPhone.trim();
    await onUpdate(id, {
      nickname: editNickname.trim(),
      ...(phoneTrim ? { phone: phoneTrim } : { phone: "" }),
      group: editGroup,
      gender: editGender,
    });
    setSavingId(null);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 주소를 삭제할까요?")) return;
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  };

  const handleExportExcel = () => {
    if (locations.length === 0) {
      alert("\uC800\uC7A5\uB41C \uC8FC\uC18C\uAC00 \uC5C6\uC5B4\uC694.");
      return;
    }
    downloadLocationsAsExcelCsv(locations);
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
        <button
          type="button"
          className={styles.exportBtn}
          onClick={handleExportExcel}
          disabled={locations.length === 0}
          aria-label={"\uC5D1\uC140\uB85C \uB0B4\uBCF4\uB0B4\uAE30"}
          id="manage-addresses-export-btn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <path d="M8 13h2"/>
            <path d="M8 17h6"/>
            <path d="M8 9h1"/>
          </svg>
          <span>{"\uC5D1\uC140 \uB0B4\uBCF4\uB0B4\uAE30"}</span>
        </button>
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
                      <div className={styles.editField}>
                        <label className={styles.editLabel} htmlFor={`edit-phone-${loc.id}`}>
                          전화번호
                        </label>
                        <input
                          id={`edit-phone-${loc.id}`}
                          className={styles.editInput}
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="선택"
                        />
                      </div>
                      <div className={styles.editAddr}>{loc.address}</div>
                      <div className={styles.editField}>
                        <label className={styles.editLabel}>성별</label>
                        <div className={styles.editGroupRow}>
                          <label
                            className={`${styles.editGroupOption} ${editGender === "male" ? styles.editGroupSelected : ""}`}
                          >
                            <input
                              type="radio"
                              name={`edit-gender-${loc.id}`}
                              checked={editGender === "male"}
                              onChange={() => setEditGender("male")}
                            />
                            <span>남성</span>
                          </label>
                          <label
                            className={`${styles.editGroupOption} ${editGender === "female" ? styles.editGroupSelected : ""}`}
                          >
                            <input
                              type="radio"
                              name={`edit-gender-${loc.id}`}
                              checked={editGender === "female"}
                              onChange={() => setEditGender("female")}
                            />
                            <span>여성</span>
                          </label>
                        </div>
                      </div>
                      <div className={styles.editField}>
                        <label className={styles.editLabel}>그룹</label>
                        <div className={styles.editGroupRow}>
                          <label
                            className={`${styles.editGroupOption} ${editGroup === "fixed" ? styles.editGroupSelected : ""}`}
                          >
                            <input
                              type="radio"
                              name={`edit-group-${loc.id}`}
                              checked={editGroup === "fixed"}
                              onChange={() => setEditGroup("fixed")}
                            />
                            <span>고정</span>
                          </label>
                          <label
                            className={`${styles.editGroupOption} ${editGroup === "temporary" ? styles.editGroupSelected : ""}`}
                          >
                            <input
                              type="radio"
                              name={`edit-group-${loc.id}`}
                              checked={editGroup === "temporary"}
                              onChange={() => setEditGroup("temporary")}
                            />
                            <span>임시</span>
                          </label>
                        </div>
                      </div>
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
                        <div className={styles.nameRow}>
                          <span className={styles.nickname}>{loc.nickname}</span>
                          <span
                            className={
                              loc.group === "temporary"
                                ? styles.groupBadgeTemp
                                : styles.groupBadgeFixed
                            }
                          >
                            {loc.group === "temporary" ? "임시" : "고정"}
                          </span>
                          {loc.gender === "male" && (
                            <span className={styles.genderBadgeMale}>남</span>
                          )}
                          {loc.gender === "female" && (
                            <span className={styles.genderBadgeFemale}>여</span>
                          )}
                        </div>
                        <span className={styles.address}>{loc.address}</span>
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
