import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../utils/api';
import { Search, Loader2, ChevronLeft, ChevronRight, CheckCircle, Clock, XCircle, DollarSign, Calendar, CalendarCheck } from 'lucide-react';

const STATUS_CONFIG = {
  pending_confirmation: { label: 'Pending Confirmation', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clock },
  confirmed: { label: 'Confirmed (awaiting payment)', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: CalendarCheck },
  paid: { label: 'Paid', color: 'bg-teal-50 text-teal border-teal-200', icon: CheckCircle },
  completed: { label: 'Completed', color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-50 text-red-600 border-red-200', icon: XCircle },
  refunded: { label: 'Refunded', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: DollarSign },
};

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  // Confirm modal state
  const [confirmingAppt, setConfirmingAppt] = useState(null);
  const [confirmDateTime, setConfirmDateTime] = useState('');
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState('');

  const fetchAppointments = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getAppointments({
        page, limit: 20,
        search: search || undefined,
        status: filterStatus || undefined,
      });
      setAppointments(data.appointments);
      setPagination(data.pagination);
    } finally { setLoading(false); }
  }, [search, filterStatus]);

  useEffect(() => { fetchAppointments(1); }, [search, filterStatus]);

  const handleStatusChange = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      await adminAPI.updateAppointmentStatus(id, newStatus);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    } catch (err) {
      alert('Failed to update: ' + (err.response?.data?.error || err.message));
    } finally { setUpdatingId(null); }
  };

  const openConfirm = (apt) => {
    setConfirmingAppt(apt);
    setConfirmMsg('');
    // Pre-fill with the preferred date at a default time within their window
    const defaultHour = apt.preferred_window === 'afternoon' ? '13:00' : '09:00';
    const date = apt.preferred_date ? apt.preferred_date.split('T')[0] : '';
    setConfirmDateTime(date ? `${date}T${defaultHour}` : '');
  };

  const submitConfirm = async () => {
    if (!confirmDateTime) { setConfirmMsg('Pick a date and time.'); return; }
    setConfirmBusy(true); setConfirmMsg('');
    try {
      const { data } = await adminAPI.confirmAppointment(confirmingAppt.id, new Date(confirmDateTime).toISOString());
      setConfirmMsg(data.message);
      // Refresh row
      setAppointments(prev => prev.map(a => a.id === confirmingAppt.id
        ? { ...a, status: 'confirmed', appointment_datetime: confirmDateTime, payment_due_at: data.payment_due_at }
        : a));
      setTimeout(() => setConfirmingAppt(null), 1500);
    } catch (err) {
      setConfirmMsg(err.response?.data?.error || 'Could not confirm.');
    } finally { setConfirmBusy(false); }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-navy">Appointments</h1>
          <p className="text-sm text-gray-500 mt-0.5">{pagination.total} total appointments</p>
        </div>
      </div>

      {/* Status summary pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={() => setFilterStatus('')} className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all ${filterStatus === '' ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200 hover:border-navy'}`}>
          All
        </button>
        {Object.entries(STATUS_CONFIG).map(([key, { label, color }]) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key === filterStatus ? '' : key)}
            className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all ${filterStatus === key ? 'ring-2 ring-offset-1 ring-navy ' + color : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, email, or confirmation #…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-9 text-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Confirmation</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Patient</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Study</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Center</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-16">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-teal" />
              </td></tr>
            ) : appointments.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16 text-gray-400">No appointments found.</td></tr>
            ) : appointments.map(apt => {
              const statusCfg = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending_confirmation;
              const StatusIcon = statusCfg.icon;
              return (
                <tr key={apt.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <span className="font-mono text-sm font-bold text-navy">{apt.confirmation_number}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-medium text-navy">{apt.patient_first_name} {apt.patient_last_name}</div>
                    <div className="text-xs text-gray-500">{apt.patient_email}</div>
                    <div className="text-xs text-gray-400">{apt.patient_phone}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm font-medium text-navy max-w-[180px] truncate" title={apt.protocol_name}>{apt.protocol_name}</div>
                    <div className="text-xs text-gray-500">{apt.modality_name}</div>
                  </td>
                  <td className="px-5 py-4 text-gray-600 text-xs max-w-[140px] truncate" title={apt.center_name}>
                    {apt.center_name}
                    {apt.status === 'pending_confirmation' && apt.preferred_date && (
                      <div className="text-[11px] text-brand-blue mt-1">
                        Wants: {new Date(apt.preferred_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {apt.preferred_window ? ` · ${apt.preferred_window}` : ''}
                      </div>
                    )}
                    {apt.appointment_datetime && apt.status !== 'pending_confirmation' && (
                      <div className="text-[11px] text-brand-green mt-1">
                        {new Date(apt.appointment_datetime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-semibold text-navy">${parseFloat(apt.amount_charged).toFixed(2)}</span>
                  </td>
                  <td className="px-5 py-4">
                    {apt.status === 'pending_confirmation' ? (
                      <button onClick={() => openConfirm(apt)} className="btn-primary text-xs flex items-center gap-1.5 px-3 py-1.5 whitespace-nowrap">
                        <CalendarCheck className="w-3.5 h-3.5" /> Confirm time
                      </button>
                    ) : (
                      <div className="relative">
                        {updatingId === apt.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-teal" />
                        ) : (
                          <select
                            value={apt.status}
                            onChange={e => handleStatusChange(apt.id, e.target.value)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-full border appearance-none cursor-pointer ${statusCfg.color}`}
                          >
                            {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-400">
                    {new Date(apt.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-500">Showing {appointments.length} of {pagination.total}</span>
            <div className="flex items-center gap-2">
              <button disabled={pagination.page <= 1} onClick={() => fetchAppointments(pagination.page - 1)} className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-gray-600">Page {pagination.page} of {pagination.pages}</span>
              <button disabled={pagination.page >= pagination.pages} onClick={() => fetchAppointments(pagination.page + 1)} className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm appointment modal */}
      {confirmingAppt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !confirmBusy && setConfirmingAppt(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-brand-ink mb-1">Confirm appointment time</h3>
            <p className="text-sm text-brand-body mb-1">{confirmingAppt.patient_first_name} {confirmingAppt.patient_last_name} · {confirmingAppt.confirmation_number}</p>
            <p className="text-xs text-brand-body mb-4">
              Patient requested: <b>{confirmingAppt.preferred_date ? new Date(confirmingAppt.preferred_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'any date'}</b>
              {confirmingAppt.preferred_window ? ` · ${confirmingAppt.preferred_window}` : ''}
            </p>

            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Exact appointment date & time</label>
            <input
              type="datetime-local"
              value={confirmDateTime}
              onChange={e => setConfirmDateTime(e.target.value)}
              className="input mb-2"
            />
            <p className="text-xs text-brand-body mb-4">
              The patient will be emailed this time and a payment link. They'll have <b>24 hours</b> to pay or the slot is released.
            </p>

            {confirmMsg && (
              <p className="text-xs px-3 py-2 rounded-lg bg-brand-mist text-brand-ink mb-3">{confirmMsg}</p>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmingAppt(null)} disabled={confirmBusy} className="btn-ghost text-sm">Cancel</button>
              <button onClick={submitConfirm} disabled={confirmBusy} className="btn-primary text-sm flex items-center gap-2">
                {confirmBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarCheck className="w-4 h-4" />}
                Confirm & send payment email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
