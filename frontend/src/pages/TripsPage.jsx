import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowRight, ShieldAlert, Zap, CheckCircle2,
  Trash2, XOctagon, Loader2, ArrowRightCircle, CheckCircle,
} from 'lucide-react';
import { getVehicles } from '../api/vehicles.api';
import { getDrivers } from '../api/drivers.api';
import { getTrips, createTrip, dispatchTrip, completeTrip, cancelTrip } from '../api/trips.api';
import StatusBadge from '../components/common/StatusBadge';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';

// Form validation schema for creating a trip
const tripFormSchema = z.object({
  source: z.string().min(1, 'Source depot is required'),
  destination: z.string().min(1, 'Destination is required'),
  vehicle_id: z.coerce.number().positive('Select a valid vehicle'),
  driver_id: z.coerce.number().positive('Select a valid driver'),
  cargo_weight: z.coerce.number().positive('Cargo weight must be greater than 0'),
  planned_distance: z.coerce.number().positive('Planned distance must be greater than 0'),
});

export default function TripsPage() {
  const toast = useToast();
  const { user } = useAuth();

  const canWriteTrips = user?.role?.name === 'FLEET_MANAGER' || user?.role?.name === 'DRIVER_OPS';

  // Master lists
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  // Selections
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [loading, setLoading] = useState(true);

  // Submitting statuses
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // stores tripId being operated on

  // Inline complete sub-form state (keyed by tripId)
  const [completionInputs, setCompletionInputs] = useState({});

  // ── Form configuration ──
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(tripFormSchema),
    defaultValues: {
      source: '',
      destination: '',
      vehicle_id: '',
      driver_id: '',
      cargo_weight: '',
      planned_distance: '',
    },
  });

  // Watch fields for live capacity checks
  const watchedVehicleId = watch('vehicle_id');
  const watchedCargoWeight = watch('cargo_weight');

  // Load vehicles & drivers
  const loadFormResources = useCallback(async () => {
    try {
      const vRes = await getVehicles({ status: 'AVAILABLE' });
      setVehicles(vRes.data || []);

      const dRes = await getDrivers({ status: 'AVAILABLE' });
      setDrivers(dRes.data || []);
    } catch (err) {
      toast.error('Failed to load available fleet resources.');
    }
  }, [toast]);

  // Load trips feed
  const loadTrips = useCallback(async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    try {
      const res = await getTrips();
      // Sort newest first
      const sorted = (res.data || []).sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setTrips(sorted);
    } catch (err) {
      if (!isPolling) toast.error('Failed to load trips board.');
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [toast]);

  // Initial load
  useEffect(() => {
    loadFormResources();
    loadTrips();
  }, [loadFormResources, loadTrips]);

  // Polling every 15s
  useEffect(() => {
    const interval = setInterval(() => {
      loadTrips(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [loadTrips]);

  // Sync selected vehicle details for validation
  const activeVehicle = vehicles.find((v) => v.vehicle_id === Number(watchedVehicleId));
  const capacityExceeded =
    activeVehicle &&
    Number(watchedCargoWeight) > Number(activeVehicle.max_load_capacity);

  const capacityDiff = activeVehicle
    ? Math.max(0, Number(watchedCargoWeight) - Number(activeVehicle.max_load_capacity))
    : 0;

  // Handle trip submission
  const onSubmit = async (data) => {
    if (capacityExceeded) return;
    setSubmitting(true);
    try {
      await createTrip(data);
      toast.success('Trip draft created successfully.');
      reset();
      setSelectedVehicleId('');
      loadTrips();
      loadFormResources(); // Refresh dropdown resources
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to create trip draft.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Dispatch handler
  const handleDispatch = async (tripId) => {
    setActionLoading(tripId);
    try {
      await dispatchTrip(tripId);
      toast.success('Trip dispatched successfully. Vehicle and driver set to ON_TRIP.');
      loadTrips();
      loadFormResources();
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Dispatch failed.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Complete handler
  const handleCompleteSubmit = async (tripId, vehicleStartOdo) => {
    const inputs = completionInputs[tripId] || {};
    const finalOdo = Number(inputs.final_odometer);
    const fuel = Number(inputs.fuel_consumed);
    const rev = Number(inputs.revenue);

    if (!finalOdo || finalOdo <= 0) {
      toast.error('Final odometer is required and must be positive.');
      return;
    }
    if (finalOdo < Number(vehicleStartOdo)) {
      toast.error(`Final odometer cannot be less than starting odometer (${vehicleStartOdo} km).`);
      return;
    }
    if (isNaN(fuel) || fuel < 0) {
      toast.error('Fuel consumed must be a non-negative number.');
      return;
    }
    if (isNaN(rev) || rev < 0) {
      toast.error('Revenue must be a non-negative number.');
      return;
    }

    setActionLoading(tripId);
    try {
      await completeTrip(tripId, {
        final_odometer: finalOdo,
        fuel_consumed: fuel,
        revenue: rev,
      });
      toast.success('Trip completed successfully. Resources released.');
      // Clear inputs
      setCompletionInputs((prev) => {
        const copy = { ...prev };
        delete copy[tripId];
        return copy;
      });
      loadTrips();
      loadFormResources();
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Trip completion failed.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Cancel handler
  const handleCancel = async (trip) => {
    const confirmMsg = `Are you sure you want to cancel Trip #${trip.trip_id}? This action is permanent.`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(trip.trip_id);
    try {
      await cancelTrip(trip.trip_id);
      toast.success('Trip cancelled successfully.');
      loadTrips();
      loadFormResources();
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Cancellation failed.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Change input values in complete sub-form
  const handleCompletionInputChange = (tripId, key, value) => {
    setCompletionInputs((prev) => ({
      ...prev,
      [tripId]: {
        ...(prev[tripId] || {}),
        [key]: value,
      },
    }));
  };

  // Check driver license expiration
  const isDriverLicenseExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  // Lifecycle node stepper states
  const selectedStatus = selectedTrip?.status || 'DRAFT';
  const getStepClass = (stepName) => {
    const sequence = ['DRAFT', 'DISPATCHED', 'COMPLETED', 'CANCELLED'];
    const activeIdx = sequence.indexOf(selectedStatus);
    const stepIdx = sequence.indexOf(stepName);

    if (selectedStatus === 'CANCELLED' && stepName === 'CANCELLED') {
      return 'bg-status-retired text-white border-transparent';
    }
    if (stepName === 'CANCELLED') {
      return 'bg-surface-base text-content-muted border-border-hairline';
    }
    
    if (stepIdx < activeIdx) {
      return 'bg-status-available text-white border-transparent';
    }
    if (stepIdx === activeIdx) {
      return 'bg-accent text-white border-transparent ring-4 ring-accent/20';
    }
    return 'bg-surface-base text-content-muted border-border-hairline';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* ─── LEFT COLUMN: Lifecycle Stepper & Create Form ─── */}
      <div className="space-y-6">
        
        {/* Trip Lifecycle Stepper */}
        <div className="bg-surface-card p-5 rounded-[10px] border border-border-hairline">
          <h2 className="text-sm font-semibold text-content-primary mb-4">Trip Lifecycle Stepper</h2>
          
          <div className="flex items-center justify-between">
            {/* Draft Node */}
            <div className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${getStepClass('DRAFT')}`}>
                1
              </div>
              <span className="text-[10px] mt-1.5 font-medium text-content-muted">Draft</span>
            </div>

            <div className="h-0.5 bg-border-hairline flex-1 -mt-4" />

            {/* Dispatched Node */}
            <div className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${getStepClass('DISPATCHED')}`}>
                2
              </div>
              <span className="text-[10px] mt-1.5 font-medium text-content-muted">Dispatched</span>
            </div>

            <div className="h-0.5 bg-border-hairline flex-1 -mt-4" />

            {/* Completed Node */}
            <div className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${getStepClass('COMPLETED')}`}>
                3
              </div>
              <span className="text-[10px] mt-1.5 font-medium text-content-muted">Completed</span>
            </div>

            <div className="h-0.5 bg-border-hairline flex-1 -mt-4" />

            {/* Cancelled Node */}
            <div className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${getStepClass('CANCELLED')}`}>
                ✕
              </div>
              <span className="text-[10px] mt-1.5 font-medium text-content-muted">Cancelled</span>
            </div>
          </div>
          {selectedTrip && (
            <p className="text-[10px] text-content-muted mt-3 text-center">
              Tracking Trip #{selectedTrip.trip_id} &middot; Current status: <span className="text-accent font-semibold uppercase">{selectedTrip.status}</span>
            </p>
          )}
        </div>

        {/* Create Trip Form */}
        <div className="bg-surface-card p-5 rounded-[10px] border border-border-hairline">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-content-primary">Create Trip Draft</h2>
            <p className="text-xs text-content-muted">Assign vehicles and drivers to set up new operational drafts</p>
          </div>

          {canWriteTrips ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Source */}
                <div>
                  <label htmlFor="source" className="block text-[10px] font-bold text-content-muted uppercase tracking-wider mb-1.5">
                    Source Depot <span className="text-status-retired">*</span>
                  </label>
                  <input
                    id="source"
                    type="text"
                    placeholder="e.g. North Depot"
                    {...register('source')}
                    className={`w-full h-10 px-3 rounded-[10px] bg-surface-base border text-sm text-content-primary placeholder:text-content-muted/30 outline-none transition-colors focus:border-accent
                      ${errors.source ? 'border-status-retired' : 'border-border-hairline'}`}
                  />
                  {errors.source && (
                    <p className="mt-1 text-xs text-status-retired">{errors.source.message}</p>
                  )}
                </div>

                {/* Destination */}
                <div>
                  <label htmlFor="destination" className="block text-[10px] font-bold text-content-muted uppercase tracking-wider mb-1.5">
                    Destination <span className="text-status-retired">*</span>
                  </label>
                  <input
                    id="destination"
                    type="text"
                    placeholder="e.g. Retail Center B"
                    {...register('destination')}
                    className={`w-full h-10 px-3 rounded-[10px] bg-surface-base border text-sm text-content-primary placeholder:text-content-muted/30 outline-none transition-colors focus:border-accent
                      ${errors.destination ? 'border-status-retired' : 'border-border-hairline'}`}
                  />
                  {errors.destination && (
                    <p className="mt-1 text-xs text-status-retired">{errors.destination.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Vehicle Dropdown */}
                <div>
                  <label htmlFor="vehicle_id" className="block text-[10px] font-bold text-content-muted uppercase tracking-wider mb-1.5">
                    Vehicle <span className="text-status-retired">*</span>
                  </label>
                  <select
                    id="vehicle_id"
                    disabled={vehicles.length === 0}
                    {...register('vehicle_id')}
                    className="w-full h-10 px-3 rounded-[10px] bg-surface-base border border-border-hairline text-sm text-content-primary cursor-pointer outline-none focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {vehicles.length === 0 ? (
                      <option value="">No available vehicles — check fleet status</option>
                    ) : (
                      <>
                        <option value="">Select available vehicle...</option>
                        {vehicles.map((v) => (
                          <option key={v.vehicle_id} value={v.vehicle_id}>
                            {v.registration_no} ({v.name_model}) - Max {Number(v.max_load_capacity)} kg
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  {errors.vehicle_id && (
                    <p className="mt-1 text-xs text-status-retired">{errors.vehicle_id.message}</p>
                  )}
                </div>

                {/* Driver Dropdown */}
                <div>
                  <label htmlFor="driver_id" className="block text-[10px] font-bold text-content-muted uppercase tracking-wider mb-1.5">
                    Driver <span className="text-status-retired">*</span>
                  </label>
                  <select
                    id="driver_id"
                    {...register('driver_id')}
                    className="w-full h-10 px-3 rounded-[10px] bg-surface-base border border-border-hairline text-sm text-content-primary cursor-pointer outline-none focus:border-accent"
                  >
                    <option value="">Select available driver...</option>
                    {drivers.map((d) => {
                      const expired = isDriverLicenseExpired(d.license_expiry);
                      return (
                        <option key={d.driver_id} value={d.driver_id} className={expired ? 'text-content-muted line-through' : ''}>
                          {expired ? '⚠️ [EXPIRED] ' : ''}{d.full_name} ({d.license_category})
                        </option>
                      );
                    })}
                  </select>
                  {errors.driver_id && (
                    <p className="mt-1 text-xs text-status-retired">{errors.driver_id.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Cargo Weight */}
                <div>
                  <label htmlFor="cargo_weight" className="block text-[10px] font-bold text-content-muted uppercase tracking-wider mb-1.5">
                    Cargo Weight (kg) <span className="text-status-retired">*</span>
                  </label>
                  <input
                    id="cargo_weight"
                    type="number"
                    placeholder="e.g. 500"
                    {...register('cargo_weight')}
                    className={`w-full h-10 px-3 rounded-[10px] bg-surface-base border text-sm text-content-primary placeholder:text-content-muted/30 outline-none transition-colors focus:border-accent
                      ${errors.cargo_weight ? 'border-status-retired' : 'border-border-hairline'}`}
                  />
                  {errors.cargo_weight && (
                    <p className="mt-1 text-xs text-status-retired">{errors.cargo_weight.message}</p>
                  )}
                </div>

                {/* Planned Distance */}
                <div>
                  <label htmlFor="planned_distance" className="block text-[10px] font-bold text-content-muted uppercase tracking-wider mb-1.5">
                    Planned Distance (km) <span className="text-status-retired">*</span>
                  </label>
                  <input
                    id="planned_distance"
                    type="number"
                    placeholder="e.g. 120"
                    {...register('planned_distance')}
                    className={`w-full h-10 px-3 rounded-[10px] bg-surface-base border text-sm text-content-primary placeholder:text-content-muted/30 outline-none transition-colors focus:border-accent
                      ${errors.planned_distance ? 'border-status-retired' : 'border-border-hairline'}`}
                  />
                  {errors.planned_distance && (
                    <p className="mt-1 text-xs text-status-retired">{errors.planned_distance.message}</p>
                  )}
                </div>
              </div>

              {/* Live Client-Side Capacity Alert Box */}
              {capacityExceeded && (
                <div className="flex items-start gap-2.5 p-3 rounded-[10px] border border-status-retired/40 bg-status-retired-bg text-xs text-red-300">
                  <ShieldAlert className="w-4 h-4 text-status-retired flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Overweight Alert</span>
                    Vehicle Capacity: {Number(activeVehicle.max_load_capacity)} kg / Cargo Weight: {watchedCargoWeight} kg
                    <br />
                    ✕ Capacity exceeded by {capacityDiff} kg &mdash; dispatch blocked.
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || capacityExceeded}
                className="w-full h-10 rounded-[10px] bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating draft...' : 'Create Draft'}
              </button>
            </form>
          ) : (
            <div className="flex items-start gap-2.5 p-4 rounded-[10px] bg-surface-base border border-border-hairline text-xs text-content-muted">
              <ShieldAlert className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
              <span>Read-only Mode &mdash; Creating new trips or editing existing operational drafts is restricted to Fleet Managers and Dispatchers.</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT COLUMN: Live Board Feed ─── */}
      <div className="space-y-4">
        
        {/* Live Board Header */}
        <div className="flex items-center justify-between bg-surface-card px-4 py-3 rounded-[10px] border border-border-hairline">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-available opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-status-available"></span>
            </span>
            <span className="text-xs font-semibold text-content-primary">Live Board</span>
          </div>
          <span className="text-[10px] text-content-muted uppercase tracking-wider font-bold">Auto-updates every 15s</span>
        </div>

        {/* Stacked Trips Feed */}
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : trips.length === 0 ? (
            <div className="bg-surface-card py-12 text-center text-content-muted text-sm border border-border-hairline rounded-[10px]">
              No active or historical trips found.
            </div>
          ) : (
            trips.map((trip) => {
              const isSelected = selectedTrip?.trip_id === trip.trip_id;
              
              // Determine context notes based on status
              let rightNote = 'Active Operational';
              if (trip.status === 'DRAFT') rightNote = 'Awaiting dispatch';
              if (trip.status === 'COMPLETED') rightNote = 'Archived successfully';
              if (trip.status === 'CANCELLED') rightNote = 'Cancelled operational';

              return (
                <div
                  key={trip.trip_id}
                  onClick={() => setSelectedTrip(isSelected ? null : trip)}
                  className={`p-4 bg-surface-card border rounded-[10px] transition-all cursor-pointer hover:border-accent/40
                    ${isSelected ? 'border-accent ring-2 ring-accent/15' : 'border-border-hairline'}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-content-primary">Trip #{trip.trip_id}</span>
                        <StatusBadge status={trip.status} />
                      </div>
                      
                      {/* Route */}
                      <div className="flex items-center gap-2 text-xs font-semibold text-content-primary mt-2">
                        <span>{trip.source}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-accent" />
                        <span>{trip.destination}</span>
                      </div>

                      {/* Fleet resource names */}
                      <p className="text-[11px] text-content-muted mt-1.5">
                        Vehicle: <span className="text-content-primary font-medium">{trip.vehicle?.registration_no || 'Unassigned'}</span> &middot; Driver: <span className="text-content-primary font-medium">{trip.driver?.full_name || 'Unassigned'}</span>
                      </p>
                      
                      <div className="flex gap-4 mt-2 text-[10px] text-content-muted">
                        <span>Cargo: {Number(trip.cargo_weight)} kg</span>
                        <span>Distance: {Number(trip.planned_distance)} km</span>
                      </div>
                    </div>

                    <div className="text-right text-[10px]">
                      <span className="font-semibold text-accent uppercase tracking-wider block">{rightNote}</span>
                      {trip.status === 'DISPATCHED' && (
                        <span className="text-content-muted block mt-1">Started: {new Date(trip.dispatched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </div>
                  </div>

                  {/* Contextual actions visible ONLY on card click */}
                  {isSelected && (
                    <div className="mt-4 pt-3 border-t border-border-hairline flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
                      {canWriteTrips ? (
                        /* Action buttons based on status */
                        <div className="flex flex-wrap items-center gap-2">
                          
                          {/* Dispatch Button (DRAFT status) */}
                          {trip.status === 'DRAFT' && (
                            <button
                              onClick={() => handleDispatch(trip.trip_id)}
                              disabled={actionLoading === trip.trip_id}
                              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[10px] bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all disabled:opacity-50"
                            >
                              {actionLoading === trip.trip_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                              Dispatch Trip
                            </button>
                          )}

                          {/* Inline completion sub-form (DISPATCHED status) */}
                          {trip.status === 'DISPATCHED' && (
                            <div className="w-full bg-surface-base p-3 rounded-[10px] border border-border-hairline space-y-3">
                              <span className="block text-[10px] font-bold text-content-muted uppercase tracking-wider">
                                Complete Trip Sub-Form (Release resources)
                              </span>
                              
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="block text-[9px] text-content-muted mb-1 font-semibold uppercase">Final Odometer</label>
                                  <input
                                    type="number"
                                    placeholder={`Min ${Number(trip.vehicle?.odometer || 0)}`}
                                    value={completionInputs[trip.trip_id]?.final_odometer || ''}
                                    onChange={(e) => handleCompletionInputChange(trip.trip_id, 'final_odometer', e.target.value)}
                                    className="w-full h-8 px-2 bg-surface-card border border-border-hairline text-xs rounded outline-none focus:border-accent text-content-primary"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] text-content-muted mb-1 font-semibold uppercase">Fuel Consumed (L)</label>
                                  <input
                                    type="number"
                                    placeholder="Liters"
                                    value={completionInputs[trip.trip_id]?.fuel_consumed || ''}
                                    onChange={(e) => handleCompletionInputChange(trip.trip_id, 'fuel_consumed', e.target.value)}
                                    className="w-full h-8 px-2 bg-surface-card border border-border-hairline text-xs rounded outline-none focus:border-accent text-content-primary"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] text-content-muted mb-1 font-semibold uppercase">Revenue ($)</label>
                                  <input
                                    type="number"
                                    placeholder="Earnings"
                                    value={completionInputs[trip.trip_id]?.revenue || ''}
                                    onChange={(e) => handleCompletionInputChange(trip.trip_id, 'revenue', e.target.value)}
                                    className="w-full h-8 px-2 bg-surface-card border border-border-hairline text-xs rounded outline-none focus:border-accent text-content-primary"
                                  />
                                </div>
                              </div>

                              <button
                                onClick={() => handleCompleteSubmit(trip.trip_id, trip.vehicle?.odometer)}
                                disabled={actionLoading === trip.trip_id}
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[10px] bg-status-available hover:bg-green-600 text-white text-xs font-bold transition-all disabled:opacity-50"
                              >
                                {actionLoading === trip.trip_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                Complete & Release
                              </button>
                            </div>
                          )}

                          {/* Cancel Button (DRAFT or DISPATCHED status) */}
                          {(trip.status === 'DRAFT' || trip.status === 'DISPATCHED') && (
                            <button
                              onClick={() => handleCancel(trip)}
                              disabled={actionLoading === trip.trip_id}
                              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[10px] border border-border-hairline hover:bg-status-retired-bg hover:text-status-retired text-content-muted text-xs font-bold transition-all disabled:opacity-50"
                            >
                              {actionLoading === trip.trip_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XOctagon className="w-3 h-3" />}
                              Cancel Trip
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 p-2 rounded-[10px] bg-surface-base text-[10px] text-content-muted border border-border-hairline">
                          <Info className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                          <span>Actions restricted to Fleet Managers and Dispatchers.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Live Board Footnote */}
        <p className="text-[10px] text-content-muted italic text-center mt-2">
          On Complete: odometer &rarr; Fuel log &rarr; expenses &rarr; Vehicle &amp; Driver set to Available automatically.
        </p>
      </div>

    </div>
  );
}
