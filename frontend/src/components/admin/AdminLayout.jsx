import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../hooks/useAuth';
import { LayoutDashboard, Building2, Calendar, Users, LogOut, ChevronRight } from 'lucide-react';
import Logo from '../Logo';

const NAV = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/centers', icon: Building2, label: 'Imaging Centers' },
  { to: '/admin/appointments', icon: Calendar, label: 'Appointments' },
  { to: '/admin/users', icon: Users, label: 'Users' },
];

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/admin/login'); };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-navy flex flex-col flex-shrink-0">
        <div className="px-6 py-5 border-b border-white/10">
          <Logo height={26} dark />
        </div>
        <div className="px-3 py-4 flex-1">
          <p className="text-white/30 text-xs uppercase tracking-widest font-bold px-3 mb-2">Admin</p>
          <nav className="space-y-0.5">
            {NAV.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}>
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-7 h-7 rounded-full bg-teal/20 flex items-center justify-center text-xs font-bold text-teal-400">
              {user?.first_name?.[0]}
            </div>
            <div className="min-w-0">
              <div className="text-sm text-white font-medium truncate">{user?.first_name} {user?.last_name}</div>
              <div className="text-xs text-white/40 capitalize">{user?.role?.replace('_', ' ')}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition-all">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
