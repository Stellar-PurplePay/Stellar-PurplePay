/**
 * eslint.config.mjs
 *
 * Flat config for ESLint.
 * Mirrors the legacy `.eslintrc.json` setup: Next core-web-vitals rules,
 * jsx-a11y recommended, and the custom SRI rule.
 */
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import jsxA11y from "eslint-plugin-jsx-a11y";
import sri from "eslint-plugin-sri";

const config = [
  ...nextCoreWebVitals,
  {
    plugins: {
      sri,
    },
    rules: {
      // jsx-a11y recommended (the plugin itself is registered by eslint-config-next).
      ...jsxA11y.flatConfigs.recommended.rules,
      "jsx-a11y/label-has-associated-control": "warn",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/alt-text": "warn",
      "react/no-unescaped-entities": "warn",
      // Keep these as warnings, matching the previous .eslintrc.json overrides.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/static-components": "off",
      "react-hooks/use-memo": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/incompatible-library": "off",
      "react-hooks/immutability": "off",
      "react-hooks/globals": "off",
      "react-hooks/refs": "off",
      "react-hooks/error-boundaries": "off",
      "react-hooks/set-state-in-render": "off",
      "react-hooks/unsupported-syntax": "off",
      "react-hooks/config": "off",
      "react-hooks/gating": "off",
      "@next/next/no-img-element": "warn",
      "sri/no-external-script-without-sri": "error",
      "sri/no-raw-dangerously-set-inner-html": "error",
    },
  },
  {
    // Storybook render() functions legitimately call hooks inside the render
    // callback; the rule is a known false positive for that pattern.
    files: ["stories/**", "**/*.stories.*"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
  {
    ignores: [
      // Default ignores of eslint-config-next:
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default config;
