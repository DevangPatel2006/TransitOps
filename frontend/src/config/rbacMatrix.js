/**
 * Static Role-Based Access Control (RBAC) matrix matching exactly the sidebar route gating rules.
 * Represented as: role label -> [Fleet, Driver, Trips, Fuel & Expenses, Analytics]
 */
export const RBAC_MATRIX = [
  {
    role: 'Fleet Manager',
    fleet: '✓',
    driver: '✓',
    trips: '—',
    fuel: '—',
    analytics: '✓',
  },
  {
    role: 'Dispatcher',
    fleet: 'View',
    driver: '—',
    trips: '✓',
    fuel: '—',
    analytics: '—',
  },
  {
    role: 'Safety Officer',
    fleet: '—',
    driver: '✓',
    trips: 'View',
    fuel: '—',
    analytics: '—',
  },
  {
    role: 'Financial Analyst',
    fleet: 'View',
    driver: '—',
    trips: '—',
    fuel: '✓',
    analytics: '✓',
  },
];

export default RBAC_MATRIX;
