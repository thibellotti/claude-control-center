const config = {
  content: [
    './renderer/pages/**/*.{js,ts,jsx,tsx}',
    './renderer/components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#0A0A0A',
          1: '#141414',
          2: '#1A1A1A',
          3: '#222222',
          4: '#2A2A2A',
        },
        border: {
          subtle: '#262626',
          default: '#333333',
          strong: '#444444',
        },
        text: {
          primary: '#FAFAFA',
          secondary: '#A0A0A0',
          tertiary: '#666666',
        },
        accent: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
          muted: '#3B82F620',
        },
        status: {
          active: '#22C55E',
          idle: '#6B7280',
          dirty: '#F59E0B',
          clean: '#22C55E',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        card: '8px',
        button: '4px',
      },
    },
  },
  plugins: [],
};
module.exports = config;
