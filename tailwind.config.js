/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          950: '#031410', // VMAX deep space obsidian
          900: '#071f19', // Panels & sidebar surface
          850: '#0c2b23', // Headers & elevated cards
          800: '#12392f', // Hover surfaces
          700: '#1b4d40', // Borders & dividers
        },
        vmax: {
          primary: '#1f8538',       // VMAX Forest Green
          hover: '#17682c',         // VMAX Darker Green
          to: '#61c73f',            // VMAX Laser Lime
          space: '#031b16',         // Deep Space
          space2: '#062d24',        // Deep Space 2
          laser: '#61c73f',         // Laser Lime Accent
          sun: '#ff7a1a',           // VMAX Energy Orange Accent
          ice: '#bdfbea',           // Mint Ice
        },
        accent: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#1f8538', // VMAX Signature Green
          600: '#17682c', // VMAX Hover
          700: '#125423',
          lime: '#61c73f',
          orange: '#ff7a1a',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      }
    },
  },
  plugins: [],
}
