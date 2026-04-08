// src/lib/firestore.ts
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  deleteField,
  doc,
  query,
  orderBy,
  setDoc,
  getDoc,
  limit,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { formatStoredRideDateTime } from "./datetime";
import { isRideSlotEnded } from "./rideSlotEnd";
import {
  Location,
  LocationGender,
  LocationGroup,
  RecentRide,
  RideActiveEntry,
  Rider,
  RideDayPeriod,
  RideSlotAssignment,
  Vehicle,
} from "@/types";

/* ── Locations ── */

export async function getUserLocations(userId: string): Promise<Location[]> {
  const q = query(
    collection(db, "users", userId, "locations"),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Location));
}

/** 저장된 주소 중 같은 이름(대소문자·앞뒤 공백 무시)이 있는지 */
export async function isNicknameTaken(
  userId: string,
  nickname: string
): Promise<boolean> {
  const t = nickname.trim().toLowerCase();
  if (!t) return false;
  const locations = await getUserLocations(userId);
  return locations.some((l) => l.nickname.trim().toLowerCase() === t);
}

export async function addUserLocation(
  userId: string,
  data: Omit<Location, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "users", userId, "locations"), data);
  return ref.id;
}

export async function deleteUserLocation(
  userId: string,
  locationId: string
): Promise<void> {
  await deleteDoc(doc(db, "users", userId, "locations", locationId));
}

export async function updateUserLocation(
  userId: string,
  locationId: string,
  updates: Partial<{
    nickname: string;
    address: string;
    lat: number;
    lng: number;
    gender: LocationGender;
    phone: string;
    group: LocationGroup;
  }>
): Promise<void> {
  await setDoc(
    doc(db, "users", userId, "locations", locationId),
    updates,
    { merge: true }
  );
}

/* ── Riders (same fields as locations, different collection) ── */

export async function getUserRiders(userId: string): Promise<Rider[]> {
  const q = query(
    collection(db, "users", userId, "riders"),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Rider));
}

export async function isRiderNicknameTaken(
  userId: string,
  nickname: string
): Promise<boolean> {
  const t = nickname.trim().toLowerCase();
  if (!t) return false;
  const riders = await getUserRiders(userId);
  return riders.some((r) => r.nickname.trim().toLowerCase() === t);
}

export async function addRider(
  userId: string,
  data: Omit<Rider, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "users", userId, "riders"), data);
  return ref.id;
}

export async function deleteRider(
  userId: string,
  riderId: string
): Promise<void> {
  await deleteDoc(doc(db, "users", userId, "riders", riderId));
}

export async function updateRider(
  userId: string,
  riderId: string,
  updates: Partial<{
    nickname: string;
    address: string;
    lat: number;
    lng: number;
    gender: LocationGender;
    phone: string;
  }>
): Promise<void> {
  await setDoc(
    doc(db, "users", userId, "riders", riderId),
    updates,
    { merge: true }
  );
}

/* ── Vehicles ── */

export async function getUserVehicles(userId: string): Promise<Vehicle[]> {
  const q = query(
    collection(db, "users", userId, "vehicles"),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vehicle));
}

export async function isVehicleNameTaken(
  userId: string,
  name: string
): Promise<boolean> {
  const t = name.trim().toLowerCase();
  if (!t) return false;
  const vehicles = await getUserVehicles(userId);
  return vehicles.some((v) => v.name.trim().toLowerCase() === t);
}

export async function addVehicle(
  userId: string,
  data: Omit<Vehicle, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "users", userId, "vehicles"), data);
  return ref.id;
}

export async function deleteVehicle(userId: string, vehicleId: string): Promise<void> {
  await deleteDoc(doc(db, "users", userId, "vehicles", vehicleId));
}

export async function updateVehicle(
  userId: string,
  vehicleId: string,
  updates: Partial<{
    name: string;
    brandModel: string;
    maxPassengers: number;
  }>
): Promise<void> {
  await setDoc(
    doc(db, "users", userId, "vehicles", vehicleId),
    updates,
    { merge: true }
  );
}

/* ── Ride slot assignments (날짜·오전/오후별 라이더·차량 배정) ── */

/** Firestore에서 period가 문자열로만 일치하지 않는 경우·복합 쿼리 이슈 대비 */
function normalizeAssignmentPeriod(p: unknown): RideDayPeriod | undefined {
  if (p === "am" || p === "pm") return p;
  if (typeof p === "string") {
    const s = p.trim().toLowerCase();
    if (s === "am" || s === "pm") return s as RideDayPeriod;
  }
  return undefined;
}

