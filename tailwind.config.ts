import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        s1: 'rgb(var(--s1) / <alpha-value>)',
        s2: 'rgb(var(--s2) / <alpha-value>)',
        s3: 'rgb(var(--s3) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        mute: 'rgb(var(--mute) / <alpha-value>)',
        dim: 'rgb(var(--dim) / <alpha-value>)',
        acc: 'rgb(var(--acc) / <alpha-value>)',
        onacc: 'rgb(var(--onacc) / <alpha-value>)',
        ok: 'rgb(var(--ok) / <alpha-value>)',
        bad: 'rgb(var(--bad) / <alpha-value>)',
        warm: 'rgb(var(--warm) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
        num: ['"Archivo Variable"', '"Inter Variable"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xl: '14px', '2xl': '20px', '3xl': '28px' },
    },
  },
  plugins: [],
} satisfies Config;
