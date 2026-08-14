// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // Deno/Edge runtime code and archived (removed-from-the-app) screens — neither
    // ships, so neither is part of the app's lint program. See src/archive/screens/README.md.
    ignores: ["dist/*", "supabase/functions/**", "src/archive/**"],
  }
]);
