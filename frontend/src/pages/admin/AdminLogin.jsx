import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Shield } from 'lucide-react';
import Logo, { LogoMark } from '../../components/Logo';
import { authAPI } from '../../utils/api';
import { useAuthStore } from '../../hooks/useAuth';

export default function AdminLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const { data } = await authAPI.login(form);
      if (!['admin', 'super_admin'].includes(data.user.role)) {
        setError('You do not have admin access.');
        return;
      }
      setAuth(data.token, data.user);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-4">
            <LogoMark size={34} dark />
          </div>
          <h1 className="font-display text-3xl text-white mb-1">Radiology Save Admin</h1>
          <p className="text-white/50 text-sm">Sign in to the management portal</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 mb-6 text-sm text-purple-700">
            <Shield className="w-4 h-4 flex-shrink-0" />
            Admin access only. Unauthorized access is prohibited.
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Address</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required className="input" placeholder="admin@clearscan.com" autoComplete="email" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} required className="input" autoComplete="current-password" />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl">{error}</p>}
            <button type="submit" disabled={loading} className="btn-secondary w-full flex items-center justify-center gap-2 py-3.5 mt-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : 'Sign In to Admin'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <a href="/" className="text-sm text-gray-400 hover:text-navy transition-colors">← Back to patient portal</a>
          </div>
        </div>

        <p className="text-center text-xs text-white/20 mt-6">Default: admin@clearscan.com / Admin@123!</p>
      </div>
    </div>
  );
}
