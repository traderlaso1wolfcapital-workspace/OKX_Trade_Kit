/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0B1220',
        'dark-panel': '#101827',
        'dark-surface': '#182235',
        'accent-green': '#00E5A8',
        'accent-blue': '#3B82F6',
        'accent-red': '#EF4444',
        'text-primary': '#FFFFFF',
        'text-secondary': '#94A3B8',
        'border': 'rgba(255, 255, 255, 0.1)'
      }
    },
  },
  plugins: [],
}
