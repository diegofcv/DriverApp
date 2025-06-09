import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const drivers = pgTable("drivers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  status: text("status").notNull().default("inactive"), // 'inactive', 'active', 'busy'
  position: integer("position").default(0),
  activeTime: timestamp("active_time"),
  deliveriesCount: integer("deliveries_count").default(0),
});

export const insertDriverSchema = createInsertSchema(drivers).pick({
  name: true,
  phone: true,
});

export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = typeof drivers.$inferSelect;

export type DriverStatus = 'inactive' | 'active' | 'busy';

export interface QueueStats {
  totalDrivers: number;
  activeDrivers: number;
  busyDrivers: number;
  deliveriesToday: number;
}
