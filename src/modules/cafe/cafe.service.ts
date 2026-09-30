import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "../../db";
import { cafeTable, type SelectCafe } from "../../db/schemas/cafe.schema.ts";
import { userFavoriteCafeTable } from "../../db/schemas/user-favorite-cafe.schema.ts";
import type { CafeInput, Coordinates, SavedCafe } from "../../types";
import {
  boundingBox,
  CAFE_MATCH_RADIUS_METERS,
  distanceMeters,
  selectMatchingCafe,
} from "../../utils/coordinates.ts";
import type { CafeUpdate } from "./cafe.validation.ts";

type CafeWithFavorites = SelectCafe & {
  favorites: { id: number }[];
};

type CafeQuery = {
  near?: Coordinates & { radiusMeters: number };
  submitted?: boolean;
};

type SaveCafeResult =
  { status: "saved"; publicId: string; created: boolean } | { status: "not_found" };

type DeleteCafeResult = "deleted" | "not_found" | "forbidden";

const toSavedCafe = (cafe: SelectCafe, favorite: boolean): SavedCafe => ({
  publicId: cafe.publicId,
  name: cafe.name,
  address: cafe.address,
  coordinates: { lat: cafe.latitude, lng: cafe.longitude },
  type: cafe.locationType,
  wifi: {
    available: cafe.wifiAvailable,
    name: cafe.wifiName,
    password: cafe.wifiPassword,
    fast: cafe.wifiFast,
  },
  outlet: cafe.outlet,
  bathroom: {
    available: cafe.bathroomAvailable,
    clean: cafe.bathroomClean,
    locked: cafe.bathroomLock ?? undefined,
  },
  seating: cafe.seating,
  clean: cafe.clean,
  busy: {
    morning: cafe.busyMorning,
    afternoon: cafe.busyAfternoon,
    evening: cafe.busyEvening,
  },
  parking: cafe.parking,
  favorite,
});

const toCafeValues = (input: CafeInput) => ({
  name: input.name,
  address: input.address,
  latitude: input.coordinates.lat,
  longitude: input.coordinates.lng,
  locationType: input.type,
  wifiAvailable: input.wifi.available,
  wifiName: input.wifi.name,
  wifiPassword: input.wifi.password,
  wifiFast: input.wifi.fast,
  outlet: input.outlet,
  bathroomAvailable: input.bathroom.available,
  bathroomClean: input.bathroom.clean,
  bathroomLock: input.bathroom.locked ?? null,
  seating: input.seating,
  clean: input.clean,
  busyMorning: input.busy.morning,
  busyAfternoon: input.busy.afternoon,
  busyEvening: input.busy.evening,
  parking: input.parking,
});

const toCafePatch = (patch: CafeUpdate) => {
  const values: Partial<ReturnType<typeof toCafeValues>> = {};

  if (patch.name !== undefined) values.name = patch.name;
  if (patch.address !== undefined) values.address = patch.address;
  if (patch.type !== undefined) values.locationType = patch.type;
  if (patch.coordinates) {
    values.latitude = patch.coordinates.lat;
    values.longitude = patch.coordinates.lng;
  }
  if (patch.outlet !== undefined) values.outlet = patch.outlet;
  if (patch.seating !== undefined) values.seating = patch.seating;
  if (patch.clean !== undefined) values.clean = patch.clean;
  if (patch.parking !== undefined) values.parking = patch.parking;

  if (patch.wifi?.available !== undefined) values.wifiAvailable = patch.wifi.available;
  if (patch.wifi?.name !== undefined) values.wifiName = patch.wifi.name;
  if (patch.wifi?.password !== undefined) values.wifiPassword = patch.wifi.password;
  if (patch.wifi?.fast !== undefined) values.wifiFast = patch.wifi.fast;

  if (patch.bathroom?.available !== undefined) values.bathroomAvailable = patch.bathroom.available;
  if (patch.bathroom?.clean !== undefined) values.bathroomClean = patch.bathroom.clean;
  if (patch.bathroom?.locked !== undefined) values.bathroomLock = patch.bathroom.locked;

  if (patch.busy?.morning !== undefined) values.busyMorning = patch.busy.morning;
  if (patch.busy?.afternoon !== undefined) values.busyAfternoon = patch.busy.afternoon;
  if (patch.busy?.evening !== undefined) values.busyEvening = patch.busy.evening;

  return values;
};

const withFavorite = (rows: CafeWithFavorites[]) =>
  rows.map((row) => toSavedCafe(row, row.favorites.length > 0));

const findCafeRow = async (publicId: string, userId: number) => {
  try {
    return await db.query.cafeTable.findFirst({
      where: {
        publicId,
        deletedAt: { isNull: true },
      },
      with: {
        favorites: {
          where: { userId },
          limit: 1,
          columns: { id: true },
        },
      },
    });
  } catch (error) {
    throw new Error("Error getting cafe", { cause: error });
  }
};

