import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  AlertTriangle, 
  Package, 
  Truck, 
  BarChart3, 
  MessageSquare, 
  LogOut,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Globe,
  Zap,
  Leaf,
  Settings
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { motion } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip as MapTooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Fix Leaflet marker icons
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- Types ---
interface Supplier {
  SupplierID: number;
  SupplierName: string;
  Country: string;
  Latitude: number;
  Longitude: number;
  ReliabilityScore: number;
  CarbonFootprint: number;
  GreenSourcingScore: number;
  ReliabilityTrend?: { value: number }[];
}

interface InventoryItem {
  SKU: string;
  Warehouse: string;
  CurrentStock: number;
  SafetyStock: number;
  DemandRate: number;
  UnitPrice: number;
}

interface RiskAlert {
  EventID: number;
  EventType: string;
  Location: string;
  Severity: 'Low' | 'Medium' | 'High';
  Timestamp: string;
  Description: string;
}

interface Recommendation {
  id: number;
  type: string;
  action: string;
  impact: string;
}

interface TransportRoute {
  RouteID: number;
  SupplierID: number;
  SupplierName: string;
  Port: string;
  TransitTime: number;
  RiskLevel: string;
  Emissions: number;
}

// --- Components ---

const NotificationToast = ({ alert, onClose }: { alert: RiskAlert, onClose: () => void }) => {
  return (
    <motion.div 
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className="fixed bottom-8 right-8 w-96 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-[9999] overflow-hidden"
    >
      <div className={cn(
        "h-1 w-full",
        alert.Severity === 'High' ? "bg-red-500" : alert.Severity === 'Medium' ? "bg-yellow-500" : "bg-blue-500"
      )} />
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className={cn(
              "w-5 h-5",
              alert.Severity === 'High' ? "text-red-500" : "text-yellow-500"
            )} />
            <span className="text-xs font-bold text-white uppercase tracking-widest">New Risk Detected</span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <Settings className="w-4 h-4 rotate-45" />
          </button>
        </div>
        <h4 className="text-lg font-bold text-white mb-1">{alert.EventType} in {alert.Location}</h4>
        <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{alert.Description}</p>
        <div className="flex gap-3">
          <button className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all">
            Analyze Impact
          </button>
          <button className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg transition-all">
            Dismiss
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const CustomTooltip = ({ active, payload, label, suffix = "" }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-950/90 backdrop-blur-xl border border-zinc-800 p-3 rounded-xl shadow-2xl ring-1 ring-white/10">
        <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-2">{label}</p>
        {payload.map((entry: any, index: number) => {
          let value = entry.value;
          if (suffix === "%" && typeof value === 'number' && value <= 1) {
            value = Math.round(value * 100);
          } else if (typeof value === 'number') {
            value = value.toLocaleString();
          }
          
          return (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                <span className="text-xs text-zinc-400">{entry.name}:</span>
              </div>
              <span className="text-sm font-bold text-white">
                {value}{suffix}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

const LoginPage = ({ onLogin }: { onLogin: (role: string) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Admin');

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none flex items-center justify-center">
        <Globe className="w-96 h-96 text-blue-500 animate-pulse" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 p-8 rounded-2xl shadow-2xl z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 rounded-2xl mb-4">
            <ShieldAlert className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Supply Chain Risk Intelligence</h1>
          <p className="text-zinc-400 text-sm">Control Tower Dashboard</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onLogin(role); }} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="praveen@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Password</label>
            <input 
              type="password" 
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Role</label>
            <select 
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option>Admin</option>
              <option>Supply Chain Planner</option>
            </select>
          </div>
          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors shadow-lg shadow-blue-600/20"
          >
            Access Control Tower
          </button>
          
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-800"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-950 px-2 text-zinc-500">Or try the demo</span>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => onLogin('Admin')}
            className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 group"
          >
            <Zap className="w-4 h-4 text-yellow-500 group-hover:scale-110 transition-transform" />
            Quick Demo Access (Admin)
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const Sidebar = ({ activeTab, setActiveTab, role, onLogout }: { activeTab: string, setActiveTab: (t: string) => void, role: string, onLogout: () => void }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
    { id: 'map', icon: MapIcon, label: 'Global Map' },
    { id: 'suppliers', icon: Truck, label: 'Suppliers' },
    { id: 'inventory', icon: Package, label: 'Inventory' },
    { id: 'simulation', icon: Zap, label: 'Simulation' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
  ];

  return (
    <div className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col h-screen sticky top-0">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold leading-tight">SCR Intelligence</h2>
            <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">Control Tower</p>
          </div>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                activeTab === item.id 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-white" : "text-zinc-500 group-hover:text-zinc-300")} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-zinc-900">
        <div className="flex items-center gap-3 mb-6 p-3 bg-zinc-900/50 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500" />
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{role}</p>
            <p className="text-xs text-zinc-500">Online</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, change, icon: Icon, color }: any) => (
  <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-3 rounded-xl", color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {change != null && (
        <div className={cn("flex items-center text-xs font-medium", change > 0 ? "text-emerald-500" : "text-red-500")}>
          {change > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
          {Math.abs(change)}%
        </div>
      )}
    </div>
    <h3 className="text-zinc-400 text-sm font-medium mb-1">{title}</h3>
    <p className="text-2xl font-bold text-white">{value}</p>
  </div>
);

interface WarehouseNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  stockLevel: number;
}

const RiskMap = ({ suppliers, routes, alerts, simulationResult, fullHeight = false }: { suppliers: Supplier[], routes: TransportRoute[], alerts: RiskAlert[], simulationResult?: any, fullHeight?: boolean }) => {
  const [mapExpanded, setMapExpanded] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  const warehouses: WarehouseNode[] = [
    { id: 'W1', name: 'Shanghai Central Hub', lat: 31.2304, lng: 121.4737, stockLevel: 0.8 },
    { id: 'W2', name: 'Rotterdam Euro-Port', lat: 51.9225, lng: 4.47917, stockLevel: 0.9 },
    { id: 'W3', name: 'Long Beach Gateway', lat: 33.7701, lng: -118.1937, stockLevel: 0.6 },
    { id: 'W4', name: 'Singapore Transit Hub', lat: 1.3521, lng: 103.8198, stockLevel: 0.95 },
  ];

  const getSupplier = (id: number) => suppliers.find(s => s.SupplierID === id);

  const getDynamicRisk = (route: TransportRoute) => {
    // If simulation result exists and this route is affected, show High risk
    if (simulationResult && simulationResult.affectedRoutes.some((r: any) => r.RouteID === route.RouteID)) {
      return 'High';
    }

    const supplier = getSupplier(route.SupplierID);
    const relevantAlerts = alerts.filter(a => 
      a.Location === route.Port || 
      (supplier && a.Location === supplier.Country)
    );

    if (relevantAlerts.some(a => a.Severity === 'High')) return 'High';
    if (relevantAlerts.some(a => a.Severity === 'Medium')) return 'Medium';
    return route.RiskLevel; // Fallback to static risk
  };

  return (
    <div className={cn(
      "rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 relative transition-all duration-500",
      fullHeight ? "h-full rounded-none border-none" : (mapExpanded ? "h-[800px]" : "h-[500px]")
    )}>
      {/* Map Controls & Sidebar */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        {!fullHeight && (
          <button 
            onClick={() => setMapExpanded(!mapExpanded)}
            className="bg-zinc-900/90 backdrop-blur border border-zinc-800 p-2 rounded-xl shadow-xl hover:bg-zinc-800 transition-colors text-white"
          >
            {mapExpanded ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
          </button>
        )}
      </div>

      {selectedItem && (
        <motion.div 
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="absolute right-4 top-4 bottom-4 w-80 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-2xl z-[1001] p-6 shadow-2xl overflow-y-auto"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">{selectedItem.name || selectedItem.SupplierName || selectedItem.Port}</h3>
              <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest mt-1">{selectedItem.type || 'Node'}</p>
            </div>
            <button onClick={() => setSelectedItem(null)} className="text-zinc-500 hover:text-white">
              <Settings className="w-5 h-5 rotate-45" />
            </button>
          </div>

          <div className="space-y-6">
            {selectedItem.ReliabilityScore !== undefined && (
              <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-3">Performance Metrics</p>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-400">Reliability Score</span>
                      <span className="text-blue-500 font-bold">{Math.round(selectedItem.ReliabilityScore * 100)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${selectedItem.ReliabilityScore * 100}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-400">Sustainability Index</span>
                      <span className="text-emerald-500 font-bold">{selectedItem.GreenSourcingScore}/100</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${selectedItem.GreenSourcingScore}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedItem.TransitTime !== undefined && (
              <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-3">Route Intelligence</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase">Transit Time</p>
                    <p className="text-lg font-bold text-white">{selectedItem.TransitTime} Days</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase">Risk Level</p>
                    <p className={cn(
                      "text-lg font-bold",
                      selectedItem.RiskLevel === 'High' ? "text-red-500" : "text-emerald-500"
                    )}>{selectedItem.RiskLevel}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] text-zinc-500 uppercase">Carbon Emissions</p>
                    <p className="text-lg font-bold text-white">{selectedItem.Emissions} Tons CO2</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-[10px] text-zinc-500 uppercase font-bold">Recent Activity</p>
              <div className="space-y-2">
                <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50 text-xs">
                  <p className="text-zinc-300 font-medium">Shipment ARR-902 delayed by 2 days</p>
                  <p className="text-zinc-500 mt-1">2 hours ago</p>
                </div>
                <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50 text-xs">
                  <p className="text-zinc-300 font-medium">Quality inspection passed</p>
                  <p className="text-zinc-500 mt-1">Yesterday</p>
                </div>
              </div>
            </div>

            <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20">
              Open Full Node Report
            </button>
          </div>
        </motion.div>
      )}
      <MapContainer 
        {...{
          center: [20, 0],
          zoom: 2,
          style: { height: '100%', width: '100%', background: '#18181b' },
          zoomControl: false
        } as any}
      >
        <TileLayer
          {...{
            url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          } as any}
        />
        {suppliers.map((s) => (
          <Marker 
            key={s.SupplierID} 
            position={[s.Latitude, s.Longitude]}
            eventHandlers={{
              click: () => setSelectedItem({ ...s, type: 'Supplier Node' })
            }}
          >
            <Popup>
              <div className="p-3 bg-zinc-900 text-white border border-zinc-800 rounded-xl">
                <h3 className="font-bold text-blue-500 text-lg">{s.SupplierName}</h3>
                <p className="text-xs text-zinc-400 mb-2">{s.Country}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] uppercase font-bold">
                    <span className="text-zinc-500">Reliability:</span>
                    <span className="text-emerald-500">{Math.round(s.ReliabilityScore * 100)}%</span>
                  </div>
                  <div className="flex justify-between text-[10px] uppercase font-bold">
                    <span className="text-zinc-500">Sustainability:</span>
                    <span className="text-emerald-500">{s.GreenSourcingScore}/100</span>
                  </div>
                </div>
              </div>
            </Popup>
            <MapTooltip {...{ direction: "top", offset: [0, -10], opacity: 1 } as any}>
              <div className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded shadow-xl">
                <p className="text-xs font-bold text-white">{s.SupplierName}</p>
                <p className="text-[10px] text-zinc-500">Reliability: {Math.round(s.ReliabilityScore * 100)}%</p>
              </div>
            </MapTooltip>
          </Marker>
        ))}
        {/* Transport Routes */}
        {routes.map((route, idx) => {
          const supplier = getSupplier(route.SupplierID);
          if (!supplier) return null;
          
          const dynamicRisk = getDynamicRisk(route);
          
          return (
            <Polyline 
              key={`route-${idx}`}
              positions={[
                [supplier.Latitude, supplier.Longitude],
                [40.7128, -74.0060] // New York Hub
              ]}
              eventHandlers={{
                click: () => setSelectedItem({ ...route, RiskLevel: dynamicRisk, type: 'Transport Route' })
              }}
              pathOptions={{
                color: dynamicRisk === 'Low' ? '#10b981' : dynamicRisk === 'Medium' ? '#3b82f6' : '#ef4444',
                weight: dynamicRisk === 'High' ? 4 : 2,
                opacity: 0.6,
                dashArray: dynamicRisk === 'High' ? '5, 5' : '10, 10'
              }}
            >
              <Popup>
                <div className="p-3 bg-zinc-900 text-white border border-zinc-800 rounded-xl">
                  <h3 className="font-bold text-blue-400">Route: {route.Port}</h3>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Transit Intelligence</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] uppercase font-bold">
                      <span className="text-zinc-500">Transit Time:</span>
                      <span className="text-white">{route.TransitTime} Days</span>
                    </div>
                    <div className="flex justify-between text-[10px] uppercase font-bold">
                      <span className="text-zinc-500">Risk Level:</span>
                      <span className={cn(dynamicRisk === 'High' ? "text-red-500" : dynamicRisk === 'Medium' ? "text-blue-500" : "text-emerald-500")}>
                        {dynamicRisk} {dynamicRisk !== route.RiskLevel && "(Alert Adjusted)"}
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
              <MapTooltip {...{ sticky: true, opacity: 1 } as any}>
                <div className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded shadow-xl">
                  <p className="text-xs font-bold text-white">Route to {route.Port}</p>
                  <p className="text-[10px] text-zinc-500">Risk: {dynamicRisk} | {route.TransitTime}d</p>
                </div>
              </MapTooltip>
            </Polyline>
          );
        })}

        {warehouses.map((w) => (
          <Marker 
            key={w.id} 
            {...{
              position: [w.lat, w.lng],
              icon: L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="w-4 h-4 bg-blue-500 border-2 border-white rounded-sm shadow-lg"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8]
              })
            } as any}
            eventHandlers={{
              click: () => setSelectedItem({ ...w, type: 'Warehouse Hub' })
            }}
          >
            <Popup>
              <div className="p-3 bg-zinc-900 text-white border border-zinc-800 rounded-xl">
                <h3 className="font-bold text-blue-400">{w.name}</h3>
                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Regional Warehouse</p>
                <div className="flex justify-between text-[10px] uppercase font-bold">
                  <span className="text-zinc-500">Stock Health:</span>
                  <span className={cn(w.stockLevel < 0.7 ? "text-red-500" : "text-emerald-500")}>
                    {Math.round(w.stockLevel * 100)}%
                  </span>
                </div>
              </div>
            </Popup>
            <MapTooltip {...{ direction: "top", offset: [0, -10], opacity: 1 } as any}>
              <div className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded shadow-xl">
                <p className="text-xs font-bold text-white">{w.name}</p>
                <p className="text-[10px] text-zinc-500">Stock: {Math.round(w.stockLevel * 100)}%</p>
              </div>
            </MapTooltip>
          </Marker>
        ))}
      </MapContainer>

      <div className="absolute bottom-4 left-4 z-[1000] bg-zinc-900/90 backdrop-blur border border-zinc-800 p-4 rounded-xl shadow-xl">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Global Network Legend</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-blue-500 border border-white" />
            <span className="text-xs text-zinc-400">Regional Warehouse Hub</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs text-zinc-400">Optimal Supplier Node</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-xs text-zinc-400">Stable Node (Reliability &gt; 80%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-xs text-zinc-400">At-Risk Node (Reliability &lt; 80%)</span>
          </div>
          <div className="pt-2 border-t border-zinc-800 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-zinc-500 border-t border-dashed" />
              <span className="text-xs text-zinc-400">Active Transit Route</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatAssistant = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: "Hello! I'm your Supply Chain AI Assistant. How can I help you optimize your logistics today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are a Supply Chain Risk Intelligence Assistant. Use the context of a "Control Tower" dashboard. 
        The user is asking: ${userMsg}. Provide concise, professional, and data-driven advice.`,
      });
      setMessages(prev => [...prev, { role: 'assistant', content: response.text || "I'm sorry, I couldn't process that request." }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Error connecting to AI service." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col h-[600px]">
      <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-white font-bold">AI Risk Assistant</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === 'user' ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[80%] p-3 rounded-2xl text-sm",
              m.role === 'user' ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-300"
            )}>
              <ReactMarkdown>{m.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 p-3 rounded-2xl text-zinc-300 animate-pulse">Thinking...</div>
          </div>
        )}
      </div>
      <div className="p-4 border-t border-zinc-800 flex gap-2">
        <input 
          type="text" 
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ask about supplier risks..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button 
          onClick={handleSend}
          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl transition-colors"
        >
          <Zap className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentToast, setCurrentToast] = useState<RiskAlert | null>(null);
  const [simulationMode, setSimulationMode] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();

      // WebSocket Connection for Real-time Alerts
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}`);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'NEW_ALERT') {
          setAlerts(prev => [data.alert, ...prev]);
          setCurrentToast(data.alert);
          
          // Auto-dismiss toast after 8 seconds
          setTimeout(() => {
            setCurrentToast(null);
          }, 8000);
        }
      };

      return () => ws.close();
    }
  }, [isLoggedIn]);

  const fetchData = async () => {
    try {
      const [sRes, iRes, aRes, rRes, rtRes] = await Promise.all([
        fetch('/api/suppliers'),
        fetch('/api/inventory'),
        fetch('/api/risk-alerts'),
        fetch('/api/recommendations'),
        fetch('/api/routes')
      ]);
      setSuppliers(await sRes.json());
      setInventory(await iRes.json());
      setAlerts(await aRes.json());
      setRecommendations(await rRes.json());
      setRoutes(await rtRes.json());
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  const runSimulation = async (scenario: string, location: string, intensity: number = 0.5) => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioType: scenario, location, intensity })
      });
      setSimulationResult(await res.json());
    } catch (err) {
      console.error("Simulation failed", err);
    } finally {
      setIsSimulating(false);
    }
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={(role) => { setIsLoggedIn(true); setUserRole(role); }} />;
  }

  return (
    <div className="flex min-h-screen bg-[#050505] text-white">
      {currentToast && (
        <NotificationToast 
          alert={currentToast} 
          onClose={() => setCurrentToast(null)} 
        />
      )}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        role={userRole} 
        onLogout={() => setIsLoggedIn(false)} 
      />
      
      <main className={cn("flex-1 overflow-y-auto", activeTab === 'map' ? "p-0" : "p-8")}>
        {activeTab !== 'map' && (
          <header className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Control Tower Overview</h1>
              <p className="text-zinc-500">Real-time supply chain intelligence and risk monitoring.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Search nodes..." 
                  className="bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>
              <button className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors">
                <Filter className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
          </header>
        )}

        {activeTab === 'map' && (
          <div className="h-screen w-full relative">
            <RiskMap 
              suppliers={suppliers} 
              routes={routes} 
              alerts={alerts} 
              simulationResult={simulationMode ? simulationResult : null} 
              fullHeight 
            />
            {simulationResult && (
              <div className="absolute bottom-8 right-8 z-[1000]">
                <button 
                  onClick={() => setSimulationMode(!simulationMode)}
                  className={cn(
                    "px-6 py-3 rounded-xl font-bold transition-all shadow-2xl flex items-center gap-2 border",
                    simulationMode 
                      ? "bg-red-600 text-white border-red-500" 
                      : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
                  )}
                >
                  <Zap className={cn("w-5 h-5", simulationMode ? "animate-pulse" : "")} />
                  {simulationMode ? "Simulation Overlay Active" : "Show Simulation Impact"}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="text-lg font-bold">Inventory Monitoring</h3>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm font-bold hover:bg-zinc-700 transition-colors">Export CSV</button>
                <button className="px-4 py-2 bg-blue-600 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors">Reorder All</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
                    <th className="p-6 font-bold">SKU</th>
                    <th className="p-6 font-bold">Warehouse</th>
                    <th className="p-6 font-bold">Current Stock</th>
                    <th className="p-6 font-bold">Safety Stock</th>
                    <th className="p-6 font-bold">Demand Rate</th>
                    <th className="p-6 font-bold">Unit Price</th>
                    <th className="p-6 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {inventory.map((item) => (
                    <tr key={item.SKU} className="text-sm hover:bg-zinc-800/30 transition-colors">
                      <td className="p-6 font-bold text-white">{item.SKU}</td>
                      <td className="p-6 text-zinc-400">{item.Warehouse}</td>
                      <td className="p-6 text-white font-mono">{item.CurrentStock}</td>
                      <td className="p-6 text-zinc-400 font-mono">{item.SafetyStock}</td>
                      <td className="p-6 text-zinc-400 font-mono">{item.DemandRate}/day</td>
                      <td className="p-6 text-zinc-400 font-mono">${item.UnitPrice}</td>
                      <td className="p-6">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                          item.CurrentStock < item.SafetyStock 
                            ? "bg-red-500/10 text-red-500 border border-red-500/20" 
                            : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        )}>
                          {item.CurrentStock < item.SafetyStock ? 'Stockout Risk' : 'Healthy'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                <h3 className="text-lg font-bold mb-6">Sustainability Scorecard</h3>
                <div className="space-y-6">
                  {suppliers.map(s => (
                    <div key={s.SupplierID} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">{s.SupplierName}</span>
                        <span className="text-emerald-500 font-bold">{s.GreenSourcingScore}/100</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500" 
                          style={{ width: `${s.GreenSourcingScore}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                <h3 className="text-lg font-bold mb-6">Carbon Footprint Analysis</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={suppliers}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="SupplierName" stroke="#71717a" fontSize={10} />
                      <YAxis stroke="#71717a" fontSize={10} />
                      <Tooltip 
                        content={<CustomTooltip suffix=" Tons CO2" />}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      />
                      <Bar name="Carbon Footprint" dataKey="CarbonFootprint" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
              <h3 className="text-lg font-bold mb-6">Reliability Distribution</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={suppliers}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="SupplierName" stroke="#71717a" fontSize={10} />
                    <YAxis stroke="#71717a" fontSize={10} />
                    <Tooltip 
                      content={<CustomTooltip suffix="%" />}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Bar name="Reliability" dataKey="ReliabilityScore" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Active Suppliers" value={suppliers.length} change={12} icon={Globe} color="bg-blue-600/20" />
              <StatCard title="Total Inventory Value" value="$4.2M" change={-5} icon={Package} color="bg-emerald-600/20" />
              <StatCard title="Risk Alert Count" value={alerts.length} change={25} icon={AlertTriangle} color="bg-red-600/20" />
              <StatCard title="Avg Reliability" value="88.4%" change={2} icon={ShieldAlert} color="bg-indigo-600/20" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Map Section */}
              <div className="lg:col-span-2 space-y-8">
                {/* AI Recommendations Panel */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Zap className="w-32 h-32 text-blue-500" />
                  </div>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-blue-500" />
                        AI-Driven Strategic Recommendations
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1">Real-time mitigation strategies generated by SCR Intelligence Engine</p>
                    </div>
                    <button className="text-xs font-bold text-blue-500 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition-all">
                      Execute All Actions
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {recommendations.map((rec) => (
                      <div key={rec.id} className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-blue-500/50 transition-all group cursor-pointer">
                        <div className="flex items-center justify-between mb-3">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                            rec.impact === 'High' ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
                          )}>{rec.impact} Impact</span>
                          <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-blue-500 transition-colors" />
                        </div>
                        <p className="text-xs font-bold text-zinc-400 uppercase mb-1">{rec.type}</p>
                        <p className="text-sm text-white font-medium line-clamp-3">{rec.action}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Global Supply Network</h3>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-xs font-bold rounded-full border border-emerald-500/20">All Nodes Active</span>
                    </div>
                  </div>
                  <RiskMap 
                    suppliers={suppliers} 
                    routes={routes} 
                    alerts={alerts} 
                    simulationResult={simulationResult} 
                  />
                </div>

                {/* Inventory Monitoring */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                  <h3 className="text-lg font-bold mb-6">Inventory Health</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
                          <th className="pb-4 font-bold">SKU</th>
                          <th className="pb-4 font-bold">Warehouse</th>
                          <th className="pb-4 font-bold">Current Stock</th>
                          <th className="pb-4 font-bold">Safety Stock</th>
                          <th className="pb-4 font-bold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {inventory.map((item) => (
                          <tr key={item.SKU} className="text-sm hover:bg-zinc-800/30 transition-colors">
                            <td className="py-4 font-medium text-white">{item.SKU}</td>
                            <td className="py-4 text-zinc-400">{item.Warehouse}</td>
                            <td className="py-4 text-white font-mono">{item.CurrentStock}</td>
                            <td className="py-4 text-zinc-400 font-mono">{item.SafetyStock}</td>
                            <td className="py-4">
                              <span className={cn(
                                "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                                item.CurrentStock < item.SafetyStock 
                                  ? "bg-red-500/10 text-red-500 border border-red-500/20" 
                                  : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              )}>
                                {item.CurrentStock < item.SafetyStock ? 'Stockout Risk' : 'Healthy'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Sidebar Panels */}
              <div className="space-y-8">
                {/* Risk Alerts */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Live Risk Alerts</h3>
                    <span className="text-xs text-blue-500 font-bold hover:underline cursor-pointer">View All</span>
                  </div>
                  <div className="space-y-4">
                    {alerts.map((alert) => (
                      <div key={alert.EventID} className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl relative overflow-hidden group">
                        <div className={cn(
                          "absolute left-0 top-0 bottom-0 w-1",
                          alert.Severity === 'High' ? "bg-red-500" : alert.Severity === 'Medium' ? "bg-yellow-500" : "bg-blue-500"
                        )} />
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold text-zinc-500 uppercase">{alert.EventType}</span>
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                            alert.Severity === 'High' ? "text-red-500" : alert.Severity === 'Medium' ? "text-yellow-500" : "text-blue-500"
                          )}>
                            {alert.Severity}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-white mb-1">{alert.Location}</p>
                        <p className="text-xs text-zinc-500 line-clamp-2">{alert.Description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Recommendations */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    AI Mitigation Strategies
                  </h3>
                  <div className="space-y-4">
                    {recommendations.map((rec) => (
                      <div key={rec.id} className="p-4 bg-blue-600/5 border border-blue-600/20 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded uppercase">{rec.type}</span>
                          <span className="text-[10px] font-bold text-emerald-500 uppercase">{rec.impact} Impact</span>
                        </div>
                        <p className="text-sm text-zinc-300">{rec.action}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chat Assistant */}
                <ChatAssistant />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'simulation' && (
          <div className="space-y-8">
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white">Scenario Simulation Engine</h2>
                  <p className="text-zinc-500 text-sm mt-1">Predict supply chain disruptions using Monte Carlo modeling.</p>
                </div>
                {simulationResult && (
                  <button 
                    onClick={() => { setActiveTab('map'); setSimulationMode(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 text-blue-500 border border-blue-500/20 rounded-xl hover:bg-blue-600/20 transition-all font-bold text-sm"
                  >
                    <MapIcon className="w-4 h-4" />
                    Visualize on Map
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Scenario Type</label>
                    <select 
                      id="sim-type"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Shutdown">Supplier Shutdown</option>
                      <option value="Closure">Port Closure</option>
                      <option value="Instability">Geopolitical Instability</option>
                      <option value="Delay">Transportation Delay</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Location / Node</label>
                    <input 
                      id="sim-loc"
                      type="text" 
                      placeholder="e.g. Shanghai" 
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Intensity (0-1)</label>
                    <input 
                      id="sim-intensity"
                      type="range" min="0" max="1" step="0.1" defaultValue="0.5"
                      className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                    />
                  </div>
                  <button 
                    onClick={() => {
                      const type = (document.getElementById('sim-type') as HTMLSelectElement).value;
                      const loc = (document.getElementById('sim-loc') as HTMLInputElement).value || 'Shanghai';
                      const intensity = parseFloat((document.getElementById('sim-intensity') as HTMLInputElement).value);
                      runSimulation(type, loc, intensity);
                    }}
                    disabled={isSimulating}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSimulating ? "Running Monte Carlo..." : "Run Simulation"}
                    <Zap className="w-5 h-5" />
                  </button>
                </div>

                <div className="md:col-span-2 bg-zinc-950 border border-zinc-800 rounded-2xl p-6 min-h-[400px] flex flex-col items-center justify-center text-center">
                  {!simulationResult ? (
                    <div className="space-y-4">
                      <Zap className="w-16 h-16 text-zinc-800 mx-auto" />
                      <p className="text-zinc-500">Configure and run a scenario to see predicted impacts.</p>
                    </div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full space-y-8"
                    >
                      <div className="grid grid-cols-3 gap-6">
                        <div className="p-6 bg-zinc-900 rounded-2xl border border-zinc-800">
                          <p className="text-zinc-500 text-xs uppercase font-bold mb-2">Expected Delay</p>
                          <p className="text-3xl font-bold text-red-500">{simulationResult.metrics.expectedDelay} Days</p>
                        </div>
                        <div className="p-6 bg-zinc-900 rounded-2xl border border-zinc-800">
                          <p className="text-zinc-500 text-xs uppercase font-bold mb-2">Stockout Prob.</p>
                          <p className="text-3xl font-bold text-yellow-500">{simulationResult.metrics.stockoutProbability}%</p>
                        </div>
                        <div className="p-6 bg-zinc-900 rounded-2xl border border-zinc-800">
                          <p className="text-zinc-500 text-xs uppercase font-bold mb-2">Est. Revenue Loss</p>
                          <p className="text-3xl font-bold text-white">${(parseInt(simulationResult.metrics.estimatedRevenueLoss) / 1000).toFixed(1)}K</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                        <div className="space-y-4">
                          <h4 className="font-bold text-white flex items-center gap-2">
                            <Truck className="w-4 h-4 text-blue-500" />
                            Affected Routes
                          </h4>
                          <div className="space-y-2">
                            {simulationResult.affectedRoutes.length > 0 ? simulationResult.affectedRoutes.map((r: any) => (
                              <div key={r.RouteID} className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 flex justify-between items-center">
                                <div>
                                  <p className="text-sm font-bold">{r.Port}</p>
                                  <p className="text-[10px] text-zinc-500 uppercase">{r.SupplierName}</p>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-red-500/10 text-red-500 rounded uppercase">Disrupted</span>
                              </div>
                            )) : (
                              <p className="text-xs text-zinc-500 italic">No routes directly affected in this region.</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="font-bold text-white flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-red-500" />
                            Affected Suppliers
                          </h4>
                          <div className="space-y-2">
                            {simulationResult.affectedSuppliers.length > 0 ? simulationResult.affectedSuppliers.map((s: any) => (
                              <div key={s.SupplierID} className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 flex justify-between items-center">
                                <div>
                                  <p className="text-sm font-bold">{s.SupplierName}</p>
                                  <p className="text-[10px] text-zinc-500 uppercase">{s.Country}</p>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-red-500/10 text-red-500 rounded uppercase">At Risk</span>
                              </div>
                            )) : (
                              <p className="text-xs text-zinc-500 italic">No suppliers directly affected in this region.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* Sustainability Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-emerald-500" />
                  Sustainability Scorecard
                </h3>
                <div className="space-y-6">
                  {suppliers.map(s => (
                    <div key={s.SupplierID} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">{s.SupplierName}</span>
                        <span className="text-emerald-500 font-bold">{s.GreenSourcingScore}/100</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500" 
                          style={{ width: `${s.GreenSourcingScore}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                <h3 className="text-lg font-bold mb-6">Carbon Footprint Analysis</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={suppliers}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="SupplierName" stroke="#71717a" fontSize={10} />
                      <YAxis stroke="#71717a" fontSize={10} />
                      <Tooltip 
                        content={<CustomTooltip suffix=" Tons CO2" />}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      />
                      <Bar name="Carbon Footprint" dataKey="CarbonFootprint" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'suppliers' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="text-lg font-bold">Supplier Risk Dashboard</h3>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-xl text-sm font-bold">
                Add New Supplier
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
                    <th className="p-6 font-bold">Supplier Name</th>
                    <th className="p-6 font-bold">Country</th>
                    <th className="p-6 font-bold">Reliability</th>
                    <th className="p-6 font-bold text-center">Trend (90d)</th>
                    <th className="p-6 font-bold">Risk Level</th>
                    <th className="p-6 font-bold">Sustainability</th>
                    <th className="p-6 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {suppliers.map((s) => (
                    <tr key={s.SupplierID} className="text-sm hover:bg-zinc-800/30 transition-colors">
                      <td className="p-6 font-bold text-white">{s.SupplierName}</td>
                      <td className="p-6 text-zinc-400">{s.Country}</td>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 w-24 bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full",
                                s.ReliabilityScore > 0.9 ? "bg-emerald-500" : s.ReliabilityScore > 0.8 ? "bg-blue-500" : "bg-yellow-500"
                              )} 
                              style={{ width: `${s.ReliabilityScore * 100}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs">{Math.round(s.ReliabilityScore * 100)}%</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="h-10 w-24 mx-auto">
                          {s.ReliabilityTrend && (
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={s.ReliabilityTrend}>
                                <Tooltip 
                                  content={<CustomTooltip suffix="%" />}
                                  position={{ y: -40 }}
                                />
                                <Line 
                                  name="Reliability"
                                  type="monotone" 
                                  dataKey="value" 
                                  stroke={s.ReliabilityScore > 0.9 ? "#10b981" : s.ReliabilityScore > 0.8 ? "#3b82f6" : "#f59e0b"} 
                                  strokeWidth={2} 
                                  dot={false} 
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </td>
                      <td className="p-6">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                          s.ReliabilityScore < 0.8 ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        )}>
                          {s.ReliabilityScore < 0.8 ? 'High Risk' : 'Low Risk'}
                        </span>
                      </td>
                      <td className="p-6 text-emerald-500 font-bold">{s.GreenSourcingScore}</td>
                      <td className="p-6">
                        <button className="text-zinc-500 hover:text-white transition-colors">
                          <Settings className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
