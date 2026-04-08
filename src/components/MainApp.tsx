"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  Location,
  RecentRide,
  RideActiveEntry,
  Rider,
  RideDayPeriod,
  RideSlotAssignment,
  Vehicle,
} from "@/types";
import {
  getUserLocations,
  addUserLocation,
  deleteUserLocation,
  updateUserLocation,
  getUserRiders,
  addRider,
  deleteRider,
  updateRider,
  getRecentRides,
  isNicknameTaken,
  isRiderNicknameTaken,
  saveRecentRide,
  addRideActive,
  updateRideActive,
  getRideActiveRides,
  migrateExpiredActiveRides,
  deleteRideActiveAndFreeSlot,
  deleteRideSlotAssignmentForRide,
  getUserVehicles,
  addVehicle,
  deleteVehicle,
  updateVehicle,
  isVehicleNameTaken,
  type SaveRecentRideMeta,
  getRideSlotAssignmentsForSlot,
  addRideSlotAssignment,
} from "@/lib/firestore";
import { calendarDateKeyAppTz, formatRideSlotSummaryLine } from "@/lib/datetime";
import { openGoogleMapsDirections } from "@/lib/googleMapsUrls";
import { shareRideContent } from "@/lib/rideShare";
import AddAddressView from "./AddAddressView";
import ManageAddressesView from "./ManageAddressesView";
import ManageRidersView from "./ManageRidersView";
import AddVehicleView from "./AddVehicleView";
import ManageVehiclesView from "./ManageVehiclesView";
import RecentRidesView from "./RecentRidesView";
import RideStatusView from "./RideStatusView";
import RideScheduleView from "./RideScheduleView";
import RideRouteView from "./RideRouteView";
import RideRiderSelectView from "./RideRiderSelectView";
import RideActive from "./RideActive";
import Script from "next/script";
import styles from "./MainApp.module.css";

type View =
  | "home"
  | "register"
  | "manage"
  | "riderRegister"
  | "riderManage"
  | "vehicleRegister"
  | "vehicleManage"
  | "rideSchedule"
  | "route"
  | "riderSelect"
  | "recentRides"
  | "rideStatus"
  | "navigate";

interface Props {
  user: User;
}

