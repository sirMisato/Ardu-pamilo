/* global module */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{ts,vue}"
  ],
  theme: {
    extend: {
      colors: {
        "broken-white": "#F8F9FA",
        "pastel-green": "#86EFAC",
        mint: {
          DEFAULT: "#2DD4BF",
          soft: "#A7F3D0",
          deep: "#0F766E"
        },
        pamilo: {
          background: "#F8F9FA",
          surface: "#FFFFFF",
          text: "#1E293B",
          muted: "#475569",
          green: "#86EFAC",
          mint: "#2DD4BF"
        },
        field: {
          night: "#F8F9FA",
          deep: "#F1F5F9",
          panel: "#FFFFFF",
          line: "#D9F3E7",
          mint: "#2DD4BF",
          green: "#86EFAC"
        }
      },
      boxShadow: {
        glass: "0 24px 70px rgb(15 23 42 / 10%)",
        "glass-soft": "0 14px 40px rgb(15 23 42 / 8%)",
        field: "0 24px 70px rgb(15 23 42 / 10%)"
      }
    }
  },
  plugins: []
};
