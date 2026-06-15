import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../hooks/useAuth';
import { Phone, Menu, X, User, LogOut } from 'lucide-react';
import { useState } from 'react';
import Logo from '../Logo';

export default function PatientLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* ── NAVBAR (brand: white, #EEF1F5 border) ─────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-[#EEF1F5] px-4 md:px-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-[68px]">
          <Link to="/" aria-label="Radiology Save home">
            <Logo height={30} />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/search" className="text-[15px] font-medium text-[#3D4A5C] hover:text-brand-blue transition-colors">Find a Scan</Link>
            <Link to="/#how-it-works" className="text-[15px] font-medium text-[#3D4A5C] hover:text-brand-blue transition-colors">How It Works</Link>
            <a href="tel:8553465152" className="flex items-center gap-1.5 text-[15px] text-[#3D4A5C] hover:text-brand-blue transition-colors">
              <Phone className="w-3.5 h-3.5" /> 855-346-5152
            </a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <Link to="/account" className="flex items-center gap-2 text-sm font-medium text-[#3D4A5C] hover:text-brand-ink px-3 py-2 rounded-[9px] hover:bg-gray-100 transition-all">
                  <User className="w-4 h-4" /> {user.first_name}
                </Link>
                <button onClick={handleLogout} className="p-2 rounded-[9px] text-gray-400 hover:bg-gray-100 transition-all">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="text-[15px] font-medium text-[#3D4A5C] hover:text-brand-ink px-3 py-2">Sign In</Link>
                <Link to="/search" className="bg-brand-blue hover:bg-brand-blueDark text-white text-[15px] font-semibold px-6 py-[11px] rounded-[9px] transition-colors">
                  Check Prices
                </Link>
              </>
            )}
          </div>

          {/* Mobile burger */}
          <button className="md:hidden p-2 rounded-[9px] hover:bg-gray-100" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[#EEF1F5] py-4 flex flex-col gap-2">
            <Link to="/search" className="px-4 py-2 text-sm font-medium text-[#3D4A5C] hover:bg-gray-50 rounded-[9px]" onClick={() => setMobileOpen(false)}>Find a Scan</Link>
            {user ? (
              <>
                <Link to="/account" className="px-4 py-2 text-sm font-medium text-[#3D4A5C]" onClick={() => setMobileOpen(false)}>My Account</Link>
                <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="px-4 py-2 text-sm text-left text-gray-500">Sign Out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Sign In</Link>
                <Link to="/search" className="mx-4 bg-brand-blue text-white text-sm font-semibold px-6 py-3 rounded-[9px] text-center" onClick={() => setMobileOpen(false)}>Check Prices</Link>
              </>
            )}
          </div>
        )}
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── FOOTER (brand: ink bg, dark logo) ─────────────────────────── */}
      <footer className="bg-brand-ink px-5 md:px-10 py-12 mt-16">
        <div className="max-w-7xl mx-auto">
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
                <Link to="/account" className="block text-[#8E9AA6] hover:text-white text-sm transition-colors">My Account</Link>
              </div>
              <div>
                <h4 className="text-white text-[13px] font-semibold uppercase tracking-wider mb-3">Partners</h4>
                <Link to="/#for-centers" className="block text-[#8E9AA6] hover:text-white text-sm mb-2 transition-colors">For Imaging Centers</Link>
                <a href="mailto:contact@radiologysave.com" className="block text-[#8E9AA6] hover:text-white text-sm transition-colors">Contact Sales</a>
              </div>
              <div>
                <h4 className="text-white text-[13px] font-semibold uppercase tracking-wider mb-3">Contact</h4>
                <a href="tel:8553465152" className="block text-[#8E9AA6] hover:text-white text-sm mb-2 transition-colors">855-346-5152</a>
                <span className="block text-[#8E9AA6] text-sm">Mon–Fri 7am–6pm CST</span>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6">
            <p className="text-[#6B7785] text-xs leading-relaxed">
              Radiology Save is not insurance and is not a healthcare provider. Cannot be used by
              participants of state or federal funded programs such as Medicare or Medicaid.
              Prices shown are self-pay rates set by independent imaging centers and are subject
              to change. A physician's order is required for all imaging studies.
              © {new Date().getFullYear()} Radiology Save. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
