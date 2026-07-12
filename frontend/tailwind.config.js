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
          base: 'var(--color-surface-base)',
          card: 'var(--color-surface-card)',
          elevated: 'var(--color-surface-elevated)',
        },
        border: {
          hairline: 'var(--color-border-hairline)',
          subtle: 'var(--color-border-subtle)',
        },
        content: {
          primary: 'var(--color-content-primary)',
          muted: 'var(--color-content-muted)',
          inverse: 'var(--color-content-inverse)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          muted: 'var(--color-accent-muted)',
        },
        status: {
          available: 'var(--color-status-available)',
          'on-trip': 'var(--color-status-on-trip)',
          'in-shop': 'var(--color-status-in-shop)',
          retired: 'var(--color-status-retired)',
          'available-bg': 'var(--color-status-available-bg)',
          'on-trip-bg': 'var(--color-status-on-trip-bg)',
          'in-shop-bg': 'var(--color-status-in-shop-bg)',
          'retired-bg': 'var(--color-status-retired-bg)',
        },
      },
      borderRadius: {
        DEFAULT: '10px',
        token: '10px',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        elevated: 'var(--shadow-elevated)',
        glow: '0 0 20px var(--color-accent-muted)',
      },
    },
  },
  plugins: [],
};
//done