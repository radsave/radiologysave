import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, Shield, Clock, Loader2, CheckCircle, Sparkles, Calendar } from 'lucide-react';
import { appointmentAPI } from '../../utils/api';
import { useAuthStore } from '../../hooks/useAuth';
import ReferralUpload from '../../components/patient/ReferralUpload';

export default function BookingPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const result = state?.result;

  const [form, setForm] = useState({
    patient_first_name: user?.first_name || '',
    patient_last_name: user?.last_name || '',
    patient_email: '',
    patient_phone: '',
    patient_dob: '',
    referring_physician: '',
    preferred_date: '',
    preferred_window: '',
    special_notes: '',
    has_referral: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [extractedNote, setExtractedNote] = useState('');

  // Pre-fill form fields from AI referral extraction
  const handleExtracted = (extraction, matchedProtocol) => {
    setForm(f => ({
      ...f,
      patient_first_name: extraction.patient_first_name || f.patient_first_name,
      patient_last_name: extraction.patient_last_name || f.patient_last_name,
      patient_dob: extraction.patient_dob || f.patient_dob,
      referring_physician: extraction.referring_physician || f.referring_physician,
      special_notes: extraction.clinical_indication
        ? `Clinical indication: ${extraction.clinical_indication}${f.special_notes ? '\n' + f.special_notes : ''}`
        : f.special_notes,
      has_referral: true,
    }));
    // Warn if the referral's ordered study doesn't match what they're booking
    if (matchedProtocol && matchedProtocol.protocol_id !== result.protocol_id) {
      setExtractedNote(
        `Heads up: your referral appears to order "${extraction.ordered_study_text || matchedProtocol.protocol_name}" but you're booking "${result.protocol_name}". Double-check before paying, or go back and select the matching study.`
      );
    } else if (extraction.extraction_notes) {
      setExtractedNote(extraction.extraction_notes);
    } else {
      setExtractedNote('');
    }
  };

  useEffect(() => { if (!result) navigate('/search'); }, [result]);
  if (!result) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await appointmentAPI.book({
        pricing_id: result.pricing_id,
        protocol_id: result.protocol_id,
        center_id: result.center_id,
        ...form,
      });
      // No payment yet — go to the "request received" page
      navigate(`/booking/received?confirmation=${data.confirmation_number}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to submit your request. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-10">
      <Link to="/search" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-navy mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to search
      </Link>

      <h1 className="font-display text-3xl text-navy mb-8">Book Your Appointment</h1>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Order summary */}
        <div className="md:col-span-1">
          <div className="card sticky top-24">
            <h2 className="font-semibold text-navy mb-4">Order Summary</h2>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-gray-500 text-xs uppercase font-bold tracking-wide mb-1">Study</div>
                <div className="font-medium text-navy">{result.protocol_name}</div>
                <div className="text-gray-500">{result.body_part_name} · {result.modality_name}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs uppercase font-bold tracking-wide mb-1">Center</div>
                <div className="font-medium text-navy">{result.center_name}</div>
                <div className="text-gray-500">{result.address_line1}, {result.city}, {result.state} {result.zip_code}</div>
              </div>
              <div className="border-t border-gray-100 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">All-inclusive price</span>
                  <span className="font-display text-2xl text-navy">${parseFloat(result.price).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Trust signals */}
            <div className="mt-6 space-y-2.5">
              {[
                [Shield, 'Secure Stripe checkout'],
                [CheckCircle, 'Radiologist report included'],
                [Clock, 'Scheduled within 4 hours'],
              ].map(([Icon, text]) => (
                <div key={text} className="flex items-center gap-2 text-xs text-gray-500">
                  <Icon className="w-3.5 h-3.5 text-teal flex-shrink-0" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Booking form */}
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* AI Referral Upload */}
            <ReferralUpload onExtracted={handleExtracted} />
            {extractedNote && (
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 leading-relaxed">
                <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{extractedNote}</span>
              </div>
            )}

            <div className="card">
              <h2 className="font-semibold text-navy mb-4">Patient Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">First Name *</label>
                  <input name="patient_first_name" value={form.patient_first_name} onChange={handleChange} required className="input" placeholder="Jane" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Last Name *</label>
                  <input name="patient_last_name" value={form.patient_last_name} onChange={handleChange} required className="input" placeholder="Smith" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Address *</label>
                  <input name="patient_email" type="email" value={form.patient_email} onChange={handleChange} required className="input" placeholder="jane@email.com" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone Number *</label>
                  <input name="patient_phone" type="tel" value={form.patient_phone} onChange={handleChange} required className="input" placeholder="(555) 555-5555" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date of Birth</label>
                  <input name="patient_dob" type="date" value={form.patient_dob} onChange={handleChange} className="input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Referring Physician</label>
                  <input name="referring_physician" value={form.referring_physician} onChange={handleChange} className="input" placeholder="Dr. Name" />
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="font-semibold text-navy mb-4">Scheduling Preferences</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Preferred Date <span className="text-red-500">*</span></label>
                  <input name="preferred_date" type="date" required value={form.preferred_date} onChange={handleChange} className="input" min={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Preferred Time <span className="text-red-500">*</span></label>
                  <select name="preferred_window" required value={form.preferred_window} onChange={handleChange} className="select">
                    <option value="">Select…</option>
                    <option value="morning">Morning (8am–12pm)</option>
                    <option value="afternoon">Afternoon (12pm–5pm)</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Special Notes / Medical History</label>
                <textarea name="special_notes" value={form.special_notes} onChange={handleChange} className="input" rows={3} placeholder="Allergies, implants, claustrophobia concerns, etc." />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <input type="checkbox" id="has_referral" name="has_referral" checked={form.has_referral} onChange={handleChange} className="w-4 h-4 rounded border-gray-300 text-teal" />
                <label htmlFor="has_referral" className="text-sm text-gray-700">I have a physician referral/order ready to upload</label>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base">
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Submitting request…</>
              ) : (
                <><Calendar className="w-5 h-5" /> Request Appointment</>
              )}
            </button>
            <p className="text-center text-xs text-gray-400">
              No payment is due now. Radiology Save will confirm your exact appointment time within 1 business day, then email you a secure payment link. A physician referral is required for all imaging studies.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
