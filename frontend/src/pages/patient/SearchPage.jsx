import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, MapPin, ChevronDown, Loader2, Building2, Clock, Star, ArrowRight, SlidersHorizontal, Sparkles } from 'lucide-react';
import { searchAPI } from '../../utils/api';
import ScanFinder from '../../components/patient/ScanFinder';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [zip, setZip] = useState(searchParams.get('zip') || '');
  const [modalities, setModalities] = useState([]);
  const [bodyParts, setBodyParts] = useState([]);
  const [protocols, setProtocols] = useState([]);
  const [selectedModality, setSelectedModality] = useState(null);
  const [selectedBodyPart, setSelectedBodyPart] = useState(null);
  const [selectedProtocol, setSelectedProtocol] = useState(null);
  const [radius, setRadius] = useState(25);
  const [sort, setSort] = useState('distance');
  const [results, setResults] = useState([]);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [showAiFinder, setShowAiFinder] = useState(false);

  // Load modalities on mount, and pre-select from URL params (homepage dropdown flow)
  useEffect(() => {
    searchAPI.modalities().then(async (r) => {
      const mods = r.data.modalities;
      setModalities(mods);
      // Pre-select modality from URL if provided
      const urlModality = searchParams.get('modality');
      const urlBodyPart = searchParams.get('body_part');
      if (urlModality) {
        const mod = mods.find(m => m.name === urlModality);
        if (mod) {
          setSelectedModality(mod);
          const bpRes = await searchAPI.bodyParts(mod.id);
          setBodyParts(bpRes.data.body_parts);
          if (urlBodyPart) {
            const bp = bpRes.data.body_parts.find(b => b.name === urlBodyPart);
            if (bp) {
              setSelectedBodyPart(bp);
              const pRes = await searchAPI.protocols(bp.id);
              setProtocols(pRes.data.protocols);
              const urlProtocolId = searchParams.get('protocol_id');
              if (urlProtocolId) {
                const proto = pRes.data.protocols.find(p => p.id === urlProtocolId);
                if (proto) setSelectedProtocol(proto);
              }
            }
          }
        }
      }
    }).catch(console.error);
  }, []);

  // Auto-search if zip in URL (waits for pre-selected filters to load)
  useEffect(() => {
    if (!searchParams.get('zip') || !modalities.length) return;
    // If URL has a modality filter, wait until it's been applied to state
    const urlModality = searchParams.get('modality');
    if (urlModality && !selectedModality) return;
    const urlProtocolId = searchParams.get('protocol_id');
    if (urlProtocolId && !selectedProtocol) return;
    runSearch();
  }, [searchParams.get('zip'), modalities.length, selectedModality, selectedProtocol]);

  const handleModalityChange = async (modId) => {
    const mod = modalities.find(m => m.id === modId);
    setSelectedModality(mod || null);
    setSelectedBodyPart(null);
    setSelectedProtocol(null);
    setBodyParts([]);
    setProtocols([]);
    if (modId) {
      const r = await searchAPI.bodyParts(modId);
      setBodyParts(r.data.body_parts);
    }
  };

  const handleBodyPartChange = async (bpId) => {
    const bp = bodyParts.find(b => b.id === bpId);
    setSelectedBodyPart(bp || null);
    setSelectedProtocol(null);
    setProtocols([]);
    if (bpId) {
      const r = await searchAPI.protocols(bpId);
      setProtocols(r.data.protocols);
    }
  };

  const runSearch = async () => {
    if (!zip || zip.length !== 5) { setError('Enter a valid 5-digit ZIP'); return; }
    setError(''); setLoading(true); setSearched(true);
    try {
      const params = { zip, radius, sort };
      if (selectedModality) params.modality = selectedModality.name;
      if (selectedBodyPart) params.body_part = selectedBodyPart.name;
      if (selectedProtocol) params.protocol_id = selectedProtocol.id;
      const r = await searchAPI.search(params);
      setResults(r.data.results);
      setLocation(r.data.location);
    } catch (e) {
      setError(e.response?.data?.error || 'Search failed. Please check your ZIP code.');
    } finally { setLoading(false); }
  };

  const handleBook = (result) => {
    navigate('/booking', { state: { result } });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <h1 className="font-display text-3xl text-navy">Find Imaging Near You</h1>
        <button
          onClick={() => setShowAiFinder(!showAiFinder)}
          className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border transition-all ${
            showAiFinder ? 'bg-teal text-white border-teal' : 'bg-teal-50 text-teal border-teal/30 hover:border-teal'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          {showAiFinder ? 'Hide AI Finder' : 'Describe it in plain English'}
        </button>
      </div>

      {showAiFinder && (
        <div className="mb-8 bg-teal-50/50 border border-teal/20 rounded-2xl p-5">
          <ScanFinder
            zip={zip}
            onSelect={async (match) => {
              // Pre-fill the dropdowns from the AI match and run the search
              const mod = modalities.find(m => m.id === match.modality_id);
              if (mod) {
                setSelectedModality(mod);
                const bpRes = await searchAPI.bodyParts(mod.id);
                setBodyParts(bpRes.data.body_parts);
                const bp = bpRes.data.body_parts.find(b => b.id === match.body_part_id);
                if (bp) {
                  setSelectedBodyPart(bp);
                  const pRes = await searchAPI.protocols(bp.id);
                  setProtocols(pRes.data.protocols);
                  const proto = pRes.data.protocols.find(p => p.id === match.protocol_id);
                  if (proto) setSelectedProtocol(proto);
                }
              }
              setShowAiFinder(false);
            }}
          />
        </div>
      )}

      {/* Search form */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-8">
        <div className="grid md:grid-cols-4 gap-4 mb-4">
          {/* Modality */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Study Type</label>
            <div className="relative">
              <select className="select pr-8" value={selectedModality?.id || ''} onChange={e => handleModalityChange(e.target.value)}>
                <option value="">All Modalities</option>
                {modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          {/* Body part */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Body Part</label>
            <div className="relative">
              <select className="select pr-8" value={selectedBodyPart?.id || ''} onChange={e => handleBodyPartChange(e.target.value)} disabled={!bodyParts.length}>
                <option value="">All Body Parts</option>
                {bodyParts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          {/* Protocol */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Protocol</label>
            <div className="relative">
              <select className="select pr-8" value={selectedProtocol?.id || ''} onChange={e => setSelectedProtocol(protocols.find(p => p.id === e.target.value) || null)} disabled={!protocols.length}>
                <option value="">All Protocols</option>
                {protocols.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          {/* ZIP */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">ZIP Code</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={zip} onChange={e => setZip(e.target.value.replace(/\D/g,'').slice(0,5))}
                placeholder="e.g. 75035" className="input pl-9" maxLength={5} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500">Radius:</label>
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white" value={radius} onChange={e => setRadius(e.target.value)}>
              {[10,25,50,100].map(r => <option key={r} value={r}>{r} mi</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500">Sort:</label>
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="distance">Nearest First</option>
              <option value="price">Lowest Price</option>
              <option value="price_desc">Highest Price</option>
            </select>
          </div>
          <button onClick={runSearch} disabled={loading || zip.length !== 5} className="btn-primary ml-auto flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600 font-medium">{error}</p>}
      </div>

      {/* Results */}
      {searched && !loading && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="font-semibold text-navy text-xl">{results.length}</span>
              <span className="text-gray-500 ml-1.5 text-sm">results</span>
              {location && <span className="text-gray-400 text-sm ml-2">near {location.city}, {location.state} ({zip})</span>}
            </div>
          </div>

          {results.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-1">No results found</p>
              <p className="text-sm">Try increasing the radius or broadening your filter criteria.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {results.map((r) => (
                <div key={r.pricing_id} className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4 hover:border-teal hover:shadow-sm transition-all group">
                  {/* Modality badge */}
                  <div className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-xs font-bold text-center leading-tight" style={{ background: r.color_hex || '#F1F3F5' }}>
                    {r.modality_name?.split(' ')[0]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-navy text-base mb-0.5 truncate">{r.protocol_name}</div>
                    <div className="text-sm text-gray-500 mb-2">{r.body_part_name} · {r.modality_name}</div>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full font-medium">{r.center_name}</span>
                      <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" /> {r.distance_miles} mi · {r.city}, {r.state}
                      </span>
                      {r.same_day_appointments && (
                        <span className="text-xs bg-teal-50 text-teal font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Same-day
                        </span>
                      )}
                      {r.price_source === 'site' && (
                        <span className="text-xs bg-green-50 text-green-700 font-medium px-2.5 py-0.5 rounded-full">✓ Verified rate</span>
                      )}
                    </div>
                  </div>

                  {/* Price + CTA */}
                  <div className="flex md:flex-col items-center md:items-end gap-4 md:gap-2 flex-shrink-0">
                    <div className="text-right">
                      <div className="font-display text-3xl text-navy">${parseFloat(r.price).toFixed(2)}</div>
                      <div className="text-xs text-gray-400">all-inclusive</div>
                    </div>
                    <button onClick={() => handleBook(r)} className="btn-primary flex items-center gap-1.5 text-sm py-2.5 px-5">
                      Book <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!searched && (
        <div className="text-center py-20 text-gray-400">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg">Enter your ZIP code to see imaging centers and prices near you.</p>
        </div>
      )}
    </div>
  );
}
