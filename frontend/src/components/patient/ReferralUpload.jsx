import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, CheckCircle, X, AlertCircle, Sparkles } from 'lucide-react';
import { aiAPI } from '../../utils/api';

/**
 * ReferralUpload — patient uploads a photo/PDF of their physician's order,
 * AI extracts the details and the parent pre-fills the booking form.
 *
 * Props:
 *   onExtracted(extraction, matchedProtocol) — required callback
 */
export default function ReferralUpload({ onExtracted }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const MAX_MB = 10;

  const processFile = async (f) => {
    setError(''); setDone(false);
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) {
      setError('Please upload a JPG, PNG, WebP, or PDF file.');
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_MB}MB.`);
      return;
    }
    setFile(f);
    setLoading(true);
    try {
      const { data } = await aiAPI.extractReferral(f);
      setDone(true);
      onExtracted(data.extraction, data.matched_protocol);
    } catch (err) {
      if (err.response?.status === 503) {
        setError('AI extraction is not configured on this server. Please fill the form manually.');
      } else {
        setError(err.response?.data?.error || 'Could not read the document. Please fill the form manually.');
      }
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => { setFile(null); setDone(false); setError(''); if (inputRef.current) inputRef.current.value = ''; };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="hidden"
        onChange={(e) => processFile(e.target.files?.[0])}
      />

      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files?.[0]); }}
          className={`w-full border-2 border-dashed rounded-2xl px-6 py-8 flex flex-col items-center gap-3 transition-all cursor-pointer ${
            dragOver ? 'border-teal bg-teal-50' : 'border-teal/40 bg-teal-50/40 hover:border-teal hover:bg-teal-50'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-teal/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-teal" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-navy text-sm">Have your doctor's order? Upload it</p>
            <p className="text-xs text-gray-500 mt-1">We'll read it and fill out this form for you — photo or PDF, up to {MAX_MB}MB</p>
          </div>
          <span className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 pointer-events-none">
            <Upload className="w-3.5 h-3.5" /> Choose file or drag & drop
          </span>
        </button>
      ) : (
        <div className={`border rounded-2xl px-5 py-4 flex items-center gap-4 ${done ? 'border-teal bg-teal-50/50' : 'border-gray-200 bg-gray-50'}`}>
          <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4.5 h-4.5 text-gray-500" size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-navy truncate">{file.name}</p>
            {loading && (
              <p className="text-xs text-teal flex items-center gap-1.5 mt-0.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Reading your referral…
              </p>
            )}
            {done && (
              <p className="text-xs text-teal flex items-center gap-1.5 mt-0.5">
                <CheckCircle className="w-3 h-3" /> Details extracted — review the form below
              </p>
            )}
          </div>
          <button type="button" onClick={clear} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="mt-2 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}
    </div>
  );
}
