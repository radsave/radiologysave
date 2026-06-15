import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CheckCircle, Clock, CreditCard, Shield, ChevronDown, Star, Sparkles, MapPin } from 'lucide-react';
import { searchAPI } from '../../utils/api';
import ScanFinder from '../../components/patient/ScanFinder';

const STARTING_PRICES = [
  { label: 'MRI', price: '$263', sub: 'w/o contrast' },
  { label: 'CT Scan', price: '$140', sub: 'w/o contrast' },
  { label: 'Ultrasound', price: '$106', sub: 'limited study' },
  { label: 'X-Ray', price: '$30', sub: '1 view' },
  { label: 'Mammogram', price: '$161', sub: 'diagnostic' },
  { label: 'DEXA', price: '$95', sub: 'bone density' },
];

const TRUST = [
  { icon: <CheckCircle className="w-4 h-4" />, label: 'Accredited Centers' },
  { icon: <Shield className="w-4 h-4" />, label: 'Board-Certified Radiologists' },
  { icon: <Clock className="w-4 h-4" />, label: 'Same-Day Appointments' },
  { icon: <CreditCard className="w-4 h-4" />, label: 'All-Inclusive Pricing' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [zip, setZip] = useState('');
  const [searchMode, setSearchMode] = useState('dropdowns'); // 'dropdowns' | 'ai'

  // ── Cascading dropdown state (Select Study → Body Part → Protocol) ───────
  const [modalities, setModalities] = useState([]);
  const [bodyParts, setBodyParts] = useState([]);
  const [protocols, setProtocols] = useState([]);
  const [selStudy, setSelStudy] = useState('');
  const [selBody, setSelBody] = useState('');
  const [selProtocol, setSelProtocol] = useState('');

  useEffect(() => {
    searchAPI.modalities().then(r => setModalities(r.data.modalities)).catch(() => {});
  }, []);

  const handleStudyChange = async (modId) => {
    setSelStudy(modId); setSelBody(''); setSelProtocol('');
    setBodyParts([]); setProtocols([]);
    if (modId) {
      const r = await searchAPI.bodyParts(modId);
      setBodyParts(r.data.body_parts);
    }
  };

  const handleBodyChange = async (bpId) => {
    setSelBody(bpId); setSelProtocol('');
    setProtocols([]);
    if (bpId) {
      const r = await searchAPI.protocols(bpId);
      setProtocols(r.data.protocols);
    }
  };

  const handleDropdownSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (zip.length === 5) params.set('zip', zip);
    const mod = modalities.find(m => m.id === selStudy);
    const bp = bodyParts.find(b => b.id === selBody);
    if (mod) params.set('modality', mod.name);
    if (bp) params.set('body_part', bp.name);
    if (selProtocol) params.set('protocol_id', selProtocol);
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div>
      {/* ── HERO with integrated search ───────────────────────────────────── */}
      <section className="bg-gradient-to-br from-navy via-navy-500/90 to-[#1a3d6b] text-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-teal/10 blur-3xl translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-1/4 w-72 h-72 rounded-full bg-gold/5 blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto px-6 pt-16 md:pt-20 pb-20 relative">
          {/* Headline */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-teal/15 border border-teal-100/30 text-teal-400 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              No Insurance Required
            </div>
            <h1 className="font-display text-5xl md:text-6xl leading-[1.05] mb-5 tracking-tight">
              Imaging that fits your <em className="text-teal-400 not-italic">budget</em>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed max-w-xl mx-auto">
              Board-certified radiologists, accredited centers, same-day appointments — at a fraction of typical self-pay rates.
            </p>
          </div>

          {/* ── SEARCH CARD: ZIP + AI / Dropdowns ──────────────────────────── */}
          <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 text-navy">
            {/* Top row: mode toggle */}
            <div className="flex justify-center mb-5">
              <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
                <button
                  onClick={() => setSearchMode('dropdowns')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    searchMode === 'dropdowns' ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-navy'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" /> Browse Menus
                </button>
                <button
                  onClick={() => setSearchMode('ai')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    searchMode === 'ai' ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-navy'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" /> Describe It
                </button>
              </div>
            </div>

            {/* AI mode: ZIP + free-text finder */}
            {searchMode === 'ai' && (
              <div>
                <div className="sm:w-56 mb-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Your ZIP Code</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={zip}
                      onChange={e => setZip(e.target.value.replace(/\D/g,'').slice(0,5))}
                      placeholder="e.g. 75035"
                      className="input pl-9 font-semibold tracking-wider"
                      maxLength={5}
                    />
                  </div>
                </div>
                <ScanFinder zip={zip} />
              </div>
            )}

            {/* Dropdown mode: ZIP + Select Study → Select Body Part → Select Protocol, one line */}
            {searchMode === 'dropdowns' && (
              <form onSubmit={handleDropdownSearch}>
                <div className="grid md:grid-cols-4 gap-4 mb-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Select Study</label>
                    <div className="relative">
                      <select className="select pr-9" value={selStudy} onChange={e => handleStudyChange(e.target.value)}>
                        <option value="">— Select Study —</option>
                        {modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Select Body Part</label>
                    <div className="relative">
                      <select className="select pr-9" value={selBody} onChange={e => handleBodyChange(e.target.value)} disabled={!bodyParts.length}>
                        <option value="">— Select Body Part —</option>
                        {bodyParts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Select Protocol</label>
                    <div className="relative">
                      <select className="select pr-9" value={selProtocol} onChange={e => setSelProtocol(e.target.value)} disabled={!protocols.length}>
                        <option value="">— Select Protocol —</option>
                        {protocols.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">ZIP Code</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={zip}
                        onChange={e => setZip(e.target.value.replace(/\D/g,'').slice(0,5))}
                        placeholder="e.g. 75035"
                        className="input pl-9 font-semibold tracking-wider"
                        maxLength={5}
                      />
                    </div>
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full md:w-auto md:px-12 flex items-center justify-center gap-2 mx-auto">
                  <Search className="w-4 h-4" /> Search Prices
                </button>
              </form>
            )}
          </div>

          {/* Stats under the card */}
          <div className="flex flex-wrap justify-center gap-8 md:gap-12 mt-10">
            {[['$30', 'X-Ray from'], ['$140', 'CT from'], ['$263', 'MRI from'], ['1000+', 'Centers']].map(([num, label]) => (
              <div key={label} className="text-center">
                <div className="font-display text-2xl text-white">{num}</div>
                <div className="text-xs text-white/45 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ─────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap gap-6 items-center justify-around">
          {TRUST.map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-sm text-gray-600 font-medium">
              <span className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal">{icon}</span>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── STARTING PRICES ───────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-bold text-teal uppercase tracking-widest mb-2">Transparent Pricing</p>
          <h2 className="font-display text-4xl text-navy">Starting rates — any ZIP</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {STARTING_PRICES.map(({ label, price, sub }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-2xl p-5 text-center hover:border-teal hover:shadow-md transition-all">
              <span className="text-xs text-gray-500 uppercase font-bold tracking-wide block mb-2">{label}</span>
              <span className="font-display text-3xl text-teal block">{price}</span>
              <span className="text-xs text-gray-400 block mt-1">{sub}</span>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">All-inclusive · Radiologist report included · No hidden fees</p>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-teal uppercase tracking-widest mb-2">Simple Process</p>
            <h2 className="font-display text-4xl text-navy">How it works</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { n: '01', title: 'Find your scan', desc: 'Describe it in plain English or browse by study, body part, and protocol.' },
              { n: '02', title: 'Compare prices', desc: 'See all-inclusive rates at accredited centers near your ZIP code.' },
              { n: '03', title: 'Upload your referral', desc: 'Snap a photo of your doctor\'s order — we read it and fill the form for you.' },
              { n: '04', title: 'Pay & get scanned', desc: 'Secure online payment, scheduled within 4 hours. Show your voucher at check-in.' },
            ].map(({ n, title, desc }) => (
              <div key={n} className="relative">
                <div className="w-10 h-10 rounded-xl bg-navy text-white font-display text-lg flex items-center justify-center mb-4">{n}</div>
                <h3 className="font-semibold text-navy mb-2">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REVIEWS ───────────────────────────────────────────────────────── */}
      <section className="bg-teal-50 py-14">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-2 justify-center mb-8">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-gold text-gold" />)}
            <span className="ml-2 font-semibold text-navy">4.9 / 5 from 1,200+ patients</span>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { q: 'Saved me over $2,000 on my MRI. The process was easy and the center was great.', author: 'Sarah P.' },
              { q: 'I just typed what my doctor wrote and it found the exact scan with the price. Incredible.', author: 'Robert R.' },
              { q: 'Uploaded a photo of my referral and the whole form filled itself out. Booked in 3 minutes.', author: 'Maria C.' },
            ].map(({ q, author }) => (
              <div key={author} className="bg-white rounded-2xl p-6 shadow-sm border border-teal-100">
                <p className="text-sm text-gray-700 leading-relaxed mb-4">"{q}"</p>
                <span className="text-xs font-bold text-teal uppercase tracking-wide">{author}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
