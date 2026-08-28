/*
 * Copy to `config.js` and fill in. `config.js` is gitignored, the same way the
 * app's `.env` is: not because these values are secret — the anon key is
 * publishable by design and RLS is what protects the data — but because the
 * project URL should be changed in one place when it changes, and a value
 * committed in two files is a value that gets updated in one.
 *
 * `npm run console:config` writes this file from the app's own .env.
 */
window.PUSHAPP_CONSOLE = {
  supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
  supabaseAnonKey: 'sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxx',
};
