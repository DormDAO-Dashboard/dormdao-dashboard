import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#34d399",
        danger: "#f87171",
        "primary-dark": "#1D9E75",
      },
      fontFamily: {
        sans: ["Antikor Display", "sans-serif"],
        mono: ["Antikor Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
