"use client";
import { useAuth } from "@/context/AuthContext";
import LoginScreen from "@/components/LoginScreen";
import NotAllowed from "@/components/NotAllowed";
import MainApp from "@/components/MainApp";
import styles from "./page.module.css";

export default function Home() {
  const { user, isWhitelisted, loading } = useAuth();

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingLogo}>
          <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
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
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <LoginScreen />;
  if (!isWhitelisted) return <NotAllowed />;

  return <MainApp user={user} />;
}
