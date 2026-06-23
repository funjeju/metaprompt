import type { Config } from "tailwindcss";

// docs/06-design-system.md 6.7 매핑. 모든 색은 CSS 변수(globals.css) 경유.
// raw hex 직접 사용 금지 — 테마 전환이 깨진다.
const config: Config = {
  darkMode: "class", // docs/04 4.5
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        ink: "var(--text)",
        muted: "var(--text-muted)",
        faint: "var(--text-faint)",
        accent: "var(--accent)",
        "accent-tint": "var(--accent-tint)",
        blue: "var(--blue)",
        green: "var(--green)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
      },
      borderRadius: {
        sm: "10px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        pill: "999px",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        card: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      backgroundImage: {
        brand: "var(--gradient-brand)",
      },
      fontFamily: {
        // docs/06 6.5 — Pretendard (추정·권장), 확정 전까지 변수화.
        sans: ["var(--font-sans)", "Pretendard", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
