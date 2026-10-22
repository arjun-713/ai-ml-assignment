/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F2F0E9",
        paper: "#FCFBF6",
        "paper-deep": "#F7F4EB",
        ink: "#14251F",
        "ink-soft": "#33443D",
        muted: "#6A7872",
        line: "#DDE2D9",
        "line-strong": "#C8D1C7",
        forest: {
          50: "#EFF5F1",
          100: "#DFEBE4",
          200: "#C1D8CC",
          300: "#98BCA9",
          400: "#679B84",
          500: "#417D68",
          600: "#2E6553",
          700: "#245244",
          800: "#1B4238",
          900: "#12372E",
          950: "#092821",
        },
        sage: {
          50: "#F2F6F2",
          100: "#E5EDE5",
          200: "#D1E0D4",
          300: "#AAC5B2",
          400: "#7DA48A",
        },
        coral: {
          50: "#FCF2EE",
          100: "#F8E2DA",
          200: "#F0C6B7",
          300: "#E4A38C",
          400: "#D67C60",
          500: "#C45D41",
          600: "#A94B33",
          700: "#883C2B",
        },
        gold: {
          100: "#F6EBD3",
          300: "#E3C58D",
          500: "#BE9750",
          700: "#8C6C35",
        },
      },
      fontFamily: {
        sans: ["Manrope Variable", "Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Instrument Serif", "Iowan Old Style", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,37,31,0.03), 0 14px 36px -30px rgba(20,37,31,0.18)",
        lift: "0 16px 36px -26px rgba(9,40,33,0.4)",
      },
      borderRadius: {
        card: "16px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "soft-pulse": {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "0.8" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.55s cubic-bezier(0.2, 0.7, 0.2, 1) both",
        "soft-pulse": "soft-pulse 3.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
