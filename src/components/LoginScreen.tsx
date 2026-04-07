"use client";
import { useState, type FormEvent } from "react";
import {
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import type { AuthError } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { motion } from "framer-motion";
import styles from "./LoginScreen.module.css";

function authErrorMessage(err: unknown): string {
  const code = err && typeof err === "object" && "code" in err
    ? (err as AuthError).code
    : "";
  switch (code) {
    case "auth/invalid-email":
      return "이메일 형식이 올바르지 않습니다.";
    case "auth/user-disabled":
      return "비활성화된 계정입니다.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "이메일 또는 비밀번호가 올바르지 않습니다.";
    case "auth/email-already-in-use":
      return "이미 사용 중인 이메일입니다.";
    case "auth/weak-password":
      return "비밀번호는 6자 이상으로 설정해 주세요.";
    case "auth/too-many-requests":
      return "시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.";
    default:
      return "로그인에 실패했습니다. 다시 시도해 주세요.";
  }
}

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [emailPending, setEmailPending] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    const trimmed = email.trim();
    if (!trimmed || !password) {
      setEmailError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    setEmailPending(true);
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, trimmed, password);
      } else {
        await createUserWithEmailAndPassword(auth, trimmed, password);
      }
    } catch (err) {
      console.error("Email auth error:", err);
      setEmailError(authErrorMessage(err));
    } finally {
      setEmailPending(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  return (
    <div className={styles.container}>
      {/* background animated blobs */}
      <div className={styles.blob1} />
      <div className={styles.blob2} />

      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className={styles.icon}>
          {/* Car + cross icon made with CSS */}
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <rect width="64" height="64" rx="16" fill="url(#grad)" />
            <path d="M14 38h36M18 38l4-10h20l4 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="22" cy="42" r="3" fill="white"/>
            <circle cx="42" cy="42" r="3" fill="white"/>
            <path d="M40 24V16M36 20h8" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                <stop stopColor="#1a56db"/>
                <stop offset="1" stopColor="#60a5fa"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h1 className={styles.title}>Ride Helper</h1>
        <p className={styles.subtitle}>교회 라이드 팀을 위한<br/>스마트 경로 관리 앱</p>

        <div className={styles.features}>
          <div className={styles.feature}>
            <span>📍</span>
            <span>주소 등록</span>
          </div>
          <div className={styles.feature}>
            <span>🗺️</span>
            <span>라이드 경로 설정</span>
          </div>
          <div className={styles.feature}>
            <span>🚗</span>
            <span>구글 맵 내비게이션 연동</span>
          </div>
        </div>

        <form className={styles.emailForm} onSubmit={handleEmailSubmit} noValidate>
          <label className={styles.fieldLabel} htmlFor="login-email">
            이메일
          </label>
          <input
            id="login-email"
            className={styles.fieldInput}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            disabled={emailPending}
          />
          <label className={styles.fieldLabel} htmlFor="login-password">
            비밀번호
          </label>
          <input
            id="login-password"
            className={styles.fieldInput}
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={emailPending}
          />
          {emailError ? (
            <p className={styles.fieldError} role="alert">
              {emailError}
            </p>
          ) : null}
          <button
            type="submit"
            className={`btn btn-primary ${styles.emailSubmitBtn}`}
            disabled={emailPending}
          >
            {emailPending
              ? "처리 중…"
              : mode === "login"
                ? "이메일로 로그인"
                : "회원가입"}
          </button>
          <button
            type="button"
            className={styles.modeToggle}
            onClick={() => {
              setMode((m) => (m === "login" ? "signup" : "login"));
              setEmailError(null);
            }}
            disabled={emailPending}
          >
            {mode === "login"
              ? "계정이 없으신가요? 회원가입"
              : "이미 계정이 있으신가요? 로그인"}
          </button>
        </form>

        <div className={styles.divider}>
          <span>또는</span>
        </div>

        <button className={`btn btn-primary ${styles.loginBtn}`} onClick={handleGoogleLogin}>
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.5 2.7 13.5l7.9 6.1C12.5 13.5 17.8 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.2-.4-4.7H24v9h12.4c-.5 2.8-2.2 5.2-4.6 6.8l7.2 5.6C43.3 37.3 46.1 31.3 46.1 24.5z"/>
            <path fill="#FBBC05" d="M10.6 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6L2.7 13.5A23.9 23.9 0 0 0 0 24c0 3.8.9 7.4 2.7 10.5l7.9-5.9z"/>
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.2-5.6c-2.2 1.5-5.1 2.4-8.7 2.4-6.2 0-11.5-4-13.4-9.5l-7.9 5.9C6.6 42.5 14.6 48 24 48z"/>
          </svg>
          Google 계정으로 로그인
        </button>

        <p className={styles.notice}>승인된 계정만 이용 가능합니다</p>
      </motion.div>
    </div>
  );
}
