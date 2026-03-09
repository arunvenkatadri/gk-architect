/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        panel: 'var(--color-panel)',
        surface: 'var(--color-surface)',
        accent: 'var(--color-accent)',
        'accent-hover': 'var(--color-accent-hover)',
        'node-service': '#6366f1',
        'node-ui': '#06b6d4',
        'node-db': '#f59e0b',
        'node-api': '#10b981',
        'node-queue': '#8b5cf6',
        'node-generic': '#6b7280',
      },
      textColor: {
        primary: 'var(--color-text)',
        secondary: 'var(--color-text-secondary)',
        muted: 'var(--color-text-muted)',
      },
      backgroundColor: {
        main: 'var(--color-bg)',
      },
    },
  },
  plugins: [],
};
