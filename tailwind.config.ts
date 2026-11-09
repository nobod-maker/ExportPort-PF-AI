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
