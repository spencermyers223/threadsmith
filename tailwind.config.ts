import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
        },
        // ThreadSmith Night Writer palette
        night: {
          DEFAULT: '#09090B',
          50: '#18181B',
          100: '#27272A',
        },
        sand: {
          DEFAULT: '#C9B896',
          hover: '#D4C4A8',
          muted: '#8B7355',
          alt: '#A8967A',
        },
        silver: {
          DEFAULT: '#E5E7EB',
          muted: '#D1D5DB',
        },
        warmgray: {
          DEFAULT: '#78716C',
          light: '#8B8279',
        },
        charcoal: '#18181B',
        // Semantic colors
        success: 'var(--success)',
        error: 'var(--error)',
        info: 'var(--info)',
      },
      borderRadius: {
        DEFAULT: '8px',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.3)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.4)',
        'glow': '0 0 20px rgba(201, 184, 150, 0.15)',
      },
    },
  },
  plugins: [typography],
};
export default config;
