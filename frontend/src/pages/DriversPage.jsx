import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit2, Shield, Calendar, Phone, Search, AlertCircle, Bell, Mail, RefreshCw, Loader2 } from 'lucide-react';
import { getDrivers, updateDriverStatus } from '../api/drivers.api';
import { getExpiringLicenses, triggerExpiryCheck } from '../api/notifications.api';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import { useToast } from '../components/common/Toast';
import DriverFormModal from '../components/forms/DriverFormModal';
import { useAuth } from '../context/AuthContext';

export default function DriversPage() {
  const toast = useToast();
  const { user } = useAuth();

  // Role Gate check for Safety Officer
  const isSafetyOfficer = user?.role?.name === 'SAFETY_OFFICER';
  const isManagerOrSafety = user?.role?.name === 'FLEET_MANAGER' || user?.role?.name === 'SAFETY_OFFICER';

  // Filters & State
  const [selectedStatus, setSelectedStatus] = useState('');
  const [expiringFilter, setExpiringFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);

  // Expiring licenses states
  const [expiringLicenses, setExpiringLicenses] = useState([]);
  const [expiryDays, setExpiryDays] = useState(30);
  const [triggeringCheck, setTriggeringCheck] = useState(false);
  const [loadingExpiring, setLoadingExpiring] = useState(false);

  const fetchExpiringLicenses = useCallback(async () => {
    if (!isManagerOrSafety) return;
    setLoadingExpiring(true);
    try {
      const res = await getExpiringLicenses(expiryDays);
      setExpiringLicenses(res.data || []);
    } catch (err) {
      console.error('Failed to fetch expiring licenses', err);
    } finally {
      setLoadingExpiring(false);
    }
  }, [expiryDays, isManagerOrSafety]);

  useEffect(() => {
    fetchExpiringLicenses();
  }, [fetchExpiringLicenses]);

  const handleTriggerExpiryCheck = async () => {
    setTriggeringCheck(true);
    try {
      await triggerExpiryCheck();
      toast.success('License expiry checks executed successfully. Alerts sent.');
      fetchExpiringLicenses();
    } catch (err) {
      toast.error('Failed to trigger license expiry check.');
    } finally {
      setTriggeringCheck(false);
    }
  };

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch drivers list
  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        status: selectedStatus || undefined,
        expiringBefore: expiringFilter || undefined,
        search: debouncedSearch || undefined,
      };
      const res = await getDrivers(filters);
      setDrivers(res.data || []);
      
      // Clear selection if selected driver is no longer in list or update it
      setSelectedDriver((prev) => {
        if (!prev) return null;
        return res.data?.find((d) => d.driver_id === prev.driver_id) || null;
      });
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to load drivers list'
      );
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, expiringFilter, debouncedSearch, toast]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  // Add / Edit handlers
  const handleAddClick = () => {
    setEditingDriver(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (driver, e) => {
    e.stopPropagation(); // Avoid row selection
    setEditingDriver(driver);
    setIsModalOpen(true);
  };

  // Toggle status for Safety Officer
  const handleStatusToggle = async (status) => {
    if (!selectedDriver) return;
    try {
      await updateDriverStatus(selectedDriver.driver_id, status);
      toast.success(`Driver status updated to ${status}`);
      fetchDrivers();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to update driver status.';
      toast.error(msg);
    }
  };

  // Helper check for license expiration
  const checkLicenseExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const checkLicenseExpiringSoon = (expiryDate, days = 30) => {
    if (!expiryDate) return false;
    const exp = new Date(expiryDate);
    const now = new Date();
    const limit = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return exp >= now && exp <= limit;
  };

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Define safety score colored pill bands
  const getSafetyBadge = (scoreVal) => {
    const score = Number(scoreVal);
    if (isNaN(score)) return null;

    let bgClass = 'bg-status-available-bg text-status-available border-status-available/20';
    let label = 'Excellent';
    
    if (score >= 85) {
      bgClass = 'bg-status-available-bg text-status-available border-status-available/20';
      label = `Safe (${score})`;
    } else if (score >= 60) {
      bgClass = 'bg-status-in-shop-bg text-status-in-shop border-status-in-shop/20';
      label = `Watch (${score})`;
    } else {
      bgClass = 'bg-status-retired-bg text-status-retired border-status-retired/20';
      label = `Critical (${score})`;
    }

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-[10px] text-xs font-semibold border ${bgClass}`}>
        {label}
      </span>
    );
  };

  const canWriteDrivers = user?.role?.name === 'FLEET_MANAGER' || user?.role?.name === 'SAFETY_OFFICER';

  // Table Columns
  const columns = useMemo(() => {
    const baseColumns = [
      {
        key: 'full_name',
        label: 'Driver',
        sortable: true,
        render: (row) => (
          <span className="font-semibold text-content-primary">
            {row.full_name}
          </span>
        ),
      },
      {
        key: 'license_number',
        label: 'License ID',
        sortable: true,
      },
      {
        key: 'license_category',
        label: 'Category',
        sortable: true,
      },
      {
        key: 'license_expiry',
        label: 'Expiry',
        sortable: true,
        render: (row) => {
          const isExpired = checkLicenseExpired(row.license_expiry);
          const isExpiringSoon = !isExpired && checkLicenseExpiringSoon(row.license_expiry, expiryDays);
          return (
            <div className="flex items-center gap-1.5">
              <span className={isExpired ? 'text-status-retired font-medium' : isExpiringSoon ? 'text-status-in-shop font-medium' : 'text-content-primary'}>
                {formatDate(row.license_expiry)}
              </span>
              {isExpired && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 bg-status-retired-bg text-status-retired border border-status-retired/20 rounded">
                  EXPIRED
                </span>
              )}
              {isExpiringSoon && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 bg-status-in-shop-bg text-status-in-shop border border-status-in-shop/20 rounded">
                  EXPIRING SOON
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: 'contact_number',
        label: 'Contact',
        sortable: true,
      },
      {
        key: 'trips_completed',
        label: 'Trip Compl.',
        sortable: true,
        render: (row) => row.trips_completed ?? row.completed_trips ?? '—',
      },
      {
        key: 'safety_score',
        label: 'Safety',
        sortable: true,
        render: (row) => getSafetyBadge(row.safety_score),
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (row) => <StatusBadge status={row.status} />,
      },
    ];

    if (canWriteDrivers) {
      return [
        ...baseColumns,
        {
          key: 'actions',
          label: 'Actions',
          sortable: false,
          render: (row) => (
            <button
              onClick={(e) => handleEditClick(row, e)}
              className="p-1.5 rounded-[10px] text-content-muted hover:text-accent hover:bg-accent-muted border border-transparent hover:border-accent/20 transition-all"
              title="Edit Driver Details"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          ),
        },
      ];
    }

    return baseColumns;
  }, [canWriteDrivers]);

  // Enhanced row click handler to select/deselect rows
  const handleRowClick = (row) => {
    setSelectedDriver((prev) => (prev?.driver_id === row.driver_id ? null : row));
  };

  return (
    <div className="space-y-6">
      {/* Title & Add Driver Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-content-primary">Drivers Directory</h1>
          <p className="text-sm text-content-muted">Manage driver credentials, safety records, and scheduling status</p>
        </div>
        {canWriteDrivers && (
          <button
            onClick={handleAddClick}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Driver
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex flex-col md:flex-row gap-3 bg-surface-card p-4 rounded-[10px] border border-border-hairline">
        {/* Search bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
          <input
            type="text"
            placeholder="Search driver name or license ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-[10px] bg-surface-base border border-border-hairline text-sm text-content-primary placeholder:text-content-muted/45 outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Filters Select boxes */}
        <div className="flex items-center gap-3">
          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-10 px-3 rounded-[10px] bg-surface-base border border-border-hairline text-sm text-content-primary cursor-pointer outline-none focus:border-accent"
          >
            <option value="">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="ON_TRIP">On Trip</option>
            <option value="OFF_DUTY">Off Duty</option>
            <option value="SUSPENDED">Suspended</option>
          </select>

          {/* License Expiry Filter Date Input */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-content-muted whitespace-nowrap">Expiring before:</span>
            <input
              type="date"
              value={expiringFilter}
              onChange={(e) => setExpiringFilter(e.target.value)}
              className="h-10 px-3 rounded-[10px] bg-surface-base border border-border-hairline text-sm text-content-primary cursor-pointer outline-none focus:border-accent"
            />
            {expiringFilter && (
              <button
                onClick={() => setExpiringFilter('')}
                className="text-xs text-status-retired hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Driver Data Table with row-selection logic */}
      <div className="space-y-4">
        <div className="rounded-[10px] overflow-hidden border border-border-hairline bg-surface-card">
          <DataTable
            columns={columns}
            data={drivers}
            loading={loading}
            emptyState="No drivers found matching search or filter criteria."
            pageSize={10}
            onRowClick={handleRowClick}
            selectedRowId={selectedDriver?.driver_id}
          />
        </div>

        {/* Selection & Expiring Alerts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Custom row selection display for selection status updates */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-[10px] bg-surface-card border border-border-hairline h-fit">
            <div className="flex-1">
              <p className="text-sm font-semibold text-content-primary">
                {selectedDriver ? `Selected: ${selectedDriver.full_name}` : 'Select a driver row from the table above to configure status'}
              </p>
              {selectedDriver && (
                <div className="flex gap-4 mt-1 text-xs text-content-muted">
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {selectedDriver.contact_number}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Expiry: {formatDate(selectedDriver.license_expiry)}</span>
                </div>
              )}
            </div>

            {/* Toggle status buttons (visible ONLY for Safety Officer) */}
            {isSafetyOfficer && (
              <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
                <button
                  disabled={!selectedDriver}
                  onClick={() => handleStatusToggle('AVAILABLE')}
                  className={`h-9 px-3.5 rounded-[10px] text-xs font-semibold transition-all border border-border-hairline
                    ${selectedDriver?.status === 'AVAILABLE' ? 'bg-status-available text-white border-transparent' : 'bg-surface-base text-content-primary hover:bg-surface-elevated disabled:opacity-40'}`}
                >
                  Available
                </button>
                <button
                  disabled={!selectedDriver}
                  onClick={() => handleStatusToggle('ON_TRIP')}
                  className={`h-9 px-3.5 rounded-[10px] text-xs font-semibold transition-all border border-border-hairline
                    ${selectedDriver?.status === 'ON_TRIP' ? 'bg-status-on-trip text-white border-transparent' : 'bg-surface-base text-content-primary hover:bg-surface-elevated disabled:opacity-40'}`}
                >
                  On Trip
                </button>
                <button
                  disabled={!selectedDriver}
                  onClick={() => handleStatusToggle('OFF_DUTY')}
                  className={`h-9 px-3.5 rounded-[10px] text-xs font-semibold transition-all border border-border-hairline
                    ${selectedDriver?.status === 'OFF_DUTY' ? 'bg-surface-elevated text-content-primary border-border-subtle' : 'bg-surface-base text-content-primary hover:bg-surface-elevated disabled:opacity-40'}`}
                >
                  Off Duty
                </button>
                <button
                  disabled={!selectedDriver}
                  onClick={() => handleStatusToggle('SUSPENDED')}
                  className={`h-9 px-3.5 rounded-[10px] text-xs font-semibold transition-all border border-border-hairline
                    ${selectedDriver?.status === 'SUSPENDED' ? 'bg-status-retired text-white border-transparent' : 'bg-surface-base text-content-primary hover:bg-surface-elevated disabled:opacity-40'}`}
                >
                  Suspended
                </button>
              </div>
            )}
          </div>

          {/* Expiring Licenses Panel */}
          {isManagerOrSafety && (
            <div className="p-4 rounded-[10px] bg-surface-card border border-border-hairline flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-accent" />
                  <h3 className="text-sm font-semibold text-content-primary">Expiring Licenses Warning</h3>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(Number(e.target.value))}
                    className="h-8 px-2 rounded-[10px] bg-surface-base border border-border-hairline text-xs text-content-primary cursor-pointer outline-none"
                  >
                    <option value={7}>7 Days</option>
                    <option value={15}>15 Days</option>
                    <option value={30}>30 Days</option>
                    <option value={90}>90 Days</option>
                  </select>
                  <button
                    onClick={handleTriggerExpiryCheck}
                    disabled={triggeringCheck}
                    className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[10px] bg-accent hover:bg-accent-hover text-white text-xs font-semibold disabled:opacity-50 transition-colors"
                    title="Trigger Expiry Reminder Check"
                  >
                    <RefreshCw className={`w-3 h-3 ${triggeringCheck ? 'animate-spin' : ''}`} />
                    <span>Trigger Check</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto max-h-48 space-y-2 pr-1">
                {loadingExpiring ? (
                  <div className="flex items-center justify-center py-6 text-xs text-content-muted">
                    <Loader2 className="w-4 h-4 animate-spin text-accent mr-1.5" />
                    Loading...
                  </div>
                ) : expiringLicenses.length === 0 ? (
                  <p className="text-xs text-content-muted py-6 text-center">No licenses expiring in the next {expiryDays} days.</p>
                ) : (
                  expiringLicenses.map((d) => (
                    <div key={d.driver_id} className="flex items-center justify-between p-2 rounded bg-surface-base border border-border-hairline text-xs">
                      <div>
                        <p className="font-semibold text-content-primary">{d.full_name}</p>
                        <p className="text-[10px] text-content-muted">License: {d.license_number} ({d.license_category})</p>
                      </div>
                      <span className="font-semibold text-status-in-shop">
                        {formatDate(d.license_expiry)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rule note caption */}
        <p className="text-xs italic text-accent font-medium mt-2">
          Rule: Expired license or Suspended status &rarr; blocked from trip assignment.
        </p>
      </div>

      {/* Driver Form Modal */}
      <DriverFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        driver={editingDriver}
        onSuccess={fetchDrivers}
      />
    </div>
  );
}
