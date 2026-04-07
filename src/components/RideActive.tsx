"use client";
import styles from "./RideActive.module.css";

interface Props {
  onBackToMain: () => void;
}

/** 라이드 시작 후 구글 맵이 열린 뒤, 웹에서는 메인으로만 돌아가면 됨 */
export default function RideActive({ onBackToMain }: Props) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.inner}>
        <p className={styles.lead}>구글 맵이 열렸어요.</p>
        <p className={styles.sub}>
          안내는 맵에서 이어가시고, 다음 라이드를 위해 돌아올 때만 아래를 눌러 주세요.
        </p>
        <button
          type="button"
          className={`btn btn-primary btn-lg ${styles.mainBtn}`}
          onClick={onBackToMain}
          id="back-to-main-btn"
        >
          메인 화면으로 돌아가기
        </button>
      </div>
    </div>
  );
}
