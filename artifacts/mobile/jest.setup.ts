// @testing-library/react-native v13+ automatically extends expect — no explicit
// import needed. The old extend-expect subpath was removed in v13.

// Mock AsyncStorage globally for all test suites.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Silence noisy console.warn output.
global.console.warn = jest.fn();
