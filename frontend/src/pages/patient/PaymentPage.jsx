import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, CreditCard, Clock, AlertCircle, CheckCircle, Calendar, MapPin } from 'lucide-react';
import { appointmentAPI, paymentAPI } from '../../utils/api';

export default function PaymentPage() {
  const { id } = useParams();
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    appointmentAPI.get(id)
      .then(r => setAppt(r.data.appointment))
      .catch(() => setError('Appointment not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePay = async () => {
    setPaying(true); setError('');
    try {
      const { data } = await paymentAPI.createCheckout(id);
      window.location.href = data.checkout_url;
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to start checkout. Please try again.');
      setPaying(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-7 h-7 animate-spin text-brand-blue" /></div>;
  }

  if (error && !appt) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-brand-ink mb-2">{error}</h1>
        <Link to="/search" className="btn-primary inline-block mt-4">Find a scan</Link>
      </div>
    );
  }

  const dt = appt.appointment_datetime ? new Date(appt.appointment_datetime) : null;
  const due = appt.payment_due_at ? new Date(appt.payment_due_at) : null;
  const now = new Date();
  const expired = appt.status === 'cancelled' || (due && now > due);
  const alreadyPaid = appt.status === 'paid';

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-12">
      <div className="card">
        {alreadyPaid ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-brand-mint flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-brand-green" />
            </div>
            <h1 className="text-2xl font-bold text-brand-ink mb-2">Already paid</h1>
            <p className="text-brand-body">This appointment is fully booked. Confirmation {appt.confirmation_number}.</p>
          </div>
        ) : expired ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
              <Clock className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-brand-ink mb-2">Payment window expired</h1>
            <p className="text-brand-body mb-6">The 24-hour window to pay for this appointment has passed and the slot was released.</p>
            <Link to="/search" className="btn-primary inline-block">Book again</Link>
          </div>
        ) : (
          <>
            <div className="inline-flex items-center gap-2 bg-brand-mint text-brand-green text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-5">
              <span className="w-2 h-2 rounded-full bg-brand-green" /> Appointment confirmed
            </div>
            <h1 className="text-2xl font-bold text-brand-ink mb-1 tracking-headline">Complete your payment</h1>
            <p className="text-brand-body mb-6">Pay now to secure your confirmed appointment time.</p>

            <div className="bg-brand-mist rounded-xl p-5 mb-5 space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-brand-blue flex-none mt-0.5" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue">Your appointment</p>
                  <p className="text-lg font-bold text-brand-ink">
                    {dt ? dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'TBD'}
                    {dt ? ' at ' + dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-brand-blue flex-none mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-brand-ink">{appt.name || appt.center_name}</p>
                  <p className="text-sm text-brand-body">{appt.modality_name} — {appt.protocol_name}</p>
                </div>
              </div>
            </div>

            {due && (
              <div className="bg-[#FFF7ED] border border-[#FCD9B6] rounded-lg px-4 py-3 mb-5 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#9A5B1E] flex-none" />
                <p className="text-sm text-[#9A5B1E]">
                  Pay by <b>{due.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</b> or the slot is released.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between py-4 border-t border-b border-[#E4E8EE] mb-6">
              <span className="text-sm font-semibold text-brand-ink">Amount due</span>
              <span className="text-2xl font-bold text-brand-green">${Number(appt.amount_charged).toFixed(2)}</span>
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4">{error}</div>}

            <button onClick={handlePay} disabled={paying} className="btn-green w-full flex items-center justify-center gap-2 py-4 text-base">
              {paying ? <><Loader2 className="w-5 h-5 animate-spin" /> Starting checkout…</> : <><CreditCard className="w-5 h-5" /> Pay ${Number(appt.amount_charged).toFixed(2)} securely</>}
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">Powered by Stripe. Secured and encrypted.</p>
          </>
        )}
      </div>
    </div>
  );
}
