// .eslintrc.cjs
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    // either point at your real TS config:
    project: "./tsconfig.build.json",
    sourceType: "module",
    ecmaVersion: 2020
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  env: {
    node: true,
    es2020: true
  },
  ignorePatterns: ["dist", "node_modules"]
};
