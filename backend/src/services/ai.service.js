/**
 * AI Service — Claude API integration
 *
 * Two capabilities:
 *  1. scanFinder(text, catalog)       → maps plain-English input to catalog protocols
 *  2. extractReferral(base64, type)   → extracts physician order details from image/PDF
 *
 * Requires ANTHROPIC_API_KEY in .env
 * Get a key at: https://console.anthropic.com
 */
const axios = require('axios');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
// Default updated to a current model string (the old dated Sonnet 4 string 404s)
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

function getHeaders() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw Object.assign(
      new Error('AI features are not configured. Set ANTHROPIC_API_KEY in backend/.env'),
      { statusCode: 503 }
    );
  }
  return {
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  };
}

/**
 * Translate Anthropic API errors into clear, actionable messages
 * instead of raw axios stack traces.
 */
function handleAnthropicError(err) {
  const status = err.response?.status;
  const apiMsg = err.response?.data?.error?.message || err.message;

  if (status === 404) {
    throw Object.assign(
      new Error(`AI model not found: ${apiMsg}. Set ANTHROPIC_MODEL in backend/.env to a current model (e.g. claude-sonnet-4-6).`),
      { statusCode: 502 }
    );
  }
  if (status === 401 || status === 403) {
    throw Object.assign(
      new Error('Invalid or unauthorized ANTHROPIC_API_KEY. Check backend/.env.'),
      { statusCode: 502 }
    );
  }
  if (status === 429) {
    throw Object.assign(
      new Error('Anthropic API rate limit reached. Try again shortly.'),
      { statusCode: 429 }
    );
  }
  if (status === 400) {
    throw Object.assign(
      new Error(`AI request rejected: ${apiMsg}`),
      { statusCode: 502 }
    );
  }
  if (status >= 500) {
    throw Object.assign(
      new Error('Anthropic API is temporarily unavailable. Try again shortly.'),
      { statusCode: 503 }
    );
  }
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
    throw Object.assign(
      new Error('AI request timed out. Try again.'),
      { statusCode: 504 }
    );
  }
  throw Object.assign(new Error(`AI service error: ${apiMsg}`), { statusCode: 502 });
}

/**
 * Strip markdown fences and parse JSON safely from a model response.
 */
function parseModelJson(text) {
  const clean = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch (e) {
    // Try to find the first {...} block
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw Object.assign(new Error('AI returned an unparseable response'), { statusCode: 502 });
  }
}

/**
 * 1. SCAN FINDER
 * Maps free text ("my doctor ordered an MRI of my lower back without dye"
 * or "knee pain after running") to protocols in the catalog.
 *
 * @param {string} userText - The patient's free-text input
 * @param {Array}  catalog  - Flat list: [{ protocol_id, protocol_name, body_part_name, modality_name }]
 * @returns {Object} { match_type, matches: [{protocol_id, confidence, reason}], disclaimer, needs_physician_order }
 */
async function scanFinder(userText, catalog) {
  // Build a compact catalog string the model can match against
  const catalogLines = catalog
    .map((c) => `${c.protocol_id}|${c.modality_name}|${c.body_part_name}|${c.protocol_name}`)
    .join('\n');

  const systemPrompt = `You are a scan-matching assistant for a diagnostic imaging marketplace. Your ONLY job is to map patient input to imaging protocols from the provided catalog.

STRICT RULES:
1. NEVER diagnose, recommend treatment, or suggest which scan a patient SHOULD get based on symptoms.
2. If the input contains a physician's order or names a specific scan (e.g. "MRI lumbar spine without contrast"), map it to the closest catalog protocol(s). This is match_type "order".
3. If the input only describes symptoms (e.g. "my knee hurts"), return the protocols doctors COMMONLY order for that body area as informational options only. This is match_type "symptom". Set needs_physician_order to true.
4. If the input is unrelated to medical imaging, return match_type "unrelated" with empty matches.
5. Return at most 5 matches, ordered by relevance.
6. Respond ONLY with valid JSON. No markdown, no preamble.

CATALOG FORMAT: protocol_id|modality|body_part|protocol_name

RESPONSE SCHEMA:
{
  "match_type": "order" | "symptom" | "unrelated",
  "matches": [
    { "protocol_id": "<uuid from catalog>", "confidence": "high" | "medium" | "low", "reason": "<one short sentence>" }
  ],
  "needs_physician_order": <boolean>,
  "clarifying_note": "<optional: one sentence if input was ambiguous, e.g. contrast not specified>"
}`;

  let data;
  try {
    ({ data } = await axios.post(
      ANTHROPIC_API_URL,
      {
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `CATALOG:\n${catalogLines}\n\nPATIENT INPUT:\n${userText}`,
          },
        ],
      },
      { headers: getHeaders(), timeout: 30000 }
    ));
  } catch (err) {
    handleAnthropicError(err);
  }

  const text = data.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  return parseModelJson(text);
}

/**
 * 2. REFERRAL EXTRACTION
 * Extracts structured order details from an uploaded physician referral
 * (image or PDF, base64-encoded).
 *
 * @param {string} base64Data - base64 file content (no data: prefix)
 * @param {string} mediaType  - e.g. 'image/jpeg', 'image/png', 'application/pdf'
 * @param {Array}  catalog    - same flat catalog as scanFinder
 * @returns {Object} extracted fields + best protocol match
 */
async function extractReferral(base64Data, mediaType, catalog) {
  const catalogLines = catalog
    .map((c) => `${c.protocol_id}|${c.modality_name}|${c.body_part_name}|${c.protocol_name}`)
    .join('\n');

  const systemPrompt = `You are a medical referral extraction assistant. Extract order details from the physician referral document and match the ordered study to the catalog.

RULES:
1. Extract ONLY what is visibly written. Use null for fields you cannot find.
2. Match the ordered study to the closest catalog protocol_id. If no clear match, set protocol_id to null.
3. Do not guess or infer diagnosis information beyond what is written.
4. Respond ONLY with valid JSON. No markdown, no preamble.

CATALOG FORMAT: protocol_id|modality|body_part|protocol_name

RESPONSE SCHEMA:
{
  "patient_first_name": "<string or null>",
  "patient_last_name": "<string or null>",
  "patient_dob": "<YYYY-MM-DD or null>",
  "referring_physician": "<string or null>",
  "physician_npi": "<string or null>",
  "physician_phone": "<string or null>",
  "ordered_study_text": "<exactly what the order says, or null>",
  "cpt_code": "<string or null>",
  "icd10_codes": ["<codes if present>"],
  "clinical_indication": "<reason for exam as written, or null>",
  "contrast_specified": "with" | "without" | "with_and_without" | null,
  "matched_protocol_id": "<uuid from catalog or null>",
  "match_confidence": "high" | "medium" | "low" | null,
  "extraction_notes": "<one sentence on anything unclear, or null>"
}`;

  // PDF uses 'document' content type; images use 'image'
  const fileBlock =
    mediaType === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Data } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } };

  let data;
  try {
    ({ data } = await axios.post(
      ANTHROPIC_API_URL,
      {
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              fileBlock,
              { type: 'text', text: `CATALOG:\n${catalogLines}\n\nExtract the referral details and match to the catalog.` },
            ],
          },
        ],
      },
      { headers: getHeaders(), timeout: 60000 }
    ));
  } catch (err) {
    handleAnthropicError(err);
  }

  const text = data.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  return parseModelJson(text);
}

module.exports = { scanFinder, extractReferral };
