// .eslintrc.cjs
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
    ecmaVersion: 2020,
    // you can add project later if you want type-aware rules:
    // project: "./tsconfig.build.json",
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  env: {
    node: true,
    es2020: true,
  },
  ignorePatterns: ["dist", "node_modules"],
};
