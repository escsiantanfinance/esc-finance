/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        jakarta: ['Plus Jakarta Sans', 'sans-serif'],
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
      },
      boxShadow: {
        'soft':  '0 4px 24px -4px rgba(79,70,229,0.10)',
        'card':  '0 2px 12px -2px rgba(79,70,229,0.08)',
        'glow':  '0 0 20px rgba(99,102,241,0.35)',
        'inner-sm': 'inset 0 1px 2px rgba(0,0,0,0.06)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        'sidebar-gradient': 'linear-gradient(180deg, #1e1b4b 0%, #2d1b69 50%, #1e1b4b 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(238,242,255,0.6) 100%)',
      },
    },
  },
  plugins: [],
}
