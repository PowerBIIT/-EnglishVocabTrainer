import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: "#ecf7f6",
          100: "#d2eeea",
          200: "#a6dcd5",
          300: "#6cc2b9",
          400: "#3ba59c",
          500: "#1f8a80",
          600: "#17716a",
          700: "#135b56",
          800: "#114a45",
          900: "#0f3d39",
        },
        success: {
          50: "#ecfbf4",
          100: "#d2f6e4",
          500: "#22c07a",
          600: "#179c64",
        },
        error: {
          50: "#fff2f2",
          100: "#ffe2e2",
          500: "#ef4444",
          600: "#dc2626",
        },
      },
    },
  },
  plugins: [],
};

export default config;
