import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("supply_chain.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS Suppliers (
    SupplierID INTEGER PRIMARY KEY AUTOINCREMENT,
    SupplierName TEXT NOT NULL,
    Country TEXT NOT NULL,
    Latitude REAL NOT NULL,
    Longitude REAL NOT NULL,
    ReliabilityScore REAL NOT NULL,
    CarbonFootprint REAL DEFAULT 0,
    GreenSourcingScore REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS Inventory (
    SKU TEXT PRIMARY KEY,
    Warehouse TEXT NOT NULL,
    CurrentStock INTEGER NOT NULL,
    SafetyStock INTEGER NOT NULL,
    DemandRate REAL NOT NULL,
    UnitPrice REAL DEFAULT 100
  );

  CREATE TABLE IF NOT EXISTS TransportRoutes (
    RouteID INTEGER PRIMARY KEY AUTOINCREMENT,
    SupplierID INTEGER NOT NULL,
    Port TEXT NOT NULL,
    TransitTime INTEGER NOT NULL,
    RiskLevel TEXT NOT NULL,
    Emissions REAL DEFAULT 0,
    FOREIGN KEY (SupplierID) REFERENCES Suppliers(SupplierID)
  );

  CREATE TABLE IF NOT EXISTS RiskEvents (
    EventID INTEGER PRIMARY KEY AUTOINCREMENT,
    EventType TEXT NOT NULL,
    Location TEXT NOT NULL,
    Severity TEXT NOT NULL,
    Timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    Description TEXT
  );
`);

// Seed Data if empty
const supplierCount = db.prepare("SELECT COUNT(*) as count FROM Suppliers").get() as { count: number };
if (supplierCount.count === 0) {
  const insertSupplier = db.prepare("INSERT INTO Suppliers (SupplierName, Country, Latitude, Longitude, ReliabilityScore, CarbonFootprint, GreenSourcingScore) VALUES (?, ?, ?, ?, ?, ?, ?)");
  insertSupplier.run("Global Electronics Co.", "China", 31.2304, 121.4737, 0.85, 120.5, 75);
  insertSupplier.run("TechParts Ltd.", "Japan", 35.6762, 139.6503, 0.92, 85.2, 88);
  insertSupplier.run("EuroCircuits", "Germany", 52.5200, 13.4050, 0.88, 95.0, 82);
  insertSupplier.run("AmeriSemi", "USA", 37.7749, -122.4194, 0.95, 110.0, 90);
  insertSupplier.run("IndoFab", "India", 19.0760, 72.8777, 0.78, 140.2, 65);

  const insertInventory = db.prepare("INSERT INTO Inventory (SKU, Warehouse, CurrentStock, SafetyStock, DemandRate, UnitPrice) VALUES (?, ?, ?, ?, ?, ?)");
  insertInventory.run("CHIP-X1", "Shanghai-W1", 5000, 2000, 150, 45.0);
  insertInventory.run("BOARD-V2", "Berlin-W2", 1200, 1500, 80, 120.0);
  insertInventory.run("CAP-A3", "Mumbai-W3", 8000, 5000, 300, 5.5);
  insertInventory.run("SENSOR-S4", "Austin-W4", 450, 1000, 40, 250.0);

  const insertRoute = db.prepare("INSERT INTO TransportRoutes (SupplierID, Port, TransitTime, RiskLevel, Emissions) VALUES (?, ?, ?, ?, ?)");
  insertRoute.run(1, "Shanghai Port", 25, "Medium", 450.5);
  insertRoute.run(2, "Tokyo Port", 18, "Low", 320.2);
  insertRoute.run(3, "Hamburg Port", 12, "Low", 210.8);
  insertRoute.run(4, "Long Beach Port", 5, "Low", 150.0);
  insertRoute.run(5, "Nhava Sheva", 30, "High", 580.4);

  const insertRisk = db.prepare("INSERT INTO RiskEvents (EventType, Location, Severity, Description) VALUES (?, ?, ?, ?)");
  insertRisk.run("Environmental", "Shanghai", "High", "Heavy flooding reported near industrial zone.");
  insertRisk.run("Operational", "Suez Canal", "Medium", "Minor congestion causing 3-day delays.");
  insertRisk.run("Political", "Eastern Europe", "High", "Trade restrictions impacting specific component exports.");
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer });
  const PORT = 3000;

  // Real-time Alert Broadcasting
  const broadcast = (data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

  // Mock Real-time Alert Generator
  setInterval(() => {
    const eventTypes = ["Environmental", "Operational", "Political", "Logistics"];
    const locations = ["Shanghai", "Suez Canal", "Rotterdam", "Panama Canal", "Singapore", "Los Angeles"];
    const severities = ["Low", "Medium", "High"];
    
    const newAlert = {
      EventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      Location: locations[Math.floor(Math.random() * locations.length)],
      Severity: severities[Math.floor(Math.random() * severities.length)],
      Description: "Real-time automated risk detection system flagged a potential disruption.",
      Timestamp: new Date().toISOString()
    };

    const stmt = db.prepare("INSERT INTO RiskEvents (EventType, Location, Severity, Description) VALUES (?, ?, ?, ?)");
    const info = stmt.run(newAlert.EventType, newAlert.Location, newAlert.Severity, newAlert.Description);
    
    broadcast({ type: 'NEW_ALERT', alert: { ...newAlert, EventID: info.lastInsertRowid } });
  }, 45000); // Every 45 seconds for demo

  // API Routes
  app.get("/api/suppliers", (req, res) => {
    const suppliers = db.prepare("SELECT * FROM Suppliers").all() as any[];
    
    // Add mock trend data for each supplier
    const suppliersWithTrend = suppliers.map(s => ({
      ...s,
      ReliabilityTrend: Array.from({ length: 12 }, () => ({
        value: s.ReliabilityScore * (0.9 + Math.random() * 0.2)
      }))
    }));
    
    res.json(suppliersWithTrend);
  });

  app.get("/api/inventory", (req, res) => {
    const inventory = db.prepare("SELECT * FROM Inventory").all();
    res.json(inventory);
  });

  app.get("/api/routes", (req, res) => {
    const routes = db.prepare(`
      SELECT r.*, s.SupplierName 
      FROM TransportRoutes r
      JOIN Suppliers s ON r.SupplierID = s.SupplierID
    `).all();
    res.json(routes);
  });

  app.get("/api/risk-alerts", (req, res) => {
    const alerts = db.prepare("SELECT * FROM RiskEvents ORDER BY Timestamp DESC").all();
    res.json(alerts);
  });

  app.post("/api/simulation", (req, res) => {
    const { scenarioType, location, intensity } = req.body;
    
    // Enhanced Simulation Logic
    const affectedSuppliers = db.prepare("SELECT * FROM Suppliers WHERE Country LIKE ? OR SupplierName LIKE ?")
      .all(`%${location}%`, `%${location}%`) as any[];
    
    const affectedRoutes = db.prepare(`
      SELECT r.*, s.SupplierName 
      FROM TransportRoutes r
      JOIN Suppliers s ON r.SupplierID = s.SupplierID
      WHERE r.Port LIKE ? OR s.Country LIKE ?
    `).all(`%${location}%`, `%${location}%`) as any[];

    const simulations = 1000;
    let totalDelay = 0;
    let stockoutCount = 0;
    let totalRevenueLoss = 0;

    const baseDelay = intensity * 20; // Max 20 days base delay

    for (let i = 0; i < simulations; i++) {
      const randomVar = Math.random() * 5; // Variance
      const delay = baseDelay + randomVar;
      totalDelay += delay;
      
      if (delay > 15) stockoutCount++;
      
      // Revenue Loss = Production Delay × Demand × Unit Price
      totalRevenueLoss += (delay * 100 * 50); 
    }

    res.json({
      scenarioType,
      location,
      intensity,
      affectedSuppliers,
      affectedRoutes,
      metrics: {
        expectedDelay: (totalDelay / simulations).toFixed(1),
        stockoutProbability: (stockoutCount / simulations * 100).toFixed(1),
        estimatedRevenueLoss: (totalRevenueLoss / simulations).toFixed(0),
        disruptionLevel: intensity > 0.7 ? 'Critical' : intensity > 0.4 ? 'Significant' : 'Moderate'
      }
    });
  });

  app.get("/api/recommendations", (req, res) => {
    // Optimization Logic Mock
    res.json([
      { id: 1, type: "Sourcing", action: "Switch to TechParts Ltd. for CHIP-X1 to reduce risk by 40%.", impact: "High" },
      { id: 2, type: "Inventory", action: "Increase safety stock for SENSOR-S4 by 200 units.", impact: "Medium" },
      { id: 3, type: "Logistics", action: "Reroute shipment from Shanghai to Ningbo to avoid congestion.", impact: "High" }
    ]);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
