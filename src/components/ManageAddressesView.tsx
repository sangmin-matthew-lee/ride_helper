"use client";
import { useRef, useState, type ChangeEvent } from "react";
import { Location, LocationGender, LocationGroup } from "@/types";
import {
  downloadLocations,
  geocodeAddressForImport,
  parseLocationImportFile,
  type LocationExportFormat,
} from "@/lib/locationExportImport";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./ManageAddressesView.module.css";

interface Props {
  locations: Location[];
  onBack: () => void;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Omit<Location, "id">>) => Promise<void>;
  onAdd: (data: Omit<Location, "id">) => Promise<void>;
}

export default function ManageAddressesView({
  locations,
  onBack,
  onDelete,
  onUpdate,
  onAdd,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNickname, setEditNickname] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editGroup, setEditGroup] = useState<LocationGroup>("fixed");
  const [editGender, setEditGender] = useState<LocationGender>("male");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<LocationExportFormat>("xlsx");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

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
    if (!confirm("\uc774 \uc8fc\uc18c\ub97c \uc0ad\uc81c\ud560\uae4c\uc694?")) return;
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  };

  const openExportModal = () => {
    if (locations.length === 0) {
      alert("\uc800\uc7a5\ub41c \uc8fc\uc18c\uac00 \uc5c6\uc5b4\uc694.");
      return;
    }
    setExportOpen(true);
  };

  const handleConfirmExport = async () => {
    setExporting(true);
    try {
      const out = downloadLocations(locations, exportFormat);
      if (out instanceof Promise) await out;
      setExportOpen(false);
    } catch (e) {
      console.error(e);
      alert("\ub0b4\ubcf4\ub0b4\uae30 \uc911 \ubb38\uc81c\uac00 \uc0dd\uacbc\uc2b5\ub2c8\ub2e4.");
    } finally {
      setExporting(false);
    }
  };

  const nicknameTaken = (nickname: string) => {
    const t = nickname.trim().toLowerCase();
    return locations.some((l) => l.nickname.trim().toLowerCase() === t);
  };

  const handleImportChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx")) {
      alert(
        "Excel (.xlsx) \ub610\ub294 CSV (.csv) \ud30c\uc77c\ub9cc \ubd88\ub7ec\uc62c \uc218 \uc788\uc5b4\uc694."
      );
      return;
    }

    setImporting(true);
    try {
      const rows = await parseLocationImportFile(file);
      if (rows.length === 0) {
        alert(
          "\ubd88\ub7ec\uc62c \ub370\uc774\ud130\uac00 \uc5c6\uc5b4\uc694. \uc774\ub984\u00b7\uc8fc\uc18c\ub97c \ud655\uc778\ud574 \uc8fc\uc138\uc694."
        );
        return;
      }
      if (
        !confirm(
          `${rows.length}\uac1c\uc758 \uc8fc\uc18c\ub97c \ubd88\ub7ec\uc62c\uae4c\uc694?\n(\uc8fc\uc18c\ub9c8\ub2e4 \uc9c0\ub3c4\uc5d0\uc11c \uc704\uce58\ub97c \ucc3e\ub294 \ub370 \uc2dc\uac04\uc774 \uac78\ub9b4 \uc218 \uc788\uc5b4\uc694.)`
        )
      ) {
        return;
      }

      const added: string[] = [];
      const skipped: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (nicknameTaken(row.nickname)) {
          skipped.push(`${row.nickname}: \uac19\uc740 \uc774\ub984\uc774 \uc788\uc5b4\uc694`);
          continue;
        }
        const geo = await geocodeAddressForImport(row.address);
        if (!geo) {
          skipped.push(`${row.nickname}: \uc8fc\uc18c\ub97c \ucc3e\uc9c0 \ubabb\ud588\uc5b4\uc694`);
          continue;
        }
        try {
          await onAdd({
            nickname: row.nickname,
            address: geo.formattedAddress || row.address,
            lat: geo.lat,
            lng: geo.lng,
            ...(row.phone.trim() ? { phone: row.phone.trim() } : {}),
            gender: row.gender ?? "male",
            group: row.group ?? "fixed",
            createdAt: Date.now() + i,
          });
          added.push(row.nickname);
        } catch {
          skipped.push(`${row.nickname}: \uc800\uc7a5\uc5d0 \uc2e4\ud328\ud588\uc5b4\uc694`);
        }
        await new Promise((r) => setTimeout(r, 120));
      }

      let msg = `\ubd88\ub7ec\uc624\uae30 \uc644\ub8cc: ${added.length}\uac1c`;
      if (skipped.length) {
        msg += `\n\uac74\ub108\ub6f0 \uc2e4\ud328 ${skipped.length}\uac1c:\n${skipped.slice(0, 12).join("\n")}`;
        if (skipped.length > 12) {
          msg += `\n\uc678 ${skipped.length - 12}\uac74`;
        }
      }
      alert(msg);
    } catch (err) {
      console.error(err);
      alert(
        "\ud30c\uc77c\uc744 \uc77d\ub294 \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4. \ud615\uc2dd\uc744 \ud655\uc778\ud574 \uc8fc\uc138\uc694."
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={onBack} id="manage-back-btn">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h2 className={styles.topTitle}>{"\uc8fc\uc18c \uad00\ub9ac"}</h2>
        <div className={styles.topBarActions}>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className={styles.hiddenFileInput}
            onChange={handleImportChange}
            id="manage-addresses-import-input"
            aria-hidden
          />
          <button
            type="button"
            className={styles.importBtn}
            onClick={() => importInputRef.current?.click()}
            disabled={importing}
            id="manage-addresses-import-btn"
          >
            {importing ? (
              <span className={styles.btnSpinner} aria-hidden />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            )}
            <span>{"\ubd88\ub7ec\uc624\uae30"}</span>
          </button>
          <button
            type="button"
            className={styles.exportBtn}
            onClick={openExportModal}
            disabled={locations.length === 0 || exporting}
            aria-haspopup="dialog"
            aria-expanded={exportOpen}
            id="manage-addresses-export-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>{"\ub0b4\ubcf4\ub0b4\uae30"}</span>
          </button>
        </div>
      </div>

      {exportOpen ? (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onClick={() => !exporting && setExportOpen(false)}
        >
          <div
            className={styles.modalPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-export-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h3 className={styles.modalTitle} id="manage-export-title">
              {"\ub0b4\ubcf4\ub0b4\uae30 \ud615\uc2dd"}
            </h3>
            <p className={styles.modalHint}>
              {
                "\ud30c\uc77c \ud615\uc2dd\uc744 \uc120\ud0dd\ud55c \ub4a4 \ub2e4\uc6b4\ub85c\ub4dc\ud558\uc138\uc694."
              }
            </p>
            <div className={styles.formatList}>
              <label className={styles.formatOption}>
                <input
                  type="radio"
                  name="export-format"
                  checked={exportFormat === "xlsx"}
                  onChange={() => setExportFormat("xlsx")}
                />
                <span>Excel (.xlsx)</span>
              </label>
              <label className={styles.formatOption}>
                <input
                  type="radio"
                  name="export-format"
                  checked={exportFormat === "csv"}
                  onChange={() => setExportFormat("csv")}
                />
                <span>CSV (.csv)</span>
              </label>
              <label className={styles.formatOption}>
                <input
                  type="radio"
                  name="export-format"
                  checked={exportFormat === "pdf"}
                  onChange={() => setExportFormat("pdf")}
                />
                <span>PDF (.pdf)</span>
              </label>
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancel}
                onClick={() => setExportOpen(false)}
                disabled={exporting}
              >
                {"\ucde8\uc18c"}
              </button>
              <button
                type="button"
                className={styles.modalPrimary}
                onClick={handleConfirmExport}
                disabled={exporting}
                id="manage-export-confirm-btn"
              >
                {exporting ? "\uc900\ube44 \uc911\u2026" : "\ub2e4\uc6b4\ub85c\ub4dc"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className={styles.content}>
        {locations.length === 0 ? (
          <motion.div
            className={styles.emptyState}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={styles.emptyIcon}>{"\ud83d\udced"}</div>
            <p>{"\uc800\uc7a5\ub41c \uc8fc\uc18c\uac00 \uc5c6\uc5b4\uc694"}</p>
            <p className={styles.emptyHint}>
              {
                "\ud648 \ud654\uba74\uc73c\ub85c \ub3cc\uc544\uac00\uc11c \uc8fc\uc18c\ub97c \ucd94\uac00\ud574\ubcf4\uc138\uc694"
              }
            </p>
          </motion.div>
        ) : (
          <>
            <div className="section-title">
              {`${locations.length}\uac1c\uc758 \uc800\uc7a5\ub41c \uc8fc\uc18c`}
            </div>
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
                    <div className={styles.editMode}>
                      <div className={styles.editField}>
                        <label className={styles.editLabel}>{"\ubcc4\uba85 \uc218\uc815"}</label>
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
                          {"\uc804\ud654\ubc88\ud638"}
                        </label>
                        <input
                          id={`edit-phone-${loc.id}`}
                          className={styles.editInput}
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder={"\uc120\ud0dd"}
                        />
                      </div>
                      <div className={styles.editAddr}>{loc.address}</div>
                      <div className={styles.editField}>
                        <label className={styles.editLabel}>{"\uc131\ubcc4"}</label>
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
                            <span>{"\ub0a8\uc131"}</span>
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
                            <span>{"\uc5ec\uc131"}</span>
                          </label>
                        </div>
                      </div>
                      <div className={styles.editField}>
                        <label className={styles.editLabel}>{"\uadf8\ub8f9"}</label>
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
                            <span>{"\uace0\uc815"}</span>
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
                            <span>{"\uc784\uc2dc"}</span>
                          </label>
                        </div>
                      </div>
                      <div className={styles.editActions}>
                        <button
                          className="btn btn-ghost"
                          onClick={cancelEdit}
                          style={{ padding: "8px 16px" }}
                          id={`cancel-edit-${loc.id}`}
                        >
                          {"\ucde8\uc18c"}
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={() => saveEdit(loc.id)}
                          disabled={!editNickname.trim() || savingId === loc.id}
                          style={{ padding: "8px 20px", borderRadius: 10 }}
                          id={`save-edit-${loc.id}`}
                        >
                          {savingId === loc.id ? "\uc800\uc7a5 \uc911..." : "\uc800\uc7a5"}
                        </button>
                      </div>
                    </div>
                  ) : (
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
                            {loc.group === "temporary"
                              ? "\uc784\uc2dc"
                              : "\uace0\uc815"}
                          </span>
                          {loc.gender === "male" && (
                            <span className={styles.genderBadgeMale}>{"\ub0a8"}</span>
                          )}
                          {loc.gender === "female" && (
                            <span className={styles.genderBadgeFemale}>{"\uc5ec"}</span>
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
                          aria-label="\uc218\uc815"
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
                          aria-label="\uc0ad\uc81c"
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
