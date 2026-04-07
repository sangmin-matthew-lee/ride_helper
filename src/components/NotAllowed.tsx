"use client";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import styles from "./NotAllowed.module.css";

export default function NotAllowed() {
  const { user } = useAuth();

  return (
    <div className={styles.container}>
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <div className={styles.icon}>🔒</div>
        <h2 className={styles.title}>접근 권한 없음</h2>
        <p className={styles.desc}>
          승인되지 않은 계정이에요.
          <br />
          라이드 팀 담당자에게 문의해 주세요.
        </p>
        <p className={styles.email}>{user?.email}</p>
        <button
          className="btn btn-secondary"
          onClick={() => signOut(auth)}
          id="not-allowed-logout-btn"
        >
          다른 계정으로 로그인
        </button>
      </motion.div>
    </div>
  );
}
