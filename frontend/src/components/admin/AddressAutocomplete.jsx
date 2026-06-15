import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';

/**
 * AddressAutocomplete — Google Places Autocomplete (NEW API).
 *
 * Uses google.maps.places.PlaceAutocompleteElement (the modern replacement
 * for the deprecated Autocomplete widget). Requires only **Places API (New)**
 * + **Maps JavaScript API** enabled on the key.
 *
 * On selection it parses the place into structured fields and calls
 * onSelect({ address_line1, city, state, zip_code, latitude, longitude }).
 *
 * Requires VITE_GOOGLE_MAPS_API_KEY in frontend/.env.
 * Degrades gracefully: renders nothing if the key is missing or the script
 * fails to load (admin fills the address fields manually).
 */

let scriptPromise = null; // load the script only once across mounts

function loadGoogleMaps(apiKey) {
  // Already fully loaded
  if (window.google?.maps?.importLibrary) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    // A script tag may already exist (e.g. after a hard page load) but not
    // yet be ready — attach to it instead of injecting a duplicate.
    const existing = document.querySelector('script[data-google-maps]');
    if (existing) {
      const check = () => {
        if (window.google?.maps?.importLibrary) resolve();
        else setTimeout(check, 100);
      };
      check();
      return;
    }

    const s = document.createElement('script');
    s.dataset.googleMaps = 'true';
    // loading=async is the recommended bootstrap for the new API
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&v=weekly`;
    s.async = true;
    s.defer = true;
    s.onload = () => {
      // importLibrary may not be ready the instant onload fires — poll briefly
      const check = (n = 0) => {
        if (window.google?.maps?.importLibrary) resolve();
        else if (n < 50) setTimeout(() => check(n + 1), 100);
        else reject(new Error('Google Maps loaded but importLibrary unavailable'));
      };
      check();
    };
    s.onerror = () => { scriptPromise = null; reject(new Error('Failed to load Google Maps script')); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

// Pull structured fields out of a fetched Place (new API shape)
function parsePlace(place) {
  const comps = place.addressComponents || [];
  const get = (type, key = 'longText') =>
    comps.find((c) => c.types.includes(type))?.[key] || '';

  const streetNumber = get('street_number');
  const route = get('route');
  const address_line1 = [streetNumber, route].filter(Boolean).join(' ');
  const city = get('locality') || get('postal_town') || get('sublocality') || '';
  const state = get('administrative_area_level_1', 'shortText');
  const zip_code = get('postal_code');

  // location is a LatLng; lat()/lng() are functions
  const lat = place.location?.lat;
  const lng = place.location?.lng;
  const latitude = typeof lat === 'function' ? lat() : (lat ?? '');
  const longitude = typeof lng === 'function' ? lng() : (lng ?? '');

  return { address_line1, city, state, zip_code, latitude, longitude };
}

export default function AddressAutocomplete({ onSelect }) {
  const containerRef = useRef(null);
  const elementRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | unavailable

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    let cancelled = false;

    if (!apiKey || apiKey.startsWith('YOUR_')) {
      setStatus('unavailable');
      return;
    }

    setStatus('loading');
    loadGoogleMaps(apiKey)
      .then(async () => {
        if (cancelled) return;
        const { PlaceAutocompleteElement } = await google.maps.importLibrary('places');
        if (cancelled || !containerRef.current) return;

        // Create the new web-component autocomplete element
        const el = new PlaceAutocompleteElement({
          componentRestrictions: { country: ['us'] },
        });
        el.id = 'rs-place-autocomplete';
        elementRef.current = el;
        containerRef.current.appendChild(el);

        // gmp-select fires when the user picks a prediction
        el.addEventListener('gmp-select', async ({ placePrediction }) => {
          try {
            const place = placePrediction.toPlace();
            await place.fetchFields({
              fields: ['addressComponents', 'location', 'formattedAddress'],
            });
            onSelect(parsePlace(place));
          } catch (err) {
            console.warn('[autocomplete] failed to fetch place details:', err);
          }
        });

        setStatus('ready');
      })
      .catch(() => { if (!cancelled) setStatus('unavailable'); });

    return () => {
      cancelled = true;
      if (elementRef.current && elementRef.current.parentNode) {
        elementRef.current.parentNode.removeChild(elementRef.current);
      }
      elementRef.current = null;
    };
  }, [apiKey]);

  // If autocomplete can't load, render nothing — manual fields still work.
  if (status === 'unavailable') return null;

  return (
    <div className="md:col-span-2 mb-1">
      <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
        <Search className="w-3.5 h-3.5 text-brand-blue" />
        Search address {status === 'loading' && <span className="text-gray-400 font-normal">(loading…)</span>}
      </label>
      {/* The PlaceAutocompleteElement web component is appended here */}
      <div ref={containerRef} className="rs-autocomplete-host" />
      <p className="text-xs text-gray-400 mt-1">
        Select a suggestion to auto-fill the address fields and map coordinates below.
      </p>
    </div>
  );
}
