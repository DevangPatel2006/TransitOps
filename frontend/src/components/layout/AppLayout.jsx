import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

/**
 * AppLayout — wraps all authenticated pages.
 * Sidebar (fixed left 220px) + Topbar + scrollable content area via <Outlet />.
 */
export default function AppLayout() {
  return (
    <div className="min-h-screen bg-surface-base">
      <Sidebar />
      <div className="ml-[220px] flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
