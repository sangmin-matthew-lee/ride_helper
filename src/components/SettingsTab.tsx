"use client";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import Image from "next/image";
import styles from "./SettingsTab.module.css";

export default function SettingsTab() {
  const { user } = useAuth();

  const handleLogout = async () => {
    if (confirm("로그아웃 하시겠습니까?")) {
      await signOut(auth);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className="page-container">
        <div className={styles.header}>
          <h1 className={styles.title}>설정</h1>
        </div>

        {/* Profile card */}
        <motion.div
          className={styles.profileCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {user?.photoURL ? (
            <Image
              src={user.photoURL}
              alt="프로필"
              width={64}
              height={64}
              className={`avatar ${styles.avatar}`}
            />
          ) : (
            <div className={`avatar ${styles.avatarFallback}`}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
          )}
          <div className={styles.profileInfo}>
            <span className={styles.profileName}>{user?.displayName ?? "사용자"}</span>
            <span className={styles.profileEmail}>{user?.email}</span>
          </div>
          <div className={`badge badge-green ${styles.profileBadge}`}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>
            승인됨
          </div>
        </motion.div>

        <div className="divider" />

        {/* Info section */}
        <motion.div
          className={styles.section}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="section-title">앱 정보</div>
          <div className={styles.infoList}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>앱 이름</span>
              <span className={styles.infoValue}>Ride Helper</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>버전</span>
              <span className={styles.infoValue}>1.0.0</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>팀</span>
              <span className={styles.infoValue}>LWBC 라이드 팀</span>
            </div>
          </div>
        </motion.div>

        <div className="divider" />

        {/* PWA Install hint */}
        <motion.div
          className={styles.pwaHint}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className={styles.pwaIcon}>📱</div>
          <div className={styles.pwaText}>
            <span className={styles.pwaTitle}>앱으로 설치하기</span>
            <span className={styles.pwaDesc}>브라우저 메뉴 → "홈 화면에 추가"를 누르면 앱처럼 사용할 수 있어요</span>
          </div>
        </motion.div>

        <div className="divider" />

        {/* Logout */}
        <motion.button
          className={`btn btn-danger ${styles.logoutBtn}`}
          onClick={handleLogout}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          id="logout-btn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          로그아웃
        </motion.button>
      </div>
    </div>
  );
}
