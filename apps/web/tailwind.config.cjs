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
        field: {
          night: "#07111f",
          deep: "#0b1626",
          panel: "#101f32",
          line: "#20364a",
          mint: "#8ef0ca",
          green: "#a7e8af"
        }
      },
      boxShadow: {
        field: "0 24px 70px rgb(2 8 23 / 36%)"
      }
    }
  },
  plugins: []
};
