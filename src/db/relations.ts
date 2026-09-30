import { defineRelations } from "drizzle-orm";
import { cafeTable } from "./schemas/cafe.schema.ts";
import { refreshTokenTable } from "./schemas/refresh-token.schema.ts";
import { userFavoriteCafeTable } from "./schemas/user-favorite-cafe.schema.ts";
import { userTable } from "./schemas/user.schema.ts";

export const schema = {
  userTable,
  refreshTokenTable,
  cafeTable,
  userFavoriteCafeTable,
};

export const relations = defineRelations(schema, (r) => ({
  userTable: {
    createdCafes: r.many.cafeTable({
      from: r.userTable.id,
      to: r.cafeTable.createdByUserId,
      alias: "cafeCreatedBy",
    }),
    updatedCafes: r.many.cafeTable({
      from: r.userTable.id,
      to: r.cafeTable.updatedByUserId,
      alias: "cafeUpdatedBy",
    }),
    favoriteCafes: r.many.userFavoriteCafeTable(),
    refreshTokens: r.many.refreshTokenTable(),
  },
  cafeTable: {
    createdBy: r.one.userTable({
      from: r.cafeTable.createdByUserId,
      to: r.userTable.id,
      optional: true,
      alias: "cafeCreatedBy",
    }),
    updatedBy: r.one.userTable({
      from: r.cafeTable.updatedByUserId,
      to: r.userTable.id,
      optional: true,
      alias: "cafeUpdatedBy",
    }),
    favorites: r.many.userFavoriteCafeTable(),
  },
  userFavoriteCafeTable: {
    user: r.one.userTable({
      from: r.userFavoriteCafeTable.userId,
      to: r.userTable.id,
      optional: false,
    }),
    cafe: r.one.cafeTable({
      from: r.userFavoriteCafeTable.cafeId,
      to: r.cafeTable.id,
      optional: false,
    }),
  },
  refreshTokenTable: {
    user: r.one.userTable({
      from: r.refreshTokenTable.userId,
      to: r.userTable.id,
      optional: false,
    }),
  },
}));
