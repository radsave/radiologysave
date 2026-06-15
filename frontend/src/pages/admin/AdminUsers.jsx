import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../utils/api';
import { Search, Loader2, ChevronLeft, ChevronRight, Shield, User } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getUsers({ page, limit: 20, search: search || undefined, role: filterRole || undefined });
      setUsers(data.users);
      setPagination(data.pagination);
    } finally { setLoading(false); }
  }, [search, filterRole]);

  useEffect(() => { fetchUsers(1); }, [search, filterRole]);

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingId(userId);
    try {
      await adminAPI.promoteUser(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.error || err.message));
    } finally { setUpdatingId(null); }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-navy">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">{pagination.total} registered accounts</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 text-sm" />
        </div>
        <select className="select text-sm w-40" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">All Roles</option>
          <option value="patient">Patients</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Joined</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-16"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal" /></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-16 text-gray-400">No users found.</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${u.role === 'patient' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                      {u.first_name?.[0]}{u.last_name?.[0]}
                    </div>
                    <span className="font-medium text-navy">{u.first_name} {u.last_name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-gray-600">{u.email}</td>
                <td className="px-5 py-4">
                  {updatingId === u.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-teal" />
                  ) : (
                    <select
                      value={u.role === 'super_admin' ? 'super_admin' : u.role}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                      disabled={u.role === 'super_admin'}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border appearance-none cursor-pointer ${
                        u.role === 'super_admin' ? 'bg-purple-50 text-purple-700 border-purple-200 cursor-not-allowed' :
                        u.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        'bg-gray-100 text-gray-600 border-gray-200'
                      }`}
                    >
                      <option value="patient">Patient</option>
                      <option value="admin">Admin</option>
                      {u.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                    </select>
                  )}
                </td>
                <td className="px-5 py-4 text-xs text-gray-400">
                  {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-5 py-4">
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${u.is_active ? 'bg-teal-50 text-teal' : 'bg-red-50 text-red-600'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-500">Showing {users.length} of {pagination.total}</span>
            <div className="flex items-center gap-2">
              <button disabled={pagination.page <= 1} onClick={() => fetchUsers(pagination.page - 1)} className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-xs font-medium">{pagination.page} / {pagination.pages}</span>
              <button disabled={pagination.page >= pagination.pages} onClick={() => fetchUsers(pagination.page + 1)} className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
