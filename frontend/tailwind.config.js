/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── RadiologySave brand tokens (HANDOFF.md §3) ──
        brand: {
          blue:      '#155EAB',
          blueDark:  '#114E8F',
          green:     '#1E9E62',
          greenDark: '#188551',
          ink:       '#1C2B3A',
          body:      '#52606D',
          mist:      '#F2F7FC',
          mint:      '#EEF8F3',
        },
        // ── Legacy token names REMAPPED to brand palette ──
        // Existing pages use navy/teal classes; pointing them at the new
        // brand colors rebrands the whole app without touching every file.
        navy: {
          DEFAULT: '#1C2B3A',   // ink — headlines, dark surfaces
          50:  '#F2F7FC',       // mist
          100: '#D8E2EC',
          500: '#155EAB',       // brand blue
          700: '#114E8F',       // blue hover
          900: '#101D2A',
        },
        teal: {
          DEFAULT: '#1E9E62',   // brand green — action/savings
          50:  '#EEF8F3',       // mint
          100: '#CFE3D9',
          400: '#1E9E62',
          500: '#1E9E62',
          700: '#188551',       // green hover
        },
        gold: '#F0A500',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        // Legacy pages use font-display for headings — now Inter per brand
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        brand: '0 8px 28px rgba(21,94,171,.09)',
      },
      letterSpacing: {
        headline: '-0.025em',
      },
    },
  },
  plugins: [],
};
