import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, ArrowRight, AlertCircle, Stethoscope } from 'lucide-react';
import { aiAPI } from '../../utils/api';

/**
 * AI Scan Finder — plain-English input mapped to catalog protocols.
 * Drop-in component used on the HomePage and SearchPage.
 *
 * Props:
 *   zip (optional)     — if provided, "View Prices" links carry the zip
 *   onSelect (optional)— callback(protocol) instead of navigation
 */
export default function ScanFinder({ zip = '', onSelect }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const EXAMPLES = [
    'MRI lumbar spine without contrast',
    'My doctor ordered a CT of my sinuses',
    'Knee pain after running — what scans exist?',
    'Screening mammogram',
  ];

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (text.trim().length < 3) return;
    setError(''); setResult(null); setLoading(true);
    try {
      const { data } = await aiAPI.findScan(text.trim());
      setResult(data);
      if (data.match_type === 'unrelated') {
        setError("That doesn't look like an imaging request. Try describing the scan your doctor ordered.");
      }
    } catch (err) {
      if (err.response?.status === 503) {
        setError('AI search is not configured on this server. Use the dropdowns below instead.');
      } else if (err.response?.status === 429) {
        setError('Too many requests — please wait a minute and try again.');
      } else {
        setError(err.response?.data?.error || 'Something went wrong. Try the dropdowns below.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePick = (match) => {
    if (onSelect) return onSelect(match);
    const params = new URLSearchParams();
    if (zip) params.set('zip', zip);
    params.set('protocol_id', match.protocol_id);
    params.set('modality', match.modality_name);
    params.set('body_part', match.body_part_name);
    navigate(`/search?${params.toString()}`);
  };

  const confidenceColor = {
    high: 'bg-teal-50 text-teal',
    medium: 'bg-yellow-50 text-yellow-700',
    low: 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="w-full">
      {/* Input */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
          <Sparkles className="w-4 h-4 text-teal" />
        </div>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='Describe your scan — e.g. "MRI lower back without contrast"'
          className="w-full border-2 border-teal/30 bg-white rounded-2xl pl-11 pr-32 py-4 text-sm outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-all placeholder:text-gray-400 shadow-sm"
          maxLength={2000}
        />
        <button
          type="submit"
          disabled={loading || text.trim().length < 3}
          className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary py-2.5 px-5 text-sm flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Find <ArrowRight className="w-3.5 h-3.5" /></>}
        </button>
      </form>

      {/* Example chips */}
      {!result && !loading && (
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="text-xs text-gray-400 py-1">Try:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => { setText(ex); }}
              className="text-xs bg-gray-100 hover:bg-teal-50 hover:text-teal text-gray-600 px-3 py-1 rounded-full transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-3 flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Results */}
      {result && result.matches?.length > 0 && (
        <div className="mt-4 space-y-2">
          {/* Symptom-mode disclaimer */}
          {result.disclaimer && (
            <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-800 leading-relaxed">
              <Stethoscope className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{result.disclaimer}</span>
            </div>
          )}
          {result.clarifying_note && (
            <p className="text-xs text-gray-500 px-1">{result.clarifying_note}</p>
          )}

          {result.matches.map((m) => (
            <button
              key={m.protocol_id}
              onClick={() => handlePick(m)}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-teal hover:shadow-sm transition-all text-left group"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ background: m.color_hex || '#F1F3F5' }}
              >
                {m.modality_name?.split(' ')[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy truncate">{m.protocol_name}</div>
                <div className="text-xs text-gray-500">{m.body_part_name} · {m.modality_name}</div>
                {m.reason && <div className="text-xs text-gray-400 mt-0.5 truncate">{m.reason}</div>}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {m.confidence && (
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${confidenceColor[m.confidence] || ''}`}>
                    {m.confidence}
                  </span>
                )}
                {m.price_from && (
                  <div className="text-right">
                    <div className="font-display text-lg text-navy leading-none">${parseFloat(m.price_from).toFixed(0)}</div>
                    <div className="text-[10px] text-gray-400">from</div>
                  </div>
                )}
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-teal transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}

      {result && result.matches?.length === 0 && result.match_type !== 'unrelated' && (
        <p className="mt-3 text-sm text-gray-500">No matching protocols found. Try the dropdowns below or call 855-346-5152.</p>
      )}
    </div>
  );
}
