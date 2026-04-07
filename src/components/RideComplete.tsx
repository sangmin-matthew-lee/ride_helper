"use client";
import { Location } from "@/types";
import { motion } from "framer-motion";
import styles from "./RideComplete.module.css";

interface Props {
  stops: Location[];
  onReset: () => void;
}

export default function RideComplete({ stops, onReset }: Props) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.content}>
        <motion.div
          className={styles.iconWrap}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
        >
          <span className={styles.emoji}>🎉</span>
        </motion.div>

        <motion.h1
          className={styles.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          라이드 완료!
        </motion.h1>
        <motion.p
          className={styles.subtitle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          오늘 경로가 저장되었어요
        </motion.p>

        <motion.div
          className={styles.summary}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="section-title">오늘의 경로</div>
          {stops.map((stop, i) => (
            <div key={stop.id} className={styles.stopRow}>
              <div className={styles.stopLine}>
                {i < stops.length - 1 && <div className={styles.connector} />}
              </div>
              <div className={styles.stopDot} />
              <div className={styles.stopInfo}>
                <span className={styles.stopNickname}>{stop.nickname}</span>
                <span className={styles.stopAddress}>{stop.address}</span>
              </div>
            </div>
          ))}
        </motion.div>

        <motion.button
          className={`btn btn-primary ${styles.resetBtn}`}
          onClick={onReset}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          id="ride-complete-reset-btn"
        >
          새 라이드 시작
        </motion.button>
      </div>
    </div>
  );
}
