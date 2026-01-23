const typography = require("@tailwindcss/typography");

module.exports = {
    darkMode: "class",
    content: ["./index.html", "./src/**/*.{html,ts}"],
    theme: {
        extend: {
            fontFamily: {
                sans: ["var(--font-sans)", "Inter", "sans-serif"],
                serif: ["var(--font-serif)", "Merriweather", "serif"],
                mono: ["var(--font-mono)", "Roboto Mono", "monospace"]
            },
            colors: {
                primary: "rgb(var(--color-primary) / <alpha-value>)",
                secondary: "#64748b"
            },
            animation: {
                "fade-in": "fadeIn 0.2s ease-out",
                "slide-up": "slideUp 0.3s ease-out",
                "slide-in-right": "slideInRight 0.3s ease-out"
            },
            keyframes: {
                fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
                slideUp: { "0%": { transform: "translateY(10px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
                slideInRight: { "0%": { transform: "translateX(100%)" }, "100%": { transform: "translateX(0)" } }
            }
        }
    },
    plugins: [typography]
};
