import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Wrench, Check, HelpCircle, ShieldAlert } from 'lucide-react';
import { getVehicles } from '../api/vehicles.api';
import { getMaintenanceLogs, createMaintenance, closeMaintenance } from '../api/maintenance.api';
import StatusBadge from '../components/common/StatusBadge';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';

// Client-side schema, keeping payload aligned with backend createMaintenanceSchema
const maintenanceFormSchema = z.object({
  vehicle_id: z.coerce.number().positive('Select a valid vehicle'),
  description: z
    .string()
    .min(1, 'Service description/type is required')
    .max(200, 'Description must be 200 characters or less'),
  cost: z.coerce
    .number({ invalid_type_error: 'Cost must be a number' })
    .nonnegative('Cost cannot be negative')
    .optional(),
  date: z.string().optional(), // Visual stub to match request
  status: z.string().default('OPEN'), // Visual stub to match request
});

export default function MaintenancePage() {
  const toast = useToast();
  const { user } = useAuth();

  // Role check: only Fleet Manager can create or close service records
  const isFleetManager = user?.role?.name === 'FLEET_MANAGER';

  // Data states
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [closingId, setClosingId] = useState(null);

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: {
      vehicle_id: '',
      description: '',
      cost: '',
      date: new Date().toISOString().split('T')[0],
      status: 'OPEN',
    },
  });

  // Fetch all vehicles for dropdown selection
  const fetchVehiclesList = useCallback(async () => {
    try {
      const res = await getVehicles();
      setVehicles(res.data || []);
    } catch {
      toast.error('Failed to load fleet list.');
    }
  }, [toast]);

  // Fetch service log table
  const fetchLogsList = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await getMaintenanceLogs();
      setLogs(res.data || []);
    } catch {
      toast.error('Failed to load service log.');
    } finally {
      setLoadingLogs(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchVehiclesList();
    fetchLogsList();
  }, [fetchVehiclesList, fetchLogsList]);

  // Save new record handler
  const onSubmit = async (data) => {
    if (!isFleetManager) {
      toast.error('Action restricted to Fleet Managers.');
      return;
    }

    setSubmitting(true);
    try {
      // Backend create schema only takes: vehicle_id, description, cost
      await createMaintenance({
        vehicle_id: data.vehicle_id,
        description: data.description,
        cost: data.cost,
      });
      toast.success('Service record logged successfully. Vehicle status changed to IN_SHOP.');
      reset({
        vehicle_id: '',
        description: '',
        cost: '',
        date: new Date().toISOString().split('T')[0],
        status: 'OPEN',
      });
      fetchLogsList();
      fetchVehiclesList(); // Reload vehicles to show status updates
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to log service record.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Close service record handler
  const handleCloseRecord = async (log) => {
    if (!isFleetManager) {
      toast.error('Action restricted to Fleet Managers.');
      return;
    }

    const confirmMsg = `Are you sure you want to close the maintenance record for vehicle ${log.vehicle?.registration_no || ''}? This will change the vehicle status back to AVAILABLE.`;
    if (!window.confirm(confirmMsg)) return;

    setClosingId(log.maintenance_id);
    try {
      await closeMaintenance(log.maintenance_id);
      toast.success('Service record closed. Vehicle released to AVAILABLE.');
      fetchLogsList();
      fetchVehiclesList();
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to close service record.'
      );
    } finally {
      setClosingId(null);
    }
  };

  // Format monetary value
  const formatCurrency = (val) => {
    const num = Number(val);
    return isNaN(num) ? '$0.00' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* ─── LEFT COLUMN: Log Service Record Form ─── */}
      <div className="space-y-6">
        
        <div className="bg-surface-card p-5 rounded-[10px] border border-border-hairline">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-content-primary">Log Service Record</h2>
            <p className="text-xs text-content-muted">Log vehicle service incidents or scheduled checkups</p>
          </div>

          {!isFleetManager && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-[10px] bg-status-in-shop-bg text-status-in-shop text-xs border border-status-in-shop/20">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>Viewing Mode &mdash; Only Fleet Managers can log or close service records.</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Vehicle Selection */}
            <div>
              <label htmlFor="vehicle_id" className="block text-[10px] font-bold text-content-muted uppercase tracking-wider mb-1.5">
                Vehicle <span className="text-status-retired">*</span>
              </label>
              <select
                id="vehicle_id"
                disabled={!isFleetManager}
                {...register('vehicle_id')}
                className="w-full h-10 px-3 rounded-[10px] bg-surface-base border border-border-hairline text-sm text-content-primary outline-none focus:border-accent disabled:opacity-60"
              >
                <option value="">Select vehicle for service...</option>
                {vehicles.map((v) => {
                  const isOnTrip = v.status === 'ON_TRIP';
                  return (
                    <option
                      key={v.vehicle_id}
                      value={v.vehicle_id}
                      disabled={isOnTrip}
                      title={isOnTrip ? "Cannot service a vehicle on an active trip" : ""}
                      className={isOnTrip ? "text-content-muted" : ""}
                    >
                      {v.registration_no} ({v.name_model}){isOnTrip ? ' — ⚠️ [ON TRIP: Tooltip: Cannot service a vehicle on an active trip]' : ` (${v.status})`}
                    </option>
                  );
                })}
              </select>
              {errors.vehicle_id && (
                <p className="mt-1 text-xs text-status-retired">{errors.vehicle_id.message}</p>
              )}
            </div>

            {/* Service Type / Description */}
            <div>
              <label htmlFor="description" className="block text-[10px] font-bold text-content-muted uppercase tracking-wider mb-1.5">
                Service Type / Description <span className="text-status-retired">*</span>
              </label>
              <input
                id="description"
                type="text"
                disabled={!isFleetManager}
                placeholder="e.g. Engine oil replacement and brake inspection"
                {...register('description')}
                className={`w-full h-10 px-3 rounded-[10px] bg-surface-base border text-sm text-content-primary placeholder:text-content-muted/30 outline-none transition-colors focus:border-accent disabled:opacity-60
                  ${errors.description ? 'border-status-retired' : 'border-border-hairline'}`}
              />
              {errors.description && (
                <p className="mt-1 text-xs text-status-retired">{errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Cost */}
              <div className="col-span-2">
                <label htmlFor="cost" className="block text-[10px] font-bold text-content-muted uppercase tracking-wider mb-1.5">
                  Cost ($)
                </label>
                <input
                  id="cost"
                  type="number"
                  step="any"
                  disabled={!isFleetManager}
                  placeholder="e.g. 350.00"
                  {...register('cost')}
                  className={`w-full h-10 px-3 rounded-[10px] bg-surface-base border text-sm text-content-primary placeholder:text-content-muted/30 outline-none transition-colors focus:border-accent disabled:opacity-60
                    ${errors.cost ? 'border-status-retired' : 'border-border-hairline'}`}
                />
                {errors.cost && (
                  <p className="mt-1 text-xs text-status-retired">{errors.cost.message}</p>
                )}
              </div>

              {/* Date (Visual) */}
              <div>
                <label htmlFor="date" className="block text-[10px] font-bold text-content-muted uppercase tracking-wider mb-1.5">
                  Date
                </label>
                <input
                  id="date"
                  type="date"
                  disabled={!isFleetManager}
                  {...register('date')}
                  className="w-full h-10 px-3 rounded-[10px] bg-surface-base border border-border-hairline text-sm text-content-primary outline-none focus:border-accent disabled:opacity-60 cursor-pointer"
                />
              </div>
            </div>

            {/* Status (Visual check) */}
            <div>
              <label htmlFor="status" className="block text-[10px] font-bold text-content-muted uppercase tracking-wider mb-1.5">
                Service Status
              </label>
              <select
                id="status"
                disabled={true}
                {...register('status')}
                className="w-full h-10 px-3 rounded-[10px] bg-surface-base border border-border-hairline text-sm text-content-muted outline-none opacity-60 cursor-not-allowed"
              >
                <option value="OPEN">Open (Vehicle to Shop)</option>
                <option value="CLOSED">Closed (Vehicle Released)</option>
              </select>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={submitting || !isFleetManager}
              className="w-full h-10 rounded-[10px] bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Logging record...' : 'Save Service Record'}
            </button>
          </form>
        </div>

        {/* Workflow flow note */}
        <div className="bg-surface-card p-4 rounded-[10px] border border-border-hairline space-y-2.5 text-xs text-content-muted">
          <div className="flex items-center gap-2 font-semibold text-content-primary">
            <Wrench className="w-4 h-4 text-accent" />
            <span>Operational Workflow Rules</span>
          </div>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>
              <span className="font-semibold text-content-primary">Available</span> &mdash;(creating active record)&rarr; <span className="font-semibold text-status-in-shop">In Shop</span>
            </li>
            <li>
              <span className="font-semibold text-status-in-shop">In Shop</span> &mdash;(closing service record)&rarr; <span className="font-semibold text-status-available">Available</span>
            </li>
            <li className="text-accent font-semibold">
              Note: In Shop vehicles are removed from the dispatch pool.
            </li>
          </ul>
        </div>

      </div>

      {/* ─── RIGHT COLUMN: Service Log Table ─── */}
      <div className="bg-surface-card rounded-[10px] border border-border-hairline overflow-hidden">
        <div className="px-5 py-4 border-b border-border-hairline flex items-center justify-between">
          <h2 className="text-sm font-semibold text-content-primary">Service Log</h2>
          <span className="text-[10px] text-content-muted font-semibold uppercase">Real-Time Data Feed</span>
        </div>

        {loadingLogs ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-surface-elevated rounded animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-content-muted text-sm">No maintenance records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-elevated/50 text-xs text-content-muted font-medium border-b border-border-hairline">
                  <th className="px-5 py-3 text-left">Vehicle</th>
                  <th className="px-5 py-3 text-left">Service</th>
                  <th className="px-5 py-3 text-left">Cost</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  {isFleetManager && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.maintenance_id} className="border-b border-border-hairline last:border-0 hover:bg-surface-elevated/35 transition-colors">
                    <td className="px-5 py-3 text-content-primary font-medium">
                      {log.vehicle ? `${log.vehicle.registration_no} (${log.vehicle.name_model})` : '—'}
                    </td>
                    <td className="px-5 py-3 text-content-primary max-w-[160px] truncate" title={log.description}>
                      {log.description}
                    </td>
                    <td className="px-5 py-3 text-content-primary">
                      {formatCurrency(log.cost)}
                    </td>
                    <td className="px-5 py-3">
                      {/* Open/Closed status display using badges */}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold
                        ${log.status === 'OPEN' 
                          ? 'bg-status-in-shop-bg text-status-in-shop border border-status-in-shop/20' 
                          : 'bg-status-available-bg text-status-available border border-status-available/20'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'OPEN' ? 'bg-status-in-shop' : 'bg-status-available'}`} />
                        {log.status === 'OPEN' ? 'Open' : 'Closed'}
                      </span>
                    </td>
                    {isFleetManager && (
                      <td className="px-5 py-3 text-right">
                        {log.status === 'OPEN' && (
                          <button
                            onClick={() => handleCloseRecord(log)}
                            disabled={closingId === log.maintenance_id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-status-available hover:bg-green-600 text-white rounded-[10px] transition-all disabled:opacity-50"
                          >
                            {closingId === log.maintenance_id ? 'Closing...' : (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                Close Record
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
