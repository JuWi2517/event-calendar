// functions/eslint.config.js
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
    {
        files: ["src/**/*.ts"],
        ignores: ["lib/**", "node_modules/**"],
        languageOptions: { parser: tsParser },
        plugins: { "@typescript-eslint": tsPlugin },
        rules: {
            // můžeš si přitvrdit později; teď hlavně ať to běží
            "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
            "@typescript-eslint/no-unused-expressions": "off"   // vypneme problematické pravidlo
        }
    }
];
