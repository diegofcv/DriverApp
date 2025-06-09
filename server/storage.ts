import { drivers, type Driver, type InsertDriver, type DriverStatus, type QueueStats } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getDriver(id: number): Promise<Driver | undefined>;
  getAllDrivers(): Promise<Driver[]>;
  getDriversByStatus(status: DriverStatus): Promise<Driver[]>;
  createDriver(driver: InsertDriver): Promise<Driver>;
  updateDriverStatus(id: number, status: DriverStatus): Promise<Driver | undefined>;
  updateDriverPosition(id: number, position: number): Promise<Driver | undefined>;
  incrementDeliveryCount(id: number): Promise<Driver | undefined>;
  getQueueStats(): Promise<QueueStats>;
  getActiveQueue(): Promise<Driver[]>;
  reorderQueue(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getDriver(id: number): Promise<Driver | undefined> {
    const [driver] = await db.select().from(drivers).where(eq(drivers.id, id));
    return driver || undefined;
  }

  async getAllDrivers(): Promise<Driver[]> {
    return await db.select().from(drivers);
  }

  async getDriversByStatus(status: DriverStatus): Promise<Driver[]> {
    return await db.select().from(drivers).where(eq(drivers.status, status));
  }

  async createDriver(insertDriver: InsertDriver): Promise<Driver> {
    const [driver] = await db
      .insert(drivers)
      .values(insertDriver)
      .returning();
    return driver;
  }

  async updateDriverStatus(id: number, status: DriverStatus): Promise<Driver | undefined> {
    const driver = await this.getDriver(id);
    if (!driver) return undefined;

    const updateData: Partial<Driver> = {
      status,
      activeTime: status === 'active' ? new Date() : driver.activeTime,
    };

    // If driver becomes active, add to end of queue
    if (status === 'active' && driver.status !== 'active') {
      const activeDrivers = await this.getDriversByStatus('active');
      const maxPosition = activeDrivers.reduce((max, d) => Math.max(max, d.position || 0), 0);
      updateData.position = maxPosition + 1;
    }

    const [updatedDriver] = await db
      .update(drivers)
      .set(updateData)
      .where(eq(drivers.id, id))
      .returning();

    // If driver becomes busy or inactive, reorder queue
    if (status !== 'active') {
      await this.reorderQueue();
    }

    return updatedDriver;
  }

  async updateDriverPosition(id: number, position: number): Promise<Driver | undefined> {
    const [updatedDriver] = await db
      .update(drivers)
      .set({ position })
      .where(eq(drivers.id, id))
      .returning();
    return updatedDriver || undefined;
  }

  async incrementDeliveryCount(id: number): Promise<Driver | undefined> {
    const driver = await this.getDriver(id);
    if (!driver) return undefined;

    const [updatedDriver] = await db
      .update(drivers)
      .set({ deliveriesCount: (driver.deliveriesCount || 0) + 1 })
      .where(eq(drivers.id, id))
      .returning();
    return updatedDriver || undefined;
  }

  async getQueueStats(): Promise<QueueStats> {
    const allDrivers = await this.getAllDrivers();
    return {
      totalDrivers: allDrivers.length,
      activeDrivers: allDrivers.filter(d => d.status === 'active').length,
      busyDrivers: allDrivers.filter(d => d.status === 'busy').length,
      deliveriesToday: allDrivers.reduce((sum, d) => sum + (d.deliveriesCount || 0), 0),
    };
  }

  async getActiveQueue(): Promise<Driver[]> {
    const activeDrivers = await this.getDriversByStatus('active');
    return activeDrivers.sort((a, b) => (a.position || 0) - (b.position || 0));
  }

  async reorderQueue(): Promise<void> {
    const activeDrivers = await this.getDriversByStatus('active');
    activeDrivers.sort((a, b) => (a.position || 0) - (b.position || 0));
    
    for (let i = 0; i < activeDrivers.length; i++) {
      await db
        .update(drivers)
        .set({ position: i + 1 })
        .where(eq(drivers.id, activeDrivers[i].id));
    }
  }
}

export const storage = new DatabaseStorage();
