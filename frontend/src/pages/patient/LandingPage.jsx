import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Search, Sparkles, ChevronDown, MapPin, User, LogOut } from 'lucide-react';
import Logo, { LogoMark } from '../../components/Logo';
import { searchAPI } from '../../utils/api';
import { useAuthStore } from '../../hooks/useAuth';
import ScanFinder from '../../components/patient/ScanFinder';

/* ─────────────────────────────────────────────────────────────────────────
   RadiologySave landing page — built per HANDOFF.md §5 (navbar + hero)
   and §6 item 1 (how-it-works, popular procedures grid, imaging-center
   CTA band, footer).

   Brand rules honored: rounded-square shape language (6–12px radius),
   no pills (except the spec'd eyebrow), no gradients except the spec'd
   hero wash, blue = trust/primary, green = savings/compare actions.
   ───────────────────────────────────────────────────────────────────── */

// Popular procedures — "from" prices pulled from the seeded center_pricing
// data; typical hospital prices for the struck-through comparison.
const PROCEDURES = [
  { name: 'Brain MRI',           from: 271,  hospital: 1850 },
  { name: 'Lumbar Spine MRI',    from: 264,  hospital: 1750 },
  { name: 'CT Head',             from: 140,  hospital: 1100 },
  { name: 'CT Abdomen & Pelvis', from: 215,  hospital: 1900 },
  { name: 'Abdominal Ultrasound',from: 129,  hospital: 650  },
  { name: 'Screening Mammogram', from: 164,  hospital: 480  },
  { name: 'DEXA Bone Density',   from: 95,   hospital: 350  },
  { name: 'Chest X-Ray',         from: 38,   hospital: 210  },
];

