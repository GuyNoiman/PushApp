// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // Deno/Edge runtime code — not part of the app's lint program.
    ignores: ["dist/*", "supabase/functions/**"],
  }
]);
