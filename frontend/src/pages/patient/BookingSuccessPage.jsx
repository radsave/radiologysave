// BookingSuccessPage.jsx
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Download, Phone, Calendar } from 'lucide-react';
import { paymentAPI } from '../../utils/api';

export default function BookingSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const confirmation = searchParams.get('confirmation');
  const [appointment, setAppointment] = useState(null);

  useEffect(() => {
    if (sessionId) {
      paymentAPI.getSession(sessionId)
        .then(r => setAppointment(r.data.appointment))
        .catch(console.error);
    }
  }, [sessionId]);

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-8 h-8 text-teal" />
      </div>
      <h1 className="font-display text-4xl text-navy mb-4">Payment confirmed!</h1>
      <p className="text-gray-600 mb-8 leading-relaxed">
        Your appointment request has been received. Our scheduling team will contact you within 4 business hours to confirm your appointment time.
      </p>
      <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-left">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-500">Confirmation Number</span>
          <span className="font-mono font-bold text-navy text-lg">{confirmation}</span>
        </div>
        {appointment && (
          <>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">Study</span>
              <span className="text-sm font-medium text-navy">{appointment.patient_first_name} {appointment.patient_last_name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Amount Paid</span>
              <span className="font-semibold text-navy">${parseFloat(appointment.amount_charged || 0).toFixed(2)}</span>
            </div>
          </>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/" className="btn-secondary">Back to Home</Link>
        <Link to="/search" className="btn-outline">Book Another</Link>
      </div>
      <p className="mt-8 text-sm text-gray-400 flex items-center justify-center gap-2">
        <Phone className="w-3.5 h-3.5" /> Questions? Call <a href="tel:8553465152" className="text-teal font-medium">855-346-5152</a>
      </p>
    </div>
  );
}
