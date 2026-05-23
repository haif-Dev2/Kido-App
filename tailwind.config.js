/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand
        primary: {
          DEFAULT: '#067A6F',
          pressed: '#045E55',
          dark: '#034840',
          soft: '#E8F5F3',
          mid: '#C6E6E0',
        },
        accent: {
          DEFAULT: '#F97362', // coral — love, reviews, heart
          pressed: '#E05A4A',
          soft: '#FFF1EE',
        },
        saffron: {
          DEFAULT: '#F5A524',
          soft: '#FEF6E7',
        },
        // Semantic
        success: { DEFAULT: '#10B981', soft: '#ECFDF5', pressed: '#059669' },
        warning: { DEFAULT: '#F59E0B', soft: '#FFFBEB' },
        danger:  { DEFAULT: '#EF4444', soft: '#FEF2F2', pressed: '#DC2626' },
        // Warm neutrals (ink)
        ink: {
          50:  '#FAFAF7',
          100: '#F5F4EF',
          200: '#EAE7DE',
          300: '#D6D2C5',
          400: '#9E9C92',
          500: '#6B6A62',
          700: '#2E2E2B',
          900: '#141413',
        },
        // Semantic surface tokens (light)
        surface: {
          1: '#FAFAF7',
          2: '#FFFFFF',
          3: '#F5F4EF',
          4: '#E8F5F3',
        },
        text: {
          primary:   '#141413',
          secondary: '#6B6A62',
          muted:     '#9E9C92',
        },
        border: {
          DEFAULT: '#EAE7DE',
          strong:  '#D6D2C5',
        },
      },
      fontFamily: {
        display: ['PlusJakartaSans_700Bold'],
        'display-bold': ['PlusJakartaSans_800ExtraBold'],
        heading: ['PlusJakartaSans_600SemiBold'],
        body: ['Inter_500Medium'],
        'body-semi': ['Inter_600SemiBold'],
        'body-bold': ['Inter_700Bold'],
      },
      borderRadius: {
        xs: '6px',
        sm: '10px',
        md: '14px',
        lg: '20px',
        xl: '28px',
      },
      fontSize: {
        // [size, lineHeight, letterSpacing]
        'display-xl': ['40px', { lineHeight: '48px', letterSpacing: '-0.6px' }],
        display:      ['30px', { lineHeight: '38px', letterSpacing: '-0.4px' }],
        'title-lg':   ['22px', { lineHeight: '28px', letterSpacing: '-0.2px' }],
        title:        ['18px', { lineHeight: '24px', letterSpacing: '-0.1px' }],
        'body-lg':    ['16px', { lineHeight: '24px' }],
        body:         ['14px', { lineHeight: '20px' }],
        'body-sm':    ['13px', { lineHeight: '18px' }],
        caption:      ['12px', { lineHeight: '16px', letterSpacing: '0.2px' }],
        overline:     ['11px', { lineHeight: '14px', letterSpacing: '0.8px' }],
      },
    },
  },
  plugins: [],
};
