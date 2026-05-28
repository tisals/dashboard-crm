/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Override slate palette — CSS variables enable dark/light switch
        slate: {
          50: 'var(--slate-50, #f8fafc)',
          100: 'var(--slate-100, #f1f5f9)',
          200: 'var(--slate-200, #e2e8f0)',
          300: 'var(--slate-300, #cbd5e1)',
          400: 'var(--slate-400, #94a3b8)',
          500: 'var(--slate-500, #64748b)',
          600: 'var(--slate-600, #475569)',
          700: 'var(--slate-700, #334155)',
          800: 'var(--slate-800, #1e293b)',
          900: 'var(--slate-900, #0f172a)',
          950: 'var(--slate-950, #020617)',
        },
        teal: {
          300: 'var(--teal-300, #5eead4)',
          400: 'var(--teal-400, #2dd4bf)',
          500: 'var(--teal-500, #14b8a6)',
          600: 'var(--teal-600, #0d9488)',
          700: 'var(--teal-700, #0f766e)',
          800: 'var(--teal-800, #115e59)',
        },
        emerald: {
          400: 'var(--emerald-400, #34d399)',
          500: 'var(--emerald-500, #10b981)',
          600: 'var(--emerald-600, #059669)',
          900: 'var(--emerald-900, #064e3b)',
        },
        red: {
          400: 'var(--red-400, #f87171)',
          500: 'var(--red-500, #ef4444)',
          600: 'var(--red-600, #dc2626)',
        },
      },
      borderRadius: {
        'xl': '2rem',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
