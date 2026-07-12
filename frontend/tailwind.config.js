/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        surface: {
          base: '#0B0B0F',
          card: '#15151B',
          elevated: '#1C1C24',
        },
        border: {
          hairline: 'rgba(255, 255, 255, 0.08)',
          subtle: 'rgba(255, 255, 255, 0.12)',
        },
        content: {
          primary: '#F1F5F9',
          muted: '#94A3B8',
          inverse: '#0B0B0F',
        },
        accent: {
          DEFAULT: '#D97706',
          hover: '#F59E0B',
          muted: 'rgba(217, 119, 6, 0.15)',
        },
        status: {
          available: '#16A34A',
          'on-trip': '#2563EB',
          'in-shop': '#D97706',
          retired: '#DC2626',
          'available-bg': 'rgba(22, 163, 74, 0.15)',
          'on-trip-bg': 'rgba(37, 99, 235, 0.15)',
          'in-shop-bg': 'rgba(217, 119, 6, 0.15)',
          'retired-bg': 'rgba(220, 38, 38, 0.15)',
        },
      },
      borderRadius: {
        DEFAULT: '10px',
        token: '10px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3)',
        elevated: '0 4px 12px rgba(0, 0, 0, 0.5)',
        glow: '0 0 20px rgba(217, 119, 6, 0.2)',
      },
    },
  },
  plugins: [],
};
