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
    // Tailwind v4 requires `@import "tailwindcss";` (string form) so its
    // PostCSS plugin can intercept the import and emit utility classes from
    // the `@theme` block. The standard config's default is "url" which
    // rewrites it to `@import url("tailwindcss");` and breaks the build.
    "import-notation": "string",
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
