import { drivers, type Driver, type InsertDriver, type DriverStatus, type QueueStats } from "@shared/schema";

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

export class MemStorage implements IStorage {
  private drivers: Map<number, Driver>;
  private currentId: number;

  constructor() {
    this.drivers = new Map();
    this.currentId = 1;
  }

  async getDriver(id: number): Promise<Driver | undefined> {
    return this.drivers.get(id);
  }

  async getAllDrivers(): Promise<Driver[]> {
    return Array.from(this.drivers.values());
  }

  async getDriversByStatus(status: DriverStatus): Promise<Driver[]> {
    return Array.from(this.drivers.values()).filter(driver => driver.status === status);
  }

  async createDriver(insertDriver: InsertDriver): Promise<Driver> {
    const id = this.currentId++;
    const driver: Driver = {
      ...insertDriver,
      id,
      status: "inactive",
      position: 0,
      activeTime: null,
      deliveriesCount: 0,
    };
    this.drivers.set(id, driver);
    return driver;
  }

  async updateDriverStatus(id: number, status: DriverStatus): Promise<Driver | undefined> {
    const driver = this.drivers.get(id);
    if (!driver) return undefined;

    const updatedDriver = {
      ...driver,
      status,
      activeTime: status === 'active' ? new Date() : driver.activeTime,
    };

    this.drivers.set(id, updatedDriver);

    // If driver becomes active, add to end of queue
    if (status === 'active' && driver.status !== 'active') {
      const activeDrivers = await this.getDriversByStatus('active');
      const maxPosition = activeDrivers.reduce((max, d) => Math.max(max, d.position || 0), 0);
      updatedDriver.position = maxPosition + 1;
      this.drivers.set(id, updatedDriver);
    }

    // If driver becomes busy or inactive, reorder queue
    if (status !== 'active') {
      await this.reorderQueue();
    }

    return updatedDriver;
  }

  async updateDriverPosition(id: number, position: number): Promise<Driver | undefined> {
    const driver = this.drivers.get(id);
    if (!driver) return undefined;

    const updatedDriver = { ...driver, position };
    this.drivers.set(id, updatedDriver);
    return updatedDriver;
  }

  async incrementDeliveryCount(id: number): Promise<Driver | undefined> {
    const driver = this.drivers.get(id);
    if (!driver) return undefined;

    const updatedDriver = { ...driver, deliveriesCount: (driver.deliveriesCount || 0) + 1 };
    this.drivers.set(id, updatedDriver);
    return updatedDriver;
  }

  async getQueueStats(): Promise<QueueStats> {
    const allDrivers = Array.from(this.drivers.values());
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
    
    activeDrivers.forEach((driver, index) => {
      const updatedDriver = { ...driver, position: index + 1 };
      this.drivers.set(driver.id, updatedDriver);
    });
  }
}

export const storage = new MemStorage();
