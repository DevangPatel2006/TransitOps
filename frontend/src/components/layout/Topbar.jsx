import { Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRoleLabel } from '../../config/roles';

export default function Topbar() {
  const { user } = useAuth();

  const roleName = user?.role?.name ?? '';
  const roleLabel = getRoleLabel(roleName);
  const fullName = user?.full_name ?? '';
  const initials = fullName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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
    </header>
  );
}
