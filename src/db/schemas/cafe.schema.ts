import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { BathroomLockValues, LocationValues } from "../../types";
import { requiredColumns, timestamps } from "../utils/shared-schema.ts";
import { userTable } from "./user.schema.ts";

// One shared row per place. Any signed-in user can read it and submit new notes
// (wifi, busy times, bathroom, and the rest of CafeType). A later submit updates
// this row when the place already exists. Favorites stay per user.
// Latitude and longitude are plain doubles so this runs on stock Postgres.

export const locationTypeEnum = pgEnum("cafe_location_type", LocationValues);
export const bathroomLockEnum = pgEnum("bathroom_lock", BathroomLockValues);

export const cafeTable = pgTable(
  "cafes",
  {
    ...requiredColumns,
    createdByUserId: integer("created_by_user_id").references(() => userTable.id, {
      onDelete: "set null",
    }),
    updatedByUserId: integer("updated_by_user_id").references(() => userTable.id, {
      onDelete: "set null",
    }),
    name: varchar({ length: 255 }).notNull(),
    address: varchar({ length: 500 }).notNull(),
    latitude: doublePrecision().notNull(),
    longitude: doublePrecision().notNull(),
    locationType: locationTypeEnum("location_type").notNull(),
    wifiAvailable: boolean("wifi_available").notNull().default(false),
    wifiName: varchar("wifi_name", { length: 255 }).notNull().default(""),
    wifiPassword: varchar("wifi_password", { length: 255 }).notNull().default(""),
    wifiFast: boolean("wifi_fast").notNull().default(false),
    outlet: boolean().notNull().default(false),
    bathroomAvailable: boolean("bathroom_available").notNull().default(false),
    bathroomClean: boolean("bathroom_clean").notNull().default(false),
    bathroomLock: bathroomLockEnum("bathroom_lock"),
    seating: boolean().notNull().default(false),
    clean: boolean().notNull().default(false),
    busyMorning: boolean("busy_morning").notNull().default(false),
    busyAfternoon: boolean("busy_afternoon").notNull().default(false),
    busyEvening: boolean("busy_evening").notNull().default(false),
    parking: boolean().notNull().default(false),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("cafes_public_id_unique").on(table.publicId),
    index("cafes_created_by_user_id_idx").on(table.createdByUserId),
    index("cafes_coordinates_idx").on(table.latitude, table.longitude),
    check("cafes_latitude_check", sql`${table.latitude} >= -90 AND ${table.latitude} <= 90`),
    check("cafes_longitude_check", sql`${table.longitude} >= -180 AND ${table.longitude} <= 180`),
  ],
);

export type SelectCafe = InferSelectModel<typeof cafeTable>;
export type InsertCafe = InferInsertModel<typeof cafeTable>;