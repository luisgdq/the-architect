/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#0071E3',
        'primary-dark': '#0062C4',
        surface: '#FFFFFF',
        background: '#F5F5F7',
        'text-primary': '#1D1D1F',
        'text-secondary': '#6E6E73',
        border: '#D2D2D7',
        moving: '#30D158',
        stopped: '#FF9F0A',
        incident: '#FF375F',
        'off-route': '#BF5AF2',
        offline: '#8E8E93',
        success: '#30D158',
        warning: '#FF9F0A',
        danger: '#FF375F',
      },
    },
  },
  plugins: [],
}
