/** @type {import('stylelint').Config} */
export default {
  extends: ["stylelint-config-standard"],
  ignoreFiles: [
    "node_modules/**",
    ".next/**",
    "dist/**",
    "build/**",
    "coverage/**",
  ],
  rules: {
    "at-rule-no-unknown": [true, { ignoreAtRules: ["tailwind", "apply", "layer", "variants", "responsive", "screen"] }],
  },
};