function assignmentMatchesSlot(
  a: RideSlotAssignment,
  period: RideDayPeriod
): boolean {
  const p = normalizeAssignmentPeriod(a.period);
  if (p === period) return true;
  // period 필드가 없는 예전 문서는 오전 배정으로만 본다 → 오후 슬롯에는 매칭 안 함
  if (p == null && period === "pm") return false;
  if (p == null && period === "am") return true;
  return false;
}

/**
 * 같은 날짜의 배정만 가져온 뒤, 오전/오후는 메모리에서 걸러서
 * 복합 인덱스·쿼리 결과 혼선 없이 슬롯이 분리되도록 함.
 */
export async function getRideSlotAssignmentsForSlot(
  userId: string,
  dateKey: string,
  period: RideDayPeriod
): Promise<RideSlotAssignment[]> {
  const q = query(
    collection(db, "users", userId, "rideSlotAssignments"),
    where("dateKey", "==", dateKey)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as RideSlotAssignment))
    .filter((a) => assignmentMatchesSlot(a, period));
}

export async function addRideSlotAssignment(
  userId: string,
  data: Omit<RideSlotAssignment, "id">
): Promise<string> {
  const ref = await addDoc(
    collection(db, "users", userId, "rideSlotAssignments"),
    data
  );
  return ref.id;
}

/** 해당 날짜·오전/오후에서 라이더(·차량)에 맞는 배정 문서 1건 삭제 */
export async function deleteRideSlotAssignmentForRide(
  userId: string,
  dateKey: string,
  period: RideDayPeriod,
  riderId: string | undefined,
  vehicleId: string | null | undefined
): Promise<void> {
  if (!riderId) return;
  const rows = await getRideSlotAssignmentsForSlot(userId, dateKey, period);
  for (const a of rows) {
    if (a.riderId !== riderId) continue;
    const vMatch =
      vehicleId != null && vehicleId !== ""
        ? a.vehicleId === vehicleId
        : a.vehicleId == null || a.vehicleId === "";
    if (vMatch) {
      await deleteDoc(doc(db, "users", userId, "rideSlotAssignments", a.id));
      return;
    }
  }
}

/* ── Recent Rides ── */

export type SaveRecentRideMeta = {
  riderId?: string;
  riderNickname?: string;
  vehicleId?: string;
  vehicleName?: string;
  vehicleBrandModel?: string;
  vehicleMaxPassengers?: number;
  rideDateKey?: string;
  ridePeriod?: RideDayPeriod;
};

export async function saveRecentRide(
  userId: string,
  stops: Location[],
  meta?: SaveRecentRideMeta
): Promise<void> {
  const ridesRef = collection(db, "users", userId, "rides");
  const oldestFirst = query(ridesRef, orderBy("createdAt", "asc"));
  const existing = await getDocs(oldestFirst);
  if (existing.docs.length >= 10) {
    await deleteDoc(doc(db, "users", userId, "rides", existing.docs[0].id));
  }
  const now = Date.now();
  const ride: Omit<RecentRide, "id"> = {
    stops,
    createdAt: now,
    date: formatStoredRideDateTime(now),
    ...(meta?.rideDateKey && meta?.ridePeriod
      ? { rideDateKey: meta.rideDateKey, ridePeriod: meta.ridePeriod }
      : {}),
    ...(meta?.riderId
      ? { riderId: meta.riderId, riderNickname: meta.riderNickname ?? "" }
      : {}),
    ...(meta?.vehicleId
      ? {
          vehicleId: meta.vehicleId,
          vehicleName: meta.vehicleName ?? "",
          vehicleBrandModel: meta.vehicleBrandModel ?? "",
          vehicleMaxPassengers: meta.vehicleMaxPassengers ?? 0,
        }
      : {}),
  };
  await addDoc(ridesRef, ride);
}

export async function getRecentRides(userId: string): Promise<RecentRide[]> {
  const q = query(
    collection(db, "users", userId, "rides"),
    orderBy("createdAt", "desc"),
    limit(10)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RecentRide));
}

/* ── 라이드 현황 (공유 후 ~ 슬롯 종료 전) → 만료 시 rides 로 이전 ── */

