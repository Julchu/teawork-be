import { drizzle } from "drizzle-orm/postgres-js";
import { cafeTable } from "./schemas/cafe.schema.ts";
import { cafeRelations, userFavoriteCafeRelations, userRelations } from "./schemas/relations.ts";
import { refreshTokenTable } from "./schemas/refresh-token.schema.ts";
import { userFavoriteCafeTable } from "./schemas/user-favorite-cafe.schema.ts";
import { userTable } from "./schemas/user.schema.ts";

export const db = drizzle({
  connection: {
    url: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" || process.env.NODE_ENV === "staging",
  },
  schema: {
    userTable,
    refreshTokenTable,
    cafeTable,
    userFavoriteCafeTable,
    userRelations,
    cafeRelations,
    userFavoriteCafeRelations,
  },
});
