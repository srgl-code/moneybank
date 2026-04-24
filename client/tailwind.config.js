/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        headline: ["'Space Grotesk'", 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ["'Plus Jakarta Sans'", 'ui-sans-serif', 'system-ui', 'sans-serif'],
        label: ["'Plus Jakarta Sans'", 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#14b8a6',
          container: '#0d9488',
          fixed: '#ccfbf1',
          'fixed-dim': '#2dd4bf',
        },
        secondary: {
          DEFAULT: '#f97316',
          container: '#ea580c',
          fixed: '#ffedd5',
          'fixed-dim': '#fb923c',
        },
        tertiary: {
          DEFAULT: '#fbbf24',
          container: '#f59e0b',
          fixed: '#fef3c7',
          'fixed-dim': '#fcd34d',
        },
        surface: {
          DEFAULT: '#ffffff',
          dim: '#f8fafc',
          bright: '#ffffff',
          'container-lowest': '#ffffff',
          'container-low': '#f8fafc',
          container: '#f1f5f9',
          'container-high': '#e2e8f0',
          'container-highest': '#cbd5e1',
        },
        'on-surface': {
          DEFAULT: '#0f172a',
          variant: '#475569',
        },
        'on-primary': {
          DEFAULT: '#ffffff',
          container: '#ccfbf1',
        },
        'on-secondary': {
          DEFAULT: '#ffffff',
          container: '#ffedd5',
        },
        'on-tertiary': {
          DEFAULT: '#ffffff',
          container: '#fef3c7',
        },
        outline: {
          DEFAULT: '#cbd5e1',
          variant: '#e2e8f0',
        },
        error: {
          DEFAULT: '#ef4444',
          container: 'rgba(239, 68, 68, 0.1)',
        },
        success: {
          DEFAULT: '#10b981',
          container: 'rgba(16, 185, 129, 0.1)',
        },
        'inverse-surface': '#1e293b',
        'inverse-on-surface': '#f8fafc',
        'inverse-primary': '#2dd4bf',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'card': '0 4px 12px rgba(0,0,0,0.05)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.08)',
        'elevated': '0 10px 40px -10px rgba(0,0,0,0.1)',
        'header': '0 4px 20px rgba(0,0,0,0.04)',
        'nav': '0 -8px 24px rgba(0,0,0,0.06)',
        'button': '0 4px 16px rgba(0,0,0,0.15)',
        'button-orange': '0 4px 16px rgba(249,115,22,0.15)',
        'button-gold': '0 4px 16px rgba(251,191,36,0.15)',
        'glow-teal': '0 0 20px rgba(20,184,166,0.15)',
        'glow-orange': '0 0 20px rgba(249,115,22,0.15)',
        'glow-gold': '0 0 20px rgba(251,191,36,0.15)',
        'glow-coral': '0 0 20px rgba(244,63,94,0.15)',
      },
      animation: {
        'fade-up': 'fadeUp 0.4s cubic-bezier(.22,1,.36,1) both',
        'slide-in-right': 'slideInRight 0.32s cubic-bezier(.22,1,.36,1) both',
        'scale-in': 'scaleIn 0.28s cubic-bezier(.22,1,.36,1) both',
        'spin-slow': 'spin 0.7s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s ease-in-out infinite',
        'pulse-dot': 'pulseDot 1.4s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(40px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.93)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(20,184,166,0.15)' },
          '50%': { boxShadow: '0 0 40px rgba(20,184,166,0.3)' },
        },
      },
    },
  },
  plugins: [],
};
