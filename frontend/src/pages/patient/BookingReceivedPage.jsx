import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Clock, Mail, Loader2 } from 'lucide-react';
import { appointmentAPI } from '../../utils/api';

export default function BookingReceivedPage() {
  const [params] = useSearchParams();
  const confirmation = params.get('confirmation');
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!confirmation) { setLoading(false); return; }
    appointmentAPI.confirm(confirmation)
      .then(r => setAppt(r.data.appointment))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [confirmation]);

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-16">
      <div className="card text-center">
        <div className="w-16 h-16 rounded-full bg-brand-mint flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-8 h-8 text-brand-green" />
        </div>
        <h1 className="text-2xl font-bold text-brand-ink mb-2 tracking-headline">Request received</h1>
        <p className="text-brand-body mb-6 max-w-md mx-auto">
          Thanks for booking with Radiology Save. Your request has been submitted —
          no payment is needed yet.
        </p>

        {confirmation && (
          <div className="inline-block bg-brand-mist rounded-xl px-5 py-3 mb-8">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-blue">Confirmation</span>
            <p className="text-lg font-bold text-brand-ink">{confirmation}</p>
          </div>
        )}

        <div className="text-left max-w-md mx-auto space-y-4 mb-8">
          <div className="flex gap-3">
            <Clock className="w-5 h-5 text-brand-blue flex-none mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-brand-ink">We'll confirm within 1 business day</p>
              <p className="text-sm text-brand-body">Our team will set an exact appointment time based on your preferred date and window.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Mail className="w-5 h-5 text-brand-blue flex-none mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-brand-ink">Then you'll get a payment link</p>
              <p className="text-sm text-brand-body">Once confirmed, we'll email you to complete payment. You'll have 24 hours to secure your slot.</p>
            </div>
          </div>
        </div>

        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-brand-blue mx-auto" />
        ) : appt && (
          <p className="text-sm text-brand-body mb-6">
            A confirmation email is on its way to <b className="text-brand-ink">{appt.patient_email}</b>.
          </p>
        )}

        <Link to="/" className="btn-primary inline-block">Back to home</Link>
      </div>
    </div>
  );
}
