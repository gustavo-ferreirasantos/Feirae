import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        feira: {
          50: "#f2fbf6",
          100: "#e1f6eb",
          200: "#c4edda",
          300: "#98dfc1",
          400: "#64c8a2",
          500: "#3bad85",
          600: "#2a8d6b",
          700: "#227056",
          800: "#1e5946",
          900: "#1a493a",
          950: "#0c2820",
        },
        terra: {
          50: "#fdf8f4",
          100: "#fbf0e8",
          200: "#f6decb",
          300: "#efc4a4",
          400: "#e6a275",
          500: "#de824e",
          600: "#cf6a39",
          700: "#ad512d",
          800: "#8a422a",
          900: "#703825",
        }
      },
    },
  },
  plugins: [],
};
export default config;
