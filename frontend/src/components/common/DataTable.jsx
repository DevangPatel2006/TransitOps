import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * DataTable — sortable, paginated table with loading skeleton and empty-state slot.
 *
 * Props:
 *  columns:    [{ key, label, sortable?, render?(row) }]
 *  data:       row objects
 *  loading:    boolean
 *  emptyState: ReactNode shown when data is empty
 *  pageSize:   items per page (default 10)
 */
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyState,
  pageSize = 10,
  onRowClick,
  selectedRowId,
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const SortIcon = ({ colKey }) => {
    if (sortKey !== colKey) return <ChevronsUpDown className="w-3.5 h-3.5 text-content-muted/40" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-accent" />
      : <ChevronDown className="w-3.5 h-3.5 text-accent" />;
  };

  // Loading skeleton rows
  if (loading) {
    return (
      <div className="rounded-[10px] border border-border-hairline overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-elevated border-b border-border-hairline">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left text-xs font-medium text-content-muted uppercase tracking-wider">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border-hairline last:border-0">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-4 bg-surface-elevated rounded animate-pulse" style={{ width: `${50 + Math.random() * 40}%` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Empty state
  if (!data.length) {
    return (
      <div className="rounded-[10px] border border-border-hairline overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-elevated border-b border-border-hairline">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left text-xs font-medium text-content-muted uppercase tracking-wider">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        <div className="py-12 text-center text-content-muted text-sm">
          {emptyState || 'No data to display.'}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-[10px] border border-border-hairline overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-elevated border-b border-border-hairline">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-medium text-content-muted uppercase tracking-wider ${col.sortable !== false ? 'cursor-pointer select-none hover:text-content-primary' : ''}`}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable !== false && <SortIcon colKey={col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((row, i) => {
              const rowId = row.id ?? row.trip_id ?? row.vehicle_id ?? row.driver_id ?? i;
              const isSelected = selectedRowId === rowId;
              return (
                <tr
                  key={rowId}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`border-b border-border-hairline last:border-0 transition-colors cursor-pointer
                    ${isSelected ? 'bg-accent/10 border-accent/30' : 'hover:bg-surface-elevated/50'}`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-content-primary">
                      {col.render ? col.render(row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-xs text-content-muted">
          <span>
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-[10px] hover:bg-surface-elevated disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-[10px] hover:bg-surface-elevated disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
