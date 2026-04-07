"use client";
import { useState } from "react";
import { Tab } from "@/types";
import BottomNav from "./BottomNav";
import HomeTab from "./HomeTab";
import RideTab from "./RideTab";
import SettingsTab from "./SettingsTab";
import styles from "./AppShell.module.css";
import { AnimatePresence, motion } from "framer-motion";

export default function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>("home");

  return (
    <div className={styles.shell}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: activeTab === "home" ? -20 : activeTab === "settings" ? 20 : 0, y: activeTab === "ride" ? 10 : 0 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={styles.tabContent}
        >
          {activeTab === "home" && <HomeTab />}
          {activeTab === "ride" && <RideTab />}
          {activeTab === "settings" && <SettingsTab />}
        </motion.div>
      </AnimatePresence>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
