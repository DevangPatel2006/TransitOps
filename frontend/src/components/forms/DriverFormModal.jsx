import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '../common/Modal';
import { useToast } from '../common/Toast';
import { createDriver, updateDriver } from '../../api/drivers.api';

// Zod schema matching backend constraints and user specifications
const driverFormSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Full name is required')
    .max(120, 'Full name must be 120 characters or less'),
  license_number: z
    .string()
    .min(1, 'License number is required')
    .max(40, 'License number must be 40 characters or less'),
  license_category: z
    .string()
    .min(1, 'License category is required')
    .max(20, 'License category must be 20 characters or less'),
  license_expiry: z
    .string()
    .min(1, 'License expiry date is required')
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    }),
  contact_number: z
    .string()
    .min(1, 'Contact number is required')
    .regex(/^\d{7,15}$/, 'Contact number must contain only digits and be between 7 and 15 digits in length'),
  safety_score: z
    .number({ invalid_type_error: 'Safety score must be a number' })
    .min(0, 'Safety score cannot be less than 0')
    .max(100, 'Safety score cannot be more than 100')
    .optional()
    .or(z.literal(100)),
  status: z.enum(['AVAILABLE', 'ON_TRIP', 'OFF_DUTY', 'SUSPENDED']).default('AVAILABLE'),
});

export default function DriverFormModal({ isOpen, onClose, driver = null, onSuccess }) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!driver;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(driverFormSchema),
    defaultValues: {
      full_name: '',
      license_number: '',
      license_category: '',
      license_expiry: '',
      contact_number: '',
      safety_score: 100,
      status: 'AVAILABLE',
    },
  });

  // Prefill form in edit mode
  useEffect(() => {
    if (isOpen) {
      if (driver) {
        // Format date string to YYYY-MM-DD for date input
        const dateStr = driver.license_expiry
          ? new Date(driver.license_expiry).toISOString().split('T')[0]
          : '';

        reset({
          full_name: driver.full_name,
          license_number: driver.license_number,
          license_category: driver.license_category,
          license_expiry: dateStr,
          contact_number: driver.contact_number,
          safety_score: Number(driver.safety_score || 100),
          status: driver.status,
        });
      } else {
        reset({
          full_name: '',
          license_number: '',
          license_category: '',
          license_expiry: '',
          contact_number: '',
          safety_score: 100,
          status: 'AVAILABLE',
        });
      }
    }
  }, [isOpen, driver, reset]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (isEdit) {
        await updateDriver(driver.driver_id, data);
        toast.success('Driver updated successfully');
      } else {
        await createDriver(data);
        toast.success('Driver created successfully');
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
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Driver' : 'Add Driver'} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Full Name */}
        <div>
          <label htmlFor="full_name" className="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1.5">
            Full Name <span className="text-status-retired">*</span>
          </label>
          <input
            id="full_name"
            type="text"
            placeholder="e.g. John Doe"
            {...register('full_name')}
            className={`w-full h-10 px-3 rounded-[10px] bg-surface-base border text-sm text-content-primary placeholder:text-content-muted/30 outline-none transition-colors focus:border-accent
              ${errors.full_name ? 'border-status-retired' : 'border-border-hairline'}`}
          />
          {errors.full_name && (
            <p className="mt-1 text-xs text-status-retired">{errors.full_name.message}</p>
          )}
        </div>

        {/* License Number */}
        <div>
          <label htmlFor="license_number" className="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1.5">
            License Number (Unique) <span className="text-status-retired">*</span>
          </label>
          <input
            id="license_number"
            type="text"
            placeholder="e.g. DL-998877"
            disabled={isEdit}
            {...register('license_number')}
            className={`w-full h-10 px-3 rounded-[10px] bg-surface-base border text-sm text-content-primary placeholder:text-content-muted/30 outline-none transition-colors focus:border-accent
              ${errors.license_number ? 'border-status-retired' : 'border-border-hairline'}
              ${isEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
          {errors.license_number && (
            <p className="mt-1 text-xs text-status-retired">{errors.license_number.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* License Category */}
          <div>
            <label htmlFor="license_category" className="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1.5">
              License Category <span className="text-status-retired">*</span>
            </label>
            <input
              id="license_category"
              type="text"
              placeholder="e.g. Class A"
              {...register('license_category')}
              className={`w-full h-10 px-3 rounded-[10px] bg-surface-base border text-sm text-content-primary placeholder:text-content-muted/30 outline-none transition-colors focus:border-accent
                ${errors.license_category ? 'border-status-retired' : 'border-border-hairline'}`}
            />
            {errors.license_category && (
              <p className="mt-1 text-xs text-status-retired">{errors.license_category.message}</p>
            )}
          </div>

          {/* License Expiry */}
          <div>
            <label htmlFor="license_expiry" className="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1.5">
              License Expiry <span className="text-status-retired">*</span>
            </label>
            <input
              id="license_expiry"
              type="date"
              {...register('license_expiry')}
              className={`w-full h-10 px-3 rounded-[10px] bg-surface-base border text-sm text-content-primary outline-none transition-colors focus:border-accent cursor-pointer
                ${errors.license_expiry ? 'border-status-retired' : 'border-border-hairline'}`}
            />
            {errors.license_expiry && (
              <p className="mt-1 text-xs text-status-retired">{errors.license_expiry.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Contact Number */}
          <div>
            <label htmlFor="contact_number" className="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1.5">
              Contact Number (Digits) <span className="text-status-retired">*</span>
            </label>
            <input
              id="contact_number"
              type="text"
              placeholder="e.g. 1234567890"
              {...register('contact_number')}
              className={`w-full h-10 px-3 rounded-[10px] bg-surface-base border text-sm text-content-primary placeholder:text-content-muted/30 outline-none transition-colors focus:border-accent
                ${errors.contact_number ? 'border-status-retired' : 'border-border-hairline'}`}
            />
            {errors.contact_number && (
              <p className="mt-1 text-xs text-status-retired">{errors.contact_number.message}</p>
            )}
          </div>

          {/* Safety Score */}
          <div>
            <label htmlFor="safety_score" className="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1.5">
              Safety Score (0-100)
            </label>
            <input
              id="safety_score"
              type="number"
              min="0"
              max="100"
              placeholder="100"
              {...register('safety_score', { valueAsNumber: true })}
              className={`w-full h-10 px-3 rounded-[10px] bg-surface-base border text-sm text-content-primary placeholder:text-content-muted/30 outline-none transition-colors focus:border-accent
                ${errors.safety_score ? 'border-status-retired' : 'border-border-hairline'}`}
            />
            {errors.safety_score && (
              <p className="mt-1 text-xs text-status-retired">{errors.safety_score.message}</p>
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
              <option value="OFF_DUTY">Off Duty</option>
              <option value="SUSPENDED">Suspended</option>
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
            {submitting ? 'Saving...' : 'Save Driver'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
