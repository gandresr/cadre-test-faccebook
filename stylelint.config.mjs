/** @type {import('stylelint').Config} */
const config = {
  extends: ["stylelint-config-standard"],
  ignoreFiles: [
    "node_modules/**",
    ".next/**",
    "dist/**",
    "build/**",
    "coverage/**",
  ],
  rules: {
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: [
          "tailwind",
          "apply",
          "layer",
          "variants",
          "responsive",
          "screen",
          "theme",
          "config",
          "plugin",
          "source",
          "utility",
          "variant",
          "custom-variant",
          "reference",
        ],
      },
    ],
  },
};

export default config;
