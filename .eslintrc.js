/** @format */

module.exports = {
    extends: [
        "react-app",
        "eslint:recommended",
        "plugin:react/recommended",
        "plugin:@typescript-eslint/recommended",
        "prettier/@typescript-eslint",
        "plugin:prettier/recommended",
        "plugin:cypress/recommended",
    ],
    rules: {
        "no-console": "off",
        "@typescript-eslint/explicit-function-return-type": ["off"],
        "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
        "react/prop-types": "off",
    },
    plugins: ["cypress"],
    env: { "cypress/globals": true },
    settings: {
        react: {
            pragma: "React",
            version: "16.6.0",
        },
    },
};
