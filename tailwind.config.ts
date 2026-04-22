import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        scheduler: {
          panel: "hsl(var(--scheduler-panel))",
          "panel-strong": "hsl(var(--scheduler-panel-strong))",
          lane: "hsl(var(--scheduler-lane))",
          "lane-alt": "hsl(var(--scheduler-lane-alt))",
          syringe: "hsl(var(--scheduler-syringe))",
          "syringe-soft": "hsl(var(--scheduler-syringe-soft))",
          peristaltic: "hsl(var(--scheduler-peristaltic))",
          "peristaltic-soft": "hsl(var(--scheduler-peristaltic-soft))",
        },
      },
      fontFamily: {
        sans: [
          "\"Segoe UI Variable Display\"",
          "\"Bahnschrift\"",
          "\"Trebuchet MS\"",
          "ui-sans-serif",
          "sans-serif",
        ],
        mono: [
          "\"Cascadia Code\"",
          "\"SFMono-Regular\"",
          "\"Consolas\"",
          "ui-monospace",
          "monospace",
        ],
      },
      boxShadow: {
        panel: "0 24px 54px -34px rgba(15, 23, 42, 0.28)",
        glow: "0 0 0 1px rgba(14, 165, 233, 0.18), 0 18px 32px -24px rgba(14, 165, 233, 0.22)",
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0))",
      },
    },
  },
  plugins: [],
};

export default config;
