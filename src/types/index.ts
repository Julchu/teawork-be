import type { Request } from "express";

export const Color = {
  LIGHT: "light",
  DARK: "dark",
} as const;

export const ColorValues = [Color.LIGHT, Color.DARK] as const;
export type ColorMode = (typeof ColorValues)[number];

export type Coordinates = {
  lat: number;
  lng: number;
};

export type MapHistoryEntry = {
  coordinates: Coordinates;
  recordedAt: string;
};

export type CheckIn = {
  id: string;
  cafePublicId?: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  checkedInAt: string;
};

export type UserPreferences = {
  colorMode: ColorMode;
  displayName: string;
  mapStyle?: string;
  performanceMode: boolean;
  lastLocation?: Coordinates;
  mapHistory?: MapHistoryEntry[];
  checkIns?: CheckIn[];
};

export type User = {
  id: number;
  publicId: string;
  email: string;
  image?: string | null;
  name: string;
  preferences?: UserPreferences;
};

export type AuthRequest<
  TParams = Record<string, unknown>,
  TResBody = unknown,
  TReqBody = unknown,
  TQuery = Record<string, unknown>,
> = Request<TParams, TResBody, TReqBody, TQuery> & {
  userId?: number;
};

const LocationEnum = {
  CAFE: "cafe",
  RESTAURANT: "restaurant",
  COWORKING_SPACE: "coworking space",
  PATIO: "patio",
  OTHER: "other",
} as const;
export const LocationValues = [
  LocationEnum.CAFE,
  LocationEnum.RESTAURANT,
  LocationEnum.COWORKING_SPACE,
  LocationEnum.PATIO,
  LocationEnum.OTHER,
] as const;
export type LocationType = (typeof LocationValues)[number];

export type WifiType = {
  available: boolean;
  name: string;
  password: string;
  fast: boolean;
};

const BathroomLockEnum = {
  KEY: "key",
  CODE: "code",
} as const;
export const BathroomLockValues = [BathroomLockEnum.KEY, BathroomLockEnum.CODE] as const;
export type BathroomLockType = (typeof BathroomLockValues)[number] | undefined;

export type BathroomType = {
  available: boolean;
  clean: boolean;
  locked: BathroomLockType;
};

export type BusyType = {
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
};

export type CafeType = {
  address: string;
  name: string;
  type: LocationType;
  wifi: WifiType;
  outlet: boolean;
  bathroom: BathroomType;
  seating: boolean;
  clean: boolean;
  busy: BusyType;
  parking: boolean;
};

export type CafeInput = CafeType & {
  coordinates: Coordinates;
};

export type SavedCafe = CafeInput & {
  publicId: string;
  favorite: boolean;
};
