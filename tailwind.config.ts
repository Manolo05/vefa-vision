import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: { DEFAULT: "#C9A96E", light: "#E8D5A8", dark: "#A07D3F" },
      },
    },
  },
  plugins: [],
};
export default config;
