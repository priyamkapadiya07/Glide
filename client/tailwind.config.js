/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        offWhite: '#F7F5F3',
        warmGray: '#8A8583',
        lightGray: '#E5E3E1',
        charcoal: '#2D2D2D',
        softBlush: '#F3E8E6',
        dustyPink: '#D1B8B4',
        roseBeige: '#E2D3D0',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Inter for modern look
      },
      boxShadow: {
        'soft': '0 10px 40px -10px rgba(0,0,0,0.05)',
        'float': '0 20px 40px -15px rgba(0,0,0,0.07)',
      }
    },
  },
  plugins: [],
}
