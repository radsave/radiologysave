import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Logo from '../../components/Logo';
import { authAPI } from '../../utils/api';
import { useAuthStore } from '../../hooks/useAuth';

export function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const { data } = await authAPI.login(form);
      setAuth(data.token, data.user);
      navigate(data.user.role === 'admin' || data.user.role === 'super_admin' ? '/admin/dashboard' : '/account');
    } catch (err) { setError(err.response?.data?.error || 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link to="/" aria-label="Radiology Save home"><Logo height={34} /></Link>
        </div>
        <div className="card">
          <h1 className="font-display text-2xl text-navy mb-6">Sign in</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required className="input" placeholder="you@email.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} required className="input" />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">Don't have an account? <Link to="/register" className="text-teal font-medium hover:underline">Create one</Link></p>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const [form, setForm] = useState({ first_name:'', last_name:'', email:'', password:'', phone:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const { data } = await authAPI.register(form);
      setAuth(data.token, data.user);
      navigate('/account');
    } catch (err) { setError(err.response?.data?.error || 'Registration failed'); }
    finally { setLoading(false); }
  };

  const f = (field) => e => setForm(prev => ({...prev, [field]: e.target.value}));

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link to="/" aria-label="Radiology Save home"><Logo height={34} /></Link>
        </div>
        <div className="card">
          <h1 className="font-display text-2xl text-navy mb-6">Create account</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">First Name</label>
                <input value={form.first_name} onChange={f('first_name')} required className="input" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Last Name</label>
                <input value={form.last_name} onChange={f('last_name')} required className="input" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={f('email')} required className="input" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
              <input type="tel" value={form.phone} onChange={f('phone')} className="input" placeholder="(555) 555-5555" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password (min 8 chars)</label>
              <input type="password" value={form.password} onChange={f('password')} required minLength={8} className="input" />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</> : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">Already have an account? <Link to="/login" className="text-teal font-medium hover:underline">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
