import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Bus, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ROLE_LABELS from '../config/roles';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data) => {
    setServerError('');
    setSubmitting(true);
    try {
      await login(data.email, data.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Login failed. Please try again.';
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const roleEntries = Object.values(ROLE_LABELS);

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-[40%] bg-[#E5E7EB] flex-col justify-between p-10">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-[10px] bg-accent flex items-center justify-center">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              TransitOps
            </span>
          </div>

          {/* Tagline */}
          <h2 className="text-3xl font-bold text-gray-900 leading-tight mb-3">
            Smart Transport
            <br />
            Operations Platform
          </h2>
          <p className="text-gray-600 text-sm mb-10 max-w-xs">
            End-to-end fleet management — vehicles, drivers, trips, maintenance,
            and financial reporting in one dashboard.
          </p>

          {/* Role bullets */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              One login, four roles:
            </p>
            <ul className="space-y-2">
              {roleEntries.map((label) => (
                <li
                  key={label}
                  className="flex items-center gap-2 text-sm text-gray-700"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-400">
          &copy; {new Date().getFullYear()} TransitOps. All rights reserved.
        </p>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 bg-surface-base flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-[10px] bg-accent flex items-center justify-center">
              <Bus className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-content-primary">TransitOps</span>
          </div>

          <h1 className="text-2xl font-semibold text-content-primary mb-1">
            Sign in to your account
          </h1>
          <p className="text-sm text-content-muted mb-8">
            Enter your credentials to access the dashboard
          </p>

          {/* Server error banner */}
          {serverError && (
            <div
              id="login-error-banner"
              className="flex items-start gap-3 p-3 mb-6 rounded-[10px] border border-status-retired/40 bg-status-retired-bg text-sm text-red-300"
            >
              <AlertCircle className="w-5 h-5 text-status-retired flex-shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-content-muted mb-1.5"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                {...register('email')}
                className={`w-full h-11 px-3 rounded-[10px] bg-surface-card border text-sm text-content-primary placeholder:text-content-muted/50 outline-none transition-colors
                  ${errors.email ? 'border-status-retired' : 'border-border-hairline focus:border-accent'}`}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-status-retired">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-content-muted mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={`w-full h-11 px-3 pr-10 rounded-[10px] bg-surface-card border text-sm text-content-primary placeholder:text-content-muted/50 outline-none transition-colors
                    ${errors.password ? 'border-status-retired' : 'border-border-hairline focus:border-accent'}`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-primary"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-status-retired">{errors.password.message}</p>
              )}
            </div>

            {/* Role (decorative, NOT sent to API) */}
            <div>
              <label
                htmlFor="role-display"
                className="block text-sm font-medium text-content-muted mb-1.5"
              >
                Role <span className="text-content-muted/50">(RBAC)</span>
              </label>
              <select
                id="role-display"
                defaultValue=""
                className="w-full h-11 px-3 rounded-[10px] bg-surface-card border border-border-hairline text-sm text-content-primary outline-none appearance-none cursor-pointer focus:border-accent"
              >
                <option value="" disabled>
                  Select a role…
                </option>
                {Object.entries(ROLE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-content-muted/60">
                Your actual role is determined by your account — this field is for display only.
              </p>
            </div>

            {/* Remember me + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded bg-surface-card border-border-hairline accent-accent"
                />
                <span className="text-sm text-content-muted">Remember me</span>
              </label>
              <button
                type="button"
                className="text-sm text-accent hover:text-accent-hover"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-[10px] bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
