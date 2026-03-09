import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        reading: ["var(--font-reading)", "Georgia", "serif"],
      },
      maxWidth: {
        reading: "720px",
      },
    },
  },
  plugins: [],
};

export default config;