export async function addRideActive(
  userId: string,
  stops: Location[],
  meta: SaveRecentRideMeta,
  sharedAt: number
): Promise<string> {
  const now = Date.now();
  const doc: Omit<RideActiveEntry, "id"> = {
    sharedAt,
    stops,
    createdAt: now,
    date: formatStoredRideDateTime(now),
    ...(meta.rideDateKey && meta.ridePeriod
      ? { rideDateKey: meta.rideDateKey, ridePeriod: meta.ridePeriod }
      : {}),
    ...(meta.riderId
      ? { riderId: meta.riderId, riderNickname: meta.riderNickname ?? "" }
      : {}),
    ...(meta.vehicleId
      ? {
          vehicleId: meta.vehicleId,
          vehicleName: meta.vehicleName ?? "",
          vehicleBrandModel: meta.vehicleBrandModel ?? "",
          vehicleMaxPassengers: meta.vehicleMaxPassengers ?? 0,
        }
      : {}),
  };
  const ref = await addDoc(collection(db, "users", userId, "rideActive"), doc);
  return ref.id;
}

export async function updateRideActive(
  userId: string,
  activeRideId: string,
  stops: Location[],
  meta: SaveRecentRideMeta,
  sharedAt: number
): Promise<void> {
  const ref = doc(db, "users", userId, "rideActive", activeRideId);
  const now = Date.now();
  const updates: Record<string, unknown> = {
    sharedAt,
    stops,
    date: formatStoredRideDateTime(now),
  };
  if (meta.rideDateKey && meta.ridePeriod) {
    updates.rideDateKey = meta.rideDateKey;
    updates.ridePeriod = meta.ridePeriod;
  }
  if (meta.riderId) {
    updates.riderId = meta.riderId;
    updates.riderNickname = meta.riderNickname ?? "";
  } else {
    updates.riderId = deleteField();
    updates.riderNickname = deleteField();
  }
  if (meta.vehicleId) {
    updates.vehicleId = meta.vehicleId;
    updates.vehicleName = meta.vehicleName ?? "";
    updates.vehicleBrandModel = meta.vehicleBrandModel ?? "";
    updates.vehicleMaxPassengers = meta.vehicleMaxPassengers ?? 0;
  } else {
    updates.vehicleId = deleteField();
    updates.vehicleName = deleteField();
    updates.vehicleBrandModel = deleteField();
    updates.vehicleMaxPassengers = deleteField();
  }
  await updateDoc(ref, updates);
}

/** 라이드 현황 삭제 + 해당 슬롯 배정 해제(Firestore 문서 삭제) */
export async function deleteRideActiveAndFreeSlot(
  userId: string,
  ride: RideActiveEntry
): Promise<void> {
  if (ride.rideDateKey && ride.ridePeriod && ride.riderId) {
    await deleteRideSlotAssignmentForRide(
      userId,
      ride.rideDateKey,
      ride.ridePeriod,
      ride.riderId,
      ride.vehicleId ?? null
    );
  }
  await deleteDoc(doc(db, "users", userId, "rideActive", ride.id));
}

export async function getRideActiveRides(userId: string): Promise<RideActiveEntry[]> {
  const snap = await getDocs(collection(db, "users", userId, "rideActive"));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RideActiveEntry));
  return list
    .filter(
      (r) =>
        r.rideDateKey &&
        r.ridePeriod &&
        !isRideSlotEnded(r.rideDateKey, r.ridePeriod)
    )
    .sort((a, b) => b.sharedAt - a.sharedAt);
}

/** 슬롯 종료 시각이 지난 항목을 이전 라이드(rides)로 옮기고 rideActive 에서 삭제 */
export async function migrateExpiredActiveRides(userId: string): Promise<void> {
  const snap = await getDocs(collection(db, "users", userId, "rideActive"));
  for (const docSnap of snap.docs) {
    const data = { id: docSnap.id, ...docSnap.data() } as RideActiveEntry;
    if (!data.rideDateKey || !data.ridePeriod) continue;
    if (!isRideSlotEnded(data.rideDateKey, data.ridePeriod)) continue;
    await saveRecentRide(userId, data.stops, {
      riderId: data.riderId,
      riderNickname: data.riderNickname,
      vehicleId: data.vehicleId,
      vehicleName: data.vehicleName,
      vehicleBrandModel: data.vehicleBrandModel,
      vehicleMaxPassengers: data.vehicleMaxPassengers,
      rideDateKey: data.rideDateKey,
      ridePeriod: data.ridePeriod,
    });
    await deleteDoc(doc(db, "users", userId, "rideActive", docSnap.id));
  }
}

/* ── Whitelist ── */

export async function checkWhitelist(email: string): Promise<boolean> {
  const docRef = doc(db, "whitelist", email);
  const docSnap = await getDoc(docRef);
  return docSnap.exists();
}

export async function ensureUserProfile(user: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}): Promise<void> {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email: user.email ?? "",
      displayName: user.displayName ?? "",
      photoURL: user.photoURL ?? "",
      createdAt: Date.now(),
    });
  }
}
