import { index, integer, pgTable, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { cafeTable } from "./cafe.schema.ts";
import { userTable } from "./user.schema.ts";

// A user's stars. The cafe itself is shared; this row is not.
// Rows are removed on unfavorite so the unique pair can be inserted again.

export const userFavoriteCafeTable = pgTable(
  "user_favorite_cafes",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .references(() => userTable.id, { onDelete: "cascade" })
      .notNull(),
    cafeId: integer("cafe_id")
      .references(() => cafeTable.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("user_favorite_cafes_user_cafe_unique").on(table.userId, table.cafeId),
    index("user_favorite_cafes_cafe_id_idx").on(table.cafeId),
  ],
);
