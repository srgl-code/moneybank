/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ["'Space Grotesk'", 'ui-sans-serif', 'system-ui', 'sans-serif'],
        headline: ["'Space Grotesk'", 'sans-serif'],
        body: ["'Plus Jakarta Sans'", 'sans-serif'],
        label: ["'Plus Jakarta Sans'", 'sans-serif'],
        mono: ["'Space Grotesk'", 'ui-monospace', 'monospace'],
      },
      colors: {
        /* === Prestige Ledger – Material 3 Tonal Palette === */
        primary:                { DEFAULT: '#006a46', container: '#00855a', fixed: '#8bf8c2', 'fixed-dim': '#6edba7' },
        'on-primary':           { DEFAULT: '#ffffff', container: '#f5fff6', fixed: '#002113', 'fixed-variant': '#005235' },
        secondary:              { DEFAULT: '#b6171e', container: '#da3433', fixed: '#ffdad6', 'fixed-dim': '#ffb3ac' },
        'on-secondary':         { DEFAULT: '#ffffff', container: '#fffbff', fixed: '#410003', 'fixed-variant': '#930010' },
        tertiary:               { DEFAULT: '#755700', container: '#946f00', fixed: '#ffdf9e', 'fixed-dim': '#fabd00' },
        'on-tertiary':          { DEFAULT: '#ffffff', container: '#fffbff', fixed: '#261a00', 'fixed-variant': '#5b4300' },
        error:                  { DEFAULT: '#ba1a1a', container: '#ffdad6' },
        'on-error':             { DEFAULT: '#ffffff', container: '#93000a' },
        surface: {
          DEFAULT:              '#fcf9f8',
          dim:                  '#dcd9d9',
          bright:               '#fcf9f8',
          'container-lowest':   '#ffffff',
          'container-low':      '#f6f3f2',
          container:            '#f0eded',
          'container-high':     '#eae7e7',
          'container-highest':  '#e5e2e1',
          variant:              '#e5e2e1',
          tint:                 '#006c48',
        },
        'on-surface':           { DEFAULT: '#1b1c1c', variant: '#3e4942' },
        background:             '#fcf9f8',
        'on-background':        '#1b1c1c',
        outline:                { DEFAULT: '#6e7a72', variant: '#bdcac0' },
        'inverse-surface':      '#303030',
        'inverse-on-surface':   '#f3f0ef',
        'inverse-primary':      '#6edba7',

        /* Legacy compat aliases */
        neutral: { DEFAULT: '#212121' },
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg:      '0.5rem',
        xl:      '0.75rem',
        '2xl':   '1rem',
        '3xl':   '1.5rem',
        full:    '9999px',
      },
      animation: {
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'fade-in':        'fadeIn 0.2s ease-out',
        'pulse-soft':     'pulseSoft 2s infinite',
        'spring-up':      'springUp 0.5s cubic-bezier(.22,1,.36,1) both',
        'fade-up':        'fadeUp 0.35s cubic-bezier(.22,1,.36,1) both',
        'scale-in':       'scaleIn 0.28s cubic-bezier(.22,1,.36,1) both',
      },
      keyframes: {
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to:   { transform: 'translateX(0)',    opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.93)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        springUp: {
          from: { transform: 'translateY(20px) scale(0.95)', opacity: '0' },
          to:   { transform: 'translateY(0) scale(1)',       opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};
