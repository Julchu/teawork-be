import type { Coordinates } from "../types";

const EARTH_RADIUS_METERS = 6_371_000;

export const CAFE_MATCH_RADIUS_METERS = 50;

export const distanceMeters = (from: Coordinates, to: Coordinates) => {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latDelta = toRadians(to.lat - from.lat);
  const lngDelta = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const haversine =
    Math.sin(latDelta / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(lngDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(haversine)));
};

export const boundingBox = (origin: Coordinates, radiusMeters: number) => {
  const latDelta = radiusMeters / 111_320;
  const lngDenominator = 111_320 * Math.max(Math.cos((origin.lat * Math.PI) / 180), 0.01);
  const lngDelta = radiusMeters / lngDenominator;

  return {
    minLat: origin.lat - latDelta,
    maxLat: origin.lat + latDelta,
    minLng: origin.lng - lngDelta,
    maxLng: origin.lng + lngDelta,
  };
};

export const normalizePlaceText = (value: string) =>
  value.trim().toLowerCase().replace(/[.,#]/g, "").replace(/\s+/g, " ");

export const selectMatchingCafe = <
  T extends { name: string; address: string; coordinates: Coordinates },
>(
  candidates: T[],
  submitted: { name: string; address: string; coordinates: Coordinates },
) => {
  const within = candidates
    .map((candidate) => ({
      candidate,
      distance: distanceMeters(candidate.coordinates, submitted.coordinates),
    }))
    .filter((item) => item.distance <= CAFE_MATCH_RADIUS_METERS);

  const name = normalizePlaceText(submitted.name);
  const address = normalizePlaceText(submitted.address);
  const sameName = within.filter((item) => normalizePlaceText(item.candidate.name) === name);
  const sameAddress = within.filter(
    (item) => normalizePlaceText(item.candidate.address) === address,
  );
  const pool = sameName.length > 0 ? sameName : sameAddress.length === 1 ? sameAddress : [];
  const nearest = pool[0];
  if (!nearest) return;

  return pool.reduce((closest, item) => (item.distance < closest.distance ? item : closest))
    .candidate;
};