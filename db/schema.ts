import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("settings", {
  userId: text("user_id").primaryKey(),
  monthlyBudget: real("monthly_budget").notNull().default(900),
  rent: real("rent").notNull().default(0),
  dietary: text("dietary").notNull().default(""),
});

export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  amount: real("amount").notNull(),
  category: text("category").notNull(),
  note: text("note").notNull(),
  date: text("date").notNull(),
});