const STEPS = [
  { n: 1, green: false, title: 'Search',  body: 'Enter your procedure and ZIP code. See every accredited center near you with its real cash price.' },
  { n: 2, green: false, title: 'Compare', body: 'One upfront price per center — imaging, radiologist read, and report included. No estimates, no surprises.' },
  { n: 3, green: true,  title: 'Book & save', body: 'Pick your center, pay securely online, and walk in with your voucher. Most patients save 60% or more.' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const handleLogout = () => { logout(); navigate('/'); };
  const [searchMode, setSearchMode] = useState('dropdowns'); // 'dropdowns' | 'ai'
  const [zip, setZip] = useState('');

  // ── Cascading dropdowns: Select Study → Body Part → Protocol ─────────
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
    <div className="font-sans text-brand-ink antialiased">

      {/* ── NAVBAR (§5) ────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between bg-white border-b border-[#EEF1F5] px-5 md:px-10 py-[18px]">
        <Link to="/" aria-label="Radiology Save home"><Logo height={32} /></Link>
        <div className="hidden md:flex items-center gap-8">
          <Link to="/search" className="text-[15px] font-medium text-[#3D4A5C] hover:text-brand-blue transition-colors">Find a Scan</Link>
          <a href="#how-it-works" className="text-[15px] font-medium text-[#3D4A5C] hover:text-brand-blue transition-colors">How It Works</a>
          <a href="#for-centers" className="text-[15px] font-medium text-[#3D4A5C] hover:text-brand-blue transition-colors">For Imaging Centers</a>
          {user ? (
            <div className="flex items-center gap-2">
              <Link to="/account" className="flex items-center gap-2 text-[15px] font-medium text-[#3D4A5C] hover:text-brand-ink px-3 py-2 rounded-[9px] hover:bg-gray-100 transition-all">
                <User className="w-4 h-4" /> {user.first_name}
              </Link>
              <button onClick={handleLogout} className="p-2 rounded-[9px] text-gray-400 hover:bg-gray-100 transition-all" aria-label="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="text-[15px] font-medium text-[#3D4A5C] hover:text-brand-ink transition-colors">Sign In</Link>
              <Link to="/search" className="bg-brand-blue hover:bg-brand-blueDark text-white text-[15px] font-semibold px-6 py-[11px] rounded-[9px] transition-colors">
                Check Prices
              </Link>
            </>
          )}
        </div>
        {/* Mobile: Sign In / account + CTA */}
        <div className="md:hidden flex items-center gap-2">
          {user ? (
            <Link to="/account" className="flex items-center gap-1.5 text-sm font-medium text-[#3D4A5C] px-2 py-2" aria-label="My account">
              <User className="w-4 h-4" /> {user.first_name}
            </Link>
          ) : (
            <Link to="/login" className="text-sm font-medium text-[#3D4A5C] px-2 py-2">Sign In</Link>
          )}
          <Link to="/search" className="bg-brand-blue text-white text-sm font-semibold px-4 py-2.5 rounded-[9px]">
            Check Prices
          </Link>
        </div>
      </nav>

      {/* ── HERO (§5) ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden text-center px-5 md:px-10 pt-[52px] pb-[60px] md:pt-[76px] md:pb-[84px]"
               style={{ background: 'linear-gradient(180deg, #F2F7FC 0%, #fff 70%)' }}>
        {/* Ghosted quadrant supergraphic, top-right */}
        <div className="absolute -right-10 -top-10 opacity-[0.06] pointer-events-none" aria-hidden="true">
          <LogoMark size={420} />
        </div>

        {/* Eyebrow pill */}
        <span className="relative inline-flex items-center gap-2 border border-[#CFE3D9] bg-brand-mint text-[#15784A] text-[13px] font-semibold px-3.5 py-1.5 rounded-full mb-6">
          <span className="w-2 h-2 rounded-full bg-brand-green flex-none" />
          Transparent cash-pay imaging
        </span>

        {/* H1 */}
        <h1 className="relative font-bold text-[33px] md:text-[48px] leading-[1.1] tracking-headline max-w-[720px] mx-auto mb-[18px]"
            style={{ fontWeight: 740 }}>
          Hospital-quality imaging.<br />
          <span className="text-brand-blue">One upfront price.</span>{' '}
          <span className="text-brand-green">Real savings.</span>
        </h1>

        {/* Sub */}
        <p className="relative text-[18px] text-brand-body max-w-[560px] mx-auto mb-9 leading-[1.55]">
          Compare real cash prices for MRI, CT, and ultrasound at accredited
          imaging centers near you — then book online in minutes.
        </p>

        {/* Search-mode toggle: Browse Menus (default) | Describe It */}
        <div className="relative flex justify-center mb-5">
          <div className="bg-white border border-[#D8E2EC] p-1 rounded-[10px] flex gap-1">
            <button
              onClick={() => setSearchMode('dropdowns')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-[7px] text-sm font-medium transition-colors ${
                searchMode === 'dropdowns' ? 'bg-brand-blue text-white' : 'text-brand-body hover:text-brand-ink'
              }`}
            >
              <Search className="w-3.5 h-3.5" /> Browse Menus
            </button>
            <button
              onClick={() => setSearchMode('ai')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-[7px] text-sm font-medium transition-colors ${
                searchMode === 'ai' ? 'bg-brand-blue text-white' : 'text-brand-body hover:text-brand-ink'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Describe It
            </button>
          </div>
        </div>

        {/* ── Browse Menus: Select Study → Body Part → Protocol → ZIP ── */}
        {searchMode === 'dropdowns' && (
          <form onSubmit={handleDropdownSearch}
                className="relative max-w-[880px] mx-auto bg-white border-[1.5px] border-[#D8E2EC] rounded-xl shadow-brand p-5 md:p-6">
            <div className="grid md:grid-cols-4 gap-3 mb-4 text-left">
              <div>
                <label className="block text-[11px] font-semibold text-brand-body uppercase tracking-wider mb-1.5">Select Study</label>
                <div className="relative">
                  <select value={selStudy} onChange={e => handleStudyChange(e.target.value)}
                          className="w-full appearance-none cursor-pointer border border-[#D8E2EC] rounded-[9px] px-3.5 py-3 pr-9 text-[15px] outline-none focus:border-brand-blue bg-white">
                    <option value="">— Select Study —</option>
                    {modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-brand-body uppercase tracking-wider mb-1.5">Select Body Part</label>
                <div className="relative">
                  <select value={selBody} onChange={e => handleBodyChange(e.target.value)} disabled={!bodyParts.length}
                          className="w-full appearance-none cursor-pointer border border-[#D8E2EC] rounded-[9px] px-3.5 py-3 pr-9 text-[15px] outline-none focus:border-brand-blue bg-white disabled:bg-gray-50 disabled:cursor-not-allowed">
                    <option value="">— Select Body Part —</option>
                    {bodyParts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-brand-body uppercase tracking-wider mb-1.5">Select Protocol</label>
                <div className="relative">
                  <select value={selProtocol} onChange={e => setSelProtocol(e.target.value)} disabled={!protocols.length}
                          className="w-full appearance-none cursor-pointer border border-[#D8E2EC] rounded-[9px] px-3.5 py-3 pr-9 text-[15px] outline-none focus:border-brand-blue bg-white disabled:bg-gray-50 disabled:cursor-not-allowed">
                    <option value="">— Select Protocol —</option>
                    {protocols.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-brand-body uppercase tracking-wider mb-1.5">ZIP Code</label>
                <input
                  type="text"
                  value={zip}
                  onChange={e => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="e.g. 75035"
                  maxLength={5}
                  className="w-full border border-[#D8E2EC] rounded-[9px] px-3.5 py-3 text-[15px] outline-none focus:border-brand-blue placeholder:text-gray-400"
                />
              </div>
            </div>
            <button type="submit"
                    className="bg-brand-green hover:bg-brand-greenDark text-white text-[15px] font-semibold px-10 py-3 rounded-[9px] transition-colors inline-flex items-center gap-2">
              <Search className="w-4 h-4" /> Compare Prices
            </button>
          </form>
        )}

        {/* ── Describe It: same AI finder as the search page (with typing suggestions) ── */}
        {searchMode === 'ai' && (
          <div className="relative max-w-[880px] mx-auto bg-white border-[1.5px] border-[#D8E2EC] rounded-xl shadow-brand p-5 md:p-6 text-left">
            <div className="sm:w-56 mb-4">
              <label className="block text-[11px] font-semibold text-brand-body uppercase tracking-wider mb-1.5">ZIP Code</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={zip}
                  onChange={e => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="e.g. 75035"
                  maxLength={5}
                  className="w-full border border-[#D8E2EC] rounded-[9px] pl-9 pr-3.5 py-3 text-[15px] outline-none focus:border-brand-blue placeholder:text-gray-400 font-semibold tracking-wider"
                />
              </div>
            </div>
            <ScanFinder zip={zip} />
          </div>
        )}

        {/* Trust strip */}
        <div className="relative flex flex-wrap justify-center gap-x-9 gap-y-3 mt-[34px]">
          <span className="flex items-center gap-2 text-sm text-brand-body">
            <span className="w-3.5 h-3.5 rounded bg-brand-blue flex-none" />
            <b className="text-brand-ink font-semibold">ACR-accredited</b>&nbsp;centers only
          </span>
          <span className="flex items-center gap-2 text-sm text-brand-body">
            <span className="w-3.5 h-3.5 rounded bg-brand-blue flex-none" />
            Average savings of&nbsp;<b className="text-brand-ink font-semibold">60%</b>
          </span>
          <span className="flex items-center gap-2 text-sm text-brand-body">
            <span className="w-3.5 h-3.5 rounded bg-brand-green flex-none" />
            <b className="text-brand-ink font-semibold">No surprise bills</b>&nbsp;— ever
          </span>
        </div>
      </section>

      {/* ── HOW IT WORKS (§6) ──────────────────────────────────────────── */}
      <section id="how-it-works" className="max-w-[1080px] mx-auto px-5 md:px-10 py-16 md:py-20">
        <h2 className="text-[28px] md:text-[36px] font-bold tracking-headline text-center mb-3" style={{ fontWeight: 740 }}>
          Three steps to a fair price
        </h2>
        <p className="text-brand-body text-center max-w-[480px] mx-auto mb-12">
          No insurance required. No phone tag. No bill months later.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map(({ n, green, title, body }) => (
            <div key={n} className="bg-white border border-[#E4E8EE] rounded-xl p-7">
              {/* Step tile — three blue, one green, echoing the quadrant logo */}
              <div className={`w-12 h-12 rounded-[10px] flex items-center justify-center text-white text-lg font-bold mb-5 ${green ? 'bg-brand-green' : 'bg-brand-blue'}`}>
                {n}
              </div>
              <h3 className="text-[18px] font-semibold mb-2">{title}</h3>
              <p className="text-[15px] text-brand-body leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── POPULAR PROCEDURES (§6) ────────────────────────────────────── */}
      <section className="bg-brand-mist">
        <div className="max-w-[1080px] mx-auto px-5 md:px-10 py-16 md:py-20">
          <h2 className="text-[28px] md:text-[36px] font-bold tracking-headline text-center mb-3" style={{ fontWeight: 740 }}>
            Popular procedures, upfront prices
          </h2>
          <p className="text-brand-body text-center max-w-[520px] mx-auto mb-12">
            Every price includes the scan, the board-certified radiologist read, and your report.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PROCEDURES.map(({ name, from, hospital }) => (
              <Link key={name} to={`/search`}
                    className="bg-white border border-[#E4E8EE] hover:border-brand-blue rounded-xl p-6 transition-colors group">
                <h3 className="text-[16px] font-semibold mb-4">{name}</h3>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[13px] text-brand-body">from</span>
                  <span className="text-[28px] font-bold text-brand-green leading-none">${from}</span>
                </div>
                <p className="text-[13px] text-brand-body">
                  vs. typical hospital <s className="text-[#9AA5B1]">${hospital.toLocaleString()}</s>
                </p>
                <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-brand-blue mt-4 group-hover:gap-2.5 transition-all">
                  Check local prices <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            ))}
          </div>
          <p className="text-center text-[13px] text-brand-body mt-8">
            Prices vary by center and region. Search your ZIP code for exact local pricing.
          </p>
        </div>
      </section>

      {/* ── IMAGING CENTER CTA BAND (§6) ───────────────────────────────── */}
      <section id="for-centers" className="bg-brand-ink">
        <div className="max-w-[1080px] mx-auto px-5 md:px-10 py-14 md:py-16 flex flex-col md:flex-row md:items-center gap-8 md:gap-12">
          <div className="flex-1">
            <h2 className="text-white text-[26px] md:text-[32px] font-bold tracking-headline mb-3" style={{ fontWeight: 740 }}>
              Run an imaging center? Fill your open slots.
            </h2>
            <p className="text-[#B9C3CE] text-[16px] leading-relaxed max-w-[560px]">
              List your cash prices on Radiology Save and reach self-pay patients
              actively searching in your area. No subscription fees — you pay
              only when a patient books.
            </p>
          </div>
          <div className="flex-none">
            <a href="mailto:contact@radiologysave.com"
               className="inline-block bg-brand-green hover:bg-brand-greenDark text-white text-[15px] font-semibold px-8 py-3.5 rounded-[9px] transition-colors">
              Partner with us
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER (§6) ────────────────────────────────────────────────── */}
      <footer className="bg-brand-ink border-t border-white/10">
        <div className="max-w-[1080px] mx-auto px-5 md:px-10 py-12">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-10 mb-10">
            <div>
              <Logo height={28} dark />
              <p className="text-[#8E9AA6] text-sm leading-relaxed max-w-[280px] mt-4">
                Transparent cash-pay diagnostic imaging at accredited centers nationwide.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-10">
              <div>
                <h4 className="text-white text-[13px] font-semibold uppercase tracking-wider mb-3">Patients</h4>
                <Link to="/search" className="block text-[#8E9AA6] hover:text-white text-sm mb-2 transition-colors">Find a Scan</Link>
                <Link to="/centers" className="block text-[#8E9AA6] hover:text-white text-sm mb-2 transition-colors">Imaging Centers</Link>
                <Link to="/procedures" className="block text-[#8E9AA6] hover:text-white text-sm mb-2 transition-colors">Procedures & Prices</Link>
                <a href="#how-it-works" className="block text-[#8E9AA6] hover:text-white text-sm mb-2 transition-colors">How It Works</a>
                <Link to="/login" className="block text-[#8E9AA6] hover:text-white text-sm transition-colors">Sign In</Link>
              </div>
              <div>
                <h4 className="text-white text-[13px] font-semibold uppercase tracking-wider mb-3">Partners</h4>
                <a href="#for-centers" className="block text-[#8E9AA6] hover:text-white text-sm mb-2 transition-colors">For Imaging Centers</a>
                <a href="mailto:contact@radiologysave.com" className="block text-[#8E9AA6] hover:text-white text-sm transition-colors">Contact Sales</a>
              </div>
              <div>
                <h4 className="text-white text-[13px] font-semibold uppercase tracking-wider mb-3">Company</h4>
                <a href="#" className="block text-[#8E9AA6] hover:text-white text-sm mb-2 transition-colors">Privacy</a>
                <a href="#" className="block text-[#8E9AA6] hover:text-white text-sm transition-colors">Terms</a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6">
            <p className="text-[#6B7785] text-xs leading-relaxed">
              Radiology Save is not insurance and is not a healthcare provider. Prices shown are
              self-pay rates set by independent imaging centers and are subject to change.
              A physician's order is required for all imaging studies.
              © {new Date().getFullYear()} Radiology Save. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
