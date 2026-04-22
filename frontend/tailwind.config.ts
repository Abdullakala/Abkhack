import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        panel: "#1e1e1e",
        sidebar: "#252526",
        border: "#3c3c3c",
      },
    },
  },
  plugins: [],
};

export default config;
