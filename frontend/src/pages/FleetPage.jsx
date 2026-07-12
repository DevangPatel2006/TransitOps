import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Search, SlidersHorizontal } from 'lucide-react';
import { getVehicles, deleteVehicle } from '../api/vehicles.api';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import { useToast } from '../components/common/Toast';
import VehicleFormModal from '../components/forms/VehicleFormModal';
import { useAuth } from '../context/AuthContext';

export default function FleetPage() {
  const toast = useToast();
  const { user } = useAuth();

  const isFleetManager = user?.role?.name === 'FLEET_MANAGER';
  
  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch Vehicles
  const fetchFleet = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        type: selectedType || undefined,
        status: selectedStatus || undefined,
        search: debouncedSearch || undefined,
      };
      const res = await getVehicles(filters);
      setVehicles(res.data || []);
    } catch (err) {
      toast.error(
        err.response?.data?.error || 
        err.response?.data?.message || 
        'Failed to load fleet data'
      );
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedType, selectedStatus, toast]);

  useEffect(() => {
    fetchFleet();
  }, [fetchFleet]);

  // Open add vehicle modal
  const handleAddClick = () => {
    setEditingVehicle(null);
    setIsModalOpen(true);
  };

  // Open edit vehicle modal
  const handleEditClick = (vehicle) => {
    setEditingVehicle(vehicle);
    setIsModalOpen(true);
  };

  // Delete/Retire vehicle action
  const handleRetireClick = async (vehicle) => {
    const confirmMessage = `Are you sure you want to retire vehicle ${vehicle.registration_no}? This will change its status to RETIRED.`;
    if (!window.confirm(confirmMessage)) return;

    try {
      await deleteVehicle(vehicle.vehicle_id);
      toast.success(`Vehicle ${vehicle.registration_no} has been retired.`);
      fetchFleet();
    } catch (err) {
      toast.error(
        err.response?.data?.error || 
        err.response?.data?.message || 
        'Failed to retire vehicle.'
      );
    }
  };

  // Format monetary value
  const formatCurrency = (value) => {
    const num = Number(value);
    if (isNaN(num)) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  // Format numerical values
  const formatNumber = (value) => {
    const num = Number(value);
    return isNaN(num) ? '0' : num.toLocaleString();
  };

  // Define table columns
  const baseColumns = [
    {
      key: 'registration_no',
      label: 'Reg. No.',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-content-primary tracking-wide">
          {row.registration_no}
        </span>
      ),
    },
    {
      key: 'name_model',
      label: 'Name / Model',
      sortable: true,
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (row) => (
        <span className="text-xs font-medium uppercase tracking-wider text-content-muted bg-surface-elevated px-2.5 py-1 rounded-[10px] border border-border-hairline">
          {row.type}
        </span>
      ),
    },
    {
      key: 'max_load_capacity',
      label: 'Capacity (kg)',
      sortable: true,
      render: (row) => formatNumber(row.max_load_capacity),
    },
    {
      key: 'odometer',
      label: 'Odometer (km)',
      sortable: true,
      render: (row) => `${formatNumber(row.odometer)} km`,
    },
    {
      key: 'acquisition_cost',
      label: 'Acq. Cost',
      sortable: true,
      render: (row) => formatCurrency(row.acquisition_cost),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const columns = isFleetManager
    ? [
        ...baseColumns,
        {
          key: 'actions',
          label: 'Actions',
          sortable: false,
          render: (row) => (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleEditClick(row)}
                className="p-1.5 rounded-[10px] text-content-muted hover:text-accent hover:bg-accent-muted border border-transparent hover:border-accent/20 transition-all"
                title="Edit Vehicle"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              {row.status !== 'RETIRED' && (
                <button
                  onClick={() => handleRetireClick(row)}
                  className="p-1.5 rounded-[10px] text-content-muted hover:text-status-retired hover:bg-status-retired-bg border border-transparent hover:border-status-retired/20 transition-all"
                  title="Retire Vehicle"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ),
        },
      ]
    : baseColumns;

  return (
    <div className="space-y-6">
      {/* Title & Add Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-content-primary">Fleet Management</h1>
          <p className="text-sm text-content-muted">View, add, edit, and retire operational vehicles</p>
        </div>
        {isFleetManager && (
          <button
            onClick={handleAddClick}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Vehicle
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
            placeholder="Search reg. no…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-[10px] bg-surface-base border border-border-hairline text-sm text-content-primary placeholder:text-content-muted/45 outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-content-muted text-xs font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Type Dropdown */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-10 px-3 rounded-[10px] bg-surface-base border border-border-hairline text-sm text-content-primary cursor-pointer outline-none focus:border-accent"
          >
            <option value="">All Types</option>
            <option value="TRUCK">Truck</option>
            <option value="VAN">Van</option>
            <option value="BIKE">Bike</option>
            <option value="TRAILER">Trailer</option>
          </select>

          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-10 px-3 rounded-[10px] bg-surface-base border border-border-hairline text-sm text-content-primary cursor-pointer outline-none focus:border-accent"
          >
            <option value="">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="ON_TRIP">On Trip</option>
            <option value="IN_SHOP">In Shop</option>
            <option value="RETIRED">Retired</option>
          </select>
        </div>
      </div>

      {/* Vehicles Data Table */}
      <div className="space-y-3">
        <DataTable
          columns={columns}
          data={vehicles}
          loading={loading}
          emptyState="No vehicles found matching search or filter criteria."
          pageSize={10}
        />

        {/* Informational Caption */}
        <p className="text-xs italic text-accent font-medium mt-2">
          Rule: Registration No. must be unique &middot; Retired/In Shop vehicles are hidden from Trip Dispatch.
        </p>
      </div>

      {/* Vehicle Form Modal */}
      <VehicleFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        vehicle={editingVehicle}
        onSuccess={fetchFleet}
      />
    </div>
  );
}
