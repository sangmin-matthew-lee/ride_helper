"use client";

import { motion } from "framer-motion";
import type { RideDayPeriod } from "@/types";
import { formatRideSlotSummaryLine } from "@/lib/datetime";
import styles from "./RideScheduleView.module.css";

interface Props {
  dateKey: string;
  period: RideDayPeriod;
  onDateKeyChange: (dateKey: string) => void;
  onPeriodChange: (period: RideDayPeriod) => void;
  onContinue: () => void;
  onBack: () => void;
}

export default function RideScheduleView({
  dateKey,
  period,
  onDateKeyChange,
  onPeriodChange,
  onContinue,
  onBack,
}: Props) {
  const summary = formatRideSlotSummaryLine(dateKey, period);

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <button type="button" className={styles.backBtn} onClick={onBack} id="ride-schedule-back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h2 className={styles.topTitle}>라이드 일정</h2>
        <div style={{ width: 40 }} />
      </div>

      <div className={styles.content}>
        <p className={styles.lead}>
          같은 날 오전·오후에 여러 라이드를 나눠 배정할 수 있어요. 먼저 날짜와 시간대를 골라 주세요.
        </p>

        <motion.div
          className={styles.fieldBlock}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
        >
          <span className={styles.fieldLabel}>날짜</span>
          <input
            type="date"
            className={styles.dateInput}
            value={dateKey}
            onChange={(e) => onDateKeyChange(e.target.value)}
            id="ride-schedule-date"
          />
        </motion.div>

        <motion.div
          className={styles.fieldBlock}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <span className={styles.fieldLabel}>오전 / 오후</span>
          <div className={styles.periodRow}>
            <button
              type="button"
              className={`${styles.periodBtn} ${period === "am" ? styles.periodBtnActive : ""}`}
              onClick={() => onPeriodChange("am")}
              id="ride-schedule-am"
            >
              오전
            </button>
            <button
              type="button"
              className={`${styles.periodBtn} ${period === "pm" ? styles.periodBtnActive : ""}`}
              onClick={() => onPeriodChange("pm")}
              id="ride-schedule-pm"
            >
              오후
            </button>
          </div>
        </motion.div>

        <motion.div
          className={styles.previewCard}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <div className={styles.previewLabel}>선택한 일정</div>
          <div className={styles.previewValue}>{summary}</div>
        </motion.div>
      </div>

      <div className={styles.bottomBar}>
        <button
          type="button"
          className={`btn btn-primary ${styles.continueBtn}`}
          onClick={onContinue}
          id="ride-schedule-continue"
        >
          경로 구성하기
        </button>
      </div>
    </div>
  );
}
