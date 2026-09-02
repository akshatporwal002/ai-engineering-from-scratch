import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        ink: "var(--ink)",
        accent: "var(--accent)",
        displayAccent: "var(--display-accent)",
        surface: "var(--surface)",
        line: "var(--line)",
        muted: "var(--muted)",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-monospace", "monospace"],
        body: ["var(--font-body)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
      },
      screens: {
        narrow: "390px",
        shell: "900px",
      },
    },
  },
  plugins: [],
};

export default config;
