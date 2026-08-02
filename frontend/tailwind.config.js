module.exports = {
  darkMode: 'class', // ← TAMBAHKAN INI
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#1a1a2e',
          card: '#16213e',
          text: '#e2e8f0',
          border: '#2d3748',
        }
      }
    },
  },
  plugins: [],
}