export default function MainApp({ user }: Props) {
  const [view, setView] = useState<View>("home");
  const [locations, setLocations] = useState<Location[]>([]);
  /** 라이드 구성에서 선택한 주소 ID 순서 (라이드 중단 후에도 유지) */
  const [routeSelectionIds, setRouteSelectionIds] = useState<string[]>([]);
  const [recentRides, setRecentRides] = useState<RecentRide[]>([]);
  const [rideActiveRides, setRideActiveRides] = useState<RideActiveEntry[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [rideDateKey, setRideDateKey] = useState<string>(() => calendarDateKeyAppTz(Date.now()));
  const [ridePeriod, setRidePeriod] = useState<RideDayPeriod>("am");
  const [slotAssignments, setSlotAssignments] = useState<RideSlotAssignment[]>([]);
  /** 라이드 현황에서 들어와 수정 중인 rideActive 문서 id (슬롯 배정 중 본인 라이더·차량은 배정됨 처리 제외) */
  const [editingActiveRideId, setEditingActiveRideId] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    const data = await getUserLocations(user.uid);
    setLocations(data);
  }, [user.uid]);

  const refreshRideHistory = useCallback(async () => {
    await migrateExpiredActiveRides(user.uid);
    const [recent, active] = await Promise.all([
      getRecentRides(user.uid),
      getRideActiveRides(user.uid),
    ]);
    setRecentRides(recent);
    setRideActiveRides(active);
  }, [user.uid]);

  const fetchRiders = useCallback(async () => {
    const data = await getUserRiders(user.uid);
    setRiders(data);
  }, [user.uid]);

  const fetchVehicles = useCallback(async () => {
    const data = await getUserVehicles(user.uid);
    setVehicles(data);
  }, [user.uid]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    if (view === "home" || view === "recentRides" || view === "rideStatus") {
      void refreshRideHistory();
    }
  }, [view, refreshRideHistory]);

  useEffect(() => {
    fetchRiders();
  }, [fetchRiders]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  useEffect(() => {
    const valid = new Set(locations.map((l) => l.id));
    setRouteSelectionIds((prev) => prev.filter((id) => valid.has(id)));
  }, [locations]);

  useEffect(() => {
    if (view !== "riderSelect") return;
    // 오전/오후·날짜를 바꾼 직후 이전 슬롯(예: 오전) 배정이 남으면 오후에도 막힌 것처럼 보임 → 즉시 비운 뒤 조회
    setSlotAssignments([]);
    let cancelled = false;
    void (async () => {
      try {
        const rows = await getRideSlotAssignmentsForSlot(user.uid, rideDateKey, ridePeriod);
        if (!cancelled) setSlotAssignments(rows);
      } catch (e) {
        console.error("슬롯 배정 조회 실패:", e);
        if (!cancelled) setSlotAssignments([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view, user.uid, rideDateKey, ridePeriod]);

  const editingActiveRide = useMemo(
    () =>
      editingActiveRideId
        ? rideActiveRides.find((r) => r.id === editingActiveRideId)
        : undefined,
    [editingActiveRideId, rideActiveRides]
  );

  const busyRiderIds = useMemo(() => {
    const raw = slotAssignments.map((a) => a.riderId);
    const rid = editingActiveRide?.riderId;
    if (rid) return raw.filter((id) => id !== rid);
    return raw;
  }, [slotAssignments, editingActiveRide?.riderId]);

  const busyVehicleIds = useMemo(() => {
    const raw = slotAssignments
      .map((a) => a.vehicleId)
      .filter((id): id is string => id != null && id !== "");
    const vid = editingActiveRide?.vehicleId;
    if (vid) return raw.filter((id) => id !== vid);
    return raw;
  }, [slotAssignments, editingActiveRide?.vehicleId]);

  const resetRideFlow = useCallback(() => {
    setRouteSelectionIds([]);
    setRideDateKey(calendarDateKeyAppTz(Date.now()));
    setRidePeriod("am");
    setSlotAssignments([]);
    setEditingActiveRideId(null);
    setView("home");
  }, []);

  const handleAddAddress = async (data: Omit<Location, "id">) => {
    await addUserLocation(user.uid, data);
    await fetchLocations();
    setView("home");
  };

  const handleDeleteAddress = async (id: string) => {
    await deleteUserLocation(user.uid, id);
    setLocations((prev) => prev.filter((l) => l.id !== id));
  };

  const handleUpdateAddress = async (id: string, updates: Partial<Omit<Location, "id">>) => {
    await updateUserLocation(user.uid, id, updates);
    await fetchLocations();
  };

  const handleAddRider = async (data: Omit<Rider, "id">) => {
    await addRider(user.uid, data);
    await fetchRiders();
    setView("home");
  };

  const handleDeleteRider = async (id: string) => {
    await deleteRider(user.uid, id);
    setRiders((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateRider = async (id: string, updates: Partial<Omit<Rider, "id">>) => {
    await updateRider(user.uid, id, updates);
    await fetchRiders();
  };

  const handleAddVehicle = async (data: Omit<Vehicle, "id">) => {
    await addVehicle(user.uid, data);
    await fetchVehicles();
    setView("home");
  };

  const handleDeleteVehicle = async (id: string) => {
    await deleteVehicle(user.uid, id);
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  };

  const handleUpdateVehicle = async (id: string, updates: Partial<Omit<Vehicle, "id">>) => {
    await updateVehicle(user.uid, id, updates);
    await fetchVehicles();
  };

  const buildRecentRideMeta = (rider: Rider | null, vehicle: Vehicle | null): SaveRecentRideMeta => {
    const meta: SaveRecentRideMeta = {
      rideDateKey,
      ridePeriod,
    };
    if (rider) {
      meta.riderId = rider.id;
      meta.riderNickname = rider.nickname;
    }
    if (vehicle) {
      meta.vehicleId = vehicle.id;
      meta.vehicleName = vehicle.name;
      meta.vehicleBrandModel = vehicle.brandModel;
      meta.vehicleMaxPassengers = vehicle.maxPassengers;
    }
    return meta;
  };

  const handleStartRide = (route: Location[], rider: Rider, vehicle: Vehicle | null) => {
    openGoogleMapsDirections(route);
    setView("navigate");
    void (async () => {
      try {
        const prev =
          editingActiveRideId != null
            ? rideActiveRides.find((r) => r.id === editingActiveRideId)
            : undefined;
        if (prev?.riderId && prev.rideDateKey && prev.ridePeriod) {
          await deleteRideSlotAssignmentForRide(
            user.uid,
            prev.rideDateKey,
            prev.ridePeriod,
            prev.riderId,
            prev.vehicleId ?? null
          );
        }
        await saveRecentRide(user.uid, route, buildRecentRideMeta(rider, vehicle));
        await addRideSlotAssignment(user.uid, {
          dateKey: rideDateKey,
          period: ridePeriod,
          riderId: rider.id,
          vehicleId: vehicle?.id ?? null,
          createdAt: Date.now(),
        });
        setEditingActiveRideId(null);
      } catch (err) {
        console.error("라이드 저장 실패:", err);
      }
      await refreshRideHistory();
    })();
  };

  const handleShareRoute = useCallback(
    async (route: Location[], rider: Rider | null, vehicle: Vehicle | null) => {
      const result = await shareRideContent(route, vehicle, rider);
      if (result === "clipboard") {
        alert("클립보드에 복사했어요");
      }
      try {
        const prev =
          editingActiveRideId != null
            ? rideActiveRides.find((r) => r.id === editingActiveRideId)
            : undefined;
        if (prev?.riderId && prev.rideDateKey && prev.ridePeriod) {
          await deleteRideSlotAssignmentForRide(
            user.uid,
            prev.rideDateKey,
            prev.ridePeriod,
            prev.riderId,
            prev.vehicleId ?? null
          );
        }
        const meta = buildRecentRideMeta(rider, vehicle);
        const sharedAt = Date.now();
        if (editingActiveRideId) {
          await updateRideActive(user.uid, editingActiveRideId, route, meta, sharedAt);
        } else {
          await addRideActive(user.uid, route, meta, sharedAt);
        }
        if (rider) {
          await addRideSlotAssignment(user.uid, {
            dateKey: rideDateKey,
            period: ridePeriod,
            riderId: rider.id,
            vehicleId: vehicle?.id ?? null,
            createdAt: Date.now(),
          });
          const rows = await getRideSlotAssignmentsForSlot(user.uid, rideDateKey, ridePeriod);
          setSlotAssignments(rows);
        }
        setEditingActiveRideId(null);
        await refreshRideHistory();
      } catch (err) {
        console.error("라이드 현황 저장 실패:", err);
      }
    },
    [
      user.uid,
      refreshRideHistory,
      rideDateKey,
      ridePeriod,
      editingActiveRideId,
      rideActiveRides,
    ]
  );

  const handlePickPastRide = (ride: RecentRide) => {
    setEditingActiveRideId(null);
    const validIds = ride.stops
      .filter((s) => locations.some((l) => l.id === s.id))
      .map((s) => s.id);
    setRouteSelectionIds(validIds);
    if (ride.rideDateKey && ride.ridePeriod) {
      setRideDateKey(ride.rideDateKey);
      setRidePeriod(ride.ridePeriod);
    } else {
      setRideDateKey(calendarDateKeyAppTz(Date.now()));
      setRidePeriod("am");
    }
    setView("route");
  };

  const handlePickActiveRide = (ride: RideActiveEntry) => {
    setEditingActiveRideId(ride.id);
    const validIds = ride.stops
      .filter((s) => locations.some((l) => l.id === s.id))
      .map((s) => s.id);
    setRouteSelectionIds(validIds);
    if (ride.rideDateKey && ride.ridePeriod) {
      setRideDateKey(ride.rideDateKey);
      setRidePeriod(ride.ridePeriod);
    }
    setView("route");
  };

  const handleDeleteActiveRide = async (ride: RideActiveEntry) => {
    try {
      await deleteRideActiveAndFreeSlot(user.uid, ride);
      if (editingActiveRideId === ride.id) setEditingActiveRideId(null);
      await refreshRideHistory();
    } catch (err) {
      console.error("라이드 현황 삭제 실패:", err);
      alert("삭제에 실패했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  const handleShareActiveRideFromList = useCallback(
    async (ride: RideActiveEntry) => {
      const route = ride.stops
        .map((s) => locations.find((l) => l.id === s.id))
        .filter((l): l is Location => !!l);
      if (route.length === 0) {
        alert("경로에 쓸 주소가 없어요. 주소가 삭제됐을 수 있어요.");
        return;
      }
      const vehicle =
        ride.vehicleId != null && ride.vehicleId !== ""
          ? vehicles.find((v) => v.id === ride.vehicleId) ?? null
          : null;
      const rider =
        ride.riderId != null && ride.riderId !== ""
          ? riders.find((r) => r.id === ride.riderId) ?? null
          : null;
      const riderNicknameFallback =
        !rider && ride.riderNickname?.trim() ? ride.riderNickname.trim() : null;
      const result = await shareRideContent(route, vehicle, rider, riderNicknameFallback);
      if (result === "clipboard") {
        alert("클립보드에 복사했어요");
      }
    },
    [locations, vehicles, riders]
  );

  if (view === "register") {
    return (
      <>
        <Script src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`} strategy="afterInteractive" />
        <AddAddressView
          onBack={() => setView("home")}
          onSave={handleAddAddress}
          checkNicknameDuplicate={(nickname) => isNicknameTaken(user.uid, nickname)}
        />
      </>
    );
  }
  if (view === "riderRegister") {
    return (
      <AddAddressView
        variant="rider"
        onBack={() => setView("home")}
        onSave={handleAddRider}
        checkNicknameDuplicate={(nickname) => isRiderNicknameTaken(user.uid, nickname)}
      />
    );
  }
  if (view === "manage") {
    return (
      <ManageAddressesView
        locations={locations}
        onBack={() => setView("home")}
        onDelete={handleDeleteAddress}
        onUpdate={handleUpdateAddress}
      />
    );
  }
  if (view === "riderManage") {
    return (
      <ManageRidersView
        riders={riders}
        onBack={() => setView("home")}
        onDelete={handleDeleteRider}
        onUpdate={handleUpdateRider}
      />
    );
  }
  if (view === "vehicleRegister") {
    return (
      <AddVehicleView
        onBack={() => setView("home")}
        onSave={handleAddVehicle}
        checkNameDuplicate={(name) => isVehicleNameTaken(user.uid, name)}
      />
    );
  }
  if (view === "vehicleManage") {
    return (
      <ManageVehiclesView
        vehicles={vehicles}
        onBack={() => setView("home")}
        onDelete={handleDeleteVehicle}
        onUpdate={handleUpdateVehicle}
      />
    );
  }
  if (view === "recentRides") {
    return (
      <RecentRidesView
        locations={locations}
        recentRides={recentRides}
        onBack={() => setView("home")}
        onPickRide={handlePickPastRide}
      />
    );
  }
  if (view === "rideStatus") {
    return (
      <RideStatusView
        locations={locations}
        rides={rideActiveRides}
        onBack={() => setView("home")}
        onPickRide={handlePickActiveRide}
        onDeleteRide={handleDeleteActiveRide}
        onShareRide={handleShareActiveRideFromList}
      />
    );
  }
  if (view === "rideSchedule") {
    return (
      <RideScheduleView
        dateKey={rideDateKey}
        period={ridePeriod}
        onDateKeyChange={setRideDateKey}
        onPeriodChange={setRidePeriod}
        onContinue={() => setView("route")}
        onBack={() => setView("home")}
      />
    );
  }
  if (view === "riderSelect") {
    const orderedRoute = routeSelectionIds
      .map((id) => locations.find((l) => l.id === id))
      .filter((l): l is Location => !!l);
    const passengerCount = Math.max(0, orderedRoute.length - 1);
    const eligibleVehicles = vehicles.filter((v) => v.maxPassengers >= passengerCount);
    const slotSummaryLine = formatRideSlotSummaryLine(rideDateKey, ridePeriod);
    return (
      <RideRiderSelectView
        key={editingActiveRideId ?? "new-ride"}
        route={orderedRoute}
        riders={riders}
        eligibleVehicles={eligibleVehicles}
        vehicleRegisteredCount={vehicles.length}
        passengerCount={passengerCount}
        busyRiderIds={busyRiderIds}
        busyVehicleIds={busyVehicleIds}
        slotSummaryLine={slotSummaryLine}
        initialRiderId={editingActiveRide?.riderId}
        initialVehicleId={editingActiveRide?.vehicleId}
        onBack={() => setView("route")}
        onStartRide={handleStartRide}
        onShare={handleShareRoute}
        onGoHome={resetRideFlow}
      />
    );
  }
  if (view === "route") {
    return (
      <RideRouteView
        locations={locations}
        orderedIds={routeSelectionIds}
        onOrderedIdsChange={setRouteSelectionIds}
        onBack={() => setView("rideSchedule")}
        onPickRider={() => setView("riderSelect")}
        userId={user.uid}
        scheduleSummary={formatRideSlotSummaryLine(rideDateKey, ridePeriod)}
      />
    );
  }
  if (view === "navigate") {
    return (
      <RideActive
        onBackToMain={resetRideFlow}
      />
    );
  }

  /* ── Home screen ── */
  const handleLogout = async () => {
    if (confirm("로그아웃 하시겠습니까?")) {
      await signOut(auth);
    }
  };

  return (
    <div className={styles.screen}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.appBrand}>
          <div className={styles.brandIcon}>
            <svg width="20" height="20" viewBox="0 0 64 64" fill="none">
              <rect width="64" height="64" rx="14" fill="url(#g1)"/>
              <path d="M14 38h36M18 38l4-10h20l4 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="22" cy="42" r="3" fill="white"/>
              <circle cx="42" cy="42" r="3" fill="white"/>
              <path d="M40 24V16M36 20h8" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#1a56db"/>
                  <stop offset="1" stopColor="#60a5fa"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className={styles.brandName}>Ride Helper</span>
        </div>
        <div className={styles.userArea}>
          {user.photoURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.avatar} src={user.photoURL} alt="profile" referrerPolicy="no-referrer" />
          )}
          <button className={styles.logoutBtn} onClick={handleLogout} id="logout-btn">
            로그아웃
          </button>
        </div>
      </div>

      {/* Greeting */}
      <div className={styles.greeting}>
        <p className={styles.greetingText}>안녕하세요, {user.displayName?.split(" ")[0] ?? "팀원"}님 👋</p>
        <p className={styles.greetingSubText}>오늘도 안전한 라이드 되세요</p>
      </div>

      {/* Cards */}
      <div className={styles.cards}>
        {/* 주소 등록 */}
        <div className={styles.cardRow}>
          <button
            className={styles.card}
            onClick={() => setView("register")}
            id="register-address-btn"
          >
            <div className={styles.cardIconWrap} style={{ background: "rgba(59,130,246,0.15)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.cardTitle}>주소 등록</div>
              <div className={styles.cardSub}>
                {locations.length > 0 ? `${locations.length}개 저장됨` : "자주 가는 주소를 추가해요"}
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.cardArrow}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          <button
            className={styles.gearBtn}
            onClick={() => setView("manage")}
            id="manage-addresses-btn"
            aria-label="주소 관리"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            {locations.length > 0 && (
              <span className={styles.gearBadge}>{locations.length}</span>
            )}
          </button>
        </div>

        {/* 라이더 등록 */}
        <div className={styles.cardRow}>
          <button
            className={styles.card}
            onClick={() => setView("riderRegister")}
            id="register-rider-btn"
            type="button"
          >
            <div className={styles.cardIconWrap} style={{ background: "rgba(244,114,182,0.12)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.cardTitle}>라이더 등록</div>
              <div className={styles.cardSub}>
                {riders.length > 0 ? `${riders.length}명 등록됨` : "라이더 정보를 추가해요"}
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.cardArrow}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          <button
            className={styles.gearBtn}
            onClick={() => setView("riderManage")}
            id="manage-riders-btn"
            aria-label="라이더 관리"
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            {riders.length > 0 && (
              <span className={styles.gearBadge}>{riders.length}</span>
            )}
          </button>
        </div>

        {/* 운행 차량 등록 */}
        <div className={styles.cardRow}>
          <button
            className={styles.card}
            onClick={() => setView("vehicleRegister")}
            id="register-vehicle-btn"
            type="button"
          >
            <div className={styles.cardIconWrap} style={{ background: "rgba(16,185,129,0.12)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                <circle cx="7" cy="17" r="2"/>
                <path d="M9 17h6"/>
                <circle cx="17" cy="17" r="2"/>
              </svg>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.cardTitle}>운행 차량 등록</div>
              <div className={styles.cardSub}>
                {vehicles.length > 0 ? `${vehicles.length}대 등록됨` : "차량 정보를 추가해요"}
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.cardArrow}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          <button
            className={styles.gearBtn}
            onClick={() => setView("vehicleManage")}
            id="manage-vehicles-btn"
            aria-label="운행 차량 관리"
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            {vehicles.length > 0 && (
              <span className={styles.gearBadge}>{vehicles.length}</span>
            )}
          </button>
        </div>

        {/* 라이드 구성 */}
        <button
          className={`${styles.card} ${styles.cardFull} ${locations.length === 0 ? styles.cardDisabled : ""}`}
          onClick={() => {
            if (locations.length === 0) return;
            setEditingActiveRideId(null);
            setRouteSelectionIds([]);
            setRideDateKey(calendarDateKeyAppTz(Date.now()));
            setRidePeriod("am");
            setView("rideSchedule");
          }}
          id="ride-route-btn"
        >
          <div className={styles.cardIconWrap} style={{ background: "rgba(139,92,246,0.15)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h18M3 6h18M3 18h18"/>
            </svg>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.cardTitle}>라이드 구성</div>
            <div className={styles.cardSub}>
              {locations.length === 0
                ? "주소를 먼저 등록해주세요"
                : "날짜·오전/오후 → 경로 → 라이더 순으로 진행해요"}
            </div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.cardArrow}>
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        {/* 라이드 현황 */}
        <button
          className={`${styles.card} ${styles.cardFull}`}
          onClick={() => setView("rideStatus")}
          id="ride-status-btn"
          type="button"
        >
          <div className={styles.cardIconWrap} style={{ background: "rgba(59,130,246,0.12)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.cardTitle}>라이드 현황</div>
            <div className={styles.cardSub}>
              {rideActiveRides.length === 0
                ? "공유한 뒤 일정이 끝나기 전까지 여기에 표시돼요"
                : `진행 중 ${rideActiveRides.length}건 · 눌러서 경로 수정`}
            </div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.cardArrow}>
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        {/* 이전 라이드 */}
        <button
          className={`${styles.card} ${styles.cardFull}`}
          onClick={() => setView("recentRides")}
          id="recent-rides-btn"
          type="button"
        >
          <div className={styles.cardIconWrap} style={{ background: "rgba(16,185,129,0.12)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.cardTitle}>이전 라이드</div>
            <div className={styles.cardSub}>
              {recentRides.length === 0
                ? "라이드 공유·시작 시 경로가 여기에 저장돼요"
                : `최근 ${recentRides.length}건 · 불러와서 그대로 갈 수 있어요`}
            </div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.cardArrow}>
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        {/* 구글맵 내비게이션 연동 */}
        <div className={`${styles.card} ${styles.cardFull} ${styles.cardInactive}`}>
          <div className={styles.cardIconWrap} style={{ background: "rgba(255,255,255,0.05)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.cardTitle} style={{ color: "var(--text-muted)" }}>구글맵 내비게이션 연동</div>
            <div className={styles.cardSub}>라이드 구성 후 자동 연동됩니다</div>
          </div>
        </div>
      </div>
    </div>
  );
}
