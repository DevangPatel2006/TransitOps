import { useState, useEffect, useCallback } from 'react';
import { Fuel, DollarSign, Plus, X, ListCollapse, Calculator } from 'lucide-react';
import { getVehicles } from '../api/vehicles.api';
import { getMaintenanceLogs } from '../api/maintenance.api';
import { getFuelLogs, createFuelLog, getExpenses, createExpense } from '../api/fuelExpense.api';
import StatusBadge from '../components/common/StatusBadge';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';

export default function FuelExpensePage() {
  const toast = useToast();
  const { user } = useAuth();

  const canWriteExpenses = user?.role?.name === 'FLEET_MANAGER' || user?.role?.name === 'FINANCIAL_ANALYST';

  // Data states
  const [vehicles, setVehicles] = useState([]);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [maintLogs, setMaintLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form toggles
  const [showFuelForm, setShowFuelForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  // Quick-add fuel log form state
  const [fuelData, setFuelData] = useState({
    vehicle_id: '',
    liters: '',
    cost: '',
    log_date: new Date().toISOString().split('T')[0],
  });

  // Quick-add expense form state
  const [expenseData, setExpenseData] = useState({
    vehicle_id: '',
    type: 'TOLL',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Load resources
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, fRes, eRes, mRes] = await Promise.all([
        getVehicles(),
        getFuelLogs(),
        getExpenses(),
        getMaintenanceLogs(),
      ]);
      setVehicles(vRes.data || []);
      setFuelLogs(fRes.data || []);
      setExpenses(eRes.data || []);
      setMaintLogs(mRes.data || []);
    } catch {
      toast.error('Failed to load operational cost databases.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Submit quick-add fuel log
  const handleFuelSubmit = async (e) => {
    e.preventDefault();
    const vId = Number(fuelData.vehicle_id);
    const lit = Number(fuelData.liters);
    const cost = Number(fuelData.cost);

    if (!vId) return toast.error('Please select a vehicle.');
    if (isNaN(lit) || lit <= 0) return toast.error('Liters must be positive.');
    if (isNaN(cost) || cost < 0) return toast.error('Fuel cost cannot be negative.');

    try {
      await createFuelLog({
        vehicle_id: vId,
        liters: lit,
        cost: cost,
        log_date: fuelData.log_date || undefined,
      });
      toast.success('Fuel entry logged successfully.');
      setFuelData({
        vehicle_id: '',
        liters: '',
        cost: '',
        log_date: new Date().toISOString().split('T')[0],
      });
      setShowFuelForm(false);
      fetchAllData();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to log fuel entry.');
    }
  };

  // Submit quick-add expense
  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    const vId = Number(expenseData.vehicle_id);
    const amt = Number(expenseData.amount);

    if (!vId) return toast.error('Please select a vehicle.');
    if (isNaN(amt) || amt <= 0) return toast.error('Expense amount must be positive.');

    try {
      await createExpense({
        vehicle_id: vId,
        type: expenseData.type,
        amount: amt,
        expense_date: expenseData.expense_date || undefined,
        notes: expenseData.notes || undefined,
      });
      toast.success('Other expense logged successfully.');
      setExpenseData({
        vehicle_id: '',
        type: 'TOLL',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setShowExpenseForm(false);
      fetchAllData();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to log expense.');
    }
  };

  // ── Client-side aggregation notes ──
  // Comment clearly: Computed client-side as: sum(fuel logs cost) + sum(maintenance logs cost)
  const totalFuelCost = fuelLogs.reduce((acc, log) => acc + Number(log.cost || 0), 0);
  const totalMaintCost = maintLogs.reduce((acc, log) => acc + Number(log.cost || 0), 0);
  const totalOperationalCost = totalFuelCost + totalMaintCost;

  const formatCurrency = (val) => {
    const num = Number(val);
    return isNaN(num) ? '$0.00' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Quick Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-content-primary">Fuel &amp; Expenses</h1>
          <p className="text-sm text-content-muted">Track fuel records, maintenance invoices, tolls, and miscellaneous fees</p>
        </div>
        {canWriteExpenses && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowFuelForm(!showFuelForm);
                setShowExpenseForm(false);
              }}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors"
            >
              {showFuelForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              Log Fuel
            </button>
            <button
              onClick={() => {
                setShowExpenseForm(!showExpenseForm);
                setShowFuelForm(false);
              }}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-surface-card border border-border-hairline text-content-primary text-sm font-semibold hover:bg-surface-elevated transition-colors"
            >
              {showExpenseForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              Add Expense
            </button>
          </div>
        )}
      </div>

      {/* ─── QUICK ADD INLINE FORMS ─── */}
      
      {/* Quick Add Fuel Log Form */}
      {showFuelForm && (
        <form onSubmit={handleFuelSubmit} className="p-4 bg-surface-card border border-border-hairline rounded-[10px] grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-[10px] font-bold text-content-muted uppercase tracking-wider mb-1.5">Vehicle</label>
            <select
              value={fuelData.vehicle_id}
              onChange={(e) => setFuelData({ ...fuelData, vehicle_id: e.target.value })}
              className="w-full h-10 px-3 rounded-[10px] bg-surface-base border border-border-hairline text-sm text-content-primary outline-none focus:border-accent cursor-pointer"
            >
              <option value="">Select vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.vehicle_id} value={v.vehicle_id}>{v.registration_no} ({v.name_model})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-content-muted uppercase tracking-wider mb-1.5">Liters</label>
            <input
              type="number"
              step="any"
              placeholder="e.g. 45"
              value={fuelData.liters}
              onChange={(e) => setFuelData({ ...fuelData, liters: e.target.value })}
              className="w-full h-10 px-3 bg-surface-base border border-border-hairline text-sm rounded-[10px] outline-none focus:border-accent text-content-primary"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-content-muted uppercase tracking-wider mb-1.5">Fuel Cost ($)</label>
            <input
              type="number"
              step="any"
              placeholder="e.g. 60"
              value={fuelData.cost}
              onChange={(e) => setFuelData({ ...fuelData, cost: e.target.value })}
              className="w-full h-10 px-3 bg-surface-base border border-border-hairline text-sm rounded-[10px] outline-none focus:border-accent text-content-primary"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 h-10 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-[10px] transition-colors">
              Log Fuel
            </button>
            <button type="button" onClick={() => setShowFuelForm(false)} className="p-2.5 rounded-[10px] bg-surface-elevated text-content-muted hover:text-content-primary">
              <X className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* Quick Add Expense Form */}
      {showExpenseForm && (
        <form onSubmit={handleExpenseSubmit} className="p-4 bg-surface-card border border-border-hairline rounded-[10px] space-y-3">
          <span className="block text-[10px] font-bold text-content-muted uppercase tracking-wider mb-1">New Operational Expense</span>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-[9px] font-bold text-content-muted uppercase tracking-wider mb-1">Vehicle</label>
              <select
                value={expenseData.vehicle_id}
                onChange={(e) => setExpenseData({ ...expenseData, vehicle_id: e.target.value })}
                className="w-full h-10 px-3 rounded-[10px] bg-surface-base border border-border-hairline text-sm text-content-primary outline-none focus:border-accent cursor-pointer"
              >
                <option value="">Select vehicle...</option>
                {vehicles.map((v) => (
                  <option key={v.vehicle_id} value={v.vehicle_id}>{v.registration_no} ({v.name_model})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-bold text-content-muted uppercase tracking-wider mb-1">Expense Type</label>
              <select
                value={expenseData.type}
                onChange={(e) => setExpenseData({ ...expenseData, type: e.target.value })}
                className="w-full h-10 px-3 rounded-[10px] bg-surface-base border border-border-hairline text-sm text-content-primary outline-none focus:border-accent cursor-pointer"
              >
                <option value="TOLL">Toll Fee</option>
                <option value="FINE">Traffic Fine</option>
                <option value="PARKING">Parking Ticket</option>
                <option value="OTHER">Other / Miscellaneous</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-bold text-content-muted uppercase tracking-wider mb-1">Amount ($)</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 45"
                value={expenseData.amount}
                onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })}
                className="w-full h-10 px-3 bg-surface-base border border-border-hairline text-sm rounded-[10px] outline-none focus:border-accent text-content-primary"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-content-muted uppercase tracking-wider mb-1">Notes / Description</label>
              <input
                type="text"
                placeholder="e.g. Highway Toll B"
                value={expenseData.notes}
                onChange={(e) => setExpenseData({ ...expenseData, notes: e.target.value })}
                className="w-full h-10 px-3 bg-surface-base border border-border-hairline text-sm rounded-[10px] outline-none focus:border-accent text-content-primary"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1.5">
            <button type="button" onClick={() => setShowExpenseForm(false)} className="h-9 px-4 text-xs font-semibold text-content-muted hover:text-content-primary bg-surface-base rounded-[10px]">
              Cancel
            </button>
            <button type="submit" className="h-9 px-4 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-[10px] transition-colors">
              Add Expense Record
            </button>
          </div>
        </form>
      )}

      {/* ─── FUEL LOGS TABLE ─── */}
      <div className="bg-surface-card rounded-[10px] border border-border-hairline overflow-hidden">
        <div className="px-5 py-4 border-b border-border-hairline flex items-center justify-between">
          <h2 className="text-sm font-semibold text-content-primary flex items-center gap-2">
            <Fuel className="w-4 h-4 text-accent" />
            Fuel Logs
          </h2>
          <span className="text-[10px] text-content-muted font-semibold uppercase">Usage History</span>
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-9 bg-surface-elevated rounded animate-pulse" />
            ))}
          </div>
        ) : fuelLogs.length === 0 ? (
          <div className="py-12 text-center text-content-muted text-sm">No fuel entries found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-elevated/50 text-xs text-content-muted font-medium border-b border-border-hairline">
                  <th className="px-5 py-3 text-left">Vehicle</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Liters</th>
                  <th className="px-5 py-3 text-left">Fuel Cost</th>
                </tr>
              </thead>
              <tbody>
                {fuelLogs.map((log) => (
                  <tr key={log.fuel_log_id} className="border-b border-border-hairline last:border-0 hover:bg-surface-elevated/35 transition-colors">
                    <td className="px-5 py-3 text-content-primary font-medium">
                      {log.vehicle ? `${log.vehicle.registration_no} (${log.vehicle.name_model})` : '—'}
                    </td>
                    <td className="px-5 py-3 text-content-primary">
                      {new Date(log.log_date).toLocaleDateString('en-US')}
                    </td>
                    <td className="px-5 py-3 text-content-primary">
                      {Number(log.liters)} L
                    </td>
                    <td className="px-5 py-3 text-content-primary">
                      {formatCurrency(log.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── OTHER EXPENSES (TOLL/MISC) TABLE ─── */}
      <div className="bg-surface-card rounded-[10px] border border-border-hairline overflow-hidden">
        <div className="px-5 py-4 border-b border-border-hairline flex items-center justify-between">
          <h2 className="text-sm font-semibold text-content-primary flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-accent" />
            Other Expenses (Toll/Misc)
          </h2>
          <span className="text-[10px] text-content-muted font-semibold uppercase">Operational Fees</span>
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-9 bg-surface-elevated rounded animate-pulse" />
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <div className="py-12 text-center text-content-muted text-sm">No expense records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-elevated/50 text-xs text-content-muted font-medium border-b border-border-hairline">
                  <th className="px-5 py-3 text-left">Trip</th>
                  <th className="px-5 py-3 text-left">Vehicle</th>
                  <th className="px-5 py-3 text-left">Toll</th>
                  <th className="px-5 py-3 text-left">Other</th>
                  <th className="px-5 py-3 text-left">Maint. (Linked)</th>
                  <th className="px-5 py-3 text-left">Total</th>
                  <th className="px-5 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((row) => {
                  // Attempt parsing Trip ID from notes/description text
                  const tripMatch = row.notes?.match(/(?:trip\s*#?|#)\s*(\d+)/i);
                  const parsedTripId = tripMatch ? `#${tripMatch[1]}` : '—';

                  const isToll = row.type === 'TOLL';
                  const tollCost = isToll ? row.amount : 0;
                  const otherCost = !isToll ? row.amount : 0;

                  // Check if notes indicate connection to maintenance checkups
                  const isMaintLinked = row.notes?.toLowerCase().includes('maint') || row.type === 'OTHER' && row.notes?.toLowerCase().includes('oil');

                  return (
                    <tr key={row.expense_id} className="border-b border-border-hairline last:border-0 hover:bg-surface-elevated/35 transition-colors">
                      <td className="px-5 py-3 text-content-primary font-medium">
                        {parsedTripId}
                      </td>
                      <td className="px-5 py-3 text-content-primary font-medium">
                        {row.vehicle ? row.vehicle.registration_no : '—'}
                      </td>
                      <td className="px-5 py-3 text-content-primary">
                        {isToll ? formatCurrency(tollCost) : '—'}
                      </td>
                      <td className="px-5 py-3 text-content-primary">
                        {!isToll ? formatCurrency(otherCost) : '—'}
                      </td>
                      <td className="px-5 py-3 text-content-primary font-medium">
                        {isMaintLinked ? '🔗 Linked' : '—'}
                      </td>
                      <td className="px-5 py-3 text-content-primary font-semibold">
                        {formatCurrency(row.amount)}
                      </td>
                      <td className="px-5 py-3">
                        {/* Static/frontend status indicator for operational logging */}
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-status-available-bg text-status-available border border-status-available/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-status-available" />
                          Logged
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── BOTTOM SUMMARY CARD ─── */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-5 rounded-[10px] bg-accent-muted border border-accent/25">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-accent/15 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-content-primary">Total Operational Cost (AUTO)</h3>
            <p className="text-xs text-content-muted">Formula: Fuel Cost ({formatCurrency(totalFuelCost)}) + Maintenance Cost ({formatCurrency(totalMaintCost)})</p>
          </div>
        </div>
        <div className="text-right mt-3 sm:mt-0">
          <span className="text-3xl font-extrabold text-accent">
            {formatCurrency(totalOperationalCost)}
          </span>
          <span className="block text-[9px] text-content-muted font-medium mt-1">
            {/* Clearly commented calculation source */}
            Computed client-side: sum of all logged fuel costs + sum of all closed/open maintenance logs
          </span>
        </div>
      </div>

    </div>
  );
}