export const listCafes = async (userId: number, query: CafeQuery = {}) => {
  try {
    const box = query.near ? boundingBox(query.near, query.near.radiusMeters) : undefined;
    const rows = await db.query.cafeTable.findMany({
      where: {
        deletedAt: { isNull: true },
        ...(query.submitted
          ? {
              OR: [{ createdByUserId: userId }, { updatedByUserId: userId }],
            }
          : {}),
        ...(box
          ? {
              latitude: { gte: box.minLat, lte: box.maxLat },
              longitude: { gte: box.minLng, lte: box.maxLng },
            }
          : {}),
      },
      with: {
        favorites: {
          where: { userId },
          limit: 1,
          columns: { id: true },
        },
      },
      orderBy: { updatedAt: "desc", createdAt: "desc" },
    });

    const near = query.near;
    const nearby = near
      ? rows.filter(
          (row) =>
            distanceMeters(near, { lat: row.latitude, lng: row.longitude }) <= near.radiusMeters,
        )
      : rows;

    return withFavorite(nearby);
  } catch (error) {
    throw new Error("Error listing cafes", { cause: error });
  }
};

export const getCafe = async (userId: number, publicId: string) => {
  const cafe = await findCafeRow(publicId, userId);
  if (!cafe) return;
  return toSavedCafe(cafe, cafe.favorites.length > 0);
};

export const listFavoriteCafes = async (userId: number) => {
  try {
    const rows = await db.query.userFavoriteCafeTable.findMany({
      where: { userId },
      with: { cafe: true },
      orderBy: { createdAt: "desc" },
    });

    return rows
      .filter((row) => row.cafe.deletedAt === null)
      .map((row) => toSavedCafe(row.cafe, true));
  } catch (error) {
    throw new Error("Error listing favorite cafes", { cause: error });
  }
};

const findMatchingCafe = async (input: CafeInput) => {
  const box = boundingBox(input.coordinates, CAFE_MATCH_RADIUS_METERS);
  const rows = await db
    .select()
    .from(cafeTable)
    .where(
      and(
        isNull(cafeTable.deletedAt),
        gte(cafeTable.latitude, box.minLat),
        lte(cafeTable.latitude, box.maxLat),
        gte(cafeTable.longitude, box.minLng),
        lte(cafeTable.longitude, box.maxLng),
      ),
    );

  const match = selectMatchingCafe(
    rows.map((row) => ({
      row,
      name: row.name,
      address: row.address,
      coordinates: { lat: row.latitude, lng: row.longitude },
    })),
    input,
  );

  return match?.row;
};

export const saveCafe = async (
  userId: number,
  input: CafeInput,
  publicId?: string,
): Promise<SaveCafeResult> => {
  try {
    const existing = publicId
      ? await db.query.cafeTable.findFirst({
          where: {
            publicId,
            deletedAt: { isNull: true },
          },
        })
      : await findMatchingCafe(input);

    if (publicId && !existing) return { status: "not_found" };

    if (existing) {
      await db
        .update(cafeTable)
        .set({ ...toCafeValues(input), updatedByUserId: userId })
        .where(and(eq(cafeTable.id, existing.id), isNull(cafeTable.deletedAt)));

      return { status: "saved", publicId: existing.publicId, created: false };
    }

    const [created] = await db
      .insert(cafeTable)
      .values({
        ...toCafeValues(input),
        createdByUserId: userId,
        updatedByUserId: userId,
      })
      .returning({ publicId: cafeTable.publicId });

    if (!created) return { status: "not_found" };
    return { status: "saved", publicId: created.publicId, created: true };
  } catch (error) {
    throw new Error("Error saving cafe", { cause: error });
  }
};

export const updateCafe = async (userId: number, publicId: string, patch: CafeUpdate) => {
  const existing = await findCafeRow(publicId, userId);
  if (!existing) return;

  try {
    const [updated] = await db
      .update(cafeTable)
      .set({ ...toCafePatch(patch), updatedByUserId: userId })
      .where(and(eq(cafeTable.id, existing.id), isNull(cafeTable.deletedAt)))
      .returning();

    if (!updated) return;
    return toSavedCafe(updated, existing.favorites.length > 0);
  } catch (error) {
    throw new Error("Error updating cafe", { cause: error });
  }
};

export const deleteCafe = async (userId: number, publicId: string): Promise<DeleteCafeResult> => {
  const existing = await findCafeRow(publicId, userId);
  if (!existing) return "not_found";
  if (existing.createdByUserId !== userId) return "forbidden";

  try {
    await db.transaction(async (tx) => {
      await tx.delete(userFavoriteCafeTable).where(eq(userFavoriteCafeTable.cafeId, existing.id));
      await tx
        .update(cafeTable)
        .set({ deletedAt: new Date(), updatedByUserId: userId })
        .where(eq(cafeTable.id, existing.id));
    });
    return "deleted";
  } catch (error) {
    throw new Error("Error deleting cafe", { cause: error });
  }
};

export const setCafeFavorite = async (userId: number, publicId: string, favorite: boolean) => {
  const existing = await findCafeRow(publicId, userId);
  if (!existing) return;

  try {
    if (favorite) {
      await db
        .insert(userFavoriteCafeTable)
        .values({ userId, cafeId: existing.id })
        .onConflictDoNothing({
          target: [userFavoriteCafeTable.userId, userFavoriteCafeTable.cafeId],
        });
    } else {
      await db
        .delete(userFavoriteCafeTable)
        .where(
          and(
            eq(userFavoriteCafeTable.userId, userId),
            eq(userFavoriteCafeTable.cafeId, existing.id),
          ),
        );
    }

    return toSavedCafe(existing, favorite);
  } catch (error) {
    throw new Error("Error updating cafe favorite", { cause: error });
  }
};