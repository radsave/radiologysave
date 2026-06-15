import { useParams, Link, useNavigate } from 'react-router-dom';
import { Loader2, MapPin, Phone, ShieldCheck, Clock, ArrowRight, AlertCircle } from 'lucide-react';
import { directoryAPI } from '../../utils/api';
import { useSsrData } from '../../utils/useSsrData';
import { useSeo, SITE_URL } from '../../utils/seo';

export default function CenterDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useSsrData(async () => (await directoryAPI.getCenter(slug)).data);
  const notFound = !!error;

  const center = data?.center;

  // Build the booking result object from this center + a chosen procedure row.
  const bookProcedure = (proc) => {
    const result = {
      pricing_id: proc.pricing_id,
      protocol_id: proc.protocol_id,
      center_id: proc.center_id,
      price: proc.price,
      center_name: center.name,
      protocol_name: proc.protocol_name,
      modality_name: proc.modality_name,
      body_part_name: proc.body_part_name,
      address_line1: center.address_line1,
      city: center.city,
      state: center.state,
      zip_code: center.zip_code,
    };
    navigate('/booking', { state: { result } });
  };

  useSeo(center ? {
    title: `${center.name} — Cash Prices for Imaging in ${center.city}, ${center.state} | Radiology Save`,
    description: `${center.name} in ${center.city}, ${center.state} offers transparent cash-pay imaging${data.starting_price != null ? ` starting from $${Math.round(data.starting_price)}` : ''}. Compare prices for MRI, CT, ultrasound and more.`,
    canonical: `${SITE_URL}/centers/${center.slug}`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'MedicalBusiness',
      name: center.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: center.address_line1,
        addressLocality: center.city,
        addressRegion: center.state,
        postalCode: center.zip_code,
        addressCountry: 'US',
      },
      ...(center.phone ? { telephone: center.phone } : {}),
      ...(center.latitude && center.longitude ? {
        geo: { '@type': 'GeoCoordinates', latitude: center.latitude, longitude: center.longitude },
      } : {}),
      url: `${SITE_URL}/centers/${center.slug}`,
      medicalSpecialty: 'Radiology',
      ...(data.starting_price != null ? { priceRange: `From $${Math.round(data.starting_price)}` } : {}),
    },
  } : { title: 'Imaging Center | Radiology Save' });

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="w-7 h-7 animate-spin text-brand-blue" /></div>;

  if (notFound) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-brand-ink mb-2">Center not found</h1>
        <Link to="/centers" className="btn-primary inline-block mt-4">Browse all centers</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-10">
      <nav className="text-sm text-brand-body mb-4">
        <Link to="/" className="hover:text-brand-blue">Home</Link> <span className="mx-1.5">/</span>
        <Link to="/centers" className="hover:text-brand-blue">Centers</Link> <span className="mx-1.5">/</span>
        {center.city}, {center.state}
      </nav>

      <h1 className="text-3xl md:text-4xl font-bold text-brand-ink tracking-headline mb-3">{center.name}</h1>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-brand-body mb-6">
        <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {center.address_line1}, {center.city}, {center.state} {center.zip_code}</span>
        {center.phone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {center.phone}</span>}
        {center.accreditation && <span className="flex items-center gap-1.5 text-brand-blue font-medium"><ShieldCheck className="w-4 h-4" /> {center.accreditation} accredited</span>}
        {center.same_day_appointments && <span className="flex items-center gap-1.5 text-brand-green font-medium"><Clock className="w-4 h-4" /> Same-day available</span>}
      </div>

      {center.description && <p className="text-brand-body mb-6 max-w-2xl">{center.description}</p>}

      <div className="bg-brand-mist rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-sm text-brand-body">Cash prices at this center</p>
          {data.starting_price != null && (
            <p className="text-2xl font-bold text-brand-green">Starting from ${Math.round(data.starting_price)}</p>
          )}
        </div>
        <Link to="/search" className="btn-primary whitespace-nowrap">Check prices & book</Link>
      </div>

      <h2 className="text-xl font-bold text-brand-ink mb-4">Procedures offered at {center.name}</h2>
      {data.modalities.map(group => (
        <section key={group.modality_name} className="mb-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-brand-blue mb-2">
            {group.modality_name} <span className="text-brand-body font-normal normal-case">· from ${Math.round(group.starting_price)}</span>
          </h3>
          <div className="border border-[#E4E8EE] rounded-xl overflow-hidden">
            {group.procedures.map((p, i) => (
              <div key={p.protocol_slug || i}
                   className={`flex items-center justify-between gap-3 px-4 py-3 ${i ? 'border-t border-[#E4E8EE]' : ''}`}>
                <div className="min-w-0">
                  <span className="text-sm text-brand-ink">{p.protocol_name}</span>
                  <Link to={`/procedures/${p.protocol_slug}`} className="text-xs text-brand-blue hover:underline ml-2">details</Link>
                </div>
                <div className="flex items-center gap-3 flex-none">
                  <span className="text-sm font-semibold text-brand-green">${Math.round(p.price)}</span>
                  <button onClick={() => bookProcedure(p)}
                          className="btn-primary text-xs px-3 py-1.5 whitespace-nowrap flex items-center gap-1">
                    Book <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <p className="text-xs text-brand-body mt-8">
        Prices shown are self-pay cash rates and may change. A physician's referral is required for all imaging studies.
        Radiology Save is not insurance and is not a healthcare provider.
      </p>
    </div>
  );
}
