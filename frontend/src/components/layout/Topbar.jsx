import { useState, useEffect } from 'react';
import { Search, Bell, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRoleLabel } from '../../config/roles';
import { getExpiringLicenses } from '../../api/notifications.api';

export default function Topbar() {
  const { user } = useAuth();
  const [expiringCount, setExpiringCount] = useState(0);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('transitops_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('transitops_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const roleName = user?.role?.name ?? '';
  const roleLabel = getRoleLabel(roleName);
  const fullName = user?.full_name ?? '';
  const initials = fullName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const isManagerOrSafety = roleName === 'FLEET_MANAGER' || roleName === 'SAFETY_OFFICER';

  useEffect(() => {
    if (!isManagerOrSafety) return;
    
    let active = true;
    const fetchCount = async () => {
      try {
        const res = await getExpiringLicenses(30);
        if (active) {
          setExpiringCount(res.data?.length || 0);
        }
      } catch (err) {
        console.error('Failed to load topbar alerts count:', err);
      }
    };

    fetchCount();
    // Poll every 2 minutes for updates
    const interval = setInterval(fetchCount, 120000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isManagerOrSafety]);

  return (
    <header className="h-16 bg-surface-card border-b border-border-hairline flex items-center justify-between px-6 flex-shrink-0">
      {/* Search */}
      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
        <input
          type="text"
          placeholder="Search…"
          className="w-full h-9 pl-9 pr-3 rounded-[10px] bg-surface-elevated border border-border-hairline text-sm text-content-primary placeholder:text-content-muted/50 outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-5">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          type="button"
          className="p-1.5 rounded-[10px] bg-surface-elevated hover:bg-surface-base border border-border-hairline text-content-muted hover:text-content-primary cursor-pointer transition-colors"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Notification indicator */}
        {isManagerOrSafety && (
          <div className="relative p-1.5 rounded-[10px] bg-surface-elevated hover:bg-surface-base border border-border-hairline text-content-muted hover:text-content-primary cursor-pointer transition-colors" title="Safety Alerts: Licenses Expiring in 30 Days">
            <Bell className="w-4.5 h-4.5" />
            {expiringCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-status-retired text-[9px] font-bold text-white ring-2 ring-surface-card animate-pulse">
                {expiringCount}
              </span>
            )}
          </div>
        )}

        {/* User info */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-content-primary leading-tight">{fullName}</p>
            <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-accent-muted text-accent">
              {roleLabel}
            </span>
          </div>
          <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-sm font-semibold text-white">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
