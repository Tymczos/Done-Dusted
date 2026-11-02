/* global __dirname */
// Use the installed Expo Router generator so typecheck works before Metro starts.
// This adapter is intentionally tied to the pinned Expo Router 6 / SDK 54.
const fs = require("node:fs");
const path = require("node:path");
const { EXPO_ROUTER_CTX_IGNORE } = require("expo-router/_ctx-shared");
const context =
  require("expo-router/build/testing-library/require-context-ponyfill").default;
const {
  getTypedRoutesDeclarationFile,
} = require("expo-router/build/typed-routes/generate");
const root = path.resolve(__dirname, "..");
const output = getTypedRoutesDeclarationFile(
  context(path.join(root, "app"), true, EXPO_ROUTER_CTX_IGNORE),
);
if (!output)
  throw new Error("Expo Router could not generate route declarations");
fs.mkdirSync(path.join(root, ".expo/types"), { recursive: true });
fs.writeFileSync(path.join(root, ".expo/types/router.d.ts"), output);
