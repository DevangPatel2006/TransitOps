import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '../common/Modal';
import { useToast } from '../common/Toast';
import { createVehicle, updateVehicle } from '../../api/vehicles.api';

// Zod validation schema matching backend rules & user request
const vehicleFormSchema = z.object({
  registration_no: z
    .string()
    .min(1, 'Registration number is required')
    .max(30, 'Registration number must be 30 characters or less')
    .regex(/^[A-Za-z0-9-]+$/, 'Must only contain letters, numbers, and hyphens (alphanumeric+hyphens)'),
  name_model: z
    .string()
    .min(1, 'Name/Model is required')
    .max(100, 'Name/Model must be 100 characters or less'),
  type: z.enum(['TRUCK', 'VAN', 'BIKE', 'TRAILER'], {
    errorMap: () => ({ message: 'Select a valid vehicle type' }),
  }),
  max_load_capacity: z
    .number({ invalid_type_error: 'Max load capacity must be a number' })
    .positive('Max load capacity must be greater than 0'),
  odometer: z
    .number({ invalid_type_error: 'Odometer must be a number' })
    .nonnegative('Odometer reading cannot be negative')
    .default(0),
  acquisition_cost: z
    .number({ invalid_type_error: 'Acquisition cost must be a number' })
    .nonnegative('Acquisition cost cannot be negative'),
  region: z
    .string()
    .max(60, 'Region must be 60 characters or less')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? null : val),
  status: z.enum(['AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'RETIRED']).default('AVAILABLE'),
});

export default function VehicleFormModal({ isOpen, onClose, vehicle = null, onSuccess }) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!vehicle;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      registration_no: '',
      name_model: '',
      type: 'TRUCK',
      max_load_capacity: '',
      odometer: 0,
      acquisition_cost: '',
      region: '',
      status: 'AVAILABLE',
    },
  });

  // Reset form when modal opens or vehicle changes
  useEffect(() => {
    if (isOpen) {
      if (vehicle) {
        reset({
          registration_no: vehicle.registration_no,
          name_model: vehicle.name_model,
          type: vehicle.type,
          max_load_capacity: Number(vehicle.max_load_capacity),
          odometer: Number(vehicle.odometer || 0),
          acquisition_cost: Number(vehicle.acquisition_cost),
          region: vehicle.region || '',
          status: vehicle.status,
        });
      } else {
        reset({
          registration_no: '',
          name_model: '',
          type: 'TRUCK',
          max_load_capacity: '',
          odometer: 0,
          acquisition_cost: '',
          region: '',
          status: 'AVAILABLE',
        });
      }
    }
  }, [isOpen, vehicle, reset]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (isEdit) {
        await updateVehicle(vehicle.vehicle_id, data);
        toast.success('Vehicle updated successfully');
      } else {
        await createVehicle(data);
        toast.success('Vehicle created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'An error occurred. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Vehicle' : 'Add Vehicle'} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Registration No */}
        <div>
          <label htmlFor="registration_no" className="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1.5">
            Registration No. <span className="text-status-retired">*</span>
          </label>
          <input
            id="registration_no"
            type="text"
            placeholder="e.g. TRK-102"
            disabled={isEdit} // Often reg_no is immutable once created, or matches spec
            {...register('registration_no')}
            className={`w-full h-10 px-3 rounded-[10px] bg-surface-base border text-sm text-content-primary placeholder:text-content-muted/30 outline-none transition-colors focus:border-accent
              ${errors.registration_no ? 'border-status-retired' : 'border-border-hairline'}
              ${isEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
          {errors.registration_no && (
            <p className="mt-1 text-xs text-status-retired">{errors.registration_no.message}</p>
          )}
        </div>

        {/* Name / Model */}
        <div>
          <label htmlFor="name_model" className="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1.5">
            Name / Model <span className="text-status-retired">*</span>
          </label>
          <input
            id="name_model"
            type="text"
            placeholder="e.g. Volvo FH16"
            {...register('name_model')}
            className={`w-full h-10 px-3 rounded-[10px] bg-surface-base border text-sm text-content-primary placeholder:text-content-muted/30 outline-none transition-colors focus:border-accent
              ${errors.name_model ? 'border-status-retired' : 'border-border-hairline'}`}
          />
          {errors.name_model && (
            <p className="mt-1 text-xs text-status-retired">{errors.name_model.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Vehicle Type */}
          <div>
            <label htmlFor="type" className="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1.5">
              Vehicle Type <span className="text-status-retired">*</span>
            </label>
            <select
              id="type"
              {...register('type')}
              className="w-full h-10 px-3 rounded-[10px] bg-surface-base border border-border-hairline text-sm text-content-primary outline-none focus:border-accent cursor-pointer"
            >
              <option value="TRUCK">Truck</option>
              <option value="VAN">Van</option>
              <option value="BIKE">Bike</option>
              <option value="TRAILER">Trailer</option>
            </select>
            {errors.type && (
              <p className="mt-1 text-xs text-status-retired">{errors.type.message}</p>
            )}
          </div>

          {/* Region */}
          <div>
            <label htmlFor="region" className="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1.5">
              Region
            </label>
            <input
              id="region"
              type="text"
              placeholder="e.g. North"
              {...register('region')}
              className={`w-full h-10 px-3 rounded-[10px] bg-surface-base border text-sm text-content-primary placeholder:text-content-muted/30 outline-none transition-colors focus:border-accent
                ${errors.region ? 'border-status-retired' : 'border-border-hairline'}`}
            />
            {errors.region && (
              <p className="mt-1 text-xs text-status-retired">{errors.region.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Max Load Capacity */}
          <div>
            <label htmlFor="max_load_capacity" className="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1.5">
              Capacity (kg) <span className="text-status-retired">*</span>
            </label>
            <input
              id="max_load_capacity"
              type="number"
              step="any"
              placeholder="e.g. 15000"
              {...register('max_load_capacity', { valueAsNumber: true })}
              className={`w-full h-10 px-3 rounded-[10px] bg-surface-base border text-sm text-content-primary placeholder:text-content-muted/30 outline-none transition-colors focus:border-accent
                ${errors.max_load_capacity ? 'border-status-retired' : 'border-border-hairline'}`}
            />
            {errors.max_load_capacity && (
              <p className="mt-1 text-xs text-status-retired">{errors.max_load_capacity.message}</p>
            )}
          </div>

          {/* Odometer */}
          <div>
            <label htmlFor="odometer" className="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1.5">
              Odometer (km)
            </label>
            <input
              id="odometer"
              type="number"
              step="any"
              placeholder="0"
              {...register('odometer', { valueAsNumber: true })}
              className={`w-full h-10 px-3 rounded-[10px] bg-surface-base border text-sm text-content-primary placeholder:text-content-muted/30 outline-none transition-colors focus:border-accent
                ${errors.odometer ? 'border-status-retired' : 'border-border-hairline'}`}
            />
            {errors.odometer && (
              <p className="mt-1 text-xs text-status-retired">{errors.odometer.message}</p>
            )}
          </div>

          {/* Acquisition Cost */}
          <div>
            <label htmlFor="acquisition_cost" className="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1.5">
              Acq. Cost ($) <span className="text-status-retired">*</span>
            </label>
            <input
              id="acquisition_cost"
              type="number"
              step="any"
              placeholder="e.g. 95000"
              {...register('acquisition_cost', { valueAsNumber: true })}
              className={`w-full h-10 px-3 rounded-[10px] bg-surface-base border text-sm text-content-primary placeholder:text-content-muted/30 outline-none transition-colors focus:border-accent
                ${errors.acquisition_cost ? 'border-status-retired' : 'border-border-hairline'}`}
            />
            {errors.acquisition_cost && (
              <p className="mt-1 text-xs text-status-retired">{errors.acquisition_cost.message}</p>
            )}
          </div>
        </div>

        {/* Status (Edit only) */}
        {isEdit && (
          <div>
            <label htmlFor="status" className="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1.5">
              Status
            </label>
            <select
              id="status"
              {...register('status')}
              className="w-full h-10 px-3 rounded-[10px] bg-surface-base border border-border-hairline text-sm text-content-primary outline-none focus:border-accent cursor-pointer"
            >
              <option value="AVAILABLE">Available</option>
              <option value="ON_TRIP">On Trip</option>
              <option value="IN_SHOP">In Shop</option>
              <option value="RETIRED">Retired</option>
            </select>
            {errors.status && (
              <p className="mt-1 text-xs text-status-retired">{errors.status.message}</p>
            )}
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-[10px] border border-border-hairline text-sm font-medium text-content-primary hover:bg-surface-base transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-10 px-4 rounded-[10px] bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Vehicle'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
