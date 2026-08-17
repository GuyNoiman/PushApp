// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // Deno/Edge runtime code does not ship in the app bundle, so it is not part of the
    // app's lint program. (The archived screens used to be ignored here too; they now live
    // outside app/ entirely — see 12_Future_Assets/README.md.)
    ignores: ["dist/*", "supabase/functions/**"],
  }
]);
