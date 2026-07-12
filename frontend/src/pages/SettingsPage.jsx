import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Settings, ShieldCheck, Save, Info } from 'lucide-react';
import { useToast } from '../components/common/Toast';
import { RBAC_MATRIX } from '../config/rbacMatrix';

// Settings schema for validation
const settingsSchema = z.object({
  depot_name: z
    .string()
    .min(1, 'Depot Name is required')
    .max(100, 'Depot Name must be 100 characters or less'),
  currency: z.enum(['USD', 'EUR', 'GBP', 'INR', 'CAD'], {
    errorMap: () => ({ message: 'Select a valid currency' }),
  }),
  distance_unit: z.enum(['km', 'mi'], {
    errorMap: () => ({ message: 'Select a valid distance unit' }),
  }),
});

export default function SettingsPage() {
  const toast = useToast();

  // Load from localStorage on mount
  const [initialSettings] = useState(() => {
    return {
      depot_name: localStorage.getItem('transitops_depot_name') || 'TransitOps Central Depot',
      currency: localStorage.getItem('transitops_currency') || 'USD',
      distance_unit: localStorage.getItem('transitops_distance_unit') || 'km',
    };
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(settingsSchema),
    defaultValues: initialSettings,
  });

  const onSubmit = (data) => {
    try {
      localStorage.setItem('transitops_depot_name', data.depot_name);
      localStorage.setItem('transitops_currency', data.currency);
      localStorage.setItem('transitops_distance_unit', data.distance_unit);
      toast.success('Settings updated successfully. Configurations cached locally.');
    } catch {
      toast.error('Failed to save settings to local storage.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold text-content-primary">System Settings</h1>
        <p className="text-sm text-content-muted">Configure local depot rules and view role-based privileges</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN: General Settings Form */}
        <div className="bg-surface-card p-5 rounded-[10px] border border-border-hairline">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-[10px] bg-accent/15 flex items-center justify-center text-accent">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-content-primary">General Configuration</h2>
              <p className="text-[11px] text-content-muted">Local browser client overrides (LocalStorage persist)</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Depot Name */}
            <div>
              <label htmlFor="depot_name" className="block text-[10px] font-bold text-content-muted uppercase tracking-wider mb-1.5">
                Depot Name <span className="text-status-retired">*</span>
              </label>
              <input
                id="depot_name"
                type="text"
                placeholder="e.g. North Hub Depot"
                {...register('depot_name')}
                className={`w-full h-10 px-3 rounded-[10px] bg-surface-base border text-sm text-content-primary placeholder:text-content-muted/30 outline-none transition-colors focus:border-accent
                  ${errors.depot_name ? 'border-status-retired' : 'border-border-hairline'}`}
              />
              {errors.depot_name && (
                <p className="mt-1 text-xs text-status-retired">{errors.depot_name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Currency Selector */}
              <div>
                <label htmlFor="currency" className="block text-[10px] font-bold text-content-muted uppercase tracking-wider mb-1.5">
                  Currency Symbol
                </label>
                <select
                  id="currency"
                  {...register('currency')}
                  className="w-full h-10 px-3 rounded-[10px] bg-surface-base border border-border-hairline text-sm text-content-primary outline-none focus:border-accent cursor-pointer"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="CAD">CAD ($)</option>
                </select>
                {errors.currency && (
                  <p className="mt-1 text-xs text-status-retired">{errors.currency.message}</p>
                )}
              </div>

              {/* Distance Unit Selector */}
              <div>
                <label htmlFor="distance_unit" className="block text-[10px] font-bold text-content-muted uppercase tracking-wider mb-1.5">
                  Distance Unit
                </label>
                <select
                  id="distance_unit"
                  {...register('distance_unit')}
                  className="w-full h-10 px-3 rounded-[10px] bg-surface-base border border-border-hairline text-sm text-content-primary outline-none focus:border-accent cursor-pointer"
                >
                  <option value="km">Kilometers (km)</option>
                  <option value="mi">Miles (mi)</option>
                </select>
                {errors.distance_unit && (
                  <p className="mt-1 text-xs text-status-retired">{errors.distance_unit.message}</p>
                )}
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-[10px] bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Static RBAC Matrix Table */}
        <div className="bg-surface-card rounded-[10px] border border-border-hairline overflow-hidden">
          <div className="px-5 py-4 border-b border-border-hairline flex items-center gap-2">
            <div className="w-8 h-8 rounded-[10px] bg-accent/15 flex items-center justify-center text-accent">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-content-primary">Role-Based Access (RBAC) Control Matrix</h2>
              <p className="text-[11px] text-content-muted">Operational privileges mapped across all user roles</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-elevated/50 text-[10px] text-content-muted font-bold uppercase tracking-wider border-b border-border-hairline">
                  <th className="px-5 py-3.5 text-left">Role</th>
                  <th className="px-5 py-3.5 text-center">Fleet</th>
                  <th className="px-5 py-3.5 text-center">Driver</th>
                  <th className="px-5 py-3.5 text-center">Trips</th>
                  <th className="px-5 py-3.5 text-center">Fuel/Exp.</th>
                  <th className="px-5 py-3.5 text-center">Analytics</th>
                </tr>
              </thead>
              <tbody>
                {RBAC_MATRIX.map((row) => (
                  <tr key={row.role} className="border-b border-border-hairline last:border-0 hover:bg-surface-elevated/35 transition-colors">
                    <td className="px-5 py-3.5 text-content-primary font-bold">
                      {row.role}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`font-semibold ${row.fleet === '✓' ? 'text-status-available font-bold text-base' : row.fleet === 'View' ? 'text-accent' : 'text-content-muted'}`}>
                        {row.fleet}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`font-semibold ${row.driver === '✓' ? 'text-status-available font-bold text-base' : row.driver === 'View' ? 'text-accent' : 'text-content-muted'}`}>
                        {row.driver}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`font-semibold ${row.trips === '✓' ? 'text-status-available font-bold text-base' : row.trips === 'View' ? 'text-accent' : 'text-content-muted'}`}>
                        {row.trips}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`font-semibold ${row.fuel === '✓' ? 'text-status-available font-bold text-base' : row.fuel === 'View' ? 'text-accent' : 'text-content-muted'}`}>
                        {row.fuel}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`font-semibold ${row.analytics === '✓' ? 'text-status-available font-bold text-base' : row.analytics === 'View' ? 'text-accent' : 'text-content-muted'}`}>
                        {row.analytics}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-start gap-2.5 p-4 bg-surface-elevated/30 border-t border-border-hairline text-[11px] text-content-muted">
            <Info className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <span>Gating Policy: &quot;&mdash;&quot; indicates no access; &quot;View&quot; indicates read-only listings; &quot;&check;&quot; indicates full read-write CRUD authorization.</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
