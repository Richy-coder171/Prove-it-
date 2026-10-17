/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17251f",
        paper: "#f2f1eb",
        moss: "#415f4c",
        acid: "#d2f36b",
        clay: "#dc684f",
      },
      fontFamily: {
        sans: ["Satoshi", "Manrope", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
