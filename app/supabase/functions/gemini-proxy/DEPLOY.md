# Deploying `gemini-proxy` — the founder's four commands

Until these run, the app keeps calling Gemini **directly** with the key from `app/.env.local`
(forced by the temporary `EXPO_PUBLIC_LLM_DIRECT=1` line there). That is fine on your own machine
and **not fine in any build you hand to somebody else** — the key is inlined into the bundle and can
be extracted from it, with no spend ceiling.

## 1. Install the CLI and sign in
```
brew install supabase/tap/supabase
supabase login
supabase link --project-ref <your-project-ref>
```

## 2. Find your own user id
This is the uid the 2 MB cap will SKIP. Anyone not on this list is metered.
In the Supabase dashboard: **Authentication → Users**, copy the UUID of your row.

## 3. Set the secrets (server-side only — none of these reach the app)
```
supabase secrets set GEMINI_API_KEY=<the key currently in app/.env.local>
supabase secrets set UNMETERED_UIDS=<your uid>
```

## 4. Push the table and deploy
```
supabase db push
supabase functions deploy gemini-proxy
```

## 5. Turn the direct path off
Delete the `EXPO_PUBLIC_LLM_DIRECT=1` line from `app/.env.local` and restart the dev server. The
coach now routes through the function; the app holds no key.

## 6. THE ONE THAT ACTUALLY CLOSES THE HOLE
Remove the key from the EAS environment, or every cloud build keeps embedding it:
```
eas env:delete --variable-name EXPO_PUBLIC_GEMINI_API_KEY --environment development
```
Left deliberately for you rather than done automatically: it changes remote configuration and would
break any existing development build that still expects the direct path.

## How to tell it worked
Open the Coach and send a message. Then, in the SQL editor:
```sql
select user_id, bytes, requests, last_at from public.llm_usage order by last_at desc limit 5;
```
A row means the call went through the proxy. No row means it went direct — check step 5.
