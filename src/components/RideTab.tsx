"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserLocations, getRecentRides, saveRecentRide } from "@/lib/firestore";
import { buildGoogleMapsDirectionsUrl } from "@/lib/googleMapsUrls";
import { Location, RecentRide, RideStep } from "@/types";
import RideSelect from "./RideSelect";
import RideSort from "./RideSort";
import RideActive from "./RideActive";
import styles from "./RideTab.module.css";

export default function RideTab() {
  const { user } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [recentRides, setRecentRides] = useState<RecentRide[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [orderedStops, setOrderedStops] = useState<Location[]>([]);
  const [step, setStep] = useState<RideStep>("select");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [locs, rides] = await Promise.all([
        getUserLocations(user.uid),
        getRecentRides(user.uid),
      ]);
      setLocations(locs);
      setRecentRides(rides);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const startRideWithMaps = async (stops: Location[]) => {
    if (user) {
      try {
        await saveRecentRide(user.uid, stops);
      } catch (e) {
        console.error("라이드 저장 실패:", e);
      }
    }
    await fetchData();
    window.open(buildGoogleMapsDirectionsUrl(stops), "_blank");
    setStep("active");
  };

  const handleStartRide = (stops: Location[]) => {
    setOrderedStops(stops);
    void startRideWithMaps(stops);
  };

  const handleReset = () => {
    setStep("select");
    setSelectedIds(new Set());
    setOrderedStops([]);
    fetchData();
  };

  const handleLoadRecent = (ride: RecentRide) => {
    const validStops = ride.stops.filter((s) =>
      locations.some((l) => l.id === s.id)
    );
    const stops = validStops.length > 0 ? validStops : ride.stops;
    setOrderedStops(stops);
    void startRideWithMaps(stops);
  };

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {step === "select" && (
        <RideSelect
          locations={locations}
          recentRides={recentRides}
          selectedIds={selectedIds}
          onToggle={(id) =>
            setSelectedIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
          onNext={(stops) => {
            setOrderedStops(stops);
            setStep("sort");
          }}
          onLoadRecent={handleLoadRecent}
        />
      )}
      {step === "sort" && (
        <RideSort
          stops={orderedStops}
          onBack={() => setStep("select")}
          onStart={handleStartRide}
          onChange={setOrderedStops}
        />
      )}
      {step === "active" && (
        <RideActive onBackToMain={handleReset} />
      )}
    </div>
  );
}
