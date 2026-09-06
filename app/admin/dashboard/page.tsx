export default function Dashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-white">Dashboard Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-bg-surface p-6 rounded-2xl border border-slate-800 shadow-lg">
          <p className="text-slate-400 text-sm font-medium mb-1">Total Revenue</p>
          <h3 className="text-2xl font-bold text-accent-teal">৳ 1,24,500</h3>
        </div>
        <div className="bg-bg-surface p-6 rounded-2xl border border-slate-800 shadow-lg">
          <p className="text-slate-400 text-sm font-medium mb-1">Total Orders</p>
          <h3 className="text-2xl font-bold text-white">142</h3>
        </div>
        <div className="bg-bg-surface p-6 rounded-2xl border border-slate-800 shadow-lg">
          <p className="text-slate-400 text-sm font-medium mb-1">Active Courses</p>
          <h3 className="text-2xl font-bold text-white">3</h3>
        </div>
        <div className="bg-bg-surface p-6 rounded-2xl border border-slate-800 shadow-lg">
          <p className="text-slate-400 text-sm font-medium mb-1">Total Customers</p>
          <h3 className="text-2xl font-bold text-white">128</h3>
        </div>
      </div>
      <div className="mt-12 bg-bg-surface p-8 rounded-2xl border border-slate-800 shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-white">Recent Orders</h2>
        <div className="text-slate-400">Loading orders from Supabase...</div>
      </div>
    </div>
  );
}