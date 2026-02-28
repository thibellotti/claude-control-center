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
          0: 'var(--surface-0)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
          4: 'var(--surface-4)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          default: 'var(--border-default)',
          strong: 'var(--border-strong)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          muted: 'var(--accent-muted)',
        },
        status: {
          active: 'var(--status-active)',
          idle: 'var(--status-idle)',
          dirty: 'var(--status-dirty)',
          clean: 'var(--status-clean)',
        },
        feedback: {
          error: 'var(--feedback-error)',
          'error-muted': 'var(--feedback-error-muted)',
          'error-border': 'var(--feedback-error-border)',
          success: 'var(--feedback-success)',
          'success-muted': 'var(--feedback-success-muted)',
          'success-border': 'var(--feedback-success-border)',
          warning: 'var(--feedback-warning)',
          'warning-muted': 'var(--feedback-warning-muted)',
          'warning-border': 'var(--feedback-warning-border)',
          info: 'var(--feedback-info)',
          'info-muted': 'var(--feedback-info-muted)',
          'info-border': 'var(--feedback-info-border)',
        },
        terminal: {
          bg: 'var(--terminal-bg)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        micro: ['10px', { lineHeight: '14px' }],
      },
      borderRadius: {
        card: '8px',
        button: '4px',
        badge: '9999px',
        input: '8px',
      },
    },
  },
  plugins: [],
};
module.exports = config;
