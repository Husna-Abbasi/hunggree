import { type Config } from "tailwindcss";
import { heroui } from "@heroui/react";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    plugins: [
        heroui({
            themes: {
                light: {
                    colors: {
                        primary: {
                            DEFAULT: "#5C6F2B",
                            foreground: "#FFFFFF",
                        },
                        secondary: {
                            DEFAULT: "#DE802B",
                            foreground: "#FFFFFF",
                        },
                        background: "#EEEEEE",
                        content1: "#D8C9A7",
                        default: {
                            100: "#E5D9BF",
                            200: "#D8C9A7",
                            300: "#CBB98F",
                            DEFAULT: "#D8C9A7",
                        }
                    },
                },
                dark: {
                    colors: {
                        primary: {
                            DEFAULT: "#5C6F2B",
                            foreground: "#FFFFFF",
                        },
                        secondary: {
                            DEFAULT: "#DE802B",
                            foreground: "#FFFFFF",
                        },
                        background: "#1A1C14", // Dark olive-tinted background
                        content1: "#25281B",   // Slightly lighter olive-tinted surface
                        default: {
                            100: "#313524",
                            200: "#25281B",
                            300: "#1A1C14",
                            DEFAULT: "#25281B",
                        }
                    }
                }
            }
        })
    ],
};

export default config;
