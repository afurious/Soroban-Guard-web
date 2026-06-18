import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#6366f1',
          dark: '#4f46e5',
        },
        surface: {
          DEFAULT: '#0f1117',
          card: '#1a1d27',
          border: '#2a2d3a',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      keyframes: {
        'step-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'step-in': 'step-in 0.3s ease-out forwards',
      },
    },
  },
  plugins: [],
}

export default config
