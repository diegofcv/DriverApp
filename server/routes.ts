import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDriverSchema } from "@shared/schema";
import { z } from "zod";

// WhatsApp API configuration
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || "https://graph.facebook.com/v18.0";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || "";
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || "";

async function sendWhatsAppMessage(phone: string, message: string) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    console.log("WhatsApp credentials not configured, message would be:", message);
    return { success: true, simulated: true };
  }

  try {
    const response = await fetch(`${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone.replace(/\D/g, ''), // Remove non-digits
        type: "text",
        text: {
          body: message
        }
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error("WhatsApp API error:", result);
      return { success: false, error: result.error?.message || "Failed to send message" };
    }

    return { success: true, messageId: result.messages?.[0]?.id };
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return { success: false, error: "Network error" };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all drivers
  app.get("/api/drivers", async (req, res) => {
    try {
      const drivers = await storage.getAllDrivers();
      res.json(drivers);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      res.status(500).json({ error: "Failed to fetch drivers" });
    }
  });

  // Create new driver
  app.post("/api/drivers", async (req, res) => {
    try {
      const validatedData = insertDriverSchema.parse(req.body);
      const driver = await storage.createDriver(validatedData);
      res.status(201).json(driver);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid driver data", details: error.errors });
      } else {
        console.error("Error creating driver:", error);
        res.status(500).json({ error: "Failed to create driver" });
      }
    }
  });

  // Update driver status
  app.patch("/api/drivers/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!['inactive', 'active', 'busy'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const driver = await storage.updateDriverStatus(id, status);
      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }

      res.json(driver);
    } catch (error) {
      console.error("Error updating driver status:", error);
      res.status(500).json({ error: "Failed to update driver status" });
    }
  });

  // Get active queue
  app.get("/api/queue", async (req, res) => {
    try {
      const queue = await storage.getActiveQueue();
      res.json(queue);
    } catch (error) {
      console.error("Error fetching queue:", error);
      res.status(500).json({ error: "Failed to fetch queue" });
    }
  });

  // Call next driver (WhatsApp notification)
  app.post("/api/queue/call-next", async (req, res) => {
    try {
      const queue = await storage.getActiveQueue();
      const nextDriver = queue.find(d => d.position === 1);
      
      if (!nextDriver) {
        return res.status(404).json({ error: "No active drivers available" });
      }

      // Send WhatsApp message
      const message = `🍕 New delivery order ready! Please come to the restaurant to pick up your delivery. Thank you!`;
      const whatsappResult = await sendWhatsAppMessage(nextDriver.phone, message);

      if (!whatsappResult.success && !whatsappResult.simulated) {
        return res.status(500).json({ error: whatsappResult.error || "Failed to send WhatsApp message" });
      }

      // Move driver to busy status
      await storage.updateDriverStatus(nextDriver.id, 'busy');
      
      // Increment delivery count
      await storage.incrementDeliveryCount(nextDriver.id);

      res.json({ 
        success: true, 
        driver: nextDriver, 
        whatsappSent: whatsappResult.success,
        simulated: whatsappResult.simulated || false
      });
    } catch (error) {
      console.error("Error calling next driver:", error);
      res.status(500).json({ error: "Failed to call next driver" });
    }
  });

  // Mark driver as returned (move to end of queue)
  app.post("/api/drivers/:id/return", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const driver = await storage.getDriver(id);
      
      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }

      if (driver.status !== 'busy') {
        return res.status(400).json({ error: "Driver is not currently busy" });
      }

      // Move driver back to active status (will be added to end of queue)
      const updatedDriver = await storage.updateDriverStatus(id, 'active');
      
      res.json(updatedDriver);
    } catch (error) {
      console.error("Error returning driver:", error);
      res.status(500).json({ error: "Failed to return driver" });
    }
  });

  // Get queue statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getQueueStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
