// src/types/index.ts
export type LocationGender = "male" | "female";

/** 주소 그룹: 고정(자주 쓰는 곳) / 임시(일회성 등) */
export type LocationGroup = "fixed" | "temporary";

export interface Location {
  id: string;
  nickname: string;
  address: string;
  lat: number;
  lng: number;
  createdAt: number;
  /** 주소 담당 성별 (기존 데이터 없을 수 있음) */
  gender?: LocationGender;
  /** 연락처 (기존 데이터 없을 수 있음) */
  phone?: string;
  /** 없으면 고정으로 취급 */
  group?: LocationGroup;
}

/** 라이더도 주소와 동일한 필드 구조 (`users/{uid}/riders`) */
export type Rider = Location;

/** 운행 차량 (`users/{uid}/vehicles`) */
export interface Vehicle {
  id: string;
  /** 차량 구분 이름(별명) */
  name: string;
  /** 브랜드 및 모델명 */
  brandModel: string;
  /** 최대 탑승 인원 */
  maxPassengers: number;
  createdAt: number;
}

export interface RecentRide {
  id: string;
  stops: Location[];
  createdAt: number;
  /** 저장 시각 표시용 (이전 라이드 백업) */
  date: string;
  /** 라이드 일정: 날짜(LA 달력 YYYY-MM-DD) + 오전/오후 (없으면 예전 저장 데이터) */
  rideDateKey?: string;
  ridePeriod?: RideDayPeriod;
  /** 저장 시점의 라이더 (공유/시작 시 기록) */
  riderId?: string;
  riderNickname?: string;
  /** 저장 시점의 운행 차량 */
  vehicleId?: string;
  vehicleName?: string;
  vehicleBrandModel?: string;
  vehicleMaxPassengers?: number;
}

/** 라이드 공유 직후 ~ 슬롯 종료 전 (`users/{uid}/rideActive`) */
export type RideActiveEntry = RecentRide & {
  /** 라이드 공유 버튼을 누른 시각 */
  sharedAt: number;
};

export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  isWhitelisted: boolean;
}

export type Tab = "home" | "ride" | "settings";
export type RideStep = "select" | "sort" | "active";

/** 라이드 일정: LA 달력 날짜 키(YYYY-MM-DD) + 오전/오후 */
export type RideDayPeriod = "am" | "pm";

/** 같은 날·같은 오전/오후 슬롯에 라이더·차량 배정 기록 (`users/{uid}/rideSlotAssignments`) */
export interface RideSlotAssignment {
  id: string;
  dateKey: string;
  period: RideDayPeriod;
  riderId: string;
  /** 차량 없이 라이더만 배정한 경우 null */
  vehicleId: string | null;
  createdAt: number;
}
