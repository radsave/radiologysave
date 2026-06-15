import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { appointmentAPI } from '../../utils/api';
import Logo from '../../components/Logo';

export default function ReferralUploadPage() {
  const { token } = useParams();
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileData, setFileData] = useState('');
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    appointmentAPI.getUploadInfo(token)
      .then(r => {
        setAppt(r.data.appointment);
        if (r.data.appointment.has_referral) setDone(true);
      })
      .catch(() => setError('This upload link is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('File is too large (max 10MB).'); return; }
    const reader = new FileReader();
    reader.onload = () => { setFileData(reader.result); setFileName(file.name); setError(''); };
    reader.onerror = () => setError('Could not read that file. Try another.');
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!fileData) { setError('Please choose a file first.'); return; }
    setUploading(true); setError('');
    try {
      await appointmentAPI.uploadReferral(token, { file_data: fileData, file_name: fileName });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally { setUploading(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-7 h-7 animate-spin text-brand-blue" /></div>;
  }

  return (
    <div className="min-h-screen bg-brand-mist">
      <nav className="bg-white border-b border-[#EEF1F5] px-5 md:px-10 py-[18px]">
        <Link to="/" aria-label="Radiology Save home"><Logo height={30} /></Link>
      </nav>

      <div className="max-w-xl mx-auto px-4 py-12">
        {error && !appt ? (
          <div className="card text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-brand-ink mb-2">{error}</h1>
            <Link to="/" className="btn-primary inline-block mt-4">Back to home</Link>
          </div>
        ) : done ? (
          <div className="card text-center">
            <div className="w-16 h-16 rounded-full bg-brand-mint flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-brand-green" />
            </div>
            <h1 className="text-2xl font-bold text-brand-ink mb-2">Referral received</h1>
            <p className="text-brand-body mb-2">Thanks{appt ? `, ${appt.patient_first_name}` : ''} — your physician's order has been uploaded.</p>
            {appt && <p className="text-sm text-brand-body">Appointment {appt.confirmation_number} · {appt.modality_name} — {appt.protocol_name}</p>}
          </div>
        ) : (
          <div className="card">
            <h1 className="text-2xl font-bold text-brand-ink mb-1 tracking-headline">Upload your physician's order</h1>
            <p className="text-brand-body mb-1">For appointment <b className="text-brand-ink">{appt.confirmation_number}</b></p>
            <p className="text-sm text-brand-body mb-6">{appt.modality_name} — {appt.protocol_name} · {appt.center_name}</p>

            <label className="block border-2 border-dashed border-[#D8E2EC] rounded-xl p-8 text-center cursor-pointer hover:border-brand-blue transition-colors mb-4">
              <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={handleFile} className="hidden" />
              {fileName ? (
                <div className="flex items-center justify-center gap-2 text-brand-ink">
                  <FileText className="w-5 h-5 text-brand-blue" />
                  <span className="font-medium text-sm">{fileName}</span>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-brand-ink">Click to choose a file</p>
                  <p className="text-xs text-brand-body mt-1">PDF, PNG, or JPG · max 10MB</p>
                </>
              )}
            </label>

            {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 mb-4">{error}</div>}

            <button onClick={handleUpload} disabled={uploading || !fileData} className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 disabled:opacity-50">
              {uploading ? <><Loader2 className="w-5 h-5 animate-spin" /> Uploading…</> : <><Upload className="w-5 h-5" /> Upload referral</>}
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">This is a secure, private link tied to your appointment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
