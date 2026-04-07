// src/lib/firestore.ts
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  setDoc,
  getDoc,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";
import { Location, RecentRide } from "@/types";

/* ── Locations ── */

export async function getUserLocations(userId: string): Promise<Location[]> {
  const q = query(
    collection(db, "users", userId, "locations"),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Location));
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
  updates: Partial<{ nickname: string; address: string; lat: number; lng: number }>
): Promise<void> {
  await setDoc(
    doc(db, "users", userId, "locations", locationId),
    updates,
    { merge: true }
  );
}


/* ── Recent Rides ── */

export async function saveRecentRide(
  userId: string,
  stops: Location[]
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
    date: new Date(now).toLocaleString("ko-KR", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
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
