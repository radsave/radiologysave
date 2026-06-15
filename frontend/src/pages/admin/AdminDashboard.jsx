import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../utils/api';
import { Building2, Calendar, DollarSign, Users, TrendingUp, Activity } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.dashboard().then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  const cards = stats ? [
    { label: 'Active Centers', value: stats.centers.active, sub: `${stats.centers.total} total`, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Appointments', value: stats.appointments.total, sub: `${stats.appointments.today} today`, icon: Calendar, color: 'text-teal', bg: 'bg-teal-50' },
    { label: 'Revenue', value: `$${parseFloat(stats.revenue.total).toLocaleString()}`, sub: 'Paid appointments', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Patients', value: stats.users.total, sub: 'Registered accounts', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
  ] : [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl text-navy">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Welcome back. Here's what's happening.</p>
        </div>
        <span className="text-xs text-gray-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {cards.map(({ label, value, sub, icon: Icon, color, bg }) => (
            <div key={label} className="card">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon className={`w-4.5 h-4.5 ${color}`} size={18} />
                </div>
              </div>
              <div className="font-display text-3xl text-navy mb-0.5">{value}</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</div>
              <div className="text-xs text-gray-400 mt-1">{sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-navy mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-teal" /> Quick Actions</h2>
          <div className="space-y-2">
            {[
              { label: 'Add New Imaging Center', to: '/admin/centers/new', color: 'btn-primary' },
              { label: 'View All Appointments', to: '/admin/appointments', color: 'btn-outline' },
              { label: 'Manage Users', to: '/admin/users', color: 'btn-ghost' },
            ].map(({ label, to, color }) => (
              <Link key={label} to={to} className={`${color} block text-center text-sm py-2.5`}>{label}</Link>
            ))}
          </div>
        </div>
        <div className="card">
          <h2 className="font-semibold text-navy mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-teal" /> System Status</h2>
          <div className="space-y-3">
            {[
              { label: 'API Server', status: 'Operational' },
              { label: 'Database', status: 'Operational' },
              { label: 'Stripe Payments', status: 'Operational' },
              { label: 'Email Service', status: 'Operational' },
            ].map(({ label, status }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{label}</span>
                <span className="text-xs font-semibold text-teal bg-teal-50 px-2.5 py-0.5 rounded-full">● {status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
