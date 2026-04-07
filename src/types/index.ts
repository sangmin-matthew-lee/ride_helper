// src/types/index.ts
export interface Location {
  id: string;
  nickname: string;
  address: string;
  lat: number;
  lng: number;
  createdAt: number;
}

export interface RecentRide {
  id: string;
  stops: Location[];
  createdAt: number;
  date: string;
}

export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  isWhitelisted: boolean;
}

export type Tab = "home" | "ride" | "settings";
export type RideStep = "select" | "sort" | "active";
