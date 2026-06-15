import { useParams, Link, useNavigate } from 'react-router-dom';
import { Loader2, MapPin, ShieldCheck, Clock, ArrowRight, AlertCircle } from 'lucide-react';
import { directoryAPI } from '../../utils/api';
import { useSsrData } from '../../utils/useSsrData';
import { useSeo, SITE_URL } from '../../utils/seo';

export default function ProcedureDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useSsrData(async () => (await directoryAPI.getProcedure(slug)).data);
  const notFound = !!error;

  const p = data?.protocol;
  const fullName = p ? `${p.modality_name} — ${p.protocol_name}` : '';

  // Build the booking result object the BookingPage expects, then go book.
  const bookAtCenter = (c) => {
    const result = {
      pricing_id: c.pricing_id,
      protocol_id: c.protocol_id,
      center_id: c.center_id,
      price: c.price,
      center_name: c.name,
      protocol_name: p.protocol_name,
      modality_name: p.modality_name,
      body_part_name: p.body_part_name,
      address_line1: c.address_line1,
      city: c.city,
      state: c.state,
      zip_code: c.zip_code,
    };
    navigate('/booking', { state: { result } });
  };

  useSeo(p ? {
    title: `${fullName} Cash Price${data.starting_price != null ? ` from $${Math.round(data.starting_price)}` : ''} | Radiology Save`,
    description: `Compare cash prices for ${fullName} at ${data.center_count} accredited imaging center${data.center_count !== 1 ? 's' : ''}.${data.starting_price != null ? ` Starting from $${Math.round(data.starting_price)}.` : ''} No insurance required — book online.`,
    canonical: `${SITE_URL}/procedures/${p.slug}`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'MedicalProcedure',
      name: fullName,
      ...(p.description ? { description: p.description } : {}),
      bodyLocation: p.body_part_name,
      category: 'Diagnostic Imaging',
      ...(data.starting_price != null ? {
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'USD',
          lowPrice: Math.round(data.starting_price),
          offerCount: data.center_count,
        },
      } : {}),
    },
  } : { title: 'Imaging Procedure | Radiology Save' });

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="w-7 h-7 animate-spin text-brand-blue" /></div>;

  if (notFound) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-brand-ink mb-2">Procedure not found</h1>
        <Link to="/procedures" className="btn-primary inline-block mt-4">Browse all procedures</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-10">
      <nav className="text-sm text-brand-body mb-4">
        <Link to="/" className="hover:text-brand-blue">Home</Link> <span className="mx-1.5">/</span>
        <Link to="/procedures" className="hover:text-brand-blue">Procedures</Link> <span className="mx-1.5">/</span>
        {p.modality_name}
      </nav>

      <h1 className="text-3xl md:text-4xl font-bold text-brand-ink tracking-headline mb-2">{fullName}</h1>
      <p className="text-brand-body mb-6">{p.body_part_name} · {p.modality_name}{p.duration_minutes ? ` · ~${p.duration_minutes} min` : ''}</p>

      {data.starting_price != null && (
        <div className="bg-brand-mist rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-sm text-brand-body">Cash price for {fullName}</p>
            <p className="text-2xl font-bold text-brand-green">Starting from ${Math.round(data.starting_price)}</p>
            <p className="text-xs text-brand-body mt-0.5">Available at {data.center_count} accredited center{data.center_count !== 1 ? 's' : ''}</p>
          </div>
          <Link to="/search" className="btn-primary whitespace-nowrap">Check prices & book</Link>
        </div>
      )}

      {p.description && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-brand-ink mb-2">About this scan</h2>
          <p className="text-brand-body">{p.description}</p>
        </div>
      )}

      {p.patient_prep_instructions && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-brand-ink mb-2">How to prepare</h2>
          <p className="text-brand-body">{p.patient_prep_instructions}</p>
        </div>
      )}

      <h2 className="text-lg font-bold text-brand-ink mb-4">Centers offering {fullName}</h2>
      <div className="border border-[#E4E8EE] rounded-xl overflow-hidden mb-8">
        {data.centers.map((c, i) => (
          <div key={c.slug}
               className={`flex items-center justify-between gap-3 px-5 py-4 ${i ? 'border-t border-[#E4E8EE]' : ''}`}>
            <div className="min-w-0">
              <p className="font-semibold text-brand-ink text-sm">{c.name}</p>
              <p className="text-xs text-brand-body flex items-center gap-2 mt-0.5 flex-wrap">
                <MapPin className="w-3 h-3" /> {c.city}, {c.state}
                {c.accreditation && <span className="text-brand-blue flex items-center gap-0.5"><ShieldCheck className="w-3 h-3" /> {c.accreditation}</span>}
                {c.same_day_appointments && <span className="text-brand-green flex items-center gap-0.5"><Clock className="w-3 h-3" /> Same-day</span>}
                <Link to={`/centers/${c.slug}`} className="text-brand-blue hover:underline">View center</Link>
              </p>
            </div>
            <div className="flex items-center gap-3 flex-none">
              <span className="text-sm font-bold text-brand-green">${Math.round(c.price)}</span>
              <button onClick={() => bookAtCenter(c)}
                      className="btn-primary text-xs px-3 py-1.5 whitespace-nowrap flex items-center gap-1">
                Book this scan <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-brand-body">
        Prices shown are self-pay cash rates and may change. A physician's referral is required for all imaging studies.
        Radiology Save is not insurance and is not a healthcare provider.
      </p>
    </div>
  );
}
