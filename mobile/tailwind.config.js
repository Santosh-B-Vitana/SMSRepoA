/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a6fd8',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#1a6fd8',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        accent: {
          DEFAULT: '#17a2b8',
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#17a2b8',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        sidebar: {
          DEFAULT: '#1e293b',
          foreground: '#f8fafc',
          border: '#334155',
          active: '#1a6fd8',
        },
        surface: {
          DEFAULT: '#f5f7fa',
          dark: '#161b22',
        },
      },
      fontFamily: {
        sans: ['Inter', 'System'],
        heading: ['Poppins', 'System'],
      },
    },
  },
  plugins: [],
};
