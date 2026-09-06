import Link from 'next/link';
import { LayoutDashboard, ShoppingCart, Package, Settings, LogOut } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-bg-primary text-slate-200 font-sans">
      <aside className="w-64 bg-bg-surface border-r border-slate-700/50 flex flex-col">
        <div className="p-6 border-b border-slate-700/50">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent-teal to-accent-violet">
            HVB Admin
          </h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors">
            <LayoutDashboard size={20} /> Dashboard
          </Link>
          <Link href="/admin/products" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors">
            <Package size={20} /> Courses
          </Link>
          <Link href="/admin/orders" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors">
            <ShoppingCart size={20} /> Orders
          </Link>
          <Link href="/admin/settings" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors">
            <Settings size={20} /> Settings
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-700/50">
          <button className="flex w-full items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-[#0a0f1d] p-8">
        {children}
      </main>
    </div>
  );
}