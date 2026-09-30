import { relations } from "drizzle-orm";
import { cafeTable } from "./cafe.schema.ts";
import { userFavoriteCafeTable } from "./user-favorite-cafe.schema.ts";
import { userTable } from "./user.schema.ts";

export const userRelations = relations(userTable, ({ many }) => ({
  createdCafes: many(cafeTable, { relationName: "cafeCreatedBy" }),
  updatedCafes: many(cafeTable, { relationName: "cafeUpdatedBy" }),
  favoriteCafes: many(userFavoriteCafeTable),
}));

export const cafeRelations = relations(cafeTable, ({ one, many }) => ({
  createdBy: one(userTable, {
    fields: [cafeTable.createdByUserId],
    references: [userTable.id],
    relationName: "cafeCreatedBy",
  }),
  updatedBy: one(userTable, {
    fields: [cafeTable.updatedByUserId],
    references: [userTable.id],
    relationName: "cafeUpdatedBy",
  }),
  favorites: many(userFavoriteCafeTable),
}));

export const userFavoriteCafeRelations = relations(userFavoriteCafeTable, ({ one }) => ({
  user: one(userTable, {
    fields: [userFavoriteCafeTable.userId],
    references: [userTable.id],
  }),
  cafe: one(cafeTable, {
    fields: [userFavoriteCafeTable.cafeId],
    references: [cafeTable.id],
  }),
}));
