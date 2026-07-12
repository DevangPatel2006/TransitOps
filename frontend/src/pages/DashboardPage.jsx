import { useState, useEffect, useCallback } from 'react';
import {
  Truck, CheckCircle, Wrench, Route, Clock,
  Users, Gauge, ChevronDown,
} from 'lucide-react';
import { fetchKpis, fetchRecentTrips, fetchVehicles } from '../api/dashboard.api';
import StatusBadge from '../components/common/StatusBadge';

/* ─── Filter pill dropdown ──────────────────────────────────── */
function FilterPill({ label, value, options, onChange }) {
  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none h-8 pl-3 pr-8 rounded-full bg-surface-elevated border border-border-hairline text-xs font-medium text-content-primary outline-none cursor-pointer hover:border-accent focus:border-accent transition-colors"
      >
        <option value="">{label}: All</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {label}: {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-content-muted pointer-events-none" />
    </div>
  );
}

/* ─── KPI Card ──────────────────────────────────────────────── */
const ICON_MAP = {
  activeVehicles: Truck,
  availableVehicles: CheckCircle,
  inMaintenance: Wrench,
  activeTrips: Route,
  pendingTrips: Clock,
  driversOnDuty: Users,
  fleetUtilizationPct: Gauge,
};

function KpiCard({ label, value, accentColor, kpiKey, loading }) {
  const Icon = ICON_MAP[kpiKey] || Truck;

  const colorMap = {
    blue: { border: 'border-l-status-on-trip', text: 'text-status-on-trip', bg: 'bg-status-on-trip-bg' },
    green: { border: 'border-l-status-available', text: 'text-status-available', bg: 'bg-status-available-bg' },
    orange: { border: 'border-l-status-in-shop', text: 'text-status-in-shop', bg: 'bg-status-in-shop-bg' },
  };
  const c = colorMap[accentColor] || colorMap.blue;

  return (
    <div className={`bg-surface-card border border-border-hairline rounded-[10px] p-4 border-l-4 ${c.border}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-content-muted uppercase tracking-wider mb-1">{label}</p>
          {loading ? (
            <div className="h-8 w-16 bg-surface-elevated rounded animate-pulse mt-1" />
          ) : (
            <p className={`text-2xl font-bold ${c.text}`}>
              {kpiKey === 'fleetUtilizationPct' ? `${value}%` : value}
            </p>
          )}
        </div>
        <div className={`w-9 h-9 rounded-[10px] ${c.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${c.text}`} />
        </div>
      </div>
    </div>
  );
}

/* ─── Vehicle Status Distribution Bar ───────────────────────── */
const STATUS_COLORS = {
  AVAILABLE: { color: 'bg-status-available', label: 'Available' },
  ON_TRIP: { color: 'bg-status-on-trip', label: 'On Trip' },
  IN_SHOP: { color: 'bg-status-in-shop', label: 'In Shop' },
  RETIRED: { color: 'bg-status-retired', label: 'Retired' },
};

function VehicleStatusBar({ vehicles, loading }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-5 bg-surface-elevated rounded animate-pulse" />
        ))}
      </div>
    );
  }

  const counts = { AVAILABLE: 0, ON_TRIP: 0, IN_SHOP: 0, RETIRED: 0 };
  vehicles.forEach((v) => {
    if (counts[v.status] !== undefined) counts[v.status]++;
  });
  const total = vehicles.length || 1;

  return (
    <div className="space-y-3">
      {Object.entries(STATUS_COLORS).map(([status, cfg]) => {
        const count = counts[status];
        const pct = Math.round((count / total) * 100);
        return (
          <div key={status}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-content-muted">{cfg.label}</span>
              <span className="text-content-primary font-medium">{count} ({pct}%)</span>
            </div>
            <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
              <div
                className={`h-full ${cfg.color} rounded-full transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── DashboardPage ─────────────────────────────────────────── */
const VEHICLE_TYPE_OPTIONS = [
  { value: 'TRUCK', label: 'Truck' },
  { value: 'VAN', label: 'Van' },
  { value: 'BIKE', label: 'Bike' },
  { value: 'TRAILER', label: 'Trailer' },
];

const STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'ON_TRIP', label: 'On Trip' },
  { value: 'IN_SHOP', label: 'In Shop' },
  { value: 'RETIRED', label: 'Retired' },
];

export default function DashboardPage() {
  const [filters, setFilters] = useState({ type: '', status: '', region: '' });
  const [kpis, setKpis] = useState(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);

  // Unique region values derived from vehicles data
  const regionOptions = [...new Set(vehicles.map((v) => v.region).filter(Boolean))].map((r) => ({
    value: r,
    label: r,
  }));

  const loadKpis = useCallback(async () => {
    try {
      setKpiLoading(true);
      const res = await fetchKpis(filters);
      setKpis(res.data);
    } catch {
      // silently fail on poll
    } finally {
      setKpiLoading(false);
    }
  }, [filters]);

  const loadTrips = useCallback(async () => {
    try {
      setTripsLoading(true);
      const res = await fetchRecentTrips();
      // Sort by created_at desc, take latest 5
      const sorted = (res.data || [])
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);
      setTrips(sorted);
    } catch {
      // silently fail
    } finally {
      setTripsLoading(false);
    }
  }, []);

  const loadVehicles = useCallback(async () => {
    try {
      setVehiclesLoading(true);
      const res = await fetchVehicles();
      setVehicles(res.data || []);
    } catch {
      // silently fail
    } finally {
      setVehiclesLoading(false);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    loadKpis();
    loadTrips();
    loadVehicles();
  }, [loadKpis, loadTrips, loadVehicles]);

  // Poll KPIs every 15s
  useEffect(() => {
    const interval = setInterval(loadKpis, 15000);
    return () => clearInterval(interval);
  }, [loadKpis]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const KPI_CARDS = [
    { key: 'activeVehicles', label: 'Active Vehicles', color: 'blue' },
    { key: 'availableVehicles', label: 'Available Vehicles', color: 'green' },
    { key: 'inMaintenance', label: 'Vehicles in Maintenance', color: 'orange' },
    { key: 'activeTrips', label: 'Active Trips', color: 'blue' },
    { key: 'pendingTrips', label: 'Pending Trips', color: 'blue' },
    { key: 'driversOnDuty', label: 'Drivers On Duty', color: 'blue' },
    { key: 'fleetUtilizationPct', label: 'Fleet Utilization', color: 'green' },
  ];

  return (
    <div className="space-y-6">
      {/* Page header + filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-content-primary">Dashboard</h1>
          <p className="text-sm text-content-muted">Fleet overview and real-time metrics</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterPill
            label="Vehicle Type"
            value={filters.type}
            options={VEHICLE_TYPE_OPTIONS}
            onChange={(v) => updateFilter('type', v)}
          />
          <FilterPill
            label="Status"
            value={filters.status}
            options={STATUS_OPTIONS}
            onChange={(v) => updateFilter('status', v)}
          />
          <FilterPill
            label="Region"
            value={filters.region}
            options={regionOptions}
            onChange={(v) => updateFilter('region', v)}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {KPI_CARDS.map((card) => (
          <KpiCard
            key={card.key}
            kpiKey={card.key}
            label={card.label}
            value={kpis?.[card.key] ?? 0}
            accentColor={card.color}
            loading={kpiLoading && !kpis}
          />
        ))}
      </div>

      {/* Two columns: Recent Trips + Vehicle Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Trips — 2/3 width */}
        <div className="lg:col-span-2 bg-surface-card border border-border-hairline rounded-[10px] overflow-hidden">
          <div className="px-5 py-4 border-b border-border-hairline">
            <h2 className="text-sm font-semibold text-content-primary">Recent Trips</h2>
          </div>

          {tripsLoading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-surface-elevated rounded animate-pulse" />
              ))}
            </div>
          ) : trips.length === 0 ? (
            <div className="py-12 text-center text-content-muted text-sm">No trips found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-elevated/50">
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-content-muted uppercase tracking-wider">Trip ID</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-content-muted uppercase tracking-wider">Vehicle</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-content-muted uppercase tracking-wider">Driver</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-content-muted uppercase tracking-wider">Status</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-content-muted uppercase tracking-wider">ETA</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((trip) => (
                    <tr key={trip.trip_id} className="border-t border-border-hairline hover:bg-surface-elevated/30 transition-colors">
                      <td className="px-5 py-3 text-content-primary font-medium">#{trip.trip_id}</td>
                      <td className="px-5 py-3 text-content-primary">
                        {trip.vehicle ? trip.vehicle.name_model || trip.vehicle.registration_no : <span className="text-content-muted italic">Awaiting vehicle</span>}
                      </td>
                      <td className="px-5 py-3 text-content-primary">
                        {trip.driver ? trip.driver.full_name : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={trip.status} />
                      </td>
                      <td className="px-5 py-3 text-content-muted">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Vehicle Status — 1/3 width */}
        <div className="bg-surface-card border border-border-hairline rounded-[10px]">
          <div className="px-5 py-4 border-b border-border-hairline">
            <h2 className="text-sm font-semibold text-content-primary">Vehicle Status</h2>
          </div>
          <div className="p-5">
            <VehicleStatusBar vehicles={vehicles} loading={vehiclesLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
