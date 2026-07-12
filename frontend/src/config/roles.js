/**
 * Role display-name map.
 *
 * Backend uses these enum values as canonical role identifiers.
 * This is the SINGLE source of truth for UI display labels.
 * Every component must import from here — never hard-code a role label.
 */
const ROLE_LABELS = Object.freeze({
  FLEET_MANAGER: 'Fleet Manager',
  DRIVER_OPS: 'Dispatcher',
  SAFETY_OFFICER: 'Safety Officer',
  FINANCIAL_ANALYST: 'Financial Analyst',
});

/**
 * Return the user-facing label for a backend role enum value.
 * Falls back to the raw enum if not mapped (defensive).
 */
export function getRoleLabel(roleEnum) {
  return ROLE_LABELS[roleEnum] ?? roleEnum;
}

export default ROLE_LABELS;
