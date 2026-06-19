/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#1e3a5f",
          dark: "#0f1d34",
          light: "#2a5a8a",
        },
        gold: {
          DEFAULT: "#c9953c",
          light: "#e8d5a3",
          bg: "#fdf6e7",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        display: ["Noto Serif SC", "STSong", "SimSun", "serif"],
        accent: ["Outfit", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        body: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Noto Sans SC",
          "Microsoft YaHei",
          "sans-serif",
        ],
      },
      borderRadius: {
        xs: "6px",
        sm: "10px",
        DEFAULT: "14px",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
