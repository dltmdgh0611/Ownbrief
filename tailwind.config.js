/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './frontend/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e8f5f0',
          100: '#d1ebe1',
          200: '#a3d7c3',
          300: '#75c3a5',
          400: '#47af87',
          500: '#1C543E',  // 메인 브랜드 컬러
          600: '#194838',
          700: '#163c32',
          800: '#13302c',
          900: '#0f2420',
        },
        brand: {
          DEFAULT: '#1C543E',
          light: '#2d6b4f',
          dark: '#0f2e22',
        },
      },
      scale: {
        '98': '0.98',
      },
    },
  },
  plugins: [],
}