/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#050807",
          900: "#070b0a",
          850: "#0b1210",
          800: "#0e1513",
          700: "#121a18",
          600: "#1a2522",
          500: "#243430",
          400: "#314540",
        },
        mist: {
          100: "#e8f5f0",
          200: "#c5ddd4",
          300: "#9bb5ac",
          400: "#7a948b",
          500: "#5f7870",
        },
        signal: {
          DEFAULT: "#2ee6a6",
          dim: "#1fad7c",
          soft: "rgba(46, 230, 166, 0.14)",
          glow: "rgba(46, 230, 166, 0.35)",
        },
      },
      fontFamily: {
        display: ['"Syne"', "system-ui", "sans-serif"],
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel: "0 0 0 1px rgba(46, 230, 166, 0.06), 0 12px 40px rgba(0,0,0,0.35)",
        glow: "0 0 24px rgba(46, 230, 166, 0.2)",
      },
      backgroundImage: {
        "workspace":
          "radial-gradient(ellipse 80% 50% at 10% -10%, rgba(46,230,166,0.08), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(30,120,100,0.12), transparent 50%), linear-gradient(180deg, #0b1210 0%, #070b0a 100%)",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(-4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "fade-in": "fade-in 0.18s ease-out",
      },
    },
  },
  plugins: [],
};
