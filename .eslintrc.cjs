module.exports = {
  env: {
    node: true,
    es2023: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:node/recommended",
    "plugin:prettier/recommended", // integrates Prettier
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    // Custom rules
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "node/no-unsupported-features/es-syntax": "off",
    "node/no-missing-import": "off",
  },
};
