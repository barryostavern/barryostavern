import { Outlet } from 'react-router-dom';

function AdminLayout() {
  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-gray-900 text-white p-4">
        <p className="font-bold text-sm uppercase tracking-wide text-gray-400 mb-4">Staff Dashboard</p>
        <nav className="space-y-2 text-sm">
          <p className="text-gray-500">Navigation coming soon</p>
        </nav>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
