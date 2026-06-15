import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { adminAPI, searchAPI } from '../../utils/api';
import { ArrowLeft, Save, Loader2, MapPin, DollarSign, Building2, AlertCircle, CheckCircle, Send, RefreshCw } from 'lucide-react';
import AddressAutocomplete from '../../components/admin/AddressAutocomplete';

const INITIAL_FORM = {
  name: '', description: '', phone: '', fax: '', email: '', website: '',
  address_line1: '', address_line2: '', city: '', state: '', zip_code: '',
  latitude: '', longitude: '', accreditation: '', npi_number: '',
  typical_wait_days: 1, is_active: true, same_day_appointments: true,
  hours_of_operation: '',
};

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
];

export default function AdminCenterForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('info');

  // Pricing state
  const [pricing, setPricing] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [editingPrice, setEditingPrice] = useState({});
  const [pricingFilter, setPricingFilter] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState('');
  const [pricedCount, setPricedCount] = useState(0);
  const [alreadyNotified, setAlreadyNotified] = useState(false);

  const handlePublishPricing = async (resend = false) => {
    setPublishing(true); setPublishMsg('');
    try {
      const { data } = await adminAPI.publishPricing(id, resend);
      setPublishMsg(data.message);
      // After any successful send/publish, the center is in "notified" state,
      // so subsequent actions become "Resend updated pricing".
      if (!data.error) setAlreadyNotified(true);
    } catch (err) {
      setPublishMsg(err.response?.data?.error || 'Could not publish pricing.');
    } finally { setPublishing(false); }
  };

  useEffect(() => {
    if (isEdit) {
      adminAPI.getCenter(id)
        .then(r => {
          const c = r.data.center;
          setAlreadyNotified(!!c.pricing_notified_at);
          setForm({
            name: c.name || '', description: c.description || '',
            phone: c.phone || '', fax: c.fax || '', email: c.email || '', website: c.website || '',
            address_line1: c.address_line1 || '', address_line2: c.address_line2 || '',
            city: c.city || '', state: c.state || '', zip_code: c.zip_code || '',
            latitude: c.latitude || '', longitude: c.longitude || '',
            accreditation: c.accreditation || '', npi_number: c.npi_number || '',
            typical_wait_days: c.typical_wait_days || 1,
            is_active: c.is_active, same_day_appointments: c.same_day_appointments,
            hours_of_operation: c.hours_of_operation || '',
          });
        })
        .finally(() => setFetching(false));
    }
  }, [id]);

  // Load pricing when switching to pricing tab
  useEffect(() => {
    if (activeTab === 'pricing' && isEdit) {
      loadPricing();
    }
    if (activeTab === 'pricing' && catalog.length === 0) {
      searchAPI.catalog().then(r => setCatalog(r.data.catalog || []));
    }
  }, [activeTab, isEdit]);

  const loadPricing = async () => {
    setPricingLoading(true);
    try {
      const { data } = await adminAPI.getCenterPricing(id);
      setPricing(data.pricing);
      setPricedCount(data.pricing.filter(p => p.is_available).length);
    } finally { setPricingLoading(false); }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    // Clear this field's error as the user edits it
    setFieldErrors(prev => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  // Format a phone/fax string progressively as (XXX) XXX-XXXX while typing
  const formatPhone = (raw) => {
    const d = raw.replace(/\D/g, '').slice(0, 10);
    if (d.length === 0) return '';
    if (d.length < 4) return `(${d}`;
    if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  };

  // Shared handler for both phone and fax fields
  const handleFormattedChange = (field) => (e) => {
    const formatted = formatPhone(e.target.value);
    setForm(f => ({ ...f, [field]: formatted }));
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev }; delete next[field]; return next;
    });
  };

  const handlePhoneChange = handleFormattedChange('phone');
  const handleFaxChange = handleFormattedChange('fax');

  // Fill address fields from a Google Places selection (only overwrites
  // fields the place provides; leaves address_line2 etc. untouched)
  const handleAddressSelect = (parsed) => {
    setForm(f => ({
      ...f,
      address_line1: parsed.address_line1 || f.address_line1,
      city: parsed.city || f.city,
      state: parsed.state || f.state,
      zip_code: parsed.zip_code || f.zip_code,
      latitude: parsed.latitude !== '' ? parsed.latitude : f.latitude,
      longitude: parsed.longitude !== '' ? parsed.longitude : f.longitude,
    }));
  };

  // Field-level validation errors, keyed by field name
  const [fieldErrors, setFieldErrors] = useState({});

  const validateForm = () => {
    const errs = {};

    if (!form.name.trim()) errs.name = 'Center name is required.';
    if (!form.address_line1.trim()) errs.address_line1 = 'Address is required.';
    if (!form.city.trim()) errs.city = 'City is required.';
    if (!form.state) errs.state = 'State is required.';
    if (!form.zip_code.trim()) errs.zip_code = 'ZIP code is required.';

    // Required: phone (exactly 10 digits once formatting is stripped)
    if (!form.phone.trim()) {
      errs.phone = 'Phone is required.';
    } else if (form.phone.replace(/\D/g, '').length !== 10) {
      errs.phone = 'Enter a valid 10-digit phone number.';
    }

    if (!form.email.trim()) {
      errs.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = 'Enter a valid email address.';
    }

    if (!form.accreditation) errs.accreditation = 'Accreditation is required.';

    // NPI is optional now — only validate format if something was entered
    if (!form.npi_number.trim()) {
      errs.npi_number = 'NPI number is required.';
    } else if (!/^\d{10}$/.test(form.npi_number.trim())) {
      errs.npi_number = 'NPI must be exactly 10 digits.';
    }

    setFieldErrors(errs);
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    const errs = validateForm();
    if (Object.keys(errs).length > 0) {
      setError('Please complete all required fields before saving.');
      return;
    }

    setLoading(true);
    try {
      const payload = { ...form, latitude: form.latitude || null, longitude: form.longitude || null };
      if (isEdit) {
        await adminAPI.updateCenter(id, payload);
        setSuccess('Center updated successfully!');
      } else {
        const { data } = await adminAPI.createCenter(payload);
        setSuccess('Center created! You can now manage pricing.');
        setTimeout(() => navigate(`/admin/centers/${data.center.id}/edit`), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed. Please check your inputs.');
    } finally { setLoading(false); }
  };

  const handlePriceUpdate = async (protocolId, newPrice) => {
    try {
      await adminAPI.upsertPricing(id, {
        protocol_id: protocolId,
        price: parseFloat(newPrice),
        price_source: 'admin',
        is_available: true,
      });
      setEditingPrice(p => { const n = {...p}; delete n[protocolId]; return n; });
      await loadPricing();
    } catch (err) {
      alert('Failed to update price: ' + (err.response?.data?.error || err.message));
    }
  };

  if (fetching) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-teal" />
    </div>
  );

  const getPriceForProtocol = (protocolId) => {
    const p = pricing.find(p => p.protocol_id === protocolId);
    return p ? p.price : null;
  };

  const filteredCatalog = pricingFilter
    ? catalog.map(m => ({
        ...m,
        body_parts: m.body_parts?.map(bp => ({
          ...bp,
          protocols: bp.protocols?.filter(p => p.name.toLowerCase().includes(pricingFilter.toLowerCase()))
        })).filter(bp => bp.protocols?.length > 0)
      })).filter(m => m.body_parts?.length > 0)
    : catalog;

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/admin/centers" className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-navy transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-display text-2xl text-navy">{isEdit ? 'Edit Center' : 'Add New Imaging Center'}</h1>
          {form.name && <p className="text-sm text-gray-500 mt-0.5">{form.name}</p>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: 'info', label: 'Center Info', icon: Building2 },
          ...(isEdit ? [{ id: 'pricing', label: 'Pricing', icon: DollarSign }] : []),
        ].map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tabId ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-navy'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="card">
            <h2 className="font-semibold text-navy mb-4">Basic Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Center Name *</label>
                <input name="name" value={form.name} onChange={handleChange} required className="input" placeholder="e.g. Advanced Imaging Center – Dallas" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} className="input" rows={3} placeholder="Brief description of the center and its specialties…" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone <span className="text-red-500">*</span></label>
                <input name="phone" value={form.phone} onChange={handlePhoneChange} maxLength={14} className={`input ${fieldErrors.phone ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`} placeholder="(555) 555-5555" />
                {fieldErrors.phone && <p className="text-xs text-red-500 mt-1">{fieldErrors.phone}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fax</label>
                <input name="fax" value={form.fax} onChange={handleFaxChange} maxLength={14} className="input" placeholder="(555) 555-5555" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email <span className="text-red-500">*</span></label>
                <input name="email" type="email" value={form.email} onChange={handleChange} className={`input ${fieldErrors.email ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`} placeholder="contact@center.com" />
                {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Website</label>
                <input name="website" value={form.website} onChange={handleChange} className="input" placeholder="https://…" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Accreditation <span className="text-red-500">*</span></label>
                <select name="accreditation" value={form.accreditation} onChange={handleChange} className={`select ${fieldErrors.accreditation ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`}>
                  <option value="">Select accreditation…</option>
                  <option value="ACR">ACR (American College of Radiology)</option>
                  <option value="IAC">IAC</option>
                  <option value="Joint Commission">Joint Commission</option>
                  <option value="ACHC">ACHC</option>
                </select>
                {fieldErrors.accreditation && <p className="text-xs text-red-500 mt-1">{fieldErrors.accreditation}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">NPI Number <span className="text-red-500">*</span></label>
                <input name="npi_number" value={form.npi_number} onChange={handleChange} maxLength={10} className={`input ${fieldErrors.npi_number ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`} placeholder="10-digit NPI" />
                {fieldErrors.npi_number && <p className="text-xs text-red-500 mt-1">{fieldErrors.npi_number}</p>}
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="card">
            <h2 className="font-semibold text-navy mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-teal" /> Address</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <AddressAutocomplete onSelect={handleAddressSelect} />
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Address Line 1 *</label>
                <input name="address_line1" value={form.address_line1} onChange={handleChange} required className="input" placeholder="Street address" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Address Line 2</label>
                <input name="address_line2" value={form.address_line2} onChange={handleChange} className="input" placeholder="Suite, Floor, etc." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">City *</label>
                <input name="city" value={form.city} onChange={handleChange} required className="input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">State *</label>
                  <select name="state" value={form.state} onChange={handleChange} required className="select">
                    <option value="">State</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">ZIP Code *</label>
                  <input name="zip_code" value={form.zip_code} onChange={handleChange} required className="input" maxLength={10} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Latitude <span className="font-normal text-gray-400">(for distance search)</span></label>
                <input name="latitude" type="number" step="any" value={form.latitude} onChange={handleChange} className="input" placeholder="33.1584" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Longitude</label>
                <input name="longitude" type="number" step="any" value={form.longitude} onChange={handleChange} className="input" placeholder="-96.8236" />
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="card">
            <h2 className="font-semibold text-navy mb-4">Scheduling & Settings</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Typical Wait (days)</label>
                <input name="typical_wait_days" type="number" min={0} max={30} value={form.typical_wait_days} onChange={handleChange} className="input" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Hours of Operation <span className="font-normal text-gray-400">(optional JSON)</span></label>
                <input name="hours_of_operation" value={form.hours_of_operation} onChange={handleChange} className="input" placeholder='{"Mon-Fri": "7am-6pm", "Sat": "8am-2pm"}' />
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <input type="checkbox" id="is_active" name="is_active" checked={form.is_active} onChange={handleChange} className="w-4 h-4 rounded border-gray-300 text-teal" />
                <div>
                  <label htmlFor="is_active" className="text-sm font-medium text-navy cursor-pointer">Active</label>
                  <p className="text-xs text-gray-500">Center is visible in search results</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <input type="checkbox" id="same_day" name="same_day_appointments" checked={form.same_day_appointments} onChange={handleChange} className="w-4 h-4 rounded border-gray-300 text-teal" />
                <div>
                  <label htmlFor="same_day" className="text-sm font-medium text-navy cursor-pointer">Same-Day Appointments</label>
                  <p className="text-xs text-gray-500">Show "Same-day" badge in results</p>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-xl p-4 text-sm text-teal">
              <CheckCircle className="w-4 h-4" /> {success}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> {isEdit ? 'Save Changes' : 'Create Center'}</>}
            </button>
            <Link to="/admin/centers" className="btn-ghost">Cancel</Link>
          </div>
        </form>
      )}

      {/* Pricing Tab */}
      {activeTab === 'pricing' && isEdit && (
        <div>
          {/* Publish & Notify banner — the single, deliberate email trigger */}
          <div className="bg-brand-mist border border-[#D8E2EC] rounded-xl p-5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              {alreadyNotified ? (
                <>
                  <p className="text-sm font-semibold text-brand-ink mb-0.5 flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-brand-green"></span>
                    This center is live
                  </p>
                  <p className="text-xs text-brand-body">
                    The center has been notified that they're live. If you've updated prices since,
                    resend an email with the current list. {pricedCount > 0 && <span className="font-medium">{pricedCount} procedures priced.</span>}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-brand-ink mb-0.5">Publish pricing & notify the center</p>
                  <p className="text-xs text-brand-body">
                    Set all your prices first, then publish once. This emails the center that they're live —
                    it won't send on every price you save. {pricedCount > 0 && <span className="font-medium">{pricedCount} priced so far.</span>}
                  </p>
                </>
              )}
              {publishMsg && (
                <p className="text-xs mt-2 px-3 py-1.5 rounded-lg bg-white border border-[#D8E2EC] text-brand-ink inline-block">{publishMsg}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {alreadyNotified ? (
                <button
                  onClick={() => handlePublishPricing(true)}
                  disabled={publishing || pricedCount === 0}
                  className="btn-green flex items-center gap-2 text-sm whitespace-nowrap disabled:opacity-50"
                >
                  {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Resend updated pricing
                </button>
              ) : (
                <button
                  onClick={() => handlePublishPricing(false)}
                  disabled={publishing || pricedCount === 0}
                  className="btn-green flex items-center gap-2 text-sm whitespace-nowrap disabled:opacity-50"
                >
                  {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Publish & Notify
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">Set per-protocol prices for this center. Leave blank to use program defaults.</p>
            <input
              type="text"
              placeholder="Filter protocols…"
              value={pricingFilter}
              onChange={e => setPricingFilter(e.target.value)}
              className="input text-sm w-64"
            />
          </div>

          {pricingLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-teal" />
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCatalog.map(modality => (
                <div key={modality.id} className="card overflow-hidden p-0">
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3" style={{ background: modality.color_hex + '33' }}>
                    <span className="text-sm font-bold text-navy">{modality.name}</span>
                    <span className="text-xs text-gray-500">{modality.body_parts?.reduce((a, b) => a + (b.protocols?.length || 0), 0)} protocols</span>
                  </div>
                  {modality.body_parts?.map(bodyPart => (
                    <div key={bodyPart.id}>
                      <div className="px-5 py-2 bg-gray-50 border-b border-gray-100">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{bodyPart.name}</span>
                      </div>
                      {bodyPart.protocols?.map(protocol => {
                        const currentPrice = getPriceForProtocol(protocol.id);
                        const isEditing = editingPrice[protocol.id] !== undefined;
                        return (
                          <div key={protocol.id} className="flex items-center justify-between px-5 py-2.5 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-navy font-medium">{protocol.name}</span>
                              {protocol.requires_contrast && (
                                <span className="ml-2 text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">contrast</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {isEditing ? (
                                <>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={editingPrice[protocol.id]}
                                      onChange={e => setEditingPrice(p => ({ ...p, [protocol.id]: e.target.value }))}
                                      className="input text-sm py-1.5 pl-6 w-28"
                                      autoFocus
                                    />
                                  </div>
                                  <button onClick={() => handlePriceUpdate(protocol.id, editingPrice[protocol.id])} className="btn-primary text-xs py-1.5 px-3">Save</button>
                                  <button onClick={() => setEditingPrice(p => { const n={...p}; delete n[protocol.id]; return n; })} className="btn-ghost text-xs py-1.5 px-3">Cancel</button>
                                </>
                              ) : (
                                <>
                                  <span className={`text-sm font-semibold ${currentPrice ? 'text-navy' : 'text-gray-400'}`}>
                                    {currentPrice ? `$${parseFloat(currentPrice).toFixed(2)}` : 'Not set'}
                                  </span>
                                  <button
                                    onClick={() => setEditingPrice(p => ({ ...p, [protocol.id]: currentPrice || '' }))}
                                    className="text-xs text-teal font-medium hover:underline ml-1"
                                  >
                                    {currentPrice ? 'Edit' : 'Set price'}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
