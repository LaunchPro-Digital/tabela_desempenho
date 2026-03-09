import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './index.tsx',
    './**/*.{ts,tsx}',
    '!./node_modules/**',
    '!./dist/**',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#9A11E9',
          purpleDark: '#7F2DC1',
          green: '#00A47B',
          greenDark: '#006653',
          grey: '#6A6A6A',
          black: '#000000',
          offWhite: '#F8FAFC',
          darkBg: '#0f172a',
          darkCard: '#1e293b',
          darkBorder: '#334155',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
