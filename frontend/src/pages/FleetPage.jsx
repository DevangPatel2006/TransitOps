import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Search, SlidersHorizontal, FileText, Upload, Download, Loader2 } from 'lucide-react';
import { getVehicles, deleteVehicle } from '../api/vehicles.api';
import { getVehicleDocuments, uploadVehicleDocument, downloadVehicleDocument, deleteVehicleDocument } from '../api/vehicleDocuments.api';
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

  // Documents state & handlers
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Document upload form state
  const [docType, setDocType] = useState('REGISTRATION');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [docFile, setDocFile] = useState(null);

  const fetchDocuments = useCallback(async (vehicleId) => {
    if (!vehicleId) return;
    setLoadingDocs(true);
    try {
      const res = await getVehicleDocuments(vehicleId);
      setDocuments(res.data || []);
    } catch (err) {
      toast.error('Failed to load vehicle documents.');
    } finally {
      setLoadingDocs(false);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedVehicle) {
      fetchDocuments(selectedVehicle.vehicle_id);
    } else {
      setDocuments([]);
    }
  }, [selectedVehicle, fetchDocuments]);

  const handleRowClick = (row) => {
    setSelectedVehicle((prev) => (prev?.vehicle_id === row.vehicle_id ? null : row));
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!selectedVehicle) return;
    if (!docFile) {
      toast.error('Please select a file to upload.');
      return;
    }

    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('doc_type', docType);
      if (issueDate) formData.append('issue_date', issueDate);
      if (expiryDate) formData.append('expiry_date', expiryDate);
      formData.append('document', docFile);

      await uploadVehicleDocument(selectedVehicle.vehicle_id, formData);
      toast.success('Document uploaded successfully.');

      // Reset form
      setDocFile(null);
      setIssueDate('');
      setExpiryDate('');
      const fileInput = document.getElementById('document-file-input');
      if (fileInput) fileInput.value = '';

      fetchDocuments(selectedVehicle.vehicle_id);
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to upload document.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDownloadDocument = async (doc) => {
    try {
      const res = await downloadVehicleDocument(doc.document_id);

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;

      const ext = doc.file_path ? doc.file_path.split('.').pop() : 'pdf';
      const filename = `${selectedVehicle.registration_no}_${doc.doc_type}_${doc.document_id}.${ext}`;

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to download document file.');
    }
  };

  const handleDeleteDocument = async (doc) => {
    if (!window.confirm(`Are you sure you want to delete this ${doc.doc_type} document?`)) return;
    try {
      await deleteVehicleDocument(doc.document_id);
      toast.success('Document deleted successfully.');
      fetchDocuments(selectedVehicle.vehicle_id);
    } catch (err) {
      toast.error('Failed to delete document.');
    }
  };

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
          onRowClick={handleRowClick}
          selectedRowId={selectedVehicle?.vehicle_id}
        />

        {/* Selection & Documents Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          {/* Row selection detail */}
          <div className="p-4 rounded-[10px] bg-surface-card border border-border-hairline h-fit">
            <p className="text-sm font-semibold text-content-primary">
              {selectedVehicle ? `Selected Vehicle: ${selectedVehicle.registration_no} (${selectedVehicle.name_model})` : 'Select a vehicle row to manage documents'}
            </p>
            {selectedVehicle && (
              <div className="mt-3 space-y-2 text-xs text-content-muted">
                <div className="flex justify-between border-b border-border-hairline/35 pb-1">
                  <span>Type:</span>
                  <span className="font-semibold text-content-primary uppercase">{selectedVehicle.type}</span>
                </div>
                <div className="flex justify-between border-b border-border-hairline/35 pb-1">
                  <span>Odometer:</span>
                  <span className="font-semibold text-content-primary">{formatNumber(selectedVehicle.odometer)} km</span>
                </div>
                <div className="flex justify-between border-b border-border-hairline/35 pb-1">
                  <span>Max Load Capacity:</span>
                  <span className="font-semibold text-content-primary">{formatNumber(selectedVehicle.max_load_capacity)} kg</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-semibold text-content-primary">{selectedVehicle.status}</span>
                </div>
              </div>
            )}
          </div>

          {/* Documents Panel */}
          {selectedVehicle && (
            <div className="p-4 rounded-[10px] bg-surface-card border border-border-hairline flex flex-col gap-4">
              <div className="flex items-center gap-2 pb-1 border-b border-border-hairline">
                <FileText className="w-4.5 h-4.5 text-accent" />
                <h3 className="text-sm font-semibold text-content-primary">Vehicle Documents</h3>
              </div>

              {/* List existing documents */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {loadingDocs ? (
                  <div className="flex items-center justify-center py-6 text-xs text-content-muted">
                    <Loader2 className="w-4 h-4 animate-spin text-accent mr-1.5" />
                    Loading Documents...
                  </div>
                ) : documents.length === 0 ? (
                  <p className="text-xs text-content-muted text-center py-6">No documents uploaded for this vehicle.</p>
                ) : (
                  documents.map((doc) => (
                    <div key={doc.document_id} className="flex items-center justify-between p-2.5 rounded bg-surface-base border border-border-hairline text-xs">
                      <div>
                        <p className="font-semibold text-content-primary uppercase">{doc.doc_type}</p>
                        <p className="text-[10px] text-content-muted">
                          Issue: {doc.issue_date ? doc.issue_date.split('T')[0] : '—'} &middot; Exp: {doc.expiry_date ? doc.expiry_date.split('T')[0] : '—'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadDocument(doc)}
                          className="p-1 rounded bg-surface-elevated text-content-muted hover:text-accent border border-border-hairline transition-colors"
                          title="Download Document"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {isFleetManager && (
                          <button
                            onClick={() => handleDeleteDocument(doc)}
                            className="p-1 rounded bg-status-retired-bg text-status-retired hover:bg-status-retired hover:text-white border border-transparent transition-colors"
                            title="Delete Document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Upload form for Fleet Manager */}
              {isFleetManager && (
                <form onSubmit={handleUploadDocument} className="pt-3 border-t border-border-hairline space-y-3">
                  <p className="text-xs font-semibold text-content-primary">Upload New Document</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-content-muted mb-1 font-semibold uppercase">Doc Type</label>
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        className="w-full h-8 px-2 rounded-[10px] bg-surface-base border border-border-hairline text-xs text-content-primary outline-none focus:border-accent"
                      >
                        <option value="REGISTRATION">Registration</option>
                        <option value="INSURANCE">Insurance</option>
                        <option value="PERMIT">Permit</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-content-muted mb-1 font-semibold uppercase">Document File</label>
                      <input
                        id="document-file-input"
                        type="file"
                        onChange={(e) => setDocFile(e.target.files[0])}
                        className="w-full text-xs text-content-muted file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-surface-elevated file:text-content-primary hover:file:bg-surface-base cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-content-muted mb-1 font-semibold uppercase">Issue Date</label>
                      <input
                        type="date"
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                        className="w-full h-8 px-2 rounded-[10px] bg-surface-base border border-border-hairline text-xs text-content-primary outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-content-muted mb-1 font-semibold uppercase">Expiry Date</label>
                      <input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="w-full h-8 px-2 rounded-[10px] bg-surface-base border border-border-hairline text-xs text-content-primary outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={uploadingDoc}
                    className="w-full inline-flex items-center justify-center gap-2 h-8 px-3 rounded-[10px] bg-accent hover:bg-accent-hover text-white text-xs font-semibold disabled:opacity-50 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingDoc ? 'Uploading...' : 'Upload Document'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

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
