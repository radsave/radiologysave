import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../utils/api';
import { Plus, Search, Edit2, Trash2, MapPin, Phone, CheckCircle, XCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminCenters() {
  const [centers, setCenters] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const navigate = useNavigate();

  const fetchCenters = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getCenters({ page, limit: 15, search: search || undefined, is_active: filterActive || undefined });
      setCenters(data.centers);
      setPagination(data.pagination);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, filterActive]);

  useEffect(() => { fetchCenters(1); }, [search, filterActive]);

  const handleToggleActive = async (center) => {
    await adminAPI.updateCenter(center.id, { is_active: !center.is_active });
    fetchCenters(pagination.page);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-navy">Imaging Centers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{pagination.total} centers in the network</p>
        </div>
        <Link to="/admin/centers/new" className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Center
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, city, or ZIP…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9 text-sm"
          />
        </div>
        <select
          className="select text-sm w-40"
          value={filterActive}
          onChange={e => setFilterActive(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Center</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Location</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Accreditation</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-16 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              </td></tr>
            ) : centers.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-16 text-gray-400">No centers found.</td></tr>
            ) : centers.map(c => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-5 py-4">
                  <div className="font-medium text-navy">{c.name}</div>
                  {c.same_day_appointments && (
                    <span className="text-xs text-teal bg-teal-50 px-2 py-0.5 rounded-full mt-1 inline-block font-medium">Same-day</span>
                  )}
                </td>
                <td className="px-5 py-4 text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>{c.city}, {c.state} {c.zip_code}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{c.address_line1}</div>
                </td>
                <td className="px-5 py-4 text-gray-600">
                  {c.phone && (
                    <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" />{c.phone}</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  {c.accreditation && (
                    <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-0.5 rounded-full">{c.accreditation}</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <button onClick={() => handleToggleActive(c)} className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${c.is_active ? 'bg-teal-50 text-teal hover:bg-teal-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    {c.is_active ? <><CheckCircle className="w-3.5 h-3.5" /> Active</> : <><XCircle className="w-3.5 h-3.5" /> Inactive</>}
                  </button>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => navigate(`/admin/centers/${c.id}/edit`)}
                      className="p-2 rounded-lg text-gray-400 hover:text-navy hover:bg-gray-100 transition-all"
                      title="Edit center"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(c)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                      title="Deactivate"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-500">
              Showing {centers.length} of {pagination.total}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchCenters(pagination.page - 1)}
                className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-gray-600">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchCenters(pagination.page + 1)}
                className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
