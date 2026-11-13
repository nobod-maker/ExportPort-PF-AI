import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"SF Pro"',
          '"Inter"',
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "sans-serif",
        ],
        display: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"SF Pro"',
          '"Inter"',
          "system-ui",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          '"Geist Mono"',
          '"SF Mono"',
          "ui-monospace",
          "Roboto Mono",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
      colors: {
        background: "#0A0F1D",
        foreground: "#F8FAFC",
        // Dark Navy & Slate Theme Palette
        navy: {
          950: "#070B16",
          900: "#0A0F1D",
          850: "#0D1424",
          800: "#0F172A",
          700: "#1E293B",
          600: "#334155",
        },
        // Emerald / Mint Accents
        emerald: {
          950: "#022C22",
          900: "#064E3B",
          800: "#065F46",
          700: "#047857",
          600: "#059669",
          500: "#10B981",
          400: "#34D399",
          300: "#6EE7B7",
        },
        // Apple Spatial Glass Semantic Border Tokens
        "glass-border": {
          DEFAULT: "rgba(255, 255, 255, 0.08)",
          subtle: "rgba(255, 255, 255, 0.04)",
          strong: "rgba(255, 255, 255, 0.14)",
          emerald: "rgba(16, 185, 129, 0.25)",
        },
        // Semantic Token Mapping
        card: {
          DEFAULT: "#0F172A",
          foreground: "#F8FAFC",
        },
        popover: {
          DEFAULT: "#0F172A",
          foreground: "#F8FAFC",
        },
        primary: {
          DEFAULT: "#10B981",
          foreground: "#0A0F1D",
          hover: "#059669",
        },
        secondary: {
          DEFAULT: "#1E293B",
          foreground: "#F8FAFC",
          hover: "#334155",
        },
        muted: {
          DEFAULT: "#1E293B",
          foreground: "#94A3B8",
        },
        accent: {
          DEFAULT: "#10B981",
          foreground: "#0A0F1D",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        border: "#1E293B",
        input: "#1E293B",
        ring: "#10B981",
      },
      backdropBlur: {
        spatial: "24px",
        "spatial-modal": "32px",
        "spatial-subtle": "12px",
      },
      backdropSaturate: {
        spatial: "1.8",
        180: "1.8",
        190: "1.9",
      },
      boxShadow: {
        "rim-135":
          "inset 1px 1px 0 0 rgba(255, 255, 255, 0.12), inset -1px -1px 0 0 rgba(255, 255, 255, 0.02), 0 8px 32px 0 rgba(0, 0, 0, 0.36)",
        "rim-135-emerald":
          "inset 1px 1px 0 0 rgba(52, 211, 153, 0.25), inset -1px -1px 0 0 rgba(52, 211, 153, 0.05), 0 8px 32px 0 rgba(0, 0, 0, 0.36)",
        "rim-emerald-135":
          "inset 1px 1px 0 0 rgba(52, 211, 153, 0.25), inset -1px -1px 0 0 rgba(52, 211, 153, 0.05), 0 8px 32px 0 rgba(0, 0, 0, 0.36)",
        "glass-panel":
          "inset 1px 1px 0 0 rgba(255, 255, 255, 0.12), inset -1px -1px 0 0 rgba(255, 255, 255, 0.02), 0 8px 32px 0 rgba(0, 0, 0, 0.36)",
        "glass-panel-hover":
          "inset 1px 1px 0 0 rgba(255, 255, 255, 0.20), inset -1px -1px 0 0 rgba(255, 255, 255, 0.04), 0 12px 40px -8px rgba(0, 0, 0, 0.45)",
        "glass-modal":
          "inset 1px 1px 0 0 rgba(255, 255, 255, 0.20), inset -1px -1px 0 0 rgba(255, 255, 255, 0.03), 0 24px 64px -12px rgba(0, 0, 0, 0.65)",
      },
      backgroundImage: {
        "glass-gradient":
          "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.015) 40%, rgba(15, 23, 42, 0.65) 100%)",
        "glass-gradient-hover":
          "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.025) 40%, rgba(15, 23, 42, 0.70) 100%)",
        "glass-gradient-emerald":
          "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.04) 40%, rgba(15, 23, 42, 0.75) 100%)",
        "glass-emerald":
          "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 78, 59, 0.06) 40%, rgba(10, 15, 29, 0.75) 100%)",
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
