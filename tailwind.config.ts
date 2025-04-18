import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      keyframes: {
        'spin-continuous': {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(360deg)' },
        },
        'flip-heads': {
          '0%': { transform: 'rotateY(0deg)' }, // Start from current spinning position (or 0 if idle)
          '50%': { transform: 'rotateY(900deg)' }, // Spin multiple times ending halfway
          '100%': { transform: 'rotateY(1080deg)' }, // End showing heads (multiple of 360)
        },
        'flip-tails': {
          '0%': { transform: 'rotateY(0deg)' }, // Start from current spinning position (or 0 if idle)
          '50%': { transform: 'rotateY(990deg)' }, // Spin multiple times ending halfway + 180
          '100%': { transform: 'rotateY(1260deg)' }, // End showing tails (multiple of 360 + 180)
        },
      },
      animation: {
        'spin-continuous': 'spin-continuous 0.5s linear infinite', // Faster spin
        'flip-heads': 'flip-heads 1s ease-out forwards', // 'forwards' keeps the end state
        'flip-tails': 'flip-tails 1s ease-out forwards', // 'forwards' keeps the end state
      },
    },
  },
  plugins: [],
};
export default config;
