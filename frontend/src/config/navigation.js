/**
 * Navigation items and role-gating configuration.
 * Each item defines: key, label, icon name (lucide-react), path, and which roles can see it.
 *
 * Role-gate rules:
 *  - FLEET_MANAGER: sees all
 *  - DRIVER_OPS (Dispatcher): Dashboard, Trips, Fleet (read-only), Settings
 *  - SAFETY_OFFICER: Drivers (full), Trips (read-only), Settings
 *  - FINANCIAL_ANALYST: Fuel & Expenses, Analytics, Settings
 */

export const NAV_ITEMS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    path: '/dashboard',
    roles: ['FLEET_MANAGER', 'DRIVER_OPS'],
  },
  {
    key: 'fleet',
    label: 'Fleet',
    icon: 'Truck',
    path: '/fleet',
    roles: ['FLEET_MANAGER', 'DRIVER_OPS'],
  },
  {
    key: 'drivers',
    label: 'Drivers',
    icon: 'Users',
    path: '/drivers',
    roles: ['FLEET_MANAGER', 'SAFETY_OFFICER'],
  },
  {
    key: 'trips',
    label: 'Trips',
    icon: 'Route',
    path: '/trips',
    roles: ['FLEET_MANAGER', 'DRIVER_OPS', 'SAFETY_OFFICER'],
  },
  {
    key: 'maintenance',
    label: 'Maintenance',
    icon: 'Wrench',
    path: '/maintenance',
    roles: ['FLEET_MANAGER'],
  },
  {
    key: 'fuel-expenses',
    label: 'Fuel & Expenses',
    icon: 'Fuel',
    path: '/fuel-expenses',
    roles: ['FLEET_MANAGER', 'FINANCIAL_ANALYST'],
  },
  {
    key: 'analytics',
    label: 'Analytics',
    icon: 'BarChart3',
    path: '/analytics',
    roles: ['FLEET_MANAGER', 'FINANCIAL_ANALYST'],
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: 'Settings',
    path: '/settings',
    roles: ['FLEET_MANAGER', 'DRIVER_OPS', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST'],
  },
];

/**
 * Return the NAV_ITEMS visible to the given role.
 */
export function getNavForRole(roleName) {
  return NAV_ITEMS.filter((item) => item.roles.includes(roleName));
}
