import { useAuth } from '../context/AuthContext';
import { getRoleLabel } from '../config/roles';
import { LogOut, Bus } from 'lucide-react';

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-surface-base">
      {/* Temp header */}
      <header className="h-16 border-b border-border-hairline bg-surface-card flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[10px] bg-accent flex items-center justify-center">
            <Bus className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-content-primary">TransitOps</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-content-primary">{user?.full_name}</p>
            <p className="text-xs text-content-muted">
              {user?.role?.name ? getRoleLabel(user.role.name) : ''}
            </p>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-[10px] text-content-muted hover:text-content-primary hover:bg-surface-elevated transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Placeholder content */}
      <main className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 4rem)' }}>
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-semibold text-content-primary">
            Welcome, {user?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-content-muted text-sm">
            Dashboard pages coming soon. You are authenticated as{' '}
            <span className="text-accent font-medium">
              {user?.role?.name ? getRoleLabel(user.role.name) : 'Unknown'}
            </span>.
          </p>
        </div>
      </main>
    </div>
  );
}
