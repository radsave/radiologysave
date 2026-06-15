import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowRight } from 'lucide-react';
import { directoryAPI } from '../../utils/api';
import { useSeo, SITE_URL } from '../../utils/seo';

export default function ProceduresDirectoryPage() {
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    directoryAPI.listProcedures().then(r => setProcedures(r.data.procedures)).finally(() => setLoading(false));
  }, []);

  // Group by modality
  const byModality = {};
  for (const p of procedures) {
    (byModality[p.modality_name] = byModality[p.modality_name] || []).push(p);
  }

  useSeo({
    title: 'Imaging Procedures & Cash Prices — MRI, CT, Ultrasound | Radiology Save',
    description: 'Browse diagnostic imaging procedures with transparent starting cash prices. Find MRI, CT, ultrasound, X-ray, mammogram and more at accredited centers near you.',
    canonical: `${SITE_URL}/procedures`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Imaging Procedures on Radiology Save',
      itemListElement: procedures.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_URL}/procedures/${p.protocol_slug}`,
        name: `${p.modality_name} ${p.protocol_name}`,
      })),
    },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-10">
      <nav className="text-sm text-brand-body mb-4">
        <Link to="/" className="hover:text-brand-blue">Home</Link> <span className="mx-1.5">/</span> Procedures
      </nav>
      <h1 className="text-3xl md:text-4xl font-bold text-brand-ink tracking-headline mb-3">Imaging Procedures & Prices</h1>
      <p className="text-brand-body max-w-2xl mb-8">
        Browse diagnostic imaging procedures with transparent starting cash prices. Click any procedure
        to see which accredited centers offer it and compare upfront pricing.
      </p>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-brand-blue" /></div>
      ) : (
        Object.keys(byModality).map(modality => (
          <section key={modality} className="mb-8">
            <h2 className="text-lg font-bold text-brand-ink mb-4 pb-2 border-b border-[#E4E8EE]">{modality}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {byModality[modality].map(p => (
                <Link key={p.protocol_slug} to={`/procedures/${p.protocol_slug}`}
                      className="card hover:border-brand-blue transition-colors group flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-brand-ink text-sm group-hover:text-brand-blue">{p.protocol_name}</h3>
                    <p className="text-xs text-brand-body mt-0.5">
                      {p.body_part_name}
                      {Number(p.center_count) > 0 && ` · ${p.center_count} center${Number(p.center_count) > 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <div className="text-right flex-none">
                    {p.starting_price != null && <p className="text-sm font-bold text-brand-green">from ${Math.round(p.starting_price)}</p>}
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-blue inline-block mt-1" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}

      <div className="bg-brand-mist rounded-xl p-6 text-center mt-8">
        <p className="text-brand-ink font-semibold mb-1">Prefer to browse by location?</p>
        <Link to="/centers" className="inline-flex items-center gap-1.5 text-brand-blue font-medium text-sm hover:gap-2.5 transition-all">
          See all imaging centers <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
