import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../hooks/useAuth';
import { appointmentAPI } from '../../utils/api';
import { Calendar, CheckCircle, Clock, XCircle, DollarSign } from 'lucide-react';

const STATUS_STYLES = {
  pending_confirmation: 'bg-yellow-50 text-yellow-700',
  confirmed: 'bg-blue-50 text-blue-700',
  paid: 'bg-teal-50 text-teal',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-600',
  refunded: 'bg-gray-100 text-gray-600',
};

export default function AccountPage() {
  const { user, logout } = useAuthStore();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    appointmentAPI.mine().then(r => setAppointments(r.data.appointments)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl text-navy">My Account</h1>
          <p className="text-gray-500 mt-1">{user?.email}</p>
        </div>
        <button onClick={logout} className="btn-ghost text-gray-500">Sign Out</button>
      </div>

      <h2 className="font-semibold text-navy text-xl mb-4">My Appointments</h2>
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No appointments yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map(apt => (
            <div key={apt.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="font-medium text-navy mb-1">{apt.protocol_name}</div>
                <div className="text-sm text-gray-500 mb-2">{apt.center_name} · {apt.city}, {apt.state}</div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${STATUS_STYLES[apt.status] || 'bg-gray-100 text-gray-600'}`}>
                    {apt.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(apt.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-2xl text-navy">${parseFloat(apt.amount_charged).toFixed(2)}</div>
                <div className="text-xs text-gray-400 font-mono mt-0.5">{apt.confirmation_number}</div>
                {apt.status === 'confirmed' && (
                  <Link to={`/pay/${apt.id}`} className="btn-green text-xs inline-block mt-2 px-3 py-1.5">Pay now</Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
