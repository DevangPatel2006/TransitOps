/**
 * StatusBadge — displays a colored pill for vehicle/trip status.
 *
 * Usage: <StatusBadge status="AVAILABLE" />  →  green "Available" pill
 *
 * The 4-color mapping:
 *   AVAILABLE  → green  (#16A34A)
 *   ON_TRIP    → blue   (#2563EB)
 *   IN_SHOP    → orange (#D97706)
 *   RETIRED    → red    (#DC2626)
 *
 * Trip statuses map similarly:
 *   DRAFT      → blue
 *   DISPATCHED → blue
 *   COMPLETED  → green
 *   CANCELLED  → red
 */

const STATUS_CONFIG = {
  // Vehicle statuses
  AVAILABLE: { label: 'Available', color: 'text-status-available', bg: 'bg-status-available-bg', dot: 'bg-status-available' },
  ON_TRIP: { label: 'On Trip', color: 'text-status-on-trip', bg: 'bg-status-on-trip-bg', dot: 'bg-status-on-trip' },
  IN_SHOP: { label: 'In Shop', color: 'text-status-in-shop', bg: 'bg-status-in-shop-bg', dot: 'bg-status-in-shop' },
  RETIRED: { label: 'Retired', color: 'text-status-retired', bg: 'bg-status-retired-bg', dot: 'bg-status-retired' },

  // Trip statuses
  DRAFT: { label: 'Draft', color: 'text-status-on-trip', bg: 'bg-status-on-trip-bg', dot: 'bg-status-on-trip' },
  DISPATCHED: { label: 'Dispatched', color: 'text-status-on-trip', bg: 'bg-status-on-trip-bg', dot: 'bg-status-on-trip' },
  COMPLETED: { label: 'Completed', color: 'text-status-available', bg: 'bg-status-available-bg', dot: 'bg-status-available' },
  CANCELLED: { label: 'Cancelled', color: 'text-status-retired', bg: 'bg-status-retired-bg', dot: 'bg-status-retired' },

  // Driver statuses
  SUSPENDED: { label: 'Suspended', color: 'text-status-retired', bg: 'bg-status-retired-bg', dot: 'bg-status-retired' },
};

export default function StatusBadge({ status, className = '' }) {
  const cfg = STATUS_CONFIG[status] || {
    label: status,
    color: 'text-content-muted',
    bg: 'bg-surface-elevated',
    dot: 'bg-content-muted',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
