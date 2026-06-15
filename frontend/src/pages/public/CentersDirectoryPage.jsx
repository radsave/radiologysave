import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, MapPin, ShieldCheck, ArrowRight } from 'lucide-react';
import { directoryAPI } from '../../utils/api';
import { useSeo, SITE_URL } from '../../utils/seo';

export default function CentersDirectoryPage() {
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    directoryAPI.listCenters().then(r => setCenters(r.data.centers)).finally(() => setLoading(false));
  }, []);

  // Group by state → city for a crawlable, structured listing
  const byState = {};
  for (const c of centers) {
    (byState[c.state] = byState[c.state] || []).push(c);
  }

  useSeo({
    title: 'Imaging Centers Directory — Compare Cash Prices | Radiology Save',
    description: 'Browse accredited imaging centers offering transparent cash prices for MRI, CT, ultrasound, X-ray and more. Compare upfront prices and book online.',
    canonical: `${SITE_URL}/centers`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Imaging Centers on Radiology Save',
      itemListElement: centers.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_URL}/centers/${c.slug}`,
        name: c.name,
      })),
    },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-10">
      <nav className="text-sm text-brand-body mb-4">
        <Link to="/" className="hover:text-brand-blue">Home</Link> <span className="mx-1.5">/</span> Imaging Centers
      </nav>
      <h1 className="text-3xl md:text-4xl font-bold text-brand-ink tracking-headline mb-3">Imaging Centers Directory</h1>
      <p className="text-brand-body max-w-2xl mb-8">
        Browse accredited diagnostic imaging centers offering transparent cash prices.
        Each center lists upfront pricing for MRI, CT, ultrasound, X-ray and more — no insurance required.
      </p>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-brand-blue" /></div>
      ) : (
        Object.keys(byState).sort().map(state => (
          <section key={state} className="mb-10">
            <h2 className="text-lg font-bold text-brand-ink mb-4 pb-2 border-b border-[#E4E8EE]">{state}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {byState[state].map(c => (
                <Link key={c.slug} to={`/centers/${c.slug}`}
                      className="card hover:border-brand-blue transition-colors group">
                  <h3 className="font-semibold text-brand-ink mb-1 group-hover:text-brand-blue">{c.name}</h3>
                  <p className="text-sm text-brand-body flex items-center gap-1.5 mb-2">
                    <MapPin className="w-3.5 h-3.5" /> {c.city}, {c.state} {c.zip_code}
                  </p>
                  <div className="flex items-center gap-3 text-xs">
                    {c.accreditation && (
                      <span className="inline-flex items-center gap-1 text-brand-blue font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" /> {c.accreditation}
                      </span>
                    )}
                    {Number(c.procedure_count) > 0 && (
                      <span className="text-brand-body">{c.procedure_count} procedures priced</span>
                    )}
                  </div>
                  {c.starting_price != null && (
                    <p className="text-sm font-semibold text-brand-green mt-3">
                      Starting from ${Math.round(c.starting_price)}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        ))
      )}

      <div className="bg-brand-mist rounded-xl p-6 text-center mt-8">
        <p className="text-brand-ink font-semibold mb-1">Looking for a specific scan?</p>
        <Link to="/procedures" className="inline-flex items-center gap-1.5 text-brand-blue font-medium text-sm hover:gap-2.5 transition-all">
          Browse procedures by type <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
