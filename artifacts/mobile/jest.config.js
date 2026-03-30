/**
 * Jest configuration for Expo React Native + pnpm workspace.
 *
 * pnpm resolves symlinks to the actual .pnpm store path, so transformIgnorePatterns
 * must handle both the root-level node_modules and the .pnpm nested path:
 *   node_modules/expo-modules-core/...
 *   node_modules/.pnpm/expo-modules-core@x/node_modules/expo-modules-core/...
 *
 * The trailing "/" after "node_modules" in the pattern is critical — it anchors
 * the lookahead to the right position so the package-name check is correct.
 * Package wildcards (e.g. expo[a-zA-Z0-9_-]*) match expo, expo-router,
 * expo-modules-core, etc. without listing every sub-package.
 */
const TRANSFORM_PACKAGES = [
  "react-native[a-zA-Z0-9_-]*",
  "@react-native[a-zA-Z0-9/_-]*",
  "expo[a-zA-Z0-9_-]*",
  "@expo[a-zA-Z0-9/_-]*",
  "@unimodules[a-zA-Z0-9/_-]*",
  "@testing-library[a-zA-Z0-9/_-]*",
  "@nkzw[a-zA-Z0-9/_-]*",
  "date-fns",
  "zod",
].join("|");

module.exports = {
  preset: "jest-expo",
  setupFiles: ["./jest.setup.ts"],
  transformIgnorePatterns: [
    // node_modules/ WITH the trailing slash is the anchor point.
    // (?:.+/node_modules/)? handles the pnpm .pnpm/<hash>/node_modules/ prefix.
    `node_modules/(?!(?:.+/node_modules/)?(?:${TRANSFORM_PACKAGES})/)`,
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: [
    "**/__tests__/**/*.test.ts",
    "**/__tests__/**/*.test.tsx",
  ],
  collectCoverageFrom: [
    "utils/**/*.{ts,tsx}",
    "services/**/*.{ts,tsx}",
    "hooks/**/*.{ts,tsx}",
    "!services/providers.tsx",
    "!services/seed-coordinator.tsx",
  ],
};
