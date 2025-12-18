module.exports = {
  content: [
    "./src/**/*.{html,js,ts,jsx,tsx}",
    "app/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "blue-400": "var(--blue-400)",
        "blue-50": "var(--blue-50)",
        "blue-500": "var(--blue-500)",
        "gray-700": "var(--gray-700)",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Custom Application Colors
        brand: {
          primary: "#155cfb",
          "primary-hover": "#1250dc",
          "primary-light": "#eff6ff",
          secondary: "#3B82F6",
          accent: "#1347e5",
        },
        surface: {
          white: "#ffffff",
          "white-80": "#ffffffcc",
          "white-95": "#fffffff2",
          gray: "#f8f9fb",
          "gray-light": "#f1f5f9",
        },
        text: {
          primary: "#0e162b",
          secondary: "#61738d",
          tertiary: "#717182",
          muted: "#9ca3af",
        },
        border: {
          DEFAULT: "#e1e8f0",
          light: "#e2e8f0",
          dark: "#d1d5db",
        },
        status: {
          success: "#00c950",
          error: "#dc2626",
          "error-dark": "#d32f2f",
          "error-light": "#c10007",
          warning: "#f59e0b",
          info: "#3b82f6",
        },
        priority: {
          high: "#ffe2e2",
          "high-text": "#c10007",
          medium: "#fff4e5",
          "medium-text": "#f59e0b",
          low: "#e0f2fe",
          "low-text": "#0284c7",
        },
        badge: {
          blue: "#dbeafe",
          "blue-text": "#1e40af",
          green: "#dcfce7",
          "green-text": "#166534",
          yellow: "#fef3c7",
          "yellow-text": "#92400e",
          purple: "#e0e7ff",
          "purple-text": "#4338ca",
          gray: "#f3f4f6",
          "gray-text": "#374151",
        },
        knowledge: {
          bg: "#bad2ee1a",
          "bg-hover": "#bad2ee2a",
          border: "#0072bc33",
        },
        gradient: {
          "blue-start": "#2b7fff",
          "blue-end": "#ad46ff",
          "primary-start": "#1f6feb",
          "primary-end": "#4aa3ff",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          '"Noto Color Emoji"',
        ],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
  },
  plugins: [],
  darkMode: ["class"],
};
