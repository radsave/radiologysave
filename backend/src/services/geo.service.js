const axios = require('axios');

// Hardcoded fallback coords for demo/dev without a working Google key
const FALLBACK_ZIPS = {
  '75035': { lat: 33.1584, lng: -96.8236, city: 'Frisco', state: 'TX' },
  '75034': { lat: 33.1501, lng: -96.8021, city: 'Frisco', state: 'TX' },
  '75024': { lat: 33.0748, lng: -96.8245, city: 'Plano', state: 'TX' },
  '75069': { lat: 33.1972, lng: -96.6397, city: 'McKinney', state: 'TX' },
  '75251': { lat: 32.9278, lng: -96.7894, city: 'Dallas', state: 'TX' },
  '75001': { lat: 32.9776, lng: -96.8386, city: 'Addison', state: 'TX' },
};
const GENERIC_DFW = { lat: 32.8998, lng: -96.8853, city: 'Dallas', state: 'TX' };

function fallbackFor(zipCode) {
  return FALLBACK_ZIPS[zipCode] || GENERIC_DFW;
}

/**
 * Convert a US zip code to lat/lng using Google Geocoding API.
 * Degrades gracefully: any key/quota/availability problem falls back to
 * approximate coordinates instead of failing the search.
 */
async function geocodeZip(zipCode) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  // No key, or placeholder never replaced → use fallback silently
  if (!apiKey || apiKey.startsWith('YOUR_')) {
    return fallbackFor(zipCode);
  }

  let data;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${zipCode}&key=${apiKey}&components=country:US`;
    ({ data } = await axios.get(url, { timeout: 8000 }));
  } catch (err) {
    // Network/timeout — don't fail the search
    console.warn(`[geo] Geocoding request failed (${err.message}) — using fallback coords`);
    return fallbackFor(zipCode);
  }

  // Key problems / quota → log the real reason, fall back
  if (['REQUEST_DENIED', 'OVER_QUERY_LIMIT', 'OVER_DAILY_LIMIT', 'INVALID_REQUEST'].includes(data.status)) {
    console.warn(`[geo] Google Geocoding ${data.status}: ${data.error_message || 'no detail'} — using fallback coords. Check GOOGLE_MAPS_API_KEY (Geocoding API enabled? billing active? key restrictions?).`);
    return fallbackFor(zipCode);
  }

  // Genuinely unknown ZIP — this is the only case that should 400
  if (data.status === 'ZERO_RESULTS' || !data.results.length) {
    throw Object.assign(new Error(`ZIP code not found: ${zipCode}`), { statusCode: 400 });
  }

  const result = data.results[0];
  const { lat, lng } = result.geometry.location;
  const components = result.address_components;
  const city = components.find(c => c.types.includes('locality'))?.long_name
            || components.find(c => c.types.includes('postal_town'))?.long_name || '';
  const state = components.find(c => c.types.includes('administrative_area_level_1'))?.short_name || '';
  return { lat, lng, city, state };
}

/**
 * Haversine distance between two lat/lng points in miles
 */
function distanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = { geocodeZip, distanceMiles };
