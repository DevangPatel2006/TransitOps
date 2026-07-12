import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Users, Route, Wrench,
  Fuel, BarChart3, Settings, LogOut, Bus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getNavForRole } from '../../config/navigation';

/** Map icon name strings from config to actual lucide components */
const ICON_MAP = {
  LayoutDashboard,
  Truck,
  Users,
  Route,
  Wrench,
  Fuel,
  BarChart3,
  Settings,
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const roleName = user?.role?.name ?? '';
  const navItems = getNavForRole(roleName);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-[220px] bg-surface-card border-r border-border-hairline flex flex-col z-30">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-border-hairline flex-shrink-0">
        <div className="w-8 h-8 rounded-[10px] bg-accent flex items-center justify-center">
          <Bus className="w-4 h-4 text-white" />
        </div>
        <span className="text-base font-bold text-content-primary tracking-tight">TransitOps</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = ICON_MAP[item.icon];
          return (
            <NavLink
              key={item.key}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-accent-muted text-accent border border-accent/40'
                  : 'text-content-muted hover:text-content-primary hover:bg-surface-elevated border border-transparent'
                }`
              }
            >
              {Icon && <Icon className="w-[18px] h-[18px] flex-shrink-0" />}
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom — Logout */}
      <div className="px-3 pb-4 border-t border-border-hairline pt-3 flex-shrink-0">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[10px] text-sm font-medium text-content-muted hover:text-status-retired hover:bg-status-retired-bg transition-colors"
        >
          <LogOut className="w-[18px] h-[18px]" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
