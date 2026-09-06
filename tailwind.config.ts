import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0F172A',
        'bg-surface': '#1A2133',
        'bg-surface-2': '#232B45',
        'accent-teal': '#5EEAD4',
        'accent-violet': '#A78BFA',
      }
    },
  },
  plugins: [],
};
export default config;