import { pgTable, text, serial, integer, jsonb, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sessionsTable = pgTable("sessions", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  filename: text("filename"),
  originalCode: text("original_code").notNull(),
  transformedCode: text("transformed_code").notNull(),
  totalChanges: integer("total_changes").notNull().default(0),
  automaticChanges: integer("automatic_changes").notNull().default(0),
  aiRequiredChanges: integer("ai_required_changes").notNull().default(0),
  coveragePercent: real("coverage_percent").notNull().default(0),
  byCategory: jsonb("by_category").$type<Record<string, number>>().notNull().default({}),
});

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({ createdAt: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;
