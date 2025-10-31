import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        obsidian: '#0a0e27',
        'card-bg': '#0f1535',
        'border-subtle': '#1a2555',
        'mayan-blue': '#004B87',
        'neon-cyan': '#00f0ff',
        'cochineal': '#e63946',
        jade: '#2d9e78',
        gold: '#d4a574',
        'text-primary': '#f0f4ff',
        'text-secondary': '#a8b8d8',
        'text-tertiary': '#7a8ba8',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
