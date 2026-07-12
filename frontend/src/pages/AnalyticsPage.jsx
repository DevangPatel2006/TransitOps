import { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { BarChart3, Download, Info, Loader2, Landmark } from 'lucide-react';
import { getFuelEfficiency, getUtilization, getRoi, exportReportCsv, exportReportPdf } from '../api/reports.api';
import { getCostTrend, getFleetUtilizationTrend } from '../api/analytics.api';
import { getTrips } from '../api/trips.api';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';

function LocalKpiCard({ label, value, accentColor, kpiKey, loading }) {
  const colorMap = {
    blue: { border: 'border-l-status-on-trip', text: 'text-status-on-trip', bg: 'bg-status-on-trip-bg' },
    green: { border: 'border-l-status-available', text: 'text-status-available', bg: 'bg-status-available-bg' },
    orange: { border: 'border-l-status-in-shop', text: 'text-status-in-shop', bg: 'bg-status-in-shop-bg' },
  };
  const c = colorMap[accentColor] || colorMap.blue;

  return (
    <div className={`bg-surface-card border border-border-hairline rounded-[10px] p-5 border-l-4 ${c.border}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-content-muted uppercase tracking-wider mb-1">{label}</p>
          {loading ? (
            <div className="h-7 w-20 bg-surface-elevated rounded animate-pulse mt-1" />
          ) : (
            <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
          )}
        </div>
        <div className={`w-9 h-9 rounded-[10px] ${c.bg} flex items-center justify-center`}>
          <BarChart3 className={`w-4 h-4 ${c.text}`} />
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const toast = useToast();
  const { user } = useAuth();

  const canExportCsv = user?.role?.name === 'FLEET_MANAGER' || user?.role?.name === 'FINANCIAL_ANALYST';

  // Data states
  const [efficiencyData, setEfficiencyData] = useState([]);
  const [utilization, setUtilization] = useState(null);
  const [roiData, setRoiData] = useState([]);
  const [trips, setTrips] = useState([]);
  const [costTrend, setCostTrend] = useState([]);
  const [utilizationTrend, setUtilizationTrend] = useState([]);

  // Load state
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState('vehicles');

  // Load all reports
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const [effRes, utilRes, roiRes, tripsRes, costTrendRes, utilTrendRes] = await Promise.all([
        getFuelEfficiency(),
        getUtilization(),
        getRoi(),
        getTrips(),
        getCostTrend(6),
        getFleetUtilizationTrend(7),
      ]);
      setEfficiencyData(effRes.data || []);
      setUtilization(utilRes.data || null);
      setRoiData(roiRes.data || []);
      setTrips(tripsRes.data || []);
      setCostTrend(costTrendRes.data || []);
      setUtilizationTrend(utilTrendRes.data || []);
    } catch {
      toast.error('Failed to load report analytics.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Calculations for KPIs
  const computedMetrics = useMemo(() => {
    // 1. Avg Fuel Efficiency: average of non-null efficiencies
    const validEfficiencies = efficiencyData.filter((v) => v.fuel_efficiency !== null);
    const avgEfficiency = validEfficiencies.length > 0
      ? validEfficiencies.reduce((acc, v) => acc + Number(v.fuel_efficiency), 0) / validEfficiencies.length
      : 0;

    // 2. Avg Vehicle ROI
    const avgRoi = roiData.length > 0
      ? roiData.reduce((acc, v) => acc + Number(v.roi), 0) / roiData.length
      : 0;

    // 3. Operational Cost: sum(maintenance + fuel) from ROI dataset
    const totalOpCost = roiData.reduce((acc, v) => acc + Number(v.maintenance_cost || 0) + Number(v.fuel_cost || 0), 0);

    return {
      avgFuelEfficiency: avgEfficiency.toFixed(2) + ' km/L',
      avgRoi: (avgRoi * 100).toFixed(2) + '%',
      totalOperationalCost: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalOpCost),
    };
  }, [efficiencyData, roiData]);



  // Top Costliest Vehicles: total cost = maint + fuel from ROI report
  const costliestVehicles = useMemo(() => {
    const calculated = roiData.map((v) => {
      const totalCost = Number(v.maintenance_cost || 0) + Number(v.fuel_cost || 0);
      return {
        registration_no: v.registration_no,
        name_model: v.name_model,
        totalCost,
      };
    });

    // Sort descending, take top 5
    return calculated.sort((a, b) => b.totalCost - a.totalCost).slice(0, 5);
  }, [roiData]);

  // Export CSV handler
  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const response = await exportReportCsv(exportType);
      
      // Handle file download from blob response
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transitops_${exportType}_report.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`${exportType.toUpperCase()} database exported successfully.`);
    } catch {
      toast.error('Failed to export CSV report.');
    } finally {
      setExporting(false);
    }
  };

  const [exportingPdf, setExportingPdf] = useState(false);

  // Export PDF handler
  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const response = await exportReportPdf(exportType);
      
      // Handle file download from blob response
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transitops_${exportType}_report.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`${exportType.toUpperCase()} PDF report exported successfully.`);
    } catch {
      toast.error('Failed to export PDF report.');
    } finally {
      setExportingPdf(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Export Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-content-primary">Reports &amp; Analytics</h1>
          <p className="text-sm text-content-muted">Financial ROI metrics, fleet usage patterns, and data exports</p>
        </div>
        
        {/* CSV & PDF Export tool */}
        {canExportCsv ? (
          <div className="flex items-center gap-2 bg-surface-card p-2 rounded-[10px] border border-border-hairline">
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value)}
              className="h-9 px-3 rounded-[10px] bg-surface-base border border-border-hairline text-xs text-content-primary cursor-pointer outline-none focus:border-accent"
            >
              <option value="vehicles">Export Vehicles</option>
              <option value="drivers">Export Drivers</option>
              <option value="trips">Export Trips</option>
              <option value="costs">Export Cost Logs</option>
            </select>
            <button
              onClick={handleExportCsv}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Export CSV
            </button>
            <button
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {exportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Export PDF
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 p-2 rounded-[10px] bg-surface-card border border-border-hairline text-xs text-content-muted">
            <Info className="w-4 h-4 text-accent flex-shrink-0" />
            <span>Exports restricted to Fleet Managers / Financial Analysts.</span>
          </div>
        )}
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <LocalKpiCard
          label="Fuel Efficiency (Avg)"
          value={computedMetrics.avgFuelEfficiency}
          accentColor="blue"
          loading={loading}
        />
        <LocalKpiCard
          label="Fleet Utilization"
          value={(utilization?.utilizationPct ?? 0) + '%'}
          accentColor="green"
          loading={loading}
        />
        <LocalKpiCard
          label="Operational Cost (OpEx)"
          value={computedMetrics.totalOperationalCost}
          accentColor="orange"
          loading={loading}
        />
        <LocalKpiCard
          label="Average ROI"
          value={computedMetrics.avgRoi}
          accentColor="green"
          loading={loading}
        />
      </div>

      {/* ROI Rule note caption */}
      <div className="flex items-center gap-2 p-3 bg-surface-card border border-border-hairline rounded-[10px] text-xs text-content-muted">
        <Info className="w-4 h-4 text-accent flex-shrink-0" />
        <span>Calculation Policy: <span className="font-semibold text-content-primary">ROI = (Revenue &minus; (Maintenance + Fuel)) / Acquisition Cost</span>.</span>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Monthly Operational Costs chart */}
        <div className="bg-surface-card p-5 rounded-[10px] border border-border-hairline">
          <h3 className="text-sm font-semibold text-content-primary mb-6">Monthly Operational Costs</h3>
          <div className="h-64 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#15151B', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '10px' }}
                    labelStyle={{ color: '#F1F5F9', fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar dataKey="fuel_cost" name="Fuel" fill="#D97706" stackId="a" />
                  <Bar dataKey="maintenance_cost" name="Maintenance" fill="#3B82F6" stackId="a" />
                  <Bar dataKey="expense_cost" name="Other Expenses" fill="#10B981" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Fleet Utilization Trend chart */}
        <div className="bg-surface-card p-5 rounded-[10px] border border-border-hairline">
          <h3 className="text-sm font-semibold text-content-primary mb-6">Fleet Utilization Trend (%)</h3>
          <div className="h-64 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={utilizationTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#15151B', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '10px' }}
                    labelStyle={{ color: '#F1F5F9', fontWeight: 'bold' }}
                  />
                  <Line type="monotone" dataKey="utilization" name="Utilization %" stroke="#3B82F6" strokeWidth={2} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Costliest Vehicles list */}
        <div className="bg-surface-card p-5 rounded-[10px] border border-border-hairline flex flex-col justify-between lg:col-span-2">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-content-primary mb-1">Top Costliest Vehicles</h3>
            <p className="text-[11px] text-content-muted">Ranked by combined maintenance and fuel log expenses</p>
          </div>

          <div className="space-y-4 flex-1 flex flex-col justify-center">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : costliestVehicles.length === 0 ? (
              <p className="text-xs text-content-muted text-center py-12">No cost logs registered yet.</p>
            ) : (
              costliestVehicles.map((vehicle, idx) => {
                // Find maximum cost to normalize percentages
                const maxCost = costliestVehicles[0]?.totalCost || 1;
                const pct = Math.max(8, Math.min(100, (vehicle.totalCost / maxCost) * 100));

                return (
                  <div key={vehicle.registration_no} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-content-primary">
                        {idx + 1}. {vehicle.registration_no} &middot; <span className="font-normal text-content-muted">{vehicle.name_model}</span>
                      </span>
                      <span className="font-bold text-accent">{formatCurrency(vehicle.totalCost)}</span>
                    </div>
                    <div className="h-3 bg-surface-elevated rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
