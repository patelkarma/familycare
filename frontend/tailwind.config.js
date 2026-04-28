export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#F5A623',
          dark: '#E8920F',
          light: '#FEF3DC',
        },
        surface: {
          page: 'var(--surface-page)',
          card: 'var(--surface-card)',
          muted: 'var(--surface-muted)',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'DM Sans', 'sans-serif'],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      }
    },
  },
  plugins: [],
}